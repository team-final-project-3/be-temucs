const jwt = require("jsonwebtoken");

const unprotectedRoutes = [
  "/register",
  "/login",
  "/admin/login",
  "/users/login",
  "/users/register",
  "/users/verify-otp",
  "/users/forgot-password",
  "/users/reset-password",
  "/users/resend-otp",
  "/cs/login",
  "/loket/login",
];

module.exports = (req, res, next) => {
  // Allow unprotected routes
  if (unprotectedRoutes.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
};
