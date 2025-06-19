const prisma = require("../../prisma/client");
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
      throw Object.assign(new Error(), { status: 403 });
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
      throw Object.assign(new Error(), { status: 400 });
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
      throw Object.assign(new Error(), { status: 404 });
    }
    if (user.isVerified) {
      throw Object.assign(new Error(), { status: 400 });
    }
    if (user.otp !== otp) {
      throw Object.assign(new Error(), { status: 400 });
    }
    if (user.otpExpiresAt < new Date()) {
      throw Object.assign(new Error(), { status: 400 });
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
      throw Object.assign(new Error(), { status: 404 });
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
      throw Object.assign(new Error(), { status: 401 });
    }

    if (!user.isVerified) {
      throw Object.assign(new Error(), { status: 403 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);

    if (!isMatch) {
      throw Object.assign(new Error(), { status: 401 });
    }

    const token = generateToken({
      userId: user.id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
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
      throw Object.assign(new Error(), { status: 404 });
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
      throw Object.assign(new Error(), { status: 404 });
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
      throw Object.assign(new Error(), { status: 404 });
    }
    if (user.otp !== otp) {
      throw Object.assign(new Error(), { status: 404 });
    }
    if (user.otpExpiresAt < new Date()) {
      throw Object.assign(new Error(), { status: 400 });
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
      throw Object.assign(new Error(), { status: 400 });
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
      throw Object.assign(new Error(), { status: 404 });
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
      throw Object.assign(new Error(), { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Object.assign(new Error(), { status: 404 });
    }

    const isMatch = await comparePassword(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw Object.assign(new Error(), { status: 400 });
    }

    if (oldPassword === newPassword) {
      throw Object.assign(new Error(), { status: 400 });
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

const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
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
