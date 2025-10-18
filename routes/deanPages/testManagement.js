import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import Test from "../../models/Test.js";

const router = express.Router();

// Upload folder setup
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

// Render tests
router.get("/", async (req, res) => {
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

// Upload test image
router.post("/upload", uploadFiles.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  res.json({ url: `/TestImages/${req.file.filename}` });
});

// ====================== Fetch Test Details ======================
router.get("/:id", async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate("createdBy", "firstName lastName")
      .lean();

    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    // Format name
    test.createdByName = test.createdBy
      ? `${test.createdBy.lastName}, ${test.createdBy.firstName}`
      : "Unknown";

    res.json(test);
  } catch (err) {
    console.error("❌ Error fetching test details:", err);
    res.status(500).json({ message: "Failed to fetch test details" });
  }
});

// Create test
router.post("/create", uploadFiles.array("questionFiles"), async (req, res) => {
  try {
    const { title, subjectCode, description, access = "Private", timeLimit, deadline, questions } = req.body;
    let parsedQuestions = [];
    try {
      parsedQuestions = typeof questions === "string"
        ? JSON.parse(questions)
        : Array.isArray(questions)
        ? questions
        : [];
    } catch (err) {
      console.error("⚠️ Failed to parse questions JSON:", err);
      parsedQuestions = [];
    }


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
    res.redirect("/dean/tests");
  } catch (err) {
    console.error("❌ Error creating test:", err);
    res.status(500).send("Failed to create test");
  }
});

// Delete test
router.post("/delete/:id", async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    res.redirect("/dean/tests");
  } catch (err) {
    console.error("❌ Error deleting test:", err);
    res.status(500).send("Failed to delete test");
  }
});

export default router;
