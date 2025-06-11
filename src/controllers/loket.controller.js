const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { comparePassword, generateToken } = require("../auth/loket.auth");

const addLoket = async (req, res) => {
  const { branchId, name, username, password, status, createdBy } = req.body;
  try {
    const existing = await prisma.loket.findUnique({ where: { username } });
    if (existing)
      return res.status(400).json({ message: "Username already exists" });

    const passwordHash = await hashPassword(password);
    const loket = await prisma.loket.create({
      data: {
        branchId,
        name,
        username,
        passwordHash,
        status,
        createdBy,
        updatedBy: createdBy,
      },
    });
    res.status(201).json({
      message: "Loket created",
      loket: { id: loket.id, name: loket.name, username: loket.username },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const loket = await prisma.loket.findUnique({ where: { username } });
    if (!loket)
      return res.status(401).json({ message: "Invalid username or password" });

    const isMatch = await comparePassword(password, loket.passwordHash);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid username or password" });

    const token = generateToken({ loketId: loket.id, role: "loket" });
    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { addLoket, login };
