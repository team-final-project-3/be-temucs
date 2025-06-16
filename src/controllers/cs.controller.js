const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  comparePassword,
  hashPassword,
  generateToken,
} = require("../auth/cs.auth");

const addCS = async (req, res, next) => {
  const adminUsername = req.user.username;
  const { branchId, name, username, password } = req.body;
  try {
    if (branchId == null || !name || !username || !password) {
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
        createdBy: adminUsername,
        updatedBy: adminUsername,
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

const editCS = async (req, res, next) => {
  const { id } = req.params;
  const { name, password, updatedBy } = req.body;

  try {
    const cs = await prisma.cS.findUnique({ where: { id: Number(id) } });
    if (!cs) {
      return res.status(404).json({ message: "CS not found" });
    }

    const updateData = {
      name,
      updatedBy,
    };

    if (password) {
      const passwordHash = await hashPassword(password);
      updateData.passwordHash = passwordHash;
    }

    const updatedCS = await prisma.cS.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.status(200).json({
      message: "CS updated",
      cs: {
        id: updatedCS.id,
        name: updatedCS.name,
        username: updatedCS.username,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteCS = async (req, res, next) => {
  const { id } = req.params;
  try {
    const cs = await prisma.cS.findUnique({ where: { id: Number(id) } });
    if (!cs) {
      return res.status(404).json({ message: "CS not found" });
    }

    await prisma.cS.delete({ where: { id: Number(id) } });

    res.status(200).json({ message: "CS deleted" });
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

    const cs = await prisma.cS.findUnique({
      where: { username },
      include: { branch: true },
    });
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

    const token = generateToken({
      csId: cs.id,
      username: cs.username,
      role: "cs",
    });
    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    next(error);
  }
};

const getCS = async (req, res, next) => {
  try {
    const csId = req.cs.csId;

    if (!csId) {
      const error = new Error("CS ID not found in token");
      error.status = 400;
      throw error;
    }

    const cs = await prisma.cS.findUnique({
      where: { id: csId },
      select: {
        id: true,
        name: true,
        username: true,
        branchId: true,
        branch: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!cs) {
      const error = new Error("CS Not Found");
      error.status = 404;
      throw error;
    }

    res.status(200).json({ cs });
  } catch (error) {
    next(error);
  }
};

module.exports = { addCS, login, editCS, deleteCS, getCS };
