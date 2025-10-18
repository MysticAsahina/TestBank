import express from "express";
import Admin from "../../models/Admin.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { sendPasswordSetupEmail } from "../../utils/passwordResetService.js";

const router = express.Router();

// ✅ Middleware (only authenticated Deans)
router.use(requireAuth);
router.use(requireRole(["Dean"]));

// ====================== Manage Accounts Page ======================
router.get("/", async (req, res) => {
  try {
    const professors = await Admin.find({ role: "Professor" }).lean();
    const deans = await Admin.find({ role: "Dean" }).lean();

    res.render("dean/ManageAccounts", {
      title: "Manage Accounts",
      user: req.session.user,
      professors,
      deans,
    });
  } catch (err) {
    console.error("❌ Error loading accounts:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ====================== Add User ======================
router.post("/add-user", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      middleName,
      email,
      contactNumber,
      employeeID,
      department,
      role,
    } = req.body;

    const newUser = new Admin({
      firstName,
      lastName,
      middleName,
      email,
      contactNumber,
      employeeID,
      department,
      role,
      designation: role,
      employmentStatus: "Full-time",
      accountStatus: "Active",
      password:
        "$2a$12$rypunVcKVCq.aomFTeBGFOD3E9sX62.SoSnLAYxY1Xt/AUg3tORqq", // default bcrypt-hashed pw
      createdBy: req.session.user?.fullName || "System",
    });

    await newUser.save();
    console.log(`✅ New ${role} added: ${employeeID}`);

    await sendPasswordSetupEmail(newUser.email, newUser._id);

    res.redirect("/dean/manage-accounts");
  } catch (err) {
    console.error("❌ Error adding user:", err);
    res.status(500).send("Failed to add user");
  }
});

// ====================== Delete User ======================
router.post("/delete/:id", async (req, res) => {
  try {
    await Admin.findByIdAndDelete(req.params.id);
    console.log("🗑️ Account deleted:", req.params.id);
    res.redirect("/dean/manage-accounts");
  } catch (err) {
    console.error("❌ Error deleting account:", err);
    res.status(500).send("Failed to delete account");
  }
});

export default router;
