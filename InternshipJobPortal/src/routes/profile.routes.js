import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { profileSchema } from "../validation/profile.schemas.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);
profileRouter.get("/", asyncHandler(getProfile));
profileRouter.put("/", validate(profileSchema), asyncHandler(updateProfile));
