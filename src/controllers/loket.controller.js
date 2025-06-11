const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { comparePassword, generateToken } = require("../auth/loket.auth");

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

module.exports = { login };
