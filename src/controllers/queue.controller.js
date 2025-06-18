const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function generateTicketNumber(branchId, bookingDate) {
  try {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw Object.assign(new Error(), { status: 404 });
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
  } catch (error) {
    next(error);
  }
}

const bookQueueOnline = async (req, res, next) => {
  const { userId, username, fullname, email, phoneNumber } = req.user;
  const { branchId, serviceIds } = req.body;

  try {
    if (
      !branchId ||
      !fullname ||
      !email ||
      !phoneNumber ||
      !Array.isArray(serviceIds) ||
      serviceIds.length === 0
    ) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const existingQueue = await prisma.queue.findFirst({
      where: {
        OR: [
          { userId, status: { in: ["waiting", "in progress"] } },
          { email, phoneNumber, status: { in: ["waiting", "in progress"] } },
        ],
      },
    });

    if (existingQueue) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const bookingDate = new Date();

    const queue = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumber(branchId, bookingDate);

      const bookingDateObj = new Date(bookingDate);
      bookingDateObj.setHours(0, 0, 0, 0);
      const endOfDay = new Date(bookingDateObj);
      endOfDay.setHours(23, 59, 59, 999);

      const activeQueues = await tx.queue.findMany({
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

      const queue = await tx.queue.create({
        data: {
          userId,
          branchId,
          bookingDate: new Date(bookingDate),
          name: fullname,
          email,
          phoneNumber,
          ticketNumber,
          status: "waiting",
          notification,
          estimatedTime: estimatedTimeDate,
          createdBy: username,
          updatedBy: username,
          services: {
            create: serviceIds.map((serviceId) => ({
              serviceId,
              createdBy: username,
              updatedBy: username,
            })),
          },
        },
        include: {
          services: true,
        },
      });

      await tx.queueLog.create({
        data: {
          queueId: queue.id,
          status: "waiting",
          createdBy: username,
          updatedBy: username,
        },
      });

      return queue;
    });

    res.status(201).json({ message: "Queue booked (online)", queue });
  } catch (error) {
    next(error);
  }
};

const bookQueueOffline = async (req, res, next) => {
  const { username, loketId, branchId } = req.loket;
  const { name, email, phoneNumber, serviceIds } = req.body;

  try {
    if (
      !name ||
      (!email && !phoneNumber) ||
      !Array.isArray(serviceIds) ||
      serviceIds.length === 0
    ) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const existingQueue = await prisma.queue.findFirst({
      where: {
        OR: [
          { email, phoneNumber, status: { in: ["waiting", "in progress"] } },
        ],
      },
    });

    if (existingQueue) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const bookingDate = new Date();

    const queue = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumber(branchId, bookingDate);

      const bookingDateObj = new Date(bookingDate);
      bookingDateObj.setHours(0, 0, 0, 0);
      const endOfDay = new Date(bookingDateObj);
      endOfDay.setHours(23, 59, 59, 999);

      const activeQueues = await tx.queue.findMany({
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

      const queue = await tx.queue.create({
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
          createdBy: username,
          updatedBy: username,
          services: {
            create: serviceIds.map((serviceId) => ({
              serviceId,
              createdBy: username,
              updatedBy: username,
            })),
          },
        },
        include: {
          services: true,
        },
      });

      await tx.queueLog.create({
        data: {
          queueId: queue.id,
          status: "waiting",
          createdBy: username,
          updatedBy: username,
        },
      });

      return queue;
    });

    res.status(201).json({ message: "Queue booked (offline)", queue });
  } catch (error) {
    next(error);
  }
};

const updateStatus = (newStatus) => async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const csBranchId = req.cs?.branchId;

  try {
    let username;
    if (newStatus === "canceled") {
      username = req.user?.username;
    } else {
      username = req.cs.username;
    }

    if (!username) {
      throw Object.assign(new Error(), { status: 403 });
    }

    const queueData = await prisma.queue.findUnique({ where: { id } });
    if (!queueData) {
      throw Object.assign(new Error(), { status: 404 });
    }

    if (newStatus !== "canceled" && queueData.branchId !== csBranchId) {
      throw Object.assign(new Error(), { status: 403 });
    }

    const currentStatus = queueData.status;

    if (queueData.status === newStatus) {
      throw Object.assign(new Error(), { status: 400 });
    }

    if (
      (currentStatus === "canceled" &&
        ["in progress", "done", "skipped"].includes(newStatus)) ||
      (["in progress", "done", "skipped"].includes(currentStatus) &&
        newStatus === "canceled") ||
      (currentStatus === "in progress" && newStatus === "skipped")
    ) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const queue = await tx.queue.update({
        where: { id },
        data: {
          status: newStatus,
          updatedBy: username,
        },
      });

      await tx.queueLog.create({
        data: {
          queueId: queue.id,
          status: newStatus,
          createdBy: username,
          updatedBy: username,
        },
      });

      if (["done", "skipped", "canceled"].includes(newStatus)) {
        const nextQueues = await tx.queue.findMany({
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
          await tx.queue.updateMany({
            where: { id: { in: nextIds } },
            data: { notification: true },
          });
        }
      }

      return queue;
    });

    res.json({
      message: `Queue status updated to ${newStatus}`,
      queue: result,
    });
  } catch (error) {
    next(error);
  }
};

const takeQueue = async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const { csId, username, branchId } = req.cs;

  if (!csId || !username || !branchId) {
    throw Object.assign(new Error(), { status: 403 });
  }

  try {
    const queueData = await prisma.queue.findUnique({ where: { id } });
    if (!queueData) {
      throw Object.assign(new Error(), { status: 404 });
    }
    if (queueData.branchId !== branchId) {
      throw Object.assign(new Error(), { status: 403 });
    }

    if (queueData.status === "in progress") {
      throw Object.assign(new Error(), { status: 400 });
    }

    if (queueData.status !== "waiting") {
      throw Object.assign(new Error(), { status: 400 });
    }

    const queue = await prisma.$transaction(async (tx) => {
      return await tx.queue.update({
        where: { id },
        data: {
          status: "in progress",
          calledAt: new Date(),
          csId,
          updatedBy: username,
        },
      });
    });

    await prisma.queueLog.create({
      data: {
        queueId: queue.id,
        status: "in progress",
        createdBy: username,
        updatedBy: username,
      },
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
      throw Object.assign(new Error(), { status: 400 });
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
      throw Object.assign(new Error(), { status: 400 });
    }

    const myQueue = await prisma.queue.findUnique({
      where: { id: Number(queueId) },
      select: {
        id: true,
        branchId: true,
      },
    });

    if (!myQueue) {
      throw Object.assign(new Error(), { status: 404 });
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
      throw Object.assign(new Error(), { status: 404 });
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
      throw Object.assign(new Error(), { status: 400 });
    }

    const queues = await prisma.queue.findMany({
      where: {
        branchId: Number(branchId),
        status: "waiting",
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    const formattedQueues = queues.map((queue) => ({
      ...queue,
      services: queue.services.map((qs) => qs.service),
    }));

    res.status(200).json(formattedQueues);
  } catch (error) {
    next(error);
  }
};

const getOldestWaitingQueue = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.branchId, 10);

    if (!branchId) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const queue = await prisma.queue.findFirst({
      where: {
        branchId: branchId,
        status: "waiting",
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!queue) {
      throw Object.assign(new Error(), { status: 404 });
    }

    res.status(200).json(queue);
  } catch (error) {
    next(error);
  }
};

const getAllQueues = async (req, res) => {
  try {
    const queuesRaw = await prisma.queue.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            username: true,
            email: true,
            phoneNumber: true,
          },
        },
        branch: true,
        cs: true,
        loket: true,
        queueLogs: true,
        services: true,
      },
    });

    const censorEmail = (email) => {
      if (!email || !email.includes("@")) return email;
      const [user, domain] = email.split("@");
      const censoredUser = user[0] + "*".repeat(Math.max(1, user.length - 1));
      const censoredDomain = domain
        .split(".")
        .map((part) => "*".repeat(part.length))
        .join(".");
      return `${censoredUser}@${censoredDomain}`;
    };

    const censorPhone = (phone) => {
      if (!phone || phone.length < 4) return phone;
      return phone.slice(0, 2) + "*".repeat(phone.length - 4) + phone.slice(-2);
    };

    const queues = queuesRaw.map((queue) => ({
      ...queue,
      user: queue.user
        ? {
          ...queue.user,
          email: censorEmail(queue.user.email),
          phoneNumber: censorPhone(queue.user.phoneNumber),
        }
        : null,
      email: censorEmail(queue.email),
      phoneNumber: censorPhone(queue.phoneNumber),
    }));

    res.json({ success: true, data: queues });
  } catch (error) {
    console.error("Error fetching queues:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getTicketById = async (req, res, next) => {
  try {
    const queueId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    if (!queueId) {
      throw Object.assign(new Error(), { status: 400 });
    }

    if (!userId) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        services: { include: { service: true } },
        branch: true,
        cs: true,
        user: true,
      },
    });

    if (!queue) {
      throw Object.assign(new Error(), { status: 404 });
    }

    if (req.user && queue.userId !== userId) {
      throw Object.assign(new Error(), { status: 403 });
    }

    const services = Array.isArray(queue.services)
      ? queue.services.map((qs) => qs.service)
      : [];

    res.status(200).json({
      ticketNumber: queue.ticketNumber,
      status: queue.status,
      branch: queue.branch,
      bookingDate: queue.bookingDate,
      name: queue.name,
      email: queue.email,
      phoneNumber: queue.phoneNumber,
      services,
      estimatedTime: queue.estimatedTime,
      calledAt: queue.calledAt,
      createdAt: queue.createdAt,
      cs: queue.cs,
      user: queue.user,
    });
  } catch (error) {
    next(error);
  }
};

const getLoketTicketById = async (req, res, next) => {
  try {
    const queueId = parseInt(req.params.id, 10);
    const loketId = req.loket.loketId;
    if (!queueId) {
      throw Object.assign(new Error(), { status: 400 });
    }

    if (!loketId) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        services: { include: { service: true } },
        branch: true,
        cs: true,
        loket: true,
      },
    });

    if (!queue) {
      throw Object.assign(new Error(), { status: 404 });
    }

    if (req.loket && queue.loketId !== loketId) {
      throw Object.assign(new Error(), { status: 403 });
    }

    const services = Array.isArray(queue.services)
      ? queue.services.map((qs) => qs.service)
      : [];

    res.status(200).json({
      ticketNumber: queue.ticketNumber,
      status: queue.status,
      branch: queue.branch,
      bookingDate: queue.bookingDate,
      name: queue.name,
      email: queue.email,
      phoneNumber: queue.phoneNumber,
      services,
      estimatedTime: queue.estimatedTime,
      calledAt: queue.calledAt,
      createdAt: queue.createdAt,
      cs: queue.cs,
      loket: queue.loket,
    });
  } catch (error) {
    next(error);
  }
};

const getUserQueueHistory = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const queues = await prisma.queue.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        services: { include: { service: true } },
        branch: true,
        queueLogs: true,
      },
    });

    const formattedQueues = queues.map((queue) => ({
      ...queue,
      services: Array.isArray(queue.services)
        ? queue.services.map((qs) => qs.service)
        : [],
    }));

    res.status(200).json({ success: true, data: formattedQueues });
  } catch (error) {
    next(error);
  }
};

const getActiveCSCustomer = async (req, res, next) => {
  try {
    const branchId = req.cs.branchId;

    if (!branchId) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const queues = await prisma.queue.findMany({
      where: {
        status: "in progress",
        csId: { not: null },
        branchId: branchId,
      },
      include: {
        cs: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        user: {
          select: {
            id: true,
            fullname: true,
            username: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    const result = queues.map((queue) => ({
      queueId: queue.id,
      ticketNumber: queue.ticketNumber,
      cs: queue.cs,
      nasabah: queue.user
        ? queue.user
        : {
          fullname: queue.name,
          username: null,
          email: queue.email,
          phoneNumber: queue.phoneNumber,
          id: null,
        },
      status: queue.status,
      calledAt: queue.calledAt,
    }));

    res.status(200).json(result);
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
  getAllQueues,
  getTicketById,
  getLoketTicketById,
  getUserQueueHistory,
  getActiveCSCustomer,
};
