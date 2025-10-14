import express from "express";
import Admin from "../models/Admin.js";
import nodemailer from "nodemailer";
import Test from "../models/Test.js";

const router = express.Router();
const otpStore = {};

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

router.post("/register", async (req, res) => {
  try {
    const { fullName, adminID, email, password } = req.body;

    // check duplicates
    const exists = await Admin.findOne({ $or: [{ email }, { adminID }] });
    if (exists) {
      return res.status(400).json({ msg: "Email or Admin ID already exists." });
    }

    // directly create admin (skip otp)
    const newAdmin = new Admin({ fullName, adminID, email, password });
    await newAdmin.save();

    res.json({ msg: "Admin registered successfully (OTP skipped for testing)." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error during registration." });
  }
});
router.post("/verify", async (req, res) => {
  const { email, otp } = req.body;

  if (!otpStore[email]) return res.status(400).json({ msg: "OTP not found or expired." });
  if (otpStore[email].otp === parseInt(otp)) {
    const data = otpStore[email].data;
    const newAdmin = new Admin(data);
    await newAdmin.save();
    delete otpStore[email];
    res.json({ msg: "Admin account verified and created successfully!" });
  } else {
    res.status(400).json({ msg: "Invalid OTP." });
  }
});
router.get("/dean/tests", async (req, res) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 });
    res.render("dean-tests", { tests });
  } catch (err) {
    console.error("❌ Error loading test list:", err);
    res.status(500).send("Failed to load tests.");
  }
});
export default router;
