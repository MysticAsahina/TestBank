import express from "express";
import Admin from "../models/Admin.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { fullName, adminID, email, password } = req.body;

    const exists = await Admin.findOne({ $or: [{ email }, { adminID }] });
    if (exists) return res.status(400).json({ msg: "Email or Admin ID already exists." });

    const newAdmin = new Admin({ fullName, adminID, email, password });
    await newAdmin.save();

    res.json({ msg: "Admin registered successfully." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

export default router;
