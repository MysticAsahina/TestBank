import express from "express";
import Section from "../../models/Section.js";

const router = express.Router();

// GET /dean/sections - Display sections page
router.get("/", async (req, res) => {
  try {
    // For now, using static data - later we'll fetch from database
    const sections = []; // Empty array for now since we're using static frontend
    
    res.render("dean/Sections", {
      title: "Sections Management",
      user: req.user || { fullName: "Dean User" }, // Fallback for static data
      sections: sections
    });
  } catch (error) {
    console.error("Error loading sections page:", error);
    res.status(500).render("Error", {
      message: "Error loading sections page",
      error: {}
    });
  }
});

// POST /dean/sections/create - Create new section (static version)
router.post("/create", async (req, res) => {
  try {
    // For static implementation, just return success
    // In real implementation, we would save to database
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

// GET /dean/sections/list - Get all sections (static version)
router.get("/list", async (req, res) => {
  try {
    // Static sample data for demonstration
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
    
    res.json({
      success: true,
      sections: sections
    });
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sections"
    });
  }
});

export default router;