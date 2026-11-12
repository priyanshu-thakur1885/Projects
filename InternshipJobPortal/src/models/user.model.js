import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, select: false, minlength: 8 },
  role: { type: String, enum: ["student", "recruiter", "admin"], default: "student" },
  phone: { type: String, trim: true, maxlength: 30, default: "" },
  location: { type: String, trim: true, maxlength: 120, default: "" },
  headline: { type: String, trim: true, maxlength: 160, default: "" },
  resumeUrl: { type: String, trim: true, maxlength: 500, default: "" },
  skills: { type: [String], default: [] },
  education: { type: String, trim: true, maxlength: 1000, default: "" },
  experience: { type: String, trim: true, maxlength: 2000, default: "" },
  companyName: { type: String, trim: true, maxlength: 120, default: "" },
  companyWebsite: { type: String, trim: true, maxlength: 500, default: "" },
  companyDescription: { type: String, trim: true, maxlength: 2000, default: "" }
}, { timestamps: true });

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this.id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    location: this.location,
    headline: this.headline,
    resumeUrl: this.resumeUrl,
    skills: this.skills,
    education: this.education,
    experience: this.experience,
    companyName: this.companyName,
    companyWebsite: this.companyWebsite,
    companyDescription: this.companyDescription
  };
};

export const User = mongoose.model("User", userSchema);
