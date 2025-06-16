const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  comparePassword,
  generateToken,
  hashPassword,
} = require("../auth/loket.auth");

const addLoket = async (req, res, next) => {
  const adminUsername = req.user.username;
  const { branchId, name, username, password } = req.body;
  try {
    if (branchId == null || !name || !username || !password) {
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
        createdBy: adminUsername,
        updatedBy: adminUsername,
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

const editLoket = async (req, res, next) => {
  const username = req.user.username;
  const { id } = req.params;
  const { name, password } = req.body;

  try {
    const loket = await prisma.loket.findUnique({
      where: { id: Number(id) },
    });

    if (!loket) {
      return res.status(404).json({ message: "Loket not found" });
    }

    const updateData = {
      name,
      updatedBy: username,
    };

    if (password) {
      const passwordHash = await hashPassword(password);
      updateData.passwordHash = passwordHash;
    }

    const updatedLoket = await prisma.loket.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.status(200).json({
      message: "Loket updated",
      loket: {
        id: updatedLoket.id,
        name: updatedLoket.name,
        username: updatedLoket.username,
        status: updatedLoket.status,
      },
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

    const loket = await prisma.loket.findUnique({
      where: { username },
      include: { branch: true },
    });
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

    const token = generateToken({
      loketId: loket.id,
      username: loket.username,
      role: "loket",
    });

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    next(error);
  }
};

const getLoket = async (req, res, next) => {
  try {
    const loketId = req.loket.loketId;

    if (!loketId) {
      const error = new Error("Loket ID not found in token");
      error.status = 400;
      throw error;
    }

    const loket = await prisma.loket.findUnique({
      where: { id: loketId },
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
        branchId: true,
        branch: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!loket) {
      const error = new Error("Loket Not Found!");
      error.status = 404;
      throw error;
    }

    res.status(200).json({ loket });
  } catch (error) {
    next(error);
  }
};

module.exports = { addLoket, login, editLoket, getLoket };
