// middlewares/auth.js
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "secret_key";

exports.verifyRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, secret);
      if (!allowedRoles.includes(decoded.role)) {
        return res
          .status(403)
          .json({ message: "Forbidden: Insufficient role" });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };
};
