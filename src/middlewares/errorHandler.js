const defaultMessages = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

module.exports = (err, req, res, next) => {
  const status = err.status || 500;
  const message =
    err.message || defaultMessages[status] || "Something went wrong";

  res.status(status).json({ message });
};
