import { Router } from "express";
import { listApplications, updateApplicationStatus } from "../controllers/application.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { applicationIdSchema, applicationStatusSchema } from "../validation/application.schemas.js";

export const applicationRouter = Router();

applicationRouter.use(requireAuth);
applicationRouter.get("/", asyncHandler(listApplications));
applicationRouter.patch("/:id/status", requireRole("recruiter", "admin"), validate(applicationIdSchema, "params"), validate(applicationStatusSchema), asyncHandler(updateApplicationStatus));
