import mongoose from "mongoose";

const studentSubSchema = new mongoose.Schema({
  id: { type: String },         // external id or local identifier
  name: { type: String, required: true },
  studentId: { type: String }   // school-provided student number (e.g. 2021001)
}, { _id: false });

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true },          // e.g. "BSIT3-A" or "1" — your app can compose it
  schoolYear: { type: String, required: true },    // "2024-2025"
  course: { type: String, required: true },        // "BSIT"
  campus: { type: String, default: "Main" },
  students: [studentSubSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Section", sectionSchema);