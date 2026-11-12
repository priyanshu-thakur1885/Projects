export function validate(schema, source = "body") {
  return (request, _response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      next(Object.assign(new Error(result.error.issues[0]?.message ?? "Invalid request"), { statusCode: 400 }));
      return;
    }
    request[source] = result.data;
    next();
  };
}
