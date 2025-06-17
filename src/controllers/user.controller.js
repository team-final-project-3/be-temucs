const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../auth/user.auth");
const { sendOtpEmail } = require("../utils/email");

const registerSchema = z.object({
  fullname: z.string().min(1, "Fullname is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z
    .string()
    .regex(/^\d{10,15}$/, "Phone number must be 10-15 digits"),
  role: z.enum(["nasabah", "admin"]).optional(),
});

const register = async (req, res, next) => {
  try {
    const {
      fullname,
      username,
      email,
      password,
      phoneNumber,
      role = "nasabah",
    } = registerSchema.parse(req.body);

    const coreBanking = await prisma.coreBanking.findUnique({
      where: { email },
    });
    if (!coreBanking) {
      const error = new Error(
        "Nasabah tidak terdaftar. Daftarkan diri Anda di Cabang terdekat."
      );
      error.status = 403;
      throw error;
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber }, { username }, { email }],
      },
    });

    if (existingUser) {
      if (!existingUser.isVerified) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
      const error = new Error("User already exists");
      error.status = 400;
      throw error;
    }

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
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors.map((e) => e.message),
      });
    }
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }
    if (user.isVerified) {
      const error = new Error("Already verified");
      error.status = 400;
      throw error;
    }
    if (user.otp !== otp) {
      const error = new Error("Invalid OTP");
      error.status = 400;
      throw error;
    }
    if (user.otpExpiresAt < new Date()) {
      const error = new Error("OTP expired");
      error.status = 400;
      throw error;
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true, otp: null, otpExpiresAt: null },
    });

    res.json({ message: "Email verified, registration complete." });
  } catch (error) {
    next(error);
  }
};

const resendOtp = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP resent to email." });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      const error = new Error("Invalid username or password");
      error.status = 401;
      throw error;
    }

    if (!user.isVerified) {
      const error = new Error("Please verify your email first");
      error.status = 403;
      throw error;
    }

    const isMatch = await comparePassword(password, user.passwordHash);

    if (!isMatch) {
      const error = new Error("Invalid username or password");
      error.status = 401;
      throw error;
    }

    const token = generateToken({
      userId: user.id,
      fullname: user.fullname,
      username: user.username,
      role: user.role,
    });

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP sent to email for password reset." });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  const { email, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { email },
      data: { passwordHash, otp: null, otpExpiresAt: null },
    });

    res.json({ message: "Password reset successful." });
  } catch (error) {
    next(error);
  }
};

const verifyOtpForgotPassword = async (req, res, next) => {
  const { email, otp } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }
    if (user.otp !== otp) {
      const error = new Error("Invalid OTP");
      error.status = 400;
      throw error;
    }
    if (user.otpExpiresAt < new Date()) {
      const error = new Error("OTP expired");
      error.status = 400;
      throw error;
    }

    res.json({ message: "OTP verified. You can now reset your password." });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      const error = new Error("User ID not found in token");
      error.status = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullname: true,
        username: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      const error = new Error("Old password and new password are required");
      error.status = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    const isMatch = await comparePassword(oldPassword, user.passwordHash);
    if (!isMatch) {
      const error = new Error("Old password is incorrect");
      error.status = 400;
      throw error;
    }

    if (oldPassword === newPassword) {
      const error = new Error(
        "New password must be different from old password"
      );
      error.status = 400;
      throw error;
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
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
  getProfile,
  changePassword,
  getAllUsers,
};
