const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../helpers/user.auth");

exports.register = async (req, res) => {
  const { fullname, username, email, password, phoneNumber } = req.body;

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
      },
    });

    res.status(201).json({
      message: "User registered",
      user: { id: user.id, fullname: user.fullname },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  const { phoneNumber, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user)
      return res
        .status(401)
        .json({ message: "Invalid phone number or password" });

    const isMatch = await comparePassword(password, user.passwordHash);

    if (!isMatch)
      return res
        .status(401)
        .json({ message: "Invalid phone number or password" });

    const token = generateToken({ userId: user.id, role: "user" });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
