const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function generateTicketNumber(branchId, bookingDate) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    const error = new Error("Branch not found");
    error.status = 404;
    throw error;
  }

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

  const paddingNumber = String(count + 1).padStart(3, "0");
  return `${branch.branchCode}-${paddingNumber}`;
}

const bookQueueOnline = async (req, res, next) => {
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
    if (
      !userId ||
      !branchId ||
      !bookingDate ||
      !name ||
      !email ||
      !phoneNumber ||
      !Array.isArray(serviceIds) ||
      serviceIds.length === 0 ||
      !createdBy ||
      !updatedBy
    ) {
      const error = new Error(
        "All fields are required and serviceIds must be a non-empty array."
      );
      error.status = 400;
      throw error;
    }

    const ticketNumber = await generateTicketNumber(branchId, bookingDate);

    const bookingDateObj = new Date(bookingDate);
    bookingDateObj.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDateObj);
    endOfDay.setHours(23, 59, 59, 999);

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

    let totalMinutes = 0;
    for (const q of activeQueues) {
      for (const s of q.services) {
        totalMinutes += s.service.estimatedTime || 0;
      }
    }

    const estimatedTimeDate = new Date(
      new Date(bookingDate).getTime() + totalMinutes * 60000
    );

    const count = activeQueues.length;
    const notification = count < 5;

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
    next(error);
  }
};

const bookQueueOffline = async (req, res, next) => {
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
    if (
      loketId == null ||
      branchId == null ||
      !bookingDate ||
      !name ||
      !email ||
      !phoneNumber ||
      !Array.isArray(serviceIds) ||
      serviceIds.length === 0 ||
      !createdBy ||
      !updatedBy
    ) {
      const error = new Error(
        "All fields are required and serviceIds must be a non-empty array."
      );
      error.status = 400;
      throw error;
    }

    const ticketNumber = await generateTicketNumber(branchId, bookingDate);

    const bookingDateObj = new Date(bookingDate);
    bookingDateObj.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDateObj);
    endOfDay.setHours(23, 59, 59, 999);

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

    let totalMinutes = 0;
    for (const q of activeQueues) {
      for (const s of q.services) {
        totalMinutes += s.service.estimatedTime || 0;
      }
    }

    const estimatedTimeDate = new Date(
      new Date(bookingDate).getTime() + totalMinutes * 60000
    );

    const count = activeQueues.length;
    const notification = count < 5;

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
    next(error);
  }
};

const updateStatus = (newStatus) => async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
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
    next(error);
  }
};

const takeQueue = async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const { csId } = req.body;
  try {
    const queue = await prisma.queue.update({
      where: { id: Number(id) },
      data: { status: "in progress", csId },
    });
    res.json({ message: "Queue status updated to in progress", queue });
  } catch (error) {
    next(error);
  }
};

const getQueueCountByBranchId = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.branchId, 10);

    if (!branchId) {
      const error = new Error("branchId is required");
      error.status = 400;
      throw error;
    }

    const count = await prisma.queue.count({
      where: {
        branchId: Number(branchId),
        status: {
          notIn: ["done", "skipped", "canceled"],
        },
      },
    });

    res.status(200).json({
      branchId: Number(branchId),
      totalQueue: count,
    });
  } catch (error) {
    next(error);
  }
};

const getRemainingQueue = async (req, res, next) => {
  try {
    const queueId = parseInt(req.params.queueId, 10);

    if (!queueId) {
      const error = new Error("queueId is required");
      error.status = 400;
      throw error;
    }

    const myQueue = await prisma.queue.findUnique({
      where: { id: Number(queueId) },
      select: {
        id: true,
        branchId: true,
      },
    });

    if (!myQueue) {
      const error = new Error("Queue not found");
      error.status = 404;
      throw error;
    }

    const remaining = await prisma.queue.count({
      where: {
        branchId: myQueue.branchId,
        id: { lt: myQueue.id },
        status: { notIn: ["done", "skipped", "canceled"] },
      },
    });

    res.status(200).json({
      queueId: myQueue.id,
      branchId: myQueue.branchId,
      remainingInFront: remaining,
    });
  } catch (error) {
    next(error);
  }
};

const getLatestInProgressQueue = async (req, res, next) => {
  try {
    const queue = await prisma.queue.findFirst({
      where: {
        status: "in progress",
      },
      orderBy: {
        calledAt: "desc",
      },
    });

    if (!queue) {
      const error = new Error("No in-progress queue found");
      error.status = 404;
      throw error;
    }

    res.status(200).json(queue);
  } catch (error) {
    next(error);
  }
};

const getWaitingQueuesByBranchId = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.branchId, 10);

    if (!branchId) {
      const error = new Error("branchId is required");
      error.status = 400;
      throw error;
    }

    const queues = await prisma.queue.findMany({
      where: {
        branchId: Number(branchId),
        status: "waiting",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.status(200).json(queues);
  } catch (error) {
    next(error);
  }
};

const getOldestWaitingQueue = async (req, res, next) => {
  try {
    const queue = await prisma.queue.findFirst({
      where: {
        status: "waiting",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!queue) {
      const error = new Error("No waiting queue found");
      error.status = 404;
      throw error;
    }

    res.status(200).json(queue);
  } catch (error) {
    next(error);
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
  getRemainingQueue,
  getLatestInProgressQueue,
  getWaitingQueuesByBranchId,
  getOldestWaitingQueue,
};
