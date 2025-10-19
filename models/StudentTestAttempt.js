// new file - models/StudentTestAttempt.js
import mongoose from "mongoose";

const StudentTestAttemptSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  score: { type: Number, required: true, default: 0 },
  passed: { type: Boolean, required: true, default: false },
  takenAt: { type: Date, default: Date.now }
});

export default mongoose.model("StudentTestAttempt", StudentTestAttemptSchema);