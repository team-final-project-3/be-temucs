const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { comparePassword, generateToken } = require("../helpers/admin.auth");

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin)
      return res.status(401).json({ message: "Invalid username or password" });

    const isValid = await comparePassword(password, admin.passwordHash);
    if (!isValid)
      return res.status(401).json({ message: "Invalid username or password" });

    const token = generateToken({ userId: admin.id, role: admin.role });

    res.json({
      message: `Login successful as ${admin.role}`,
      role: admin.role,
      token,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { login };
