import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ""
  },
  status: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
    index: true
  },
  dueDate: {
    type: Date,
    default: null
  }
}, { timestamps: true });

taskSchema.index({ owner: 1, createdAt: -1 });

export const Task = mongoose.model("Task", taskSchema);
