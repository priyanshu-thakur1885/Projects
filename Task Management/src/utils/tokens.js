import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function createAccessToken(user) {
  return jwt.sign({ role: user.role }, env.accessSecret, {
    subject: user.id,
    expiresIn: env.accessTokenTtl
  });
}

export function createRefreshToken(user) {
  return jwt.sign({}, env.refreshSecret, {
    subject: user.id,
    expiresIn: `${env.refreshTokenTtlDays}d`
  });
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
