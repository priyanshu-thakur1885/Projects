import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  coverLetter: { type: String, trim: true, maxlength: 3000, default: "" },
  resumeUrl: { type: String, trim: true, maxlength: 500, default: "" },
  status: {
    type: String,
    enum: ["submitted", "shortlisted", "rejected", "accepted"],
    default: "submitted",
    index: true
  }
}, { timestamps: true });

applicationSchema.index({ student: 1, job: 1 }, { unique: true });
applicationSchema.index({ job: 1, createdAt: -1 });

export const Application = mongoose.model("Application", applicationSchema);
