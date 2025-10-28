import express from "express";
import Section from "../../models/Section.js";
import Student from "../../models/Student.js";

const router = express.Router();

/**
 * GET /api/sections
 * List all sections
 */
router.get("/sections", async (req, res) => {
  try {
    const sections = await Section.find().sort({ createdAt: -1 }).lean();
    res.json(sections);
  } catch (err) {
    console.error("Error listing sections:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/sections/:id
 * Get single section
 */
router.get("/sections/:id", async (req, res) => {
  try {
    const s = await Section.findById(req.params.id).lean();
    if (!s) return res.status(404).json({ message: "Section not found" });
    res.json(s);
  } catch (err) {
    console.error("Error getting section:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/sections
 * Create a new section
 * Body:
 *  { name, schoolYear, course, campus, subject, yearLevel, students: [...] }
 */
router.post("/sections", async (req, res) => {
  try {
    const { name, schoolYear, course, campus, subject, yearLevel, students } = req.body;

    // Validate required fields
    if (!name || !schoolYear || !course || !subject || !yearLevel) {
      return res.status(400).json({ 
        message: "name, schoolYear, course, subject, and yearLevel are required" 
      });
    }

    const section = new Section({
      name,
      schoolYear,
      course,
      subject,
      yearLevel,
      campus,
      students: Array.isArray(students) ? students : []
    });

    await section.save();
    res.status(201).json(section);

  } catch (err) {
    console.error("❌ Error creating section:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/sections/:id
 * Update an existing section
 */
router.put("/sections/:id", async (req, res) => {
  try {
    const payload = req.body;
    const update = {
      name: payload.name,
      schoolYear: payload.schoolYear,
      course: payload.course,
      campus: payload.campus,
      students: Array.isArray(payload.students) ? payload.students : [],
      updatedAt: new Date()
    };

    const updated = await Section.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ message: "Section not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error updating section:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/sections/:id
 */
router.delete("/sections/:id", async (req, res) => {
  try {
    const removed = await Section.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: "Section not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Error deleting section:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/students
 * Simple endpoint returning available students (for the modal).
 * You can seed students collection or adapt to your existing Student model/sources.
 * Supports optional ?q=search query to filter by name or studentId.
 */
router.get("/students", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const filter = q ? {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { studentId: { $regex: q, $options: "i" } }
      ]
    } : {};
    const students = await Student.find(filter).limit(200).lean();
    res.json(students);
  } catch (err) {
    console.error("Error listing students:", err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;