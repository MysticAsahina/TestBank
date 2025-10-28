import express from 'express';
import Section from '../models/Section.js';
import Student from '../models/Student.js';
import TestAssignment from '../models/TestAssignment.js';
import Test from '../models/Test.js';

const router = express.Router();

// Get all sections
router.get('/sections', async (req, res) => {
  try {
    const sections = await Section.find()
      .populate('students', 'studentID firstName lastName middleName course yearLevel')
      .populate('createdBy', 'fullName');
    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single section
router.get('/sections/:id', async (req, res) => {
  try {
    const section = await Section.findById(req.params.id)
      .populate('students', 'studentID firstName lastName middleName course yearLevel');
    res.json(section);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new section
router.post('/sections', async (req, res) => {
  try {
    const { name, course, yearLevel, studentIds } = req.body;
    
    const section = new Section({
      name,
      course,
      yearLevel,
      students: studentIds || [],
      createdBy: req.session.user._id
    });

    await section.save();
    await section.populate('students', 'studentID firstName lastName middleName course yearLevel');
    
    res.status(201).json(section);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update section
router.put('/sections/:id', async (req, res) => {
  try {
    const { name, course, yearLevel, studentIds } = req.body;
    
    const section = await Section.findByIdAndUpdate(
      req.params.id,
      { name, course, yearLevel, students: studentIds },
      { new: true, runValidators: true }
    ).populate('students', 'studentID firstName lastName middleName course yearLevel');

    res.json(section);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete section
router.delete('/sections/:id', async (req, res) => {
  try {
    // Remove all test assignments for this section
    await TestAssignment.deleteMany({ section: req.params.id });
    
    await Section.findByIdAndDelete(req.params.id);
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get students not in section
router.get('/sections/:id/available-students', async (req, res) => {
  try {
    const section = await Section.findById(req.params.id);
    const students = await Student.find({
      _id: { $nin: section.students },
      course: section.course,
      yearLevel: section.yearLevel
    }).select('studentID firstName lastName middleName course yearLevel');
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assign test to section
router.post('/tests/:testId/assign', async (req, res) => {
  try {
    const { sectionId } = req.body;
    
    // Check if assignment already exists
    const existingAssignment = await TestAssignment.findOne({
      test: req.params.testId,
      section: sectionId
    });
    
    if (existingAssignment) {
      return res.status(400).json({ message: 'Test is already assigned to this section' });
    }
    
    const assignment = new TestAssignment({
      test: req.params.testId,
      section: sectionId,
      assignedBy: req.session.user._id
    });

    await assignment.save();
    
    // Add assignment to test
    await Test.findByIdAndUpdate(
      req.params.testId,
      { $push: { assignments: assignment._id } }
    );

    res.status(201).json({ message: 'Test assigned successfully', assignment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove test assignment
router.delete('/tests/:testId/assignments/:assignmentId', async (req, res) => {
  try {
    await TestAssignment.findByIdAndDelete(req.params.assignmentId);
    
    // Remove assignment from test
    await Test.findByIdAndUpdate(
      req.params.testId,
      { $pull: { assignments: req.params.assignmentId } }
    );

    res.json({ message: 'Assignment removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get test assignments
router.get('/tests/:testId/assignments', async (req, res) => {
  try {
    const assignments = await TestAssignment.find({ test: req.params.testId })
      .populate('section', 'name course yearLevel')
      .populate('assignedBy', 'fullName');
    
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;