import express from "express";
import Student from "../models/Student.js";
import Professor from "../models/Professor.js";
import Admin from "../models/Admin.js";

const router = express.Router();

// Shared login for all user types
router.post("/login", async (req, res) => {
  const { id, password } = req.body;

  try {
    let userType, user;

    if (id.startsWith("01-")) {
      user = await Student.findOne({ studentID: id });
      userType = "student";
    } else if (id.startsWith("P-")) {
      user = await Professor.findOne({ professorID: id });
      userType = "professor";
    } else if (id.startsWith("A-")) {
      user = await Admin.findOne({ adminID: id });
      userType = "admin";
    } else {
      return res.status(400).json({ msg: "Invalid ID format." });
    }

    if (!user || user.password !== password)
      return res.status(400).json({ msg: "Invalid credentials." });

    res.json({ msg: "Login successful", userType });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

export default router;
