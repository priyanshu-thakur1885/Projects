import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { HttpError } from "../utils/http-error.js";

export async function applyToJob(request, response) {
  const job = await Job.findOne({ _id: request.params.id, moderationStatus: "approved" });
  if (!job) throw new HttpError(404, "Approved job listing not found");
  if (job.closingDate && job.closingDate < new Date()) {
    throw new HttpError(400, "Applications for this listing are closed");
  }

  const student = await User.findById(request.auth.userId).select("resumeUrl");
  const application = await Application.create({
    ...request.body,
    resumeUrl: request.body.resumeUrl || student?.resumeUrl || "",
    job: job._id,
    student: request.auth.userId
  });
  response.status(201).json({ application });
}

export async function listApplications(request, response) {
  let filter = {};
  if (request.auth.role === "student") {
    filter.student = request.auth.userId;
  } else if (request.auth.role === "recruiter") {
    const jobs = await Job.find({ recruiter: request.auth.userId }).select("_id");
    filter.job = { $in: jobs.map((job) => job._id) };
  } else if (request.query.status) {
    filter.status = request.query.status;
  }

  if (request.query.status && request.auth.role !== "admin") filter.status = request.query.status;
  const applications = await Application.find(filter)
    .populate("job")
    .populate("student", "name email phone location headline resumeUrl skills education experience")
    .sort({ createdAt: -1 });
  response.json({ applications });
}

export async function updateApplicationStatus(request, response) {
  const application = await Application.findById(request.params.id).populate("job");
  if (!application) throw new HttpError(404, "Application not found");
  if (request.auth.role === "recruiter" && String(application.job.recruiter) !== request.auth.userId) {
    throw new HttpError(404, "Application not found");
  }
  if (request.auth.role !== "admin" && !["submitted", "shortlisted"].includes(application.status)) {
    throw new HttpError(409, "This application can no longer be updated");
  }

  application.status = request.body.status;
  await application.save();
  await application.populate("student", "name email phone location headline resumeUrl skills education experience");
  response.json({ application });
}
