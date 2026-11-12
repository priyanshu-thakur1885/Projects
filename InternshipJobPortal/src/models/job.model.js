import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  company: { type: String, required: true, trim: true, maxlength: 120 },
  location: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ["internship", "full-time", "part-time", "contract"], required: true },
  workplace: { type: String, enum: ["onsite", "hybrid", "remote"], default: "onsite" },
  description: { type: String, required: true, trim: true, maxlength: 8000 },
  requirements: { type: String, trim: true, maxlength: 4000, default: "" },
  experienceLevel: { type: String, enum: ["entry", "intermediate", "any"], default: "entry" },
  stipend: { type: Number, min: 1, default: null },
  closingDate: { type: Date, default: null },
  moderationStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  moderatedAt: { type: Date, default: null },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

jobSchema.index({ moderationStatus: 1, createdAt: -1 });
jobSchema.index({ recruiter: 1, createdAt: -1 });

export const Job = mongoose.model("Job", jobSchema);
