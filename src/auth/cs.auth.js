const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const secret = process.env.JWT_SECRET || "secret_key";
const prisma = require("../../prisma/client");

const verifyCSToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw Object.assign(new Error(), { status: 401 });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.role !== "cs")
      throw Object.assign(new Error(), { status: 403 });

    const cs = await prisma.cS.findUnique({ where: { id: decoded.csId } });
    if (!cs) throw Object.assign(new Error("CS not found"), { status: 401 });

    const branch = await prisma.branch.findUnique({
      where: { id: cs.branchId },
    });
    if (!branch || branch.status === false) {
      throw Object.assign(
        new Error(
          "Branch tidak aktif, CS tidak dapat login atau mengakses layanan"
        ),
        { status: 403 }
      );
    }

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
