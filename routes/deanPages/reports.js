import express from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const router = express.Router();

/**
 * @route GET /dean/reports
 * @desc Display the Dean reports page
 * @access Dean only
 */
router.get("/", requireAuth, requireRole("Dean"), async (req, res) => {
  try {
    // Example placeholder report data
    const reports = [
      { id: 1, title: "Overall Performance Summary", date: "2025-10-10" },
      { id: 2, title: "Department Progress Overview", date: "2025-09-25" },
      { id: 3, title: "Exam Completion Statistics", date: "2025-09-01" },
    ];

    res.render("dean/Reports", {
      title: "Reports",
      user: req.session.user,
      reports,
    });
  } catch (err) {
    console.error("❌ Error loading reports:", err);
    res.status(500).send("Server Error");
  }
});

export default router;
