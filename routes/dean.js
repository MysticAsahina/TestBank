import express from "express";
import path from "path";
import Admin from "../models/Admin.js"; // Dean/Professor accounts
import Test from "../models/Test.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendPasswordSetupEmail } from "../utils/passwordResetService.js";
import multer from "multer";
import fs from "fs";

const router = express.Router();

// ====================== Multer Setup ======================
const UPLOAD_DIR = path.join("public", "TestImages");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadFiles = multer({ storage });

// ====================== Middleware ======================
router.use(requireAuth);
router.use(requireRole(["Dean"]));

// ====================== Dean Dashboard ======================
router.get("/dashboard", (req, res) => {
  res.render("dean/Dashboard", {
    title: "Dean Dashboard",
    user: req.session.user,
  });
});

// ====================== Manage Accounts ======================
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

router.post("/add-user", async (req, res) => {
  try {
    const { firstName, lastName, middleName, email, contactNumber, employeeID, department, role } = req.body;

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

// ====================== Test Management ======================

// Upload single file
router.post("/tests/upload", uploadFiles.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const fileUrl = `/TestImages/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (err) {
    console.error("❌ Error uploading file:", err);
    res.status(500).json({ message: "Failed to upload file" });
  }
});

// Render all tests
router.get("/tests", async (req, res) => {
  try {
    const tests = await Test.find()
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    tests.forEach((t) => {
      t.createdByName = t.createdBy
        ? `${t.createdBy.lastName || ""}, ${t.createdBy.firstName || ""}`.trim()
        : req.session.user?.fullName || "Unknown";
    });

    res.render("dean/Tests", {
      title: "Test Management",
      user: req.session.user,
      tests,
    });
  } catch (err) {
    console.error("❌ Error loading tests:", err);
    res.status(500).send("Failed to load tests");
  }
});

// Get test by ID (JSON for edit)
router.get("/tests/:id", async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  } catch (err) {
    console.error("❌ Error fetching test:", err);
    res.status(500).json({ message: "Server error while fetching test" });
  }
});

// Create new test
router.post("/tests/create", uploadFiles.array("questionFiles"), async (req, res) => {
  try {
    const { title, subjectCode, description, access = "Private", timeLimit, deadline, questions } = req.body;

    const parsedQuestions = questions
      ? Array.isArray(questions)
        ? questions
        : JSON.parse(questions)
      : [];

    if (req.files) {
      req.files.forEach((file, idx) => {
        if (!parsedQuestions[idx].files) parsedQuestions[idx].files = [];
        parsedQuestions[idx].files.push(`TestImages/${file.filename}`);
      });
    }

    const newTest = new Test({
      title,
      subjectCode,
      description,
      access,
      timeLimit: timeLimit ? Number(timeLimit) : undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      questions: parsedQuestions,
      createdBy: req.session.user?.id,
    });

    await newTest.save();
    console.log("✅ New Test created:", newTest._id);
    res.redirect("/dean/tests");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to create test");
  }
});

// Update existing test
router.put("/tests/:id", uploadFiles.array("questionFiles"), async (req, res) => {
  try {
    const testId = req.params.id;
    let { title, subjectCode, description, access, timeLimit, deadline, questions } = req.body;

    let parsedQuestions = questions
      ? Array.isArray(questions)
        ? questions
        : JSON.parse(questions)
      : [];

    if (req.files) {
      req.files.forEach((file) => {
        const idx = parseInt(file.fieldname.split("_")[1]);
        if (!parsedQuestions[idx].files) parsedQuestions[idx].files = [];
        parsedQuestions[idx].files.push(`TestImages/${file.filename}`);
        parsedQuestions[idx].text = parsedQuestions[idx].text || "";
      });
    }

    const updated = await Test.findByIdAndUpdate(
      testId,
      { title, subjectCode, description, access, timeLimit, deadline, questions: parsedQuestions, updatedAt: new Date() },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Test not found" });
    res.json({ message: "Test updated successfully", test: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while updating test" });
  }
});

// Delete test
router.post("/tests/delete/:id", async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    console.log(`🗑️ Test deleted: ${req.params.id}`);
    res.redirect("/dean/tests");
  } catch (err) {
    console.error("❌ Error deleting test:", err);
    res.status(500).send("Failed to delete test");
  }
});

export default router;
