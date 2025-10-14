import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Ensure the upload directory exists
const UPLOAD_DIR = path.join('public', 'TestImages');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// POST /upload -> upload a single file
router.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Return the URL for frontend
    const fileUrl = `/TestImages/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (err) {
    console.error("❌ Error uploading file:", err);
    res.status(500).json({ message: "Failed to upload file" });
  }
});

// POST /uploads -> upload multiple files
router.post("/uploads", upload.array("files"), (req, res) => {
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

export default router;
