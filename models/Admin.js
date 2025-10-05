import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  adminID: { type: String, required: true, unique: true }, // match your route's adminID
  password: { type: String, required: true },
  email: { type: String, required: true },
});

// Export as default
const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
