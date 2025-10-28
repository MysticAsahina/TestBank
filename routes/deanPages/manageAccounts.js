import express from "express";
import Admin from "../../models/Admin.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { sendPasswordSetupEmail } from "../../utils/passwordResetService.js";
import { sendUserOTP, verifyUserOTP } from "../../utils/otpService.js";

const router = express.Router();

// ✅ Middleware (only authenticated Deans)
router.use(requireAuth);
router.use(requireRole(["Dean"]));

// ====================== Manage Accounts Page ======================
router.get("/", async (req, res) => {
  try {
    const professors = await Admin.find({ role: "Professor" }).lean();
    const deans = await Admin.find({ role: "Dean" }).lean();

    const alert = req.session.alert || null;
    req.session.alert = null; // clear after use

    res.render("dean/ManageAccounts", {
      title: "Manage Accounts",
      user: req.session.user,
      professors,
      deans,
      alert,
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

    // 🔍 Check for duplicates first
    const existingUser = await Admin.findOne({
      $or: [{ email }, { employeeID }],
    });

    if (existingUser) {
      // Store a flash-style message in session
      req.session.alert = {
        type: "danger",
        message: "A user with this email or employee ID already exists.",
      };
      return res.redirect("/dean/manage-accounts");
    }

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
        "$2a$12$rypunVcKVCq.aomFTeBGFOD3E9sX62.SoSnLAYxY1Xt/AUg3tORqq",
      createdBy: req.session.user?.fullName || "System",
    });

    await newUser.save();
    console.log(`✅ New ${role} added: ${employeeID}`);

    await sendPasswordSetupEmail(newUser.email, newUser._id);

    req.session.alert = {
      type: "success",
      message: `${role} added successfully and setup email sent!`,
    };
    res.redirect("/dean/manage-accounts");
  } catch (err) {
    console.error("❌ Error adding user:", err);
    req.session.alert = {
      type: "danger",
      message: "An error occurred while adding the user.",
    };
    res.redirect("/dean/manage-accounts");
  }
});

// ====================== Send OTP (for edit verification) ======================
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    await sendUserOTP(email);
    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// ====================== Save edited user (with OTP verification) ======================
router.post("/edit-user", async (req, res) => {
  try {
    const { id, email, firstName, lastName, department, contactNumber, otp } = req.body;

    // 1️⃣ OTP Validation
    const result = verifyUserOTP(email, otp);
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: `OTP verification failed: ${result.reason}`,
      });
    }

    // 2️⃣ Duplicate Email Check
    const existing = await Admin.findOne({ email, _id: { $ne: id } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already exists in another account",
      });
    }

    // 3️⃣ Update
    const updated = await Admin.findByIdAndUpdate(
      id,
      { firstName, lastName, email, department, contactNumber },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ success: false, message: "User not found" });

    console.log(`✏️ User updated: ${updated.email}`);
    res.json({ success: true, message: "User updated successfully" });
  } catch (err) {
    console.error("❌ Error editing user:", err);
    res.status(500).json({ success: false, message: "Server error while updating user" });
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
