import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route GET /dean/student-performance
 * @desc Display student performance dashboard for Dean
 * @access Dean only
 */
router.get(
  "/",
  requireAuth,
  requireRole("Dean"),
  async (req, res) => {
    try {
      // Example placeholder stats — replace with actual database queries later
      const stats = {
        overallAverage: 85,
        topPerformance: 92,
        needImprovement: 15,
        completionRate: 78,
      };

      // Example static data (replace with real results)
      const students = [
        {
          studentId: "01-2324-042431",
          name: "Juan Dela Cruz",
          course: "BS Computer Science",
          testsTaken: 8,
          avgScore: 92,
          bestScore: 98,
          weakAreas: "None",
          progress: 92,
        },
        {
          studentId: "01-2324-042432",
          name: "Maria Santos",
          course: "BS Mathematics",
          testsTaken: 6,
          avgScore: 85,
          bestScore: 92,
          weakAreas: "Algebra",
          progress: 85,
        },
        {
          studentId: "01-2324-042433",
          name: "Pedro Reyes",
          course: "BS Physics",
          testsTaken: 5,
          avgScore: 78,
          bestScore: 85,
          weakAreas: "Thermodynamics",
          progress: 78,
        },
        {
          studentId: "01-2324-042434",
          name: "Ana Lim",
          course: "BS Computer Science",
          testsTaken: 7,
          avgScore: 88,
          bestScore: 95,
          weakAreas: "Data Structures",
          progress: 88,
        },
      ];

      res.render("dean/StudentPerformance", {
        title: "Student Performance",
        user: req.session.user,
        stats,
        students,
      });
    } catch (err) {
      console.error("Error loading student performance:", err);
      res.status(500).send("Server Error");
    }
  }
);

export default router;
