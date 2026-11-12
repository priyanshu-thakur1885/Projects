import { HttpError } from "../utils/http-error.js";

export function requireRole(...roles) {
  return (request, _response, next) => {
    if (!roles.includes(request.auth.role)) {
      next(new HttpError(403, "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}
