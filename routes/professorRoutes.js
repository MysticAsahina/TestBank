import express from "express";
import Professor from "../models/Professor.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { fullName, professorID, email, password } = req.body;

    const exists = await Professor.findOne({ $or: [{ email }, { professorID }] });
    if (exists) return res.status(400).json({ msg: "Email or Professor ID already exists." });

    const newProfessor = new Professor({ fullName, professorID, email, password });
    await newProfessor.save();

    res.json({ msg: "Professor registered successfully." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

export default router;
