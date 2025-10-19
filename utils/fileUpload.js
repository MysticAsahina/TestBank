import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Ensure all required upload directories exist
const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };

const UPLOAD_ROOT = path.join('public');
const TEST_IMAGES = path.join(UPLOAD_ROOT, 'TestImages');
const QUESTION_FILES = path.join(UPLOAD_ROOT, 'QuestionFile');
const CORRECT_FILES = path.join(UPLOAD_ROOT, 'CorrectFile');
const INCORRECT_FILES = path.join(UPLOAD_ROOT, 'IncorrectFile');

ensureDir(TEST_IMAGES);
ensureDir(QUESTION_FILES);
ensureDir(CORRECT_FILES);
ensureDir(INCORRECT_FILES);

// generic multer storage factory
const storageFor = (destDir) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, destDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Single upload handlers for three types
const uploadQuestion = multer({ storage: storageFor(QUESTION_FILES) }).single('file');
const uploadCorrect = multer({ storage: storageFor(CORRECT_FILES) }).single('file');
const uploadIncorrect = multer({ storage: storageFor(INCORRECT_FILES) }).single('file');

// For backwards compatibility
const storageDefault = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEST_IMAGES),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadDefault = multer({ storage: storageDefault });

// POST /upload -> original behavior (TestImages)
router.post("/upload", uploadDefault.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const fileUrl = `/TestImages/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (err) {
    console.error("❌ Error uploading file:", err);
    res.status(500).json({ message: "Failed to upload file" });
  }
});

// POST /uploads -> original multiple files (TestImages)
router.post("/uploads", uploadDefault.array("files"), (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: "No files uploaded" });

    const urls = req.files.map(f => `/TestImages/${f.filename}`);
    res.json({ urls });
  } catch (err) {
    console.error("❌ Error uploading files:", err);
    res.status(500).json({ message: "Failed to upload files" });
  }
});

// POST /upload/question -> saves to public/QuestionFile/
router.post("/upload/question", (req, res) => {
  uploadQuestion(req, res, (err) => {
    if (err) {
      console.error("❌ Error uploading question file:", err);
      return res.status(500).json({ message: "Failed to upload question file" });
    }
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: `/QuestionFile/${req.file.filename}` });
  });
});

// POST /upload/correct -> saves to public/CorrectFile/
router.post("/upload/correct", (req, res) => {
  uploadCorrect(req, res, (err) => {
    if (err) {
      console.error("❌ Error uploading correct feedback file:", err);
      return res.status(500).json({ message: "Failed to upload correct feedback file" });
    }
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: `/CorrectFile/${req.file.filename}` });
  });
});

// POST /upload/incorrect -> saves to public/IncorrectFile/
router.post("/upload/incorrect", (req, res) => {
  uploadIncorrect(req, res, (err) => {
    if (err) {
      console.error("❌ Error uploading incorrect feedback file:", err);
      return res.status(500).json({ message: "Failed to upload incorrect feedback file" });
    }
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: `/IncorrectFile/${req.file.filename}` });
  });
});

export default router;