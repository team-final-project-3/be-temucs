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
      !name?.trim() ||
      !branchCode?.trim() ||
      !address?.trim() ||
      longitude === null ||
      latitude === null ||
      longitude === "" ||
      latitude === ""
    ) {
      throw Object.assign(new Error("Data branch tidak lengkap"), {
        status: 400,
      });
    }

    const long = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const isValidCoordinates =
      !isNaN(long) &&
      !isNaN(lat) &&
      long >= -180 &&
      long <= 180 &&
      lat >= -90 &&
      lat <= 90;

    if (!isValidCoordinates) {
      throw Object.assign(new Error("Format longitude/latitude tidak valid"), {
        status: 400,
      });
    }

    const existingName = await prisma.branch.findFirst({
      where: { name },
    });

    if (existingName) {
      throw Object.assign(new Error("Nama cabang sudah terdaftar"), {
        status: 409,
      });
    }

    const existingCode = await prisma.branch.findFirst({
      where: { branchCode },
    });

    if (existingCode) {
      throw Object.assign(new Error("Kode cabang sudah terdaftar"), {
        status: 409,
      });
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        branchCode,
        address,
        longitude: long,
        latitude: lat,
        holiday,
        status,
        createdBy: username,
        updatedBy: username,
      },
    });

    res
      .status(201)
      .json({ message: "Cabang baru berhasil ditambahkan", branch });
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
      !name?.trim() ||
      !branchCode?.trim() ||
      !address?.trim() ||
      longitude === null ||
      latitude === null ||
      longitude === "" ||
      latitude === ""
    ) {
      throw Object.assign(new Error("Data branch tidak lengkap"), {
        status: 400,
      });
    }

    const long = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const isValidCoordinates =
      !isNaN(long) &&
      !isNaN(lat) &&
      long >= -180 &&
      long <= 180 &&
      lat >= -90 &&
      lat <= 90;

    if (!isValidCoordinates) {
      throw Object.assign(new Error("Format longitude/latitude tidak valid"), {
        status: 400,
      });
    }

    const existingName = await prisma.branch.findFirst({
      where: {
        name,
        NOT: { id },
      },
    });
    if (existingName) {
      throw Object.assign(new Error("Nama cabang sudah digunakan"), {
        status: 409,
      });
    }

    const existingCode = await prisma.branch.findFirst({
      where: {
        branchCode,
        NOT: { id },
      },
    });
    if (existingCode) {
      throw Object.assign(new Error("Kode cabang sudah digunakan"), {
        status: 409,
      });
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        branchCode,
        address,
        longitude: long,
        latitude: lat,
        holiday,
        status,
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
    let { page = 1, size = 10 } = req.query;
    page = parseInt(page);
    size = parseInt(size);

    const allowedSizes = [5, 10, 15, 20];
    if (!allowedSizes.includes(size)) size = 10;

    const skip = (page - 1) * size;

    const total = await prisma.branch.count();

    const branches = await prisma.branch.findMany({
      skip,
      take: size,
      orderBy: { createdAt: "desc" },
    });

    const branchIds = branches.map((b) => b.id);
    const queueCounts = await prisma.queue.groupBy({
      by: ["branchId"],
      where: {
        branchId: { in: branchIds },
        NOT: { status: { in: ["done", "skipped", "canceled"] } },
      },
      _count: { id: true },
    });

    const countMap = {};
    queueCounts.forEach((q) => {
      countMap[q.branchId] = q._count.id;
    });

    const result = branches.map((branch) => ({
      ...branch,
      activeQueueCount: countMap[branch.id] || 0,
    }));

    res.json({
      success: true,
      data: result,
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

const getAllBranchLoket = getAllBranch;

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

    const activeQueueCount = await prisma.queue.count({
      where: {
        branchId: id,
        NOT: { status: { in: ["done", "skipped", "canceled"] } },
      },
    });

    const lastInProgress = await prisma.queue.findFirst({
      where: {
        branchId: id,
        status: "in progress",
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        ticketNumber: true,
      },
    });

    res.json({
      branch: {
        ...branch,
        activeQueueCount,
        lastInProgressTicket: lastInProgress || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// const getBranchLoket = async (req, res, next) => {
//   try {
//     const id = parseInt(req.params.id, 10);
//     const branch = await prisma.branch.findUnique({
//       where: { id },
//       include: {
//         lokets: {
//           select: {
//             id: true,
//             name: true,
//             username: true,
//             status: true,
//             createdAt: true,
//             updatedAt: true,
//           },
//         },
//         cs: true,
//       },
//     });
//     if (!branch) {
//       throw Object.assign(new Error("Branch tidak ditemukan"), { status: 404 });
//     }

//     const queueCount = await prisma.queue.count({
//       where: {
//         branchId: id,
//         NOT: { status: { in: ["done", "skipped", "canceled"] } },
//       },
//     });

//     res.json({ branch: { ...branch, waitingQueueCount: queueCount } });
//   } catch (error) {
//     next(error);
//   }
// };

module.exports = {
  addBranch,
  editBranch,
  updateBranchStatus,
  getBranch,
  // getBranchLoket,
  getAllBranch,
  getAllBranchLoket,
};
