import { Router } from "express";
import rateLimit from "express-rate-limit";
import { currentUser, login, logout, refresh, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validate } from "../middleware/validate.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { loginSchema, registerSchema } from "../validation/auth.schemas.js";

export const authRouter = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Try again later." }
});

authRouter.post("/register", authRateLimit, validate(registerSchema), asyncHandler(register));
authRouter.post("/login", authRateLimit, validate(loginSchema), asyncHandler(login));
authRouter.post("/refresh", asyncHandler(refresh));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(async (request, response) => {
  const user = await User.findById(request.auth.userId);
  if (!user) throw new HttpError(401, "Account no longer exists");
  request.user = user;
  currentUser(request, response);
}));
