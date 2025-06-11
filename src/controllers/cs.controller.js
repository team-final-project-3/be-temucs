const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { comparePassword, generateToken } = require("../auth/cs.auth");

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

module.exports = { login };
