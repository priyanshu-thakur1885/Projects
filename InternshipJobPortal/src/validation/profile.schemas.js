import { z } from "zod";

const text = (max) => z.string().trim().max(max).optional();

export const profileSchema = z.object({
  phone: text(30),
  location: text(120),
  headline: text(160),
  resumeUrl: z.union([z.literal(""), z.string().url().max(500)]).optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  education: text(1000),
  experience: text(2000),
  companyName: text(120),
  companyWebsite: z.union([z.literal(""), z.string().url().max(500)]).optional(),
  companyDescription: text(2000)
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one profile field");
