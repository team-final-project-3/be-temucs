const prisma = require("../../prisma/client");
const {
  comparePassword,
  hashPassword,
  generateToken,
} = require("../auth/cs.auth");

const addCS = async (req, res, next) => {
  const adminUsername = req.user.username;
  let { branchId, name, username, password } = req.body;
  try {
    if (branchId == null || !name || !username || !password) {
      throw Object.assign(new Error("Data CS tidak lengkap"), { status: 400 });
    }

    username = username.toLowerCase();

    const existing = await prisma.cS.findUnique({ where: { username } });
    if (existing) {
      throw Object.assign(new Error("CS sudah terdaftar"), { status: 400 });
    }

    if (password && password.length < 8) {
      throw Object.assign(new Error("Password minimal 8 karakter"), {
        status: 400,
      });
    }

    const passwordHash = await hashPassword(password);
    const cs = await prisma.cS.create({
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
      message: "CS created",
      cs: { id: cs.id, name: cs.name, username: cs.username },
    });
  } catch (error) {
    next(error);
  }
};

const editCS = async (req, res, next) => {
  const { id } = req.params;
  const username = req.user.username;
  const { name, password } = req.body;

  try {
    const cs = await prisma.cS.findUnique({ where: { id: Number(id) } });
    if (!cs) {
      throw Object.assign(new Error("CS tidak ditemukan"), { status: 404 });
    }

    const updateData = {
      name,
      updatedBy: username,
    };

    if (password && password.length < 8) {
      throw Object.assign(new Error("Password minimal 8 karakter"), {
        status: 400,
      });
    }

    if (password) {
      const passwordHash = await hashPassword(password);
      updateData.passwordHash = passwordHash;
    }

    const updatedCS = await prisma.cS.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.status(200).json({
      message: "CS updated",
      cs: {
        id: updatedCS.id,
        name: updatedCS.name,
        username: updatedCS.username,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateCSStatus = async (req, res, next) => {
  const { id } = req.params;
  const username = req.user.username;

  try {
    const cs = await prisma.cS.findUnique({ where: { id: Number(id) } });
    if (!cs) {
      throw Object.assign(new Error("CS tidak ditemukan"), { status: 404 });
    }

    const status = !cs.status;

    const updatedCS = await prisma.cS.update({
      where: { id: Number(id) },
      data: {
        status: status,
        updatedBy: username,
      },
    });

    res.status(200).json({
      message: `CS ${status ? "activated" : "deactivated"} successfully`,
      cs: {
        id: updatedCS.id,
        name: updatedCS.name,
        username: updatedCS.username,
        status: updatedCS.status,
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

    const cs = await prisma.cS.findUnique({
      where: { username },
      include: { branch: true },
    });
    if (!cs) {
      throw Object.assign(new Error("CS tidak ditemukan"), { status: 401 });
    }

    if (cs.status === false) {
      throw Object.assign(new Error("Akun CS tidak aktif"), { status: 403 });
    }

    const isMatch = await comparePassword(password, cs.passwordHash);
    if (!isMatch) {
      throw Object.assign(new Error("Password salah"), { status: 401 });
    }

    const token = generateToken({
      csId: cs.id,
      branchId: cs.branchId,
      name: cs.name,
      username: cs.username,
      role: "cs",
    });
    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    next(error);
  }
};

const getCS = async (req, res, next) => {
  try {
    const csId = req.cs?.csId;

    if (!csId) {
      throw Object.assign(new Error("CS ID tidak valid"), { status: 400 });
    }

    const cs = await prisma.cS.findUnique({
      where: { id: csId },
      select: {
        id: true,
        name: true,
        username: true,
        branchId: true,
        branch: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!cs) {
      throw Object.assign(new Error("CS tidak ditemukan"), { status: 404 });
    }

    res.status(200).json({ cs });
  } catch (error) {
    next(error);
  }
};

module.exports = { addCS, login, editCS, updateCSStatus, getCS };
