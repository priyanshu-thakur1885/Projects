import test from "node:test";
import assert from "node:assert/strict";
import { registerSchema } from "../src/validation/auth.schemas.js";
import { applySchema, jobSchema } from "../src/validation/job.schemas.js";
import { profileSchema } from "../src/validation/profile.schemas.js";

test("registration normalizes email and limits public roles", () => {
  const parsed = registerSchema.parse({
    name: "  Alex Student ",
    email: "  ALEX@example.com ",
    password: "safe-password-123",
    role: "student"
  });

  assert.equal(parsed.name, "Alex Student");
  assert.equal(parsed.email, "alex@example.com");
  assert.equal(registerSchema.safeParse({
    name: "Admin",
    email: "admin@example.com",
    password: "safe-password-123",
    role: "admin"
  }).success, false);
});

test("job listings require complete content and apply safe defaults", () => {
  const parsed = jobSchema.parse({
    title: "Software Engineering Intern",
    company: "Example Co",
    location: "Remote",
    type: "internship",
    description: "Help build and test reliable product features with our engineering team."
  });

  assert.equal(parsed.workplace, "onsite");
  assert.equal(parsed.experienceLevel, "entry");
  assert.equal(parsed.requirements, "");
  assert.equal(parsed.stipend, null);
  assert.equal(jobSchema.safeParse({ ...parsed, isApproved: true }).success, false);
});

test("monthly stipend accepts positive whole INR amounts only", () => {
  const listing = {
    title: "Software Engineering Intern",
    company: "Example Co",
    location: "Remote",
    type: "internship",
    description: "Help build and test reliable product features with our engineering team."
  };

  assert.equal(jobSchema.parse({ ...listing, stipend: "25000" }).stipend, 25000);
  assert.equal(jobSchema.safeParse({ ...listing, stipend: "25000.50" }).success, false);
  assert.equal(jobSchema.safeParse({ ...listing, stipend: "-25000" }).success, false);
  assert.equal(jobSchema.safeParse({ ...listing, stipend: "$25/hour" }).success, false);
});

test("application and profile inputs reject invalid URLs and empty updates", () => {
  assert.equal(applySchema.safeParse({ coverLetter: "I am interested.", resumeUrl: "not-a-url" }).success, false);
  assert.equal(profileSchema.safeParse({}).success, false);
  assert.equal(profileSchema.safeParse({ skills: ["JavaScript", "Research"] }).success, true);
});
