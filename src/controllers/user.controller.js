const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../auth/user.auth");

const register = async (req, res) => {
  const {
    fullname,
    username,
    email,
    password,
    phoneNumber,
    role = "nasabah",
  } = req.body;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber }, { username }, { email }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullname,
        username,
        email,
        phoneNumber,
        passwordHash,
        role,
      },
    });

    res.status(201).json({
      message: "User registered",
      user: { id: user.id, fullname: user.fullname, role: user.role },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user)
      return res.status(401).json({ message: "Invalid username or password" });

    const isMatch = await comparePassword(password, user.passwordHash);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid username or password" });

    const token = generateToken({ userId: user.id, role: user.role });

    res.json({ message: "Login successful", role: user.role, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { register, login };
