const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  comparePassword,
  generateToken,
  hashPassword,
} = require("../auth/loket.auth");

const addLoket = async (req, res, next) => {
  const { branchId, name, username, password, createdBy } = req.body;
  try {
    if (branchId == null || !name || !username || !password || !createdBy) {
      const error = new Error("All fields are required.");
      error.status = 400;
      throw error;
    }

    const existing = await prisma.loket.findUnique({ where: { username } });
    if (existing) {
      const error = new Error("Username already exists");
      error.status = 400;
      throw error;
    }

    const passwordHash = await hashPassword(password);
    const loket = await prisma.loket.create({
      data: {
        branchId,
        name,
        username,
        passwordHash,
        createdBy,
        updatedBy: createdBy,
      },
    });
    res.status(201).json({
      message: "Loket created",
      loket: { id: loket.id, name: loket.name, username: loket.username },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      const error = new Error("Username and password are required.");
      error.status = 400;
      throw error;
    }

    const loket = await prisma.loket.findUnique({ where: { username } });
    if (!loket) {
      const error = new Error("Invalid username or password");
      error.status = 401;
      throw error;
    }

    const isMatch = await comparePassword(password, loket.passwordHash);
    if (!isMatch) {
      const error = new Error("Invalid username or password");
      error.status = 401;
      throw error;
    }

    const token = generateToken({ loketId: loket.id, role: "loket" });
    res.json({ message: "Login successful", token });
  } catch (error) {
    next(error);
  }
};

module.exports = { addLoket, login };
