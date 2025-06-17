const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const secret = process.env.JWT_SECRET || "secret_key";

const verifyCSToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw Object.assign(new Error(), { status: 401 });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.role !== "cs")
      throw Object.assign(new Error(), { status: 403 });
    req.cs = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hash) =>
  await bcrypt.compare(password, hash);

const generateToken = (payload) => jwt.sign(payload, secret);

module.exports = {
  verifyCSToken,
  hashPassword,
  comparePassword,
  generateToken,
};
