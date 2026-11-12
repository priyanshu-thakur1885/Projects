import { HttpError } from "../utils/http-error.js";

export function validate(schema, property = "body") {
  return (request, _response, next) => {
    const result = schema.safeParse(request[property]);
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(", ");
      next(new HttpError(400, message));
      return;
    }

    request[property] = result.data;
    next();
  };
}
