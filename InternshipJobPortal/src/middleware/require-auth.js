import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

export function requireAuth(request, _response, next) {
  const authorization = request.get("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    next(new HttpError(401, "Authentication required"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.accessSecret);
    if (typeof payload === "string" || !payload.sub || !payload.role) {
      throw new Error("Invalid access token payload");
    }

    request.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired access token"));
  }
}
