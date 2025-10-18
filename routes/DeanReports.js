import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route GET /dean/reports
 * @desc Display reports page for Dean
 * @access Dean only
 */
router.get(
  "/",
  requireAuth,
  requireRole("Dean"),
  async (req, res) => {
    try {
      // Example placeholder data (replace later with actual database queries)
      const reports = [
        { id: 1, title: "Monthly Performance Summary", date: "Oct 2025", status: "Generated" },
        { id: 2, title: "Test Participation Overview", date: "Sep 2025", status: "Generated" },
        { id: 3, title: "Student Progress Comparison", date: "Aug 2025", status: "Archived" },
      ];

      res.render("dean/Reports", {
        title: "Dean Reports",
        user: req.session.user, // ✅ So user info is available to EJS
        reports,
      });
    } catch (err) {
      console.error("Error loading Dean Reports:", err);
      res.status(500).send("Server Error");
    }
  }
);

export default router;
