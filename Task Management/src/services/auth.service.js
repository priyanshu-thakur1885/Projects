import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { User } from "../models/user.model.js";
import { createAccessToken, createRefreshToken, hashToken } from "../utils/tokens.js";
import { HttpError } from "../utils/http-error.js";

export const refreshCookieName = "refreshToken";

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000
  };
}

export async function createSession(user) {
  const refreshToken = createRefreshToken(user);
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await RefreshSession.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt
  });

  return { accessToken: createAccessToken(user), refreshToken };
}

export async function rotateSession(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.refreshSecret);
  } catch {
    throw new HttpError(401, "Invalid or expired refresh token");
  }

  if (typeof payload === "string" || !payload.sub) {
    throw new HttpError(401, "Invalid or expired refresh token");
  }

  const session = await RefreshSession.findOneAndDelete({
    user: payload.sub,
    tokenHash: hashToken(refreshToken),
    expiresAt: { $gt: new Date() }
  });

  if (!session) throw new HttpError(401, "Refresh session is no longer valid");

  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, "Account no longer exists");

  return { user, ...(await createSession(user)) };
}

export async function revokeSession(refreshToken) {
  await RefreshSession.deleteOne({ tokenHash: hashToken(refreshToken) });
}
