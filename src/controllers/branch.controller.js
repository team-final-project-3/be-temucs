const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const addBranch = async (req, res, next) => {
  try {
    const {
      name,
      branchCode,
      address,
      longitude,
      latitude,
      holiday = false,
      status = true,
      createdBy,
      updatedBy,
    } = req.body;

    if (
      !name ||
      !branchCode ||
      !address ||
      longitude == null ||
      latitude == null ||
      !createdBy ||
      !updatedBy
    ) {
      const error = new Error("All required fields must be provided.");
      error.status = 400;
      throw error;
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
        createdBy,
        updatedBy,
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
    const {
      name,
      branchCode,
      address,
      longitude,
      latitude,
      holiday,
      status,
      updatedBy,
    } = req.body;

    if (
      !name ||
      !branchCode ||
      !address ||
      longitude == null ||
      latitude == null ||
      !updatedBy
    ) {
      const error = new Error("All required fields must be provided.");
      error.status = 400;
      throw error;
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
        status,
        updatedBy,
      },
    });

    res.json({ message: "Branch updated", branch });
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
    });
    if (!branch) {
      const error = new Error("Branch not found");
      error.status = 404;
      throw error;
    }
    res.json({ branch });
  } catch (error) {
    next(error);
  }
};

module.exports = { addBranch, editBranch, getBranch, getAllBranch };
