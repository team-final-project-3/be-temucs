const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const addBranch = async (req, res) => {
  try {
    const {
      name,
      branchCode,
      regionCode,
      address,
      longitude,
      latitude,
      holiday = false,
      status = true,
      createdBy,
      updatedBy,
    } = req.body;

    const branch = await prisma.branch.create({
      data: {
        name,
        branchCode,
        regionCode,
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
    console.error("Add Branch Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const editBranch = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      name,
      branchCode,
      regionCode,
      address,
      longitude,
      latitude,
      holiday,
      status,
      updatedBy,
    } = req.body;

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        branchCode,
        regionCode,
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
    console.error("Edit Branch Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllBranch = async (req, res) => {
  try {
    const branches = await prisma.branch.findMany();
    res.json({ branches });
  } catch (error) {
    console.error("Get All Branch Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getBranch = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const branch = await prisma.branch.findUnique({
      where: { id },
    });
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    res.json({ branch });
  } catch (error) {
    console.error("Get Branch Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { addBranch, editBranch, getBranch, getAllBranch };
