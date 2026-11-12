import mongoose from "mongoose";
import { z } from "zod";

export const applicationIdSchema = z.object({
  id: z.string().refine((value) => mongoose.isValidObjectId(value), "Invalid application identifier")
}).strict();

export const applicationStatusSchema = z.object({
  status: z.enum(["shortlisted", "rejected", "accepted"])
}).strict();
