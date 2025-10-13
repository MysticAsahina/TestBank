// C:\Users\Acer\P3Finals\P3\index.js

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import adminRoutes from './routes/adminRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import professorRoutes from './routes/professorRoutes.js';
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================
// Middleware
// ========================
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, "public")));

// ========================
// EJS Setup
// ========================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ========================
// MongoDB Connection
// ========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// ========================
// API Routes
// ========================
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/professor', professorRoutes);
app.use("/api/auth", authRoutes);

// ========================
// Landing Page Route
// ========================
app.get("/", (req, res) => {
  res.render("landingpage"); // looks for views/landingpage.ejs
});

// Login Page
app.get("/login", (req, res) => {
  res.render("login");
});

// Register Page
app.get('/register', (req, res) => {
  res.render('register');
});


// ========================
// Start Server
// ========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
