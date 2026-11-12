import mongoose from "mongoose";
import { z } from "zod";

export const jobIdSchema = z.object({
  id: z.string().refine((value) => mongoose.isValidObjectId(value), "Invalid job identifier")
}).strict();

export const jobSchema = z.object({
  title: z.string().trim().min(3).max(120),
  company: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  type: z.enum(["internship", "full-time", "part-time", "contract"]),
  workplace: z.enum(["onsite", "hybrid", "remote"]).default("onsite"),
  description: z.string().trim().min(20).max(8000),
  requirements: z.string().trim().max(4000).default(""),
  experienceLevel: z.enum(["entry", "intermediate", "any"]).default("entry"),
  stipend: z.union([
    z.literal(""),
    z.coerce.number().int().positive().max(100_000_000)
  ]).optional().transform((value) => value === "" || value === undefined ? null : value),
  closingDate: z.union([z.literal(""), z.coerce.date()]).optional().transform((value) => value || null)
}).strict();

export const moderationSchema = z.object({
  status: z.enum(["approved", "rejected"])
}).strict();

export const applySchema = z.object({
  coverLetter: z.string().trim().max(3000).default(""),
  resumeUrl: z.union([z.literal(""), z.string().url().max(500)]).default("")
}).strict();
