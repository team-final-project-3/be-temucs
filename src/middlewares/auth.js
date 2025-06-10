// helpers/auth.js
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "secret_key";

const generateToken = (payload) => {
  return jwt.sign(payload, secret, { expiresIn: "1d" });
};

// Payload untuk user:
generateToken({ userId: user.id, role: "user" });
