const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { comparePassword, generateToken } = require("../auth/cs.auth");

const addCS = async (req, res, next) => {
  const { branchId, name, username, password, createdBy } = req.body;
  try {
    if (branchId == null || !name || !username || !password || !createdBy) {
      const error = new Error("All fields are required.");
      error.status = 400;
      throw error;
    }

    const existing = await prisma.cS.findUnique({ where: { username } });
    if (existing) {
      const error = new Error("Username already exists");
      error.status = 400;
      throw error;
    }

    const passwordHash = await hashPassword(password);
    const cs = await prisma.cS.create({
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
      message: "CS created",
      cs: { id: cs.id, name: cs.name, username: cs.username },
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

    const cs = await prisma.cS.findUnique({ where: { username } });
    if (!cs) {
      const error = new Error("Invalid username or password");
      error.status = 401;
      throw error;
    }

    const isMatch = await comparePassword(password, cs.passwordHash);
    if (!isMatch) {
      const error = new Error("Invalid username or password");
      error.status = 401;
      throw error;
    }

    const token = generateToken({ csId: cs.id, role: "cs" });
    res.json({ message: "Login successful", token });
  } catch (error) {
    next(error);
  }
};

module.exports = { addCS, login };
