import { Router } from "express";
import {
  createJob,
  listJobs,
  moderateJob,
  moderateJobs,
  updateJob
} from "../controllers/job.controller.js";
import { applyToJob } from "../controllers/application.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { optionalAuth } from "../middleware/optional-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { applySchema, jobIdSchema, jobSchema, moderationSchema } from "../validation/job.schemas.js";

export const jobRouter = Router();

jobRouter.get("/", optionalAuth, asyncHandler(listJobs));
jobRouter.post("/", requireAuth, requireRole("recruiter"), validate(jobSchema), asyncHandler(createJob));
jobRouter.get("/moderation", requireAuth, requireRole("admin"), asyncHandler(moderateJobs));
jobRouter.patch("/:id/moderation", requireAuth, requireRole("admin"), validate(jobIdSchema, "params"), validate(moderationSchema), asyncHandler(moderateJob));
jobRouter.put("/:id", requireAuth, requireRole("recruiter"), validate(jobIdSchema, "params"), validate(jobSchema), asyncHandler(updateJob));
jobRouter.post("/:id/apply", requireAuth, requireRole("student"), validate(jobIdSchema, "params"), validate(applySchema), asyncHandler(applyToJob));
