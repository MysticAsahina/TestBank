import mongoose from "mongoose";
import { act } from "react";

const adminSchema = new mongoose.Schema({
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  employeeID: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  designation: { 
    type: String, 
    required: true,
    enum: ['Professor', 'Dean']  // Make sure Dean is included
  },
  employmentStatus: {
    type: String,
    required: true,
    enum: ['Full-time', 'Part-time', 'Contractual']
  },
  password: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ['Professor', 'Dean']  // Make sure Dean is included here too
  },
  accountStatus: {
    type: String,
    required: true,
    default: 'Active',
    enum: ['Active', 'Inactive', 'Suspended']
  },
  
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  resetToken: String,
  resetTokenExpiry: Date,

});

adminSchema.virtual('fullName').get(function() {
  return `${this.lastName}, ${this.firstName} ${this.middleName}`.trim();
});

adminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Admin", adminSchema);

