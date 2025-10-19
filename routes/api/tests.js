// updated file - routes/api/tests.js
import express from "express";
import mongoose from "mongoose";
import Test from "../../models/Test.js";
import StudentTestAttempt from "../../models/StudentTestAttempt.js";

const router = express.Router();

// Helper: compute maximum possible points for `howMany` questions (take top-N question points)
function maxPointsForHowMany(questions = [], howMany = 0) {
  const points = (questions || []).map(q => Number(q.points || 0)).sort((a,b) => b - a);
  return points.slice(0, howMany).reduce((s, p) => s + p, 0);
}

// Normalize question payload (ensures correctAnswer shape fits question.type)
function normalizeQuestions(questions = []) {
  return questions.map(q => {
    const question = { ...q };

    // Ensure numeric points
    question.points = Number(question.points || 0);

    if (question.type === "multiple") {
      // Ensure choices is array
      question.choices = Array.isArray(question.choices) ? question.choices : (question.choices ? [question.choices] : []);
      // Ensure correctAnswer is array (allow single selection wrapped)
      if (Array.isArray(question.correctAnswer)) {
        question.correctAnswer = question.correctAnswer;
      } else if (question.correctAnswer === undefined || question.correctAnswer === null || question.correctAnswer === "") {
        question.correctAnswer = [];
      } else {
        question.correctAnswer = [String(question.correctAnswer)];
      }
    } else {
      // For other types, store correctAnswer as string if provided as array of one
      if (Array.isArray(question.correctAnswer)) {
        question.correctAnswer = question.correctAnswer.length ? String(question.correctAnswer[0]) : undefined;
      }
    }

    // Ensure answers/choices arrays exist to avoid undefined in DB
    if (!Array.isArray(question.answers)) question.answers = Array.isArray(q.answers) ? q.answers : [];
    if (!Array.isArray(question.files)) question.files = Array.isArray(q.files) ? q.files : [];

    // Ensure feedback objects exist
    question.feedbackWhenCorrect = question.feedbackWhenCorrect || {};
    question.feedbackWhenIncorrect = question.feedbackWhenIncorrect || {};

    return question;
  });
}

// Create a test
router.post("/tests", async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.title || !payload.subjectCode) {
      return res.status(400).json({ message: "title and subjectCode are required" });
    }

    const questions = Array.isArray(payload.questions) ? normalizeQuestions(payload.questions) : [];
    const totalQuestions = questions.length;
    const howManyQuestions = Number(payload.howManyQuestions || 0);

    if (howManyQuestions <= 0) {
      return res.status(400).json({ message: "howManyQuestions must be greater than 0" });
    }

    if (howManyQuestions > totalQuestions) {
      return res.status(400).json({ message: "howManyQuestions cannot be more than total questions" });
    }

    const maxPoints = maxPointsForHowMany(questions, howManyQuestions);
    const passingPoints = Number(payload.passingPoints || 0);
    if (passingPoints > maxPoints) {
      return res.status(400).json({ message: `passingPoints cannot exceed maximum possible points (${maxPoints}) for howManyQuestions=${howManyQuestions}` });
    }

    const testDoc = new Test({
      title: payload.title,
      subjectCode: payload.subjectCode,
      description: payload.description || "",
      timeLimit: payload.timeLimit,
      deadline: payload.deadline ? new Date(payload.deadline) : undefined,
      access: payload.access || "Private",
      howManyQuestions: howManyQuestions,
      passingPoints: passingPoints,
      assignedSections: Array.isArray(payload.assignedSections) ? payload.assignedSections : [],
      prerequisites: Array.isArray(payload.prerequisites) ? payload.prerequisites : [],
      questions,
      createdBy: payload.createdBy
    });

    await testDoc.save();
    res.status(201).json(testDoc);
  } catch (err) {
    console.error("❌ Error creating test:", err);
    res.status(500).json({ message: "Server error", error: (err && err.message) ? err.message : String(err) });
  }
});

// List tests
router.get("/tests", async (req, res) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 }).lean();
    res.json(tests);
  } catch (err) {
    console.error("❌ Error listing tests:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single test
router.get("/tests/:id", async (req, res) => {
  try {
    const t = await Test.findById(req.params.id).lean();
    if (!t) return res.status(404).json({ message: "Test not found" });
    res.json(t);
  } catch (err) {
    console.error("❌ Error getting test:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update test
router.put("/tests/:id", async (req, res) => {
  try {
    const payload = req.body;
    const questions = Array.isArray(payload.questions) ? normalizeQuestions(payload.questions) : [];
    const totalQuestions = questions.length;
    const howManyQuestions = Number(payload.howManyQuestions || 0);

    if (howManyQuestions <= 0) {
      return res.status(400).json({ message: "howManyQuestions must be greater than 0" });
    }
    if (howManyQuestions > totalQuestions) {
      return res.status(400).json({ message: "howManyQuestions cannot be more than total questions" });
    }

    const maxPoints = maxPointsForHowMany(questions, howManyQuestions);
    const passingPoints = Number(payload.passingPoints || 0);
    if (passingPoints > maxPoints) {
      return res.status(400).json({ message: `passingPoints cannot exceed maximum possible points (${maxPoints}) for howManyQuestions=${howManyQuestions}` });
    }

    const updated = await Test.findByIdAndUpdate(req.params.id, {
      title: payload.title,
      subjectCode: payload.subjectCode,
      description: payload.description || "",
      timeLimit: payload.timeLimit,
      deadline: payload.deadline ? new Date(payload.deadline) : undefined,
      access: payload.access || "Private",
      howManyQuestions: howManyQuestions,
      passingPoints: passingPoints,
      assignedSections: Array.isArray(payload.assignedSections) ? payload.assignedSections : [],
      prerequisites: Array.isArray(payload.prerequisites) ? payload.prerequisites : [],
      questions,
      updatedAt: new Date()
    }, { new: true });

    if (!updated) return res.status(404).json({ message: "Test not found" });
    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating test:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete test
router.delete("/tests/:id", async (req, res) => {
  try {
    const removed = await Test.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: "Test not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("❌ Error deleting test:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Check eligibility for a student to take a test based on prerequisites.
 *
 * POST /api/tests/:id/check-eligibility
 * Body options:
 *  - { studentId: "<studentObjectId>" }
 *    Server will look up StudentTestAttempt documents for that student.
 *  - { completedTests: [{ testId: "<id>", passed: true|false, score?: number }, ...] }
 *    Use this to check client-side known completions without server attempts.
 *
 * Response:
 *  - { eligible: true }
 *  - { eligible: false, missing: ["<prereqTestId>", ...] }
 */
router.post("/tests/:id/check-eligibility", async (req, res) => {
  try {
    const testId = req.params.id;
    const t = await Test.findById(testId).lean();
    if (!t) return res.status(404).json({ message: "Test not found" });

    const prereqs = Array.isArray(t.prerequisites) ? t.prerequisites.map(String) : [];

    if (prereqs.length === 0) {
      return res.json({ eligible: true });
    }

    // Gather passed prerequisites based on provided data
    let passedSet = new Set();

    // Option A: client provided completedTests array
    if (Array.isArray(req.body.completedTests)) {
      req.body.completedTests.forEach(ct => {
        if (ct && (ct.passed === true || ct.passed === "true")) {
          passedSet.add(String(ct.testId));
        } else if (typeof ct.score === "number" && ct.score >= 0 && ct.pass === true) { // legacy
          passedSet.add(String(ct.testId));
        }
      });
    }

    // Option B: server-side lookup by studentId
    if (req.body.studentId) {
      try {
        const attempts = await StudentTestAttempt.find({
          student: req.body.studentId,
          test: { $in: prereqs }
        }).lean();

        attempts.forEach(a => {
          if (a.passed) passedSet.add(String(a.test));
        });
      } catch (err) {
        console.warn("⚠️ Warning while looking up attempts for studentId:", err);
      }
    }

    // Determine missing prerequisites
    const missing = prereqs.filter(p => !passedSet.has(String(p)));

    if (missing.length === 0) {
      return res.json({ eligible: true });
    }

    return res.json({ eligible: false, missing });
  } catch (err) {
    console.error("❌ Error checking eligibility:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;