import { Router } from "express";
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask
} from "../controllers/task.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createTaskSchema,
  taskIdSchema,
  updateTaskSchema
} from "../validation/task.schemas.js";

export const taskRouter = Router();

taskRouter.use(requireAuth);
taskRouter.get("/", asyncHandler(listTasks));
taskRouter.post("/", validate(createTaskSchema), asyncHandler(createTask));
taskRouter.put("/:id", validate(taskIdSchema, "params"), validate(updateTaskSchema), asyncHandler(updateTask));
taskRouter.delete("/:id", validate(taskIdSchema, "params"), asyncHandler(deleteTask));
