import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Admin from "../models/Admin.js"; // Assuming Dean and Professor accounts are stored here
import {sendPasswordSetupEmail } from "../utils/passwordResetService.js";
const router = express.Router();

import Test from "../models/Test.js";

// All dean routes require authentication and dean role
router.use(requireAuth);
router.use(requireRole(["Dean"]));

// Dean Dashboard
router.get("/dashboard", (req, res) => {
  res.render("dean/Dashboard", {
    title: "Dean Dashboard",
    user: req.session.user,
  });
});

// Manage Accounts — now fetches Professors & Deans dynamically
router.get("/manage-accounts", async (req, res) => {
  try {
    const professors = await Admin.find({ role: "Professor" }).lean();
    const deans = await Admin.find({ role: "Dean" }).lean();

    res.render("dean/ManageAccounts", {
      title: "Manage Accounts",
      user: req.session.user,
      professors,
      deans,
    });
  } catch (err) {
    console.error("❌ Error loading accounts:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Add new Dean or Professor
router.post("/add-user", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      middleName,
      email,
      contactNumber,
      employeeID,
      department,
      role,
    } = req.body;

    const newUser = new Admin({
      firstName,
      lastName,
      middleName,
      email,
      contactNumber,
      employeeID,
      department,
      role,
      designation: role,
      employmentStatus: "Full-time",
      accountStatus: "Active",
      password: "$2a$12$rypunVcKVCq.aomFTeBGFOD3E9sX62.SoSnLAYxY1Xt/AUg3tORqq", // Default hashed password
      createdBy: req.session.user ? req.session.user.fullName : "System",
    });

    await newUser.save();
    console.log(`✅ New ${role} added: ${employeeID}`);

    // 🔥 Send setup email with OTP link
    await sendPasswordSetupEmail(newUser.email, newUser._id);

    res.redirect("/dean/manage-accounts");
  } catch (err) {
    console.error("❌ Error adding user:", err);
    res.status(500).send("Failed to add user");
  }
});


// Delete Dean or Professor
router.post("/delete/:id", async (req, res) => {
  try {
    await Admin.findByIdAndDelete(req.params.id);
    console.log("🗑️ Account deleted:", req.params.id);
    res.redirect("/dean/manage-accounts");
  } catch (err) {
    console.error("❌ Error deleting account:", err);
    res.status(500).send("Failed to delete account");
  }
});

// GET /dean/tests  -> render tests page with tests data
router.get("/tests", async (req, res) => {
  try {
    const tests = await Test.find()
      .populate("createdBy", "firstName lastName") // optional
      .sort({ createdAt: -1 })
      .lean();

    // Create a readable createdBy name if populated
    tests.forEach(t => {
      if (t.createdBy && (t.createdBy.firstName || t.createdBy.lastName)) {
        t.createdByName = `${t.createdBy.lastName || ""}, ${t.createdBy.firstName || ""}`.trim();
      } else {
        t.createdByName = req.session.user ? req.session.user.fullName : "Unknown";
      }
    });

    res.render("dean/Tests", {
      title: "Test Management",
      user: req.session.user,
      tests,
    });
  } catch (err) {
    console.error("❌ Error loading tests:", err);
    res.status(500).send("Failed to load tests");
  }
});

// ✅ GET /dean/tests/:id -> return one test as JSON for editing
router.get("/tests/:id", async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).lean();

    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    res.json(test);
  } catch (err) {
    console.error("❌ Error fetching test:", err);
    res.status(500).json({ message: "Server error while fetching test" });
  }
});

// ✅ PUT /dean/tests/:id  -> update existing test (including questions)
router.put("/tests/:id", async (req, res) => {
  try {
    const testId = req.params.id;
    const {
      title,
      subjectCode,
      description,
      access,
      timeLimit,
      deadline,
      questions,
    } = req.body;

    const updated = await Test.findByIdAndUpdate(
      testId,
      {
        title,
        subjectCode,
        description,
        access,
        timeLimit,
        deadline,
        questions, // ✅ include questions here
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      console.log(`❌ Test not found for update: ${testId}`);
      return res.status(404).json({ message: "Test not found" });
    }

    console.log(`✅ Test updated successfully: ${testId}`);
    res.json({ message: "Test updated successfully", test: updated });
  } catch (err) {
    console.error("❌ Error updating test:", err);
    res.status(500).json({ message: "Server error while updating test" });
  }
});

// POST /dean/tests/create  -> create a simple test (questions array optional)
router.post("/tests/create", async (req, res) => {
  try {
    // The test form should post these fields. For now we handle top-level fields only.
    const {
      title,
      subjectCode,
      description,
      access = "Private",
      timeLimit,
      deadline
    } = req.body;

    const newTest = new Test({
      title,
      subjectCode,
      description,
      access,
      timeLimit: timeLimit ? Number(timeLimit) : undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      questions: [], // later you can send full questions array from the client
      createdBy: req.session.user ? req.session.user.id : undefined,
    });

    await newTest.save();
    console.log("✅ New Test created:", newTest._id);
    console.log("📝 Incoming test data:", req.body);
    res.redirect("/dean/tests");
  } catch (err) {
    console.error("❌ Error creating test:", err);
    res.status(500).send("Failed to create test");
  }
});

// DELETE /dean/tests/delete/:id  -> delete a test
router.post("/tests/delete/:id", async (req, res) => {
  try {
    const testId = req.params.id;
    await Test.findByIdAndDelete(testId);
    console.log(`🗑️ Test deleted: ${testId}`);
    res.redirect("/dean/tests");
  } catch (err) {
    console.error("❌ Error deleting test:", err);
    res.status(500).send("Failed to delete test");
  }
});

// POST /dean/tests/update/:id  -> update test information
router.post("/tests/update/:id", async (req, res) => {
  try {
    const testId = req.params.id;
    const updateData = req.body;

    // only allow specific fields to be updated
    const allowedFields = ["title", "subjectCode", "description", "access", "timeLimit", "deadline"];
    const filteredData = {};

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) filteredData[field] = updateData[field];
    });

    await Test.findByIdAndUpdate(testId, filteredData, { new: true });
    console.log(`✏️ Test updated: ${testId}`);
    res.redirect("/dean/tests");
  } catch (err) {
    console.error("❌ Error updating test:", err);
    res.status(500).send("Failed to update test");
  }
});

export default router;
