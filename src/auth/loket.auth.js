const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const secret = process.env.JWT_SECRET || "secret_key";

const verifyLoketToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.role !== "loket")
      return res.status(403).json({ message: "Forbidden" });
    req.loket = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const comparePassword = async (password, hash) =>
  await bcrypt.compare(password, hash);

const generateToken = (payload) => jwt.sign(payload, secret);

module.exports = { verifyLoketToken, comparePassword, generateToken };
