import test from "node:test";
import assert from "node:assert/strict";
import { loginSchema, registerSchema } from "../src/validation/auth.schemas.js";
import { createTaskSchema, updateTaskSchema } from "../src/validation/task.schemas.js";

test("registration trims names and normalizes email", () => {
  const result = registerSchema.parse({
    name: "  Alex Doe ",
    email: "  ALEX@example.com ",
    password: "a-secure-password"
  });

  assert.equal(result.name, "Alex Doe");
  assert.equal(result.email, "alex@example.com");
});

test("registration rejects short passwords and unexpected role fields", () => {
  assert.equal(registerSchema.safeParse({
    name: "Alex",
    email: "alex@example.com",
    password: "short"
  }).success, false);
  assert.equal(registerSchema.safeParse({
    name: "Alex",
    email: "alex@example.com",
    password: "long-enough-password",
    role: "admin"
  }).success, false);
});

test("login rejects malformed email and empty password", () => {
  assert.equal(loginSchema.safeParse({ email: "not-an-email", password: "" }).success, false);
});

test("task creation requires a title and normalizes an empty due date", () => {
  const result = createTaskSchema.safeParse({ title: "  Plan the week ", dueDate: "" });
  assert.equal(result.success, true);
  assert.equal(result.data.title, "Plan the week");
  assert.equal(result.data.dueDate, null);
});

test("task creation accepts a date from an HTML date input", () => {
  const result = createTaskSchema.safeParse({ title: "Review notes", dueDate: "2026-11-12" });
  assert.equal(result.success, true);
  assert.equal(result.data.dueDate.toISOString(), "2026-11-12T00:00:00.000Z");
});

test("task updates reject empty objects and unknown fields", () => {
  assert.equal(updateTaskSchema.safeParse({}).success, false);
  assert.equal(updateTaskSchema.safeParse({ owner: "someone-else" }).success, false);
});
