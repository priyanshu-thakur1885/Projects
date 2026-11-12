import { z } from "zod";

const emailSchema = z.string().trim().email("Enter a valid email address").max(254).transform((email) => email.toLowerCase());

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  role: z.enum(["student", "recruiter"]).default("student")
}).strict();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(72)
}).strict();
