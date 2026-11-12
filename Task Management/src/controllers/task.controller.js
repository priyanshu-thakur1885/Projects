import { Task } from "../models/task.model.js";
import { HttpError } from "../utils/http-error.js";

export async function listTasks(request, response) {
  const filter = request.auth.role === "admin"
    ? (request.query.owner ? { owner: request.query.owner } : {})
    : { owner: request.auth.userId };

  const tasks = await Task.find(filter).sort({ createdAt: -1 });
  response.json({ tasks });
}

export async function createTask(request, response) {
  const task = await Task.create({ ...request.body, owner: request.auth.userId });
  response.status(201).json({ task });
}

export async function updateTask(request, response) {
  const task = await Task.findOneAndUpdate(
    { _id: request.params.id, owner: request.auth.userId },
    request.body,
    { new: true, runValidators: true }
  );

  if (!task) throw new HttpError(404, "Task not found");
  response.json({ task });
}

export async function deleteTask(request, response) {
  const task = await Task.findOneAndDelete({
    _id: request.params.id,
    owner: request.auth.userId
  });

  if (!task) throw new HttpError(404, "Task not found");
  response.status(204).end();
}
