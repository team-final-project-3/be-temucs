const prisma = require("../../prisma/client");

const addBranch = async (req, res, next) => {
  try {
    const username = req.user.username;
    const {
      name,
      branchCode,
      address,
      longitude,
      latitude,
      holiday = false,
      status = true,
    } = req.body;

    if (
      !name ||
      !branchCode ||
      !address ||
      longitude == null ||
      latitude == null
    ) {
      throw Object.assign(new Error("Data branch tidak lengkap"), {
        status: 400,
      });
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        branchCode,
        address,
        longitude,
        latitude,
        holiday,
        status,
        createdBy: username,
        updatedBy: username,
      },
    });

    res.status(201).json({ message: "Branch created", branch });
  } catch (error) {
    next(error);
  }
};

const editBranch = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const username = req.user.username;
    const { name, branchCode, address, longitude, latitude, holiday, status } =
      req.body;

    if (
      !name ||
      !branchCode ||
      !address ||
      longitude == null ||
      latitude == null
    ) {
      throw Object.assign(new Error("Data branch tidak lengkap"), {
        status: 400,
      });
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        branchCode,
        address,
        longitude,
        latitude,
        holiday,
        updatedBy: username,
      },
    });

    res.json({ message: "Branch updated", branch });
  } catch (error) {
    next(error);
  }
};

const updateBranchStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const username = req.user.username;

    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      throw Object.assign(new Error("Cabang tidak ditemukan"), { status: 404 });
    }

    const status = !branch.status;

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        status: status,
        updatedBy: username,
      },
    });

    res.status(200).json({
      message: `Branch status ${status ? "enabled" : "disabled"} successfully`,
      branch: updatedBranch,
    });
  } catch (error) {
    next(error);
  }
};

const getAllBranch = async (req, res, next) => {
  try {
    const branches = await prisma.branch.findMany();
    res.json({ branches });
  } catch (error) {
    next(error);
  }
};

const getBranch = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        lokets: true,
        cs: true,
      },
    });
    if (!branch) {
      throw Object.assign(new Error("Branch tidak ditemukan"), { status: 404 });
    }
    res.json({ branch });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addBranch,
  editBranch,
  updateBranchStatus,
  getBranch,
  getAllBranch,
};
