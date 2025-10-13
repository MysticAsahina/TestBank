import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Admin from "../models/Admin.js"; // Assuming Dean and Professor accounts are stored here
import {sendPasswordSetupEmail } from "../utils/passwordResetService.js";
const router = express.Router();

// All dean routes require authentication and dean role
router.use(requireAuth);
router.use(requireRole(["Dean"]));

// Dean Dashboard
router.get("/dashboard", (req, res) => {
  res.render("dean/Dashboard", {
    title: "Dean Dashboard",
    user: req.session.user,
  });
});

// Manage Accounts — now fetches Professors & Deans dynamically
router.get("/manage-accounts", async (req, res) => {
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

// Add new Dean or Professor
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
      password: "$2a$12$rypunVcKVCq.aomFTeBGFOD3E9sX62.SoSnLAYxY1Xt/AUg3tORqq", // Default hashed password
      createdBy: req.session.user ? req.session.user.fullName : "System",
    });

    await newUser.save();
    console.log(`✅ New ${role} added: ${employeeID}`);

    // 🔥 Send setup email with OTP link
    await sendPasswordSetupEmail(newUser.email, newUser._id);

    res.redirect("/dean/manage-accounts");
  } catch (err) {
    console.error("❌ Error adding user:", err);
    res.status(500).send("Failed to add user");
  }
});


// Delete Dean or Professor
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
