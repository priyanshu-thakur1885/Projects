import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

export function optionalAuth(request, _response, next) {
  const authorization = request.get("authorization");
  if (!authorization) {
    next();
    return;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    next(new HttpError(401, "Invalid authorization header"));
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
