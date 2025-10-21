import mongoose from "mongoose";

const questionResultSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  questionText: { type: String, required: true },
  questionType: { type: String, required: true },
  studentAnswer: { type: mongoose.Schema.Types.Mixed }, // Can be string, array, etc.
  correctAnswer: { type: mongoose.Schema.Types.Mixed },
  isCorrect: { type: Boolean, required: true },
  pointsEarned: { type: Number, required: true },
  maxPoints: { type: Number, required: true },
  feedback: {
    text: { type: String, default: "" },
    file: { type: String, default: "" }
  }
}, { _id: false });

const StudentTestAttemptSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  score: { type: Number, required: true, default: 0 },
  passed: { type: Boolean, required: true, default: false },
  questionResults: [questionResultSchema],
  takenAt: { type: Date, default: Date.now }
});

export default mongoose.model("StudentTestAttempt", StudentTestAttemptSchema);