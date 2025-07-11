const prisma = require("../../prisma/client");
const {
  comparePassword,
  generateToken,
  hashPassword,
} = require("../auth/loket.auth");

const addLoket = async (req, res, next) => {
  const adminUsername = req.user.username;
  let { branchId, name, username, password } = req.body;
  try {
    if (branchId == null || !name || !username || !password) {
      throw Object.assign(new Error("Data loket tidak lengkap"), {
        status: 400,
      });
    }

    username = username.toLowerCase();

    const existing = await prisma.loket.findUnique({ where: { username } });
    if (existing) {
      throw Object.assign(new Error("Username sudah terdaftar"), {
        status: 400,
      });
    }

    if (password && password.length < 8) {
      throw Object.assign(new Error("Password minimal 8 karakter"), {
        status: 400,
      });
    }

    const passwordHash = await hashPassword(password);
    const loket = await prisma.loket.create({
      data: {
        branchId,
        name,
        username,
        passwordHash,
        createdBy: adminUsername,
        updatedBy: adminUsername,
      },
    });
    res.status(201).json({
      message: "Loket created",
      loket: { id: loket.id, name: loket.name, username: loket.username },
    });
  } catch (error) {
    next(error);
  }
};

const editLoket = async (req, res, next) => {
  const username = req.user.username;
  const { id } = req.params;
  const { name, password } = req.body;

  try {
    const loket = await prisma.loket.findUnique({
      where: { id: Number(id) },
    });

    if (!loket) {
      throw Object.assign(new Error("Loket tidak ditemukan"), { status: 404 });
    }

    if (!name && !password) {
      throw Object.assign(new Error("Field yang diubah tidak boleh kosong"), {
        status: 400,
      });
    }

    if (password && password.length < 8) {
      throw Object.assign(new Error("Password minimal 8 karakter"), {
        status: 400,
      });
    }

    const updateData = {
      updatedBy: username,
    };
    if (name) updateData.name = name;
    if (password) {
      const passwordHash = await hashPassword(password);
      updateData.passwordHash = passwordHash;
    }

    const updatedLoket = await prisma.loket.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.status(200).json({
      message: "Loket updated",
      loket: {
        id: updatedLoket.id,
        name: updatedLoket.name,
        username: updatedLoket.username,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateLoketStatus = async (req, res, next) => {
  const username = req.user.username;
  const { id } = req.params;

  try {
    const loket = await prisma.loket.findUnique({
      where: { id: Number(id) },
    });

    if (!loket) {
      throw Object.assign(new Error("Loket tidak ditemukan"), { status: 404 });
    }

    const status = !loket.status;

    const updatedLoket = await prisma.loket.update({
      where: { id: Number(id) },
      data: {
        status: status,
        updatedBy: username,
      },
    });

    res.status(200).json({
      message: `Loket ${status ? "diaktifkan" : "dinonaktifkan"} berhasil`,
      loket: {
        id: updatedLoket.id,
        name: updatedLoket.name,
        username: updatedLoket.username,
        status: updatedLoket.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  let { username, password } = req.body;
  try {
    if (!username || !password) {
      throw Object.assign(new Error("Username dan password wajib diisi"), {
        status: 400,
      });
    }

    username = username.toLowerCase();

    const loket = await prisma.loket.findUnique({
      where: { username },
      include: { branch: true },
    });
    if (!loket) {
      throw Object.assign(new Error("Loket tidak ditemukan"), { status: 401 });
    }

    if (loket.status === false) {
      throw Object.assign(new Error("Akun Loket tidak aktif"), { status: 403 });
    }

    const isMatch = await comparePassword(password, loket.passwordHash);
    if (!isMatch) {
      throw Object.assign(new Error("Password salah"), { status: 401 });
    }

    const token = generateToken({
      loketId: loket.id,
      branchId: loket.branchId,
      name: loket.name,
      username: loket.username,
      role: "loket",
    });

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    next(error);
  }
};

const getLoket = async (req, res, next) => {
  try {
    const loketId = req.loket.loketId;

    if (!loketId) {
      throw Object.assign(new Error("Loket tidak ditemukan"), { status: 400 });
    }

    const loket = await prisma.loket.findUnique({
      where: { id: loketId },
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
        branchId: true,
        branch: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!loket) {
      throw Object.assign(new Error("Loket tidak ditemukan"), { status: 404 });
    }

    res.status(200).json({ loket });
  } catch (error) {
    next(error);
  }
};

module.exports = { addLoket, login, editLoket, updateLoketStatus, getLoket };
