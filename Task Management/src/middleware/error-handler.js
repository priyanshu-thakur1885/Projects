import { env } from "../config/env.js";

export function errorHandler(error, _request, response, _next) {
  if (response.headersSent) return;

  if (error.name === "ValidationError") {
    response.status(400).json({ message: error.message });
    return;
  }

  if (error.name === "CastError") {
    response.status(400).json({ message: "Invalid resource identifier" });
    return;
  }

  if (error.code === 11000) {
    response.status(409).json({ message: "An account with this email already exists" });
    return;
  }

  const statusCode = error.statusCode ?? 500;
  if (statusCode >= 500) console.error(error);

  response.status(statusCode).json({
    message: statusCode === 500 && env.nodeEnv === "production"
      ? "An unexpected error occurred"
      : error.message
  });
}
