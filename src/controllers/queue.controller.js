const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function generateTicketNumber(branchId, bookingDate) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new Error("Branch not found");

  const startOfDay = new Date(bookingDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(bookingDate);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await prisma.queue.count({
    where: {
      branchId,
      bookingDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Ticket number = branchCode-NNN (increment per hari per branch)
  const paddingNumber = String(count + 1).padStart(3, "0");
  return `${branch.branchCode}-${paddingNumber}`;
}

const bookQueueOnline = async (req, res) => {
  const {
    userId,
    branchId,
    bookingDate,
    name,
    email,
    phoneNumber,
    serviceIds,
    createdBy,
    updatedBy,
  } = req.body;
  try {
    const ticketNumber = await generateTicketNumber(branchId, bookingDate);

    // Tentukan hari booking
    const bookingDateObj = new Date(bookingDate);
    bookingDateObj.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDateObj);
    endOfDay.setHours(23, 59, 59, 999);

    // Ambil semua antrian di branch & hari yang statusnya BUKAN done/skipped/canceled
    const activeQueues = await prisma.queue.findMany({
      where: {
        branchId,
        bookingDate: {
          gte: bookingDateObj,
          lte: endOfDay,
        },
        status: { notIn: ["done", "skipped", "canceled"] },
      },
      orderBy: { id: "asc" },
      include: {
        services: {
          include: { service: { select: { estimatedTime: true } } },
        },
      },
    });

    // Hitung total waktu layanan dari semua antrian aktif sebelum antrian baru ini
    let totalMinutes = 0;
    for (const q of activeQueues) {
      for (const s of q.services) {
        totalMinutes += s.service.estimatedTime || 0;
      }
    }

    // estimatedTime = bookingDate + totalMinutes (antrian aktif sebelum ini)
    const estimatedTimeDate = new Date(
      new Date(bookingDate).getTime() + totalMinutes * 60000
    );

    // Notifikasi 5 antrian pertama
    const count = activeQueues.length;
    const notification = count < 5;

    // Buat queue
    const queue = await prisma.queue.create({
      data: {
        userId,
        branchId,
        bookingDate: new Date(bookingDate),
        name,
        email,
        phoneNumber,
        ticketNumber,
        status: "waiting",
        notification,
        estimatedTime: estimatedTimeDate,
        createdBy,
        updatedBy,
        services: {
          create: serviceIds.map((serviceId) => ({
            serviceId,
            createdBy,
            updatedBy,
          })),
        },
      },
      include: {
        services: true,
      },
    });
    res.status(201).json({ message: "Queue booked (online)", queue });
  } catch (error) {
    console.error("Book queue online error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const bookQueueOffline = async (req, res) => {
  const {
    loketId,
    branchId,
    bookingDate,
    name,
    email,
    phoneNumber,
    serviceIds,
    createdBy,
    updatedBy,
  } = req.body;
  try {
    const ticketNumber = await generateTicketNumber(branchId, bookingDate);

    // Tentukan hari booking
    const bookingDateObj = new Date(bookingDate);
    bookingDateObj.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDateObj);
    endOfDay.setHours(23, 59, 59, 999);

    // Ambil semua antrian di branch & hari yang statusnya BUKAN done/skipped/canceled
    const activeQueues = await prisma.queue.findMany({
      where: {
        branchId,
        bookingDate: {
          gte: bookingDateObj,
          lte: endOfDay,
        },
        status: { notIn: ["done", "skipped", "canceled"] },
      },
      orderBy: { id: "asc" },
      include: {
        services: {
          include: { service: { select: { estimatedTime: true } } },
        },
      },
    });

    // Hitung total waktu layanan dari semua antrian aktif sebelum antrian baru ini
    let totalMinutes = 0;
    for (const q of activeQueues) {
      for (const s of q.services) {
        totalMinutes += s.service.estimatedTime || 0;
      }
    }

    // estimatedTime = bookingDate + totalMinutes (antrian aktif sebelum ini)
    const estimatedTimeDate = new Date(
      new Date(bookingDate).getTime() + totalMinutes * 60000
    );

    // Notifikasi 5 antrian pertama
    const count = activeQueues.length;
    const notification = count < 5;

    // Buat queue
    const queue = await prisma.queue.create({
      data: {
        loketId,
        branchId,
        bookingDate: new Date(bookingDate),
        name,
        email,
        phoneNumber,
        ticketNumber,
        status: "waiting",
        notification,
        estimatedTime: estimatedTimeDate,
        createdBy,
        updatedBy,
        services: {
          create: serviceIds.map((serviceId) => ({
            serviceId,
            createdBy,
            updatedBy,
          })),
        },
      },
      include: {
        services: true,
      },
    });
    res.status(201).json({ message: "Queue booked (offline)", queue });
  } catch (error) {
    console.error("Book queue offline error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateStatus = (newStatus) => async (req, res) => {
  const { id } = req.params;
  try {
    const queue = await prisma.queue.update({
      where: { id: Number(id) },
      data: { status: newStatus },
    });

    if (["done", "skipped", "canceled"].includes(newStatus)) {
      const nextQueues = await prisma.queue.findMany({
        where: {
          branchId: queue.branchId,
          bookingDate: queue.bookingDate,
          status: "waiting",
          id: { gt: queue.id },
        },
        orderBy: { id: "asc" },
        take: 5,
      });

      const nextIds = nextQueues.map((q) => q.id);

      if (nextIds.length > 0) {
        await prisma.queue.updateMany({
          where: { id: { in: nextIds } },
          data: { notification: true },
        });
      }
    }

    res.json({ message: `Queue status updated to ${newStatus}`, queue });
  } catch (error) {
    console.error(`Update queue status to ${newStatus} error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const takeQueue = async (req, res) => {
  const { id } = req.params;
  const { csId } = req.body;
  try {
    const queue = await prisma.queue.update({
      where: { id: Number(id) },
      data: { status: "in progress", csId },
    });
    res.json({ message: "Queue status updated to in progress", queue });
  } catch (error) {
    console.error("Update queue status to in progress error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateQueueEstimatedTime = async (req, res) => {
  try {
    const { queueId, updatedBy } = req.body;

    if (!queueId || !updatedBy) {
      return res
        .status(400)
        .json({ message: "queueId and updatedBy are required" });
    }

    const queueServices = await prisma.queueService.findMany({
      where: { queueId: Number(queueId) },
      select: {
        service: {
          select: { estimatedTime: true },
        },
      },
    });

    if (queueServices.length === 0) {
      return res
        .status(404)
        .json({ message: "No services found for this queue" });
    }

    const totalEstimatedTime = queueServices.reduce((sum, q) => {
      return sum + (q.service.estimatedTime || 0);
    }, 0);

    const updatedQueue = await prisma.queue.update({
      where: { id: Number(queueId) },
      data: {
        estimatedTime: totalEstimatedTime,
        updatedBy,
      },
    });

    res.status(200).json({
      message: "Estimated time updated",
      queueId,
      estimatedTime: totalEstimatedTime,
      updatedQueue,
    });
  } catch (error) {
    console.error("Update Queue Estimated Time Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getQueueCountByBranchId = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    const count = await prisma.queue.count({
      where: { branchId: Number(branchId) }
    });

    res.status(200).json({
      branchId: Number(branchId),
      totalQueue: count
    });
  } catch (error) {
    console.error("Get Queue Count Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  bookQueueOnline,
  bookQueueOffline,
  cancelQueue: updateStatus("canceled"),
  skipQueue: updateStatus("skipped"),
  takeQueue,
  doneQueue: updateStatus("done"),
  getQueueCountByBranchId,
};
