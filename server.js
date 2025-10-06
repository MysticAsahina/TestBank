import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

import studentRoutes from "./routes/studentRoutes.js";
import professorRoutes from "./routes/professorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Resolve directory path for views and public assets
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// EJS View Setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// Routes
app.use("/api/student", studentRoutes);
app.use("/api/professor", professorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);

// EJS Pages
// EJS Pages
app.get("/", (req, res) => res.render("LandingPage"));
app.get("/login", (req, res) => res.render("Login"));
app.get("/register/student", (req, res) => res.render("registerStudent"));
app.get("/register/professor", (req, res) => res.render("registerProfessor"));
app.get("/register/admin", (req, res) => res.render("registerAdmin"));


// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
