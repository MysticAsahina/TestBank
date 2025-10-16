// routes/passwordReset.js
import express from "express";
import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";

const router = express.Router();

// STEP 1: Render setup form
router.get("/setup-password/:userId", async (req, res) => {
  const { userId } = req.params;
  const user = await Admin.findById(userId);
  if (!user) return res.status(404).send("Invalid account link.");

  res.render("setup-password", { userId });
});

// STEP 2: Handle form submission
router.post("/setup-password/:userId", async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const { userId } = req.params;
  if (!newPassword || newPassword !== confirmPassword) {
    return res.status(400).send("Passwords do not match.");
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await Admin.findByIdAndUpdate(userId, { password: hashed });
  res.send("✅ Password setup successful!");
});

export default router;
