const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { comparePassword, generateToken } = require("../auth/cs.auth");

const addCS = async (req, res) => {
  const { branchId, name, username, password, createdBy } = req.body;
  try {
    const existing = await prisma.cS.findUnique({ where: { username } });
    if (existing)
      return res.status(400).json({ message: "Username already exists" });

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
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const cs = await prisma.cS.findUnique({ where: { username } });
    if (!cs)
      return res.status(401).json({ message: "Invalid username or password" });

    const isMatch = await comparePassword(password, cs.passwordHash);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid username or password" });

    const token = generateToken({ csId: cs.id, role: "cs" });
    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { addCS, login };
