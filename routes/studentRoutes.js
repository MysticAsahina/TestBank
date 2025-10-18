import express from "express";
import Student from "../models/Student.js";
import nodemailer from "nodemailer";

const router = express.Router();

// Temporary OTP store
const otpStore = {};

// Email setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your_email@gmail.com",
    pass: "your_app_password",
  },
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: '"P3Finals Verification" <your_email@gmail.com>',
    to: email,
    subject: "Account Verification OTP",
    html: `<h3>Your OTP Code: <b>${otp}</b></h3>`,
  });
};

// Register student
router.post("/register", async (req, res) => {
  try {
    const { fullName, studentID, email, password, course, yearLevel, campus } = req.body;

    const exists = await Student.findOne({ $or: [{ email }, { studentID }] });
    if (exists) return res.status(400).json({ msg: "Email or Student ID already exists." });

    const otp = generateOTP();
    otpStore[email] = { otp, data: { fullName, studentID, email, password, course, yearLevel, campus } };

    await sendOTP(email, otp);
    res.json({ msg: "OTP sent to your email for verification." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Verify student
router.post("/verify", async (req, res) => {
  const { email, otp } = req.body;

  if (!otpStore[email]) return res.status(400).json({ msg: "OTP not found or expired." });
  if (otpStore[email].otp === parseInt(otp)) {
    const data = otpStore[email].data;
    const newStudent = new Student(data);
    await newStudent.save();
    delete otpStore[email];
    res.json({ msg: "Student account verified and created successfully!" });
  } else {
    res.status(400).json({ msg: "Invalid OTP." });
  }
});

export default router;
