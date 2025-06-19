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
  "/users/verify-otp-forgot",
  "/users/resend-otp",
  "/cs/login",
  "/loket/login",
];

const authMiddleware = (req, res, next) => {
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

const allowRoles =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };

module.exports = authMiddleware;
module.exports.allowRoles = allowRoles;
