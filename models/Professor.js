import mongoose from "mongoose"

const professorSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  professorID: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true })

export default mongoose.model("Professor", professorSchema);

