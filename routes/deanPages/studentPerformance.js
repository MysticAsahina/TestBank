// routes/dean/studentPerformance.js
import express from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, requireRole("Dean"), async (req, res) => {
  try {
    // Example data (you can replace later)
    const stats = {
      overallAverage: 85,
      topPerformance: 92,
      needImprovement: 15,
      completionRate: 78,
    };

    const students = [
      { name: "Juan Dela Cruz", avgScore: 92 },
      { name: "Maria Santos", avgScore: 85 },
    ];

    res.render("dean/StudentPerformance", {
      title: "Student Performance",
      user: req.session.user,
      stats,
      students,
    });
  } catch (err) {
    console.error("Error rendering StudentPerformance:", err);
    res.status(500).send("Server Error");
  }
});

export default router;
