import { User } from "../models/user.model.js";
import {
  createSession,
  refreshCookieName,
  refreshCookieOptions,
  revokeSession,
  rotateSession
} from "../services/auth.service.js";
import { HttpError } from "../utils/http-error.js";

function sendSession(response, user, accessToken, refreshToken, statusCode = 200) {
  response.cookie(refreshCookieName, refreshToken, refreshCookieOptions());
  response.status(statusCode).json({ user: user.toSafeObject(), accessToken });
}

export async function register(request, response) {
  const user = await User.create(request.body);
  const session = await createSession(user);
  sendSession(response, user, session.accessToken, session.refreshToken, 201);
}

export async function login(request, response) {
  const user = await User.findOne({ email: request.body.email }).select("+password");
  if (!user || !(await user.comparePassword(request.body.password))) {
    throw new HttpError(401, "Email or password is incorrect");
  }

  const session = await createSession(user);
  sendSession(response, user, session.accessToken, session.refreshToken);
}

export async function refresh(request, response) {
  const refreshToken = request.cookies[refreshCookieName];
  if (!refreshToken) throw new HttpError(401, "Refresh session is missing");

  const session = await rotateSession(refreshToken);
  sendSession(response, session.user, session.accessToken, session.refreshToken);
}

export async function logout(request, response) {
  const refreshToken = request.cookies[refreshCookieName];
  if (refreshToken) await revokeSession(refreshToken);

  response.clearCookie(refreshCookieName, refreshCookieOptions());
  response.status(204).end();
}

export function currentUser(request, response) {
  response.json({ user: request.user.toSafeObject() });
}
