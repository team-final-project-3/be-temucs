const prisma = require("../../prisma/client");
const { z } = require("zod");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../auth/user.auth");
const { sendOtpEmail } = require("../utils/email");
const { toLowerCase } = require("zod/v4");

const registerSchema = z.object({
  fullname: z.string().min(3),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  phoneNumber: z.string().min(8),
  role: z.enum(["nasabah", "admin", "cs", "loket"]).optional(),
});

const register = async (req, res, next) => {
  try {
    let {
      fullname,
      username,
      email,
      password,
      phoneNumber,
      role = "nasabah",
    } = registerSchema.parse(req.body);

    username = username.toLowerCase();
    email = email.toLowerCase();

    const coreBanking = await prisma.coreBanking.findUnique({
      where: { email },
    });

    if (!coreBanking) {
      return res.status(403).json({
        message:
          "Anda belum menjadi nasabah. Silakan datang ke cabang terdekat.",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }, { phoneNumber }],
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
            "OTP telah dikirim ulang ke email Anda. Silakan verifikasi untuk menyelesaikan pendaftaran.",
          userId: existingUser.id,
        });
      }

      return res.status(400).json({
        message: "Email, username, atau nomor telepon sudah terdaftar.",
      });
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
        isVerified: true,
        otp,
        otpExpiresAt,
      },
    });

    await sendOtpEmail(email, otp);

    return res.status(201).json({
      message:
        "OTP telah dikirim ke email Anda. Silakan verifikasi untuk menyelesaikan pendaftaran.",
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validasi gagal",
        errors: error.errors.map((e) => e.message),
      });
    }

    return res.status(error.status || 500).json({
      message: error.message || "Terjadi kesalahan saat proses registrasi.",
    });
  }
};

const verifyOtp = async (req, res, next) => {
  let { email, otp } = req.body;
  try {
    email = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw Object.assign(new Error("User tidak ditemukan"), { status: 404 });
    }
    if (user.isVerified) {
      throw Object.assign(new Error("User sudah terdaftar"), {
        status: 400,
      });
    }
    if (user.otp !== otp) {
      throw Object.assign(new Error("OTP salah"), { status: 400 });
    }
    if (user.otpExpiresAt < new Date()) {
      throw Object.assign(new Error("OTP expired"), { status: 400 });
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true, otp: null, otpExpiresAt: null },
    });

    res.json({ message: "Email verified, registrasi berhasil." });
  } catch (error) {
    next(error);
  }
};

const resendOtp = async (req, res, next) => {
  let { email } = req.body;
  try {
    email = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw Object.assign(new Error("User tidak ditemukan"), { status: 404 });
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
  let { username, password } = req.body;

  try {
    username = username.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw Object.assign(new Error("User tidak ditemukan"), { status: 401 });
    }

    if (!user.isVerified) {
      throw Object.assign(new Error("User belum verifikasi email"), {
        status: 403,
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);

    if (!isMatch) {
      throw Object.assign(new Error("Password salah"), { status: 401 });
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
  let { email } = req.body;
  try {
    email = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw Object.assign(new Error("User tidak ditemukan"), { status: 404 });
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
  let { email, newPassword } = req.body;
  try {
    email = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw Object.assign(new Error("User tidak ditemukan"), { status: 404 });
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
  let { email, otp } = req.body;
  try {
    email = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw Object.assign(new Error("User tidak ditemukan"), { status: 404 });
    }
    if (user.otp !== otp) {
      throw Object.assign(new Error("OTP salah"), { status: 404 });
    }
    if (user.otpExpiresAt < new Date()) {
      throw Object.assign(new Error("OTP expired"), { status: 400 });
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
      throw Object.assign(new Error("User tidak ditemukan"), { status: 400 });
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
      throw Object.assign(new Error("User tidak ditemukan"), { status: 404 });
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
      throw Object.assign(new Error("Password lama dan baru wajib diisi"), {
        status: 400,
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Object.assign(new Error("User tidak ditemukan"), { status: 404 });
    }

    const isMatch = await comparePassword(oldPassword, user.passwordHash);

    if (oldPassword === newPassword) {
      throw Object.assign(
        new Error("Password baru tidak boleh sama dengan lama"),
        { status: 400 }
      );
    }

    if (!isMatch) {
      throw Object.assign(new Error("Password lama salah"), { status: 400 });
    }
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: "Password berhasil diubah." });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    let { page = 1, size = 10 } = req.query;
    page = parseInt(page);
    size = parseInt(size);

    const allowedSizes = [1, 5, 10, 15, 20];
    if (!allowedSizes.includes(size)) {
      size = 10;
    }

    const skip = (page - 1) * size;

    const total = await prisma.user.count({
      where: {
        NOT: { role: "admin" },
      },
    });

    const users = await prisma.user.findMany({
      where: {
        NOT: { role: "admin" },
      },
      select: {
        id: true,
        fullname: true,
        username: true,
        email: true,
        phoneNumber: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: size,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
    });
  } catch (error) {
    next(error);
  }
};

const saveExpoToken = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { expoPushToken } = req.body;
    if (!expoPushToken) {
      throw Object.assign(new Error("expoPushToken wajib diisi"), {
        status: 400,
      });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken },
    });
    res.status(200).json({ message: "Expo push token berhasil disimpan" });
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
  saveExpoToken,
};
