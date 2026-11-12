import mongoose from "mongoose";
import { z } from "zod";

const taskFields = {
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["pending", "completed"]).optional(),
  dueDate: z.union([
    z.literal(""),
    z.string().date(),
    z.string().datetime({ offset: true }),
    z.null()
  ]).optional().transform((value) => {
    if (value === "" || value == null) return null;
    return new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  })
};

export const createTaskSchema = z.object({
  title: taskFields.title,
  description: taskFields.description,
  status: taskFields.status,
  dueDate: taskFields.dueDate
}).strict();

export const updateTaskSchema = z.object(taskFields).partial().strict().refine(
  (data) => Object.keys(data).length > 0,
  "Provide at least one field to update"
);

export const taskIdSchema = z.object({
  id: z.string().refine(mongoose.isValidObjectId, "Invalid task identifier")
});
