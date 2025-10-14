// models/Test.js
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  text: String,
  type: String,
  points: Number,
  choices: [String],
  correctAnswer: String,
  answer: String,
  answers: [String],
  files: [String]
});

const testSchema = new mongoose.Schema({
  title: String,
  subjectCode: String,
  description: String,
  timeLimit: Number,
  deadline: Date,
  access: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  questions: [questionSchema]
});

export default mongoose.model("Test", testSchema);
