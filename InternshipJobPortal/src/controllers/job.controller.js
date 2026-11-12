import { Job } from "../models/job.model.js";
import { HttpError } from "../utils/http-error.js";

export async function listJobs(request, response) {
  const filter = {};
  if (request.auth?.role === "recruiter") {
    filter.$or = [
      { moderationStatus: "approved" },
      { recruiter: request.auth.userId }
    ];
  } else {
    filter.moderationStatus = "approved";
  }

  if (request.query.type) filter.type = request.query.type;
  if (request.query.workplace) filter.workplace = request.query.workplace;
  if (request.query.q) {
    const escaped = request.query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$and = [{ $or: [
      { title: { $regex: escaped, $options: "i" } },
      { company: { $regex: escaped, $options: "i" } },
      { location: { $regex: escaped, $options: "i" } }
    ] }];
  }

  const jobs = await Job.find(filter).populate("recruiter", "name companyName companyWebsite").sort({ createdAt: -1 });
  response.json({ jobs });
}

export async function createJob(request, response) {
  const job = await Job.create({
    ...request.body,
    recruiter: request.auth.userId,
    company: request.body.company
  });
  response.status(201).json({ job });
}

export async function updateJob(request, response) {
  const job = await Job.findOneAndUpdate(
    { _id: request.params.id, recruiter: request.auth.userId },
    { $set: { ...request.body, moderationStatus: "pending", moderatedAt: null, moderatedBy: null } },
    { new: true, runValidators: true }
  );
  if (!job) throw new HttpError(404, "Job listing not found");
  response.json({ job });
}

export async function moderateJobs(request, response) {
  const filter = request.query.status ? { moderationStatus: request.query.status } : {};
  const jobs = await Job.find(filter).populate("recruiter", "name email companyName").sort({ createdAt: -1 });
  response.json({ jobs });
}

export async function moderateJob(request, response) {
  const job = await Job.findByIdAndUpdate(
    request.params.id,
    {
      $set: {
        moderationStatus: request.body.status,
        moderatedAt: new Date(),
        moderatedBy: request.auth.userId
      }
    },
    { new: true, runValidators: true }
  ).populate("recruiter", "name email companyName");
  if (!job) throw new HttpError(404, "Job listing not found");
  response.json({ job });
}
