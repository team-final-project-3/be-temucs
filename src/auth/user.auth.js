const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const secret = process.env.JWT_SECRET || "secret_key";

const verifyUserToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw Object.assign(new Error(), { status: 401 });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    throw Object.assign(new Error(), { status: 401 });
  }
};

const verifyRole =
  (roles = []) =>
  (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw Object.assign(new Error(), { status: 401 });

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, secret);
      if (!roles.includes(decoded.role)) {
        throw Object.assign(new Error(), { status: 403 });
      }
      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const generateToken = (payload) => {
  return jwt.sign(payload, secret);
};

module.exports = {
  verifyUserToken,
  verifyRole,
  hashPassword,
  comparePassword,
  generateToken,
};
