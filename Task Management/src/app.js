import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.routes.js";
import { taskRouter } from "./routes/task.routes.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/tasks", taskRouter);
app.use(express.static(path.resolve(currentDirectory, "../public")));

app.use((_request, response) => {
  response.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

if (env.nodeEnv === "production") {
  app.set("trust proxy", 1);
}
