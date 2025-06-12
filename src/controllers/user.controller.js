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
    // Cek apakah email ada di CoreBanking
    const coreBanking = await prisma.coreBanking.findUnique({
      where: { email },
    });
    if (!coreBanking) {
      return res.status(403).json({
        message:
          "Nasabah tidak terdaftar. Daftarkan diri Anda di Cabang terdekat.",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber }, { username }, { email }],
      },
    });

    if (existingUser) {
      if (!existingUser.isVerified) {
        // Resend OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

        await prisma.user.update({
          where: { id: existingUser.id },
          data: { otp, otpExpiresAt },
        });

        await sendOtpEmail(existingUser.email, otp);

        return res.status(200).json({
          message:
            "OTP resent to email. Please verify to complete registration.",
          userId: existingUser.id,
        });
      }
      return res.status(400).json({ message: "User already exists" });
    }

    // User benar-benar baru
    const passwordHash = await hashPassword(password);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
  const { email, otp } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified)
      return res.status(400).json({ message: "Already verified" });
    if (user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    await prisma.user.update({
      where: { email },
      data: { isVerified: true, otp: null, otpExpiresAt: null },
    });

    res.json({ message: "Email verified, registration complete." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const resendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP resent to email." });
  } catch (error) {
    console.error("Resend OTP error:", error);
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

    if (!user.isVerified)
      return res
        .status(403)
        .json({ message: "Please verify your email first" });

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

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    await prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP sent to email for password reset." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { email },
      data: { passwordHash, otp: null, otpExpiresAt: null },
    });

    res.json({ message: "Password reset successful." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOtpForgotPassword = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    // OTP valid, bisa lanjut reset password
    res.json({ message: "OTP verified. You can now reset your password." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  verifyOtpForgotPassword,
};
