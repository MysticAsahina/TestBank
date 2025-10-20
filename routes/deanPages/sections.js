import express from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const router = express.Router();

// GET /dean/sections - Display sections page
router.get("/", requireAuth, requireRole(["Dean", "Professor"]), async (req, res) => {
  try {
    const user = req.session.user;

    res.render("dean/Sections", {
      title: "Sections Management",
      user,
      sections: [] // still static for now
    });
  } catch (error) {
    console.error("Error loading sections page:", error);
    res.status(500).render("Error", {
      message: "Error loading sections page",
      error: {}
    });
  }
});

// POST /dean/sections/create - Create new section (Dean only)
router.post("/create", requireAuth, requireRole("Dean"), async (req, res) => {
  try {
    console.log("Section creation data:", req.body);
    res.json({
      success: true,
      message: "Section created successfully (static implementation)"
    });
  } catch (error) {
    console.error("Error creating section:", error);
    res.status(500).json({
      success: false,
      message: "Error creating section"
    });
  }
});

// GET /dean/sections/list - Get all sections (Dean+Professor)
router.get("/list", requireAuth, requireRole(["Dean", "Professor"]), async (req, res) => {
  try {
    const sections = [
      {
        _id: "1",
        sectionName: "Section A",
        schoolYear: "2025-2026",
        course: "BSIT",
        students: [
          { studentId: "2021001", name: "John Smith" },
          { studentId: "2021002", name: "Maria Garcia" }
        ],
        createdAt: new Date()
      },
      {
        _id: "2",
        sectionName: "Section B",
        schoolYear: "2025-2026",
        course: "BSCS",
        students: [
          { studentId: "2021003", name: "David Johnson" },
          { studentId: "2021004", name: "Sarah Wilson" }
        ],
        createdAt: new Date()
      }
    ];

    res.json({ success: true, sections });
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sections"
    });
  }
});

export default router;
