import { User } from "../models/user.model.js";
import { HttpError } from "../utils/http-error.js";

const profileFieldsByRole = {
  student: ["phone", "location", "headline", "resumeUrl", "skills", "education", "experience"],
  recruiter: ["phone", "location", "companyName", "companyWebsite", "companyDescription"],
  admin: ["phone", "location"]
};

export async function getProfile(request, response) {
  const user = await User.findById(request.auth.userId);
  if (!user) throw new HttpError(404, "Profile not found");
  response.json({ user: user.toSafeObject() });
}

export async function updateProfile(request, response) {
  const user = await User.findById(request.auth.userId);
  if (!user) throw new HttpError(404, "Profile not found");

  const allowedFields = profileFieldsByRole[user.role] ?? [];
  const forbiddenFields = Object.keys(request.body).filter((field) => !allowedFields.includes(field));
  if (forbiddenFields.length) {
    throw new HttpError(400, `These fields are not available for your role: ${forbiddenFields.join(", ")}`);
  }

  Object.assign(user, request.body);
  await user.save();
  response.json({ user: user.toSafeObject() });
}
