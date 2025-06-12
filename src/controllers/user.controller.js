const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../auth/user.auth");
const { sendOtpEmail } = require("../utils/email");

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
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    const user = await prisma.user.create({
      data: {
        fullname,
        username,
        email,
        phoneNumber,
        passwordHash,
        role,
        otp,
        otpExpiresAt,
        isVerified: false,
      },
    });

    await sendOtpEmail(email, otp);

    res.status(201).json({
      message: "OTP sent to email. Please verify to complete registration.",
      userId: user.id,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified)
      return res.status(400).json({ message: "Already verified" });
    if (user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, otp: null, otpExpiresAt: null },
    });

    res.json({ message: "Email verified, registration complete." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user.isVerified)
      return res
        .status(403)
        .json({ message: "Please verify your email first" });

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

module.exports = { register, verifyOtp, login };
