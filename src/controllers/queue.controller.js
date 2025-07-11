const prisma = require("../../prisma/client");
const {
  generateTicketNumberAndEstimate,
} = require("../helpers/generateTicketNumberAndEstimate");
const { getStartEndOfBookingDateWIB } = require("../helpers/dateHelper");
const {
  sendExpoNotification,
  getExpoPushToken,
} = require("../helpers/sendExpoNotification");

const allowedTransitions = {
  waiting: ["called", "canceled"],
  called: ["in progress", "canceled", "skipped"],
  "in progress": ["done"],
  done: [],
  canceled: [],
  skipped: [],
};

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
      throw Object.assign(new Error("Data tidak lengkap"), { status: 400 });
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
      throw Object.assign(new Error("Sudah ada antrian aktif"), {
        status: 400,
      });
    }
    const bookingDate = new Date();

    const queue = await prisma.$transaction(async (tx) => {
      const { ticketNumber, estimatedTimeDate, notification } =
        await generateTicketNumberAndEstimate(
          tx,
          branchId,
          bookingDate,
          serviceIds,
          username
        );

      const queue = await tx.queue.create({
        data: {
          userId,
          branchId,
          bookingDate: new Date(),
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

    //websocket
    const queueServices = await prisma.queueService.findMany({
      where: { queueId: queue.id },
      include: {
        service: {
          select: {
            serviceName: true,
          },
        },
      },
    });

    const services = queueServices.map((qs) => qs.service.serviceName);

    global.io.emit("queue:booked", {
      ticketNumber: queue.ticketNumber,
      status: queue.status,
      bookedAt: queue.bookingDate,
      services,
      branchId: queue.branchId,
    });

    const expoPushToken = await getExpoPushToken({ userId });
    if (expoPushToken) {
      await sendExpoNotification(
        expoPushToken,
        "Antrian Berhasil Dibuat",
        `Antrian Anda dengan nomor tiket ${queue.ticketNumber} berhasil dibuat.`,
        { ticketNumber: queue.ticketNumber }
      );
    }

    res.status(201).json({ message: "Queue booked (online)", queue });
  } catch (error) {
    console.error("BOOK QUEUE ONLINE ERROR:", error);
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
      throw Object.assign(new Error("Data tidak lengkap"), { status: 400 });
    }

    const now = new Date();

    const existingQueue = await prisma.queue.findFirst({
      where: {
        OR: [
          { email, phoneNumber, status: { in: ["waiting", "in progress"] } },
        ],
      },
    });

    if (existingQueue) {
      throw Object.assign(new Error("Sudah ada antrian aktif"), {
        status: 400,
      });
    }

    let bookingDate = new Date(now);

    const queue = await prisma.$transaction(async (tx) => {
      const { ticketNumber, estimatedTimeDate, notification } =
        await generateTicketNumberAndEstimate(
          tx,
          branchId,
          bookingDate,
          serviceIds,
          username
        );

      const queue = await tx.queue.create({
        data: {
          loketId,
          branchId,
          bookingDate: new Date(bookingDate),
          name,
          email: email || null,
          phoneNumber: phoneNumber || null,
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

    //websocket
    const queueServices = await prisma.queueService.findMany({
      where: { queueId: queue.id },
      include: {
        service: {
          select: {
            serviceName: true,
          },
        },
      },
    });

    const services = queueServices.map((qs) => qs.service.serviceName);

    global.io.emit("queue:booked", {
      ticketNumber: queue.ticketNumber,
      status: queue.status,
      bookedAt: queue.bookingDate,
      services: services,
      branchId: queue.branchId,
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
      throw Object.assign(new Error("Antrian tidak bisa diubah statusnya."), {
        status: 403,
      });
    }

    const currentStatus = queueData.status;

    if (["done", "canceled", "skipped"].includes(currentStatus)) {
      throw Object.assign(
        new Error(
          "Antrian sudah selesai atau dibatalkan, tidak bisa diubah statusnya."
        ),
        { status: 400 }
      );
    }

    if (currentStatus === newStatus) {
      throw Object.assign(new Error(`Status sekarang sudah ${newStatus}`), {
        status: 400,
      });
    }

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw Object.assign(
        new Error(
          `Transisi status dari '${currentStatus}' ke '${newStatus}' tidak diperbolehkan.`
        ),
        { status: 400 }
      );
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

      if (["skipped"].includes(newStatus) && queue.userId) {
        const expoPushToken = await getExpoPushToken({ userId: queue.userId });
        if (expoPushToken) {
          await sendExpoNotification(
            expoPushToken,
            "Antrian Anda di-skip",
            "Antrian Anda telah di-skip oleh CS. Silakan hubungi petugas jika ada pertanyaan.",
            { ticketNumber: queue.ticketNumber }
          );
        }
      }

      if (["done", "skipped", "canceled"].includes(newStatus)) {
        const { startUTC, endUTC } = getStartEndOfBookingDateWIB(
          queue.bookingDate
        );
        const nextQueues = await tx.queue.findMany({
          where: {
            branchId: queue.branchId,
            bookingDate: {
              gte: startUTC,
              lte: endUTC,
            },
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

        console.log(
          "nextQueues.length",
          nextQueues.length,
          nextQueues.map((q) => q.id)
        );

        if (nextQueues.length === 5) {
          const queueKe5 = nextQueues[4];
          console.log("queueKe5", queueKe5);
          if (queueKe5.userId) {
            const expoPushToken = await getExpoPushToken({
              userId: queueKe5.userId,
            });
            console.log("expoPushToken", expoPushToken);
            if (expoPushToken) {
              await sendExpoNotification(
                expoPushToken,
                "Antrian Anda Hampir Dipanggil",
                "Antrian Anda tinggal 5 lagi. Mohon bersiap-siap.",
                { ticketNumber: queueKe5.ticketNumber }
              );
            }
          }
        }
      }

      return queue;
    });

    //websocket
    if (["done", "skipped", "canceled"].includes(newStatus)) {
      global.io.emit("queue:status-updated", {
        ticketNumber: result.ticketNumber,
        status: newStatus,
        updatedAt: result.updatedAt,
      });
    }

    res.json({
      message: `Queue status updated to ${newStatus}`,
      queue: result,
    });
  } catch (error) {
    next(error);
  }
};

const callQueue = async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const { csId, username, branchId } = req.cs;

  if (!csId || !username || !branchId) {
    throw Object.assign(new Error(), { status: 403 });
  }

  try {
    const queueData = await prisma.queue.findUnique({ where: { id } });
    if (!queueData) throw Object.assign(new Error(), { status: 404 });
    if (queueData.branchId !== branchId)
      throw Object.assign(new Error(), { status: 403 });

    if (queueData.status !== "waiting") {
      throw Object.assign(
        new Error("Antrian hanya bisa dipanggil jika statusnya masih waiting."),
        { status: 400 }
      );
    }

    let queue;
    try {
      queue = await prisma.$transaction(async (tx) => {
        const updated = await tx.queue.updateMany({
          where: { id, status: "waiting" },
          data: {
            status: "called",
            calledAt: new Date(),
            csId,
            updatedBy: username,
          },
        });
        if (updated.count === 0) {
          throw Object.assign(
            new Error(
              "Antrian sudah dipanggil oleh CS lain. Silakan refresh daftar antrian."
            ),
            { status: 409 }
          );
        }
        return await tx.queue.findUnique({ where: { id } });
      });
    } catch (err) {
      return next(err);
    }

    await prisma.queueLog.create({
      data: {
        queueId: queue.id,
        status: "called",
        createdBy: username,
        updatedBy: username,
      },
    });

    const cs = await prisma.cS.findUnique({
      where: { id: csId },
      select: { name: true },
    });

    //Emit
    global.io.emit("queue:called", {
      ticketNumber: queue.ticketNumber,
      status: queue.status,
      calledAt: queue.calledAt,
      csName: cs?.name || null,
      branchId: queue.branchId,
    });

    res.json({ message: "Queue status updated to called", queue });
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
    const existingInProgress = await prisma.queue.findFirst({
      where: {
        csId,
        branchId,
        status: "in progress",
      },
    });

    if (existingInProgress) {
      throw Object.assign(
        new Error(
          "Anda masih memiliki antrian yang sedang berjalan. Selesaikan terlebih dahulu sebelum mengambil antrian baru."
        ),
        { status: 400 }
      );
    }

    const queueData = await prisma.queue.findUnique({ where: { id } });
    if (!queueData) throw Object.assign(new Error(), { status: 404 });
    if (queueData.branchId !== branchId)
      throw Object.assign(new Error(), { status: 403 });

    if (queueData.status !== "called") {
      throw Object.assign(
        new Error("Antrian hanya bisa diambil jika statusnya 'called'."),
        { status: 400 }
      );
    }

    const queue = await prisma.$transaction(async (tx) => {
      return await tx.queue.update({
        where: { id },
        data: {
          status: "in progress",
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

    const cs = await prisma.cS.findUnique({
      where: { id: csId },
      select: {
        name: true,
        id: true,
      },
    });

    // Emit event
    global.io.emit("queue:in-progress", {
      ticketNumber: queue.ticketNumber,
      status: queue.status,
      updatedAt: queue.updatedAt,
      cs,
    });

    res.json({ message: "Queue status updated to in progress", queue });
  } catch (error) {
    next(error);
  }
};

const getQueueCountByBranchIdLoket = async (req, res, next) => {
  try {
    const branchId = req.loket.branchId;

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

const getQueueCountAdmin = async (req, res, next) => {
  try {
    const range = req.query.range || "day";
    const now = new Date();
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    let groups = [];
    let startRange, endRange;

    if (range === "day") {
      // Dapatkan Senin minggu berjalan
      const dayOfWeek = wibNow.getUTCDay() === 0 ? 7 : wibNow.getUTCDay();
      const monday = new Date(wibNow);
      monday.setUTCHours(0, 0, 0, 0);
      monday.setUTCDate(wibNow.getUTCDate() - dayOfWeek + 1);

      for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setUTCDate(monday.getUTCDate() + i);
        const start = new Date(date);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setUTCHours(23, 59, 59, 999);

        const totalQueueInRange = await prisma.queue.count({
          where: { createdAt: { gte: start, lt: end } },
        });
        const totalQueueOnline = await prisma.queue.count({
          where: { createdAt: { gte: start, lt: end }, userId: { not: null } },
        });
        const totalQueueOffline = await prisma.queue.count({
          where: { createdAt: { gte: start, lt: end }, userId: null },
        });

        groups.push({
          label: start.toISOString().slice(0, 10),
          totalQueueInRange,
          totalQueueOnline,
          totalQueueOffline,
        });

        if (wibNow >= start && wibNow < end) {
          startRange = start;
          endRange = end;
        }
      }
    } else if (range === "week") {
      const year = wibNow.getFullYear();
      const month = wibNow.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      lastDayOfMonth.setHours(23, 59, 59, 999);

      let week = 1;
      let start = new Date(firstDayOfMonth);

      while (start <= lastDayOfMonth) {
        // Minggu pertama: end = hari Minggu pertama atau tanggal 7
        let end = new Date(start);
        if (week === 1) {
          const dayOfWeek = start.getDay(); // 0=minggu, 1=senin, dst
          const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
          end.setDate(start.getDate() + daysToSunday);
          if (end > lastDayOfMonth) end = new Date(lastDayOfMonth);
        } else {
          end.setDate(start.getDate() + 6);
          if (end > lastDayOfMonth) end = new Date(lastDayOfMonth);
        }
        end.setHours(23, 59, 59, 999);

        const totalQueueInRange = await prisma.queue.count({
          where: { createdAt: { gte: start, lt: end } },
        });
        const totalQueueOnline = await prisma.queue.count({
          where: { createdAt: { gte: start, lt: end }, userId: { not: null } },
        });
        const totalQueueOffline = await prisma.queue.count({
          where: { createdAt: { gte: start, lt: end }, userId: null },
        });

        groups.push({
          label: `Minggu ${week}`,
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
          totalQueueInRange,
          totalQueueOnline,
          totalQueueOffline,
        });

        // Cek apakah hari ini ada di minggu ini
        if (wibNow >= start && wibNow <= end) {
          startRange = new Date(start);
          endRange = new Date(end);
        }

        // Minggu berikutnya: start = hari Senin setelah end
        start = new Date(end);
        start.setDate(start.getDate() + 1);
        start.setHours(0, 0, 0, 0);
        week++;
      }
    } else if (range === "month") {
      const year = wibNow.getUTCFullYear();
      for (let month = 0; month < 12; month++) {
        const start = new Date(year, month, 1);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(year, month + 1, 1);
        end.setUTCHours(0, 0, 0, 0);

        const totalQueueInRange = await prisma.queue.count({
          where: { createdAt: { gte: start, lt: end } },
        });
        const totalQueueOnline = await prisma.queue.count({
          where: { createdAt: { gte: start, lt: end }, userId: { not: null } },
        });
        const totalQueueOffline = await prisma.queue.count({
          where: { createdAt: { gte: start, lt: end }, userId: null },
        });

        groups.push({
          label: start.toLocaleString("id-ID", { month: "long" }),
          totalQueueInRange,
          totalQueueOnline,
          totalQueueOffline,
        });

        if (wibNow >= start && wibNow < end) {
          startRange = start;
          endRange = end;
        }
      }
    } else {
      groups = [];
      startRange = null;
      endRange = null;
    }

    let queueWhere = {};
    if (startRange && endRange) {
      queueWhere = { createdAt: { gte: startRange, lt: endRange } };
    }

    const totalQueue = await prisma.queue.count({ where: queueWhere });

    const statusCountsRaw = await prisma.queue.groupBy({
      by: ["status"],
      _count: { status: true },
      where: queueWhere,
    });
    const statusCounts = {};
    statusCountsRaw.forEach((row) => {
      statusCounts[row.status] = row._count.status;
    });

    const csCountsRaw = await prisma.queue.groupBy({
      by: ["csId"],
      _count: { csId: true },
      where: {
        ...queueWhere,
        csId: { not: null },
        status: { in: ["done"] },
      },
    });

    const csIds = csCountsRaw.map((row) => row.csId).filter(Boolean);
    const csList = await prisma.cS.findMany({
      where: { id: { in: csIds } },
      select: { id: true, name: true },
    });
    const csMap = {};
    csList.forEach((cs) => {
      csMap[cs.id] = cs.name;
    });

    const csCounts = csCountsRaw.map((row) => ({
      csId: row.csId,
      csName: csMap[row.csId] || null,
      count: row._count.csId,
    }));

    const totalBranch = await prisma.branch.count();

    const top5Queue = await prisma.queue.groupBy({
      by: ["branchId"],
      _count: { branchId: true },
      orderBy: { _count: { branchId: "desc" } },
      take: 5,
      where: queueWhere,
    });

    const allBranches = await prisma.branch.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
      take: 5,
    });
    const branchMap = {};
    allBranches.forEach((b) => {
      branchMap[b.id] = b.name;
    });
    const top5Antrian = allBranches.map((b) => {
      const found = top5Queue.find((row) => row.branchId === b.id);
      return {
        branchId: b.id,
        branchName: b.name,
        count: found ? found._count.branchId : null,
      };
    });

    const top5Service = await prisma.queueService.groupBy({
      by: ["serviceId"],
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 5,
      where:
        startRange && endRange
          ? { createdAt: { gte: startRange, lt: endRange } }
          : undefined,
    });
    const allServices = await prisma.service.findMany({
      select: { id: true, serviceName: true },
      orderBy: { id: "asc" },
      take: 5,
    });
    const serviceMap = {};
    allServices.forEach((s) => {
      serviceMap[s.id] = s.serviceName;
    });

    const top5Layanan = allServices.map((s) => {
      const found = top5Service.find((row) => row.serviceId === s.id);
      return {
        serviceId: s.id,
        serviceName: s.serviceName,
        count: found ? found._count.serviceId : null,
      };
    });

    res.status(200).json({
      range,
      groups,
      totalQueue,
      totalBranch,
      statusCounts,
      csCounts,
      top5Antrian,
      top5Layanan,
    });
  } catch (error) {
    next(error);
  }
};

const getLatestInProgressQueueCS = async (req, res, next) => {
  try {
    const branchId = req.cs?.branchId;

    const queue = await prisma.queue.findFirst({
      where: {
        status: "in progress",
        branchId: Number(branchId),
      },
      orderBy: {
        calledAt: "desc",
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!queue) {
      throw Object.assign(
        new Error("Tidak ada antrian yang sedang dilayani."),
        { status: 404 }
      );
    }

    res.status(200).json(queue);
  } catch (error) {
    next(error);
  }
};

const getLatestInProgressQueueLoket = async (req, res, next) => {
  try {
    const branchId = req.loket?.branchId;

    const queue = await prisma.queue.findFirst({
      where: {
        status: "in progress",
        branchId: Number(branchId),
      },
      orderBy: {
        calledAt: "desc",
      },
    });

    if (!queue) {
      throw Object.assign(
        new Error("Tidak ada antrian yang sedang dilayani."),
        { status: 404 }
      );
    }

    res.status(200).json(queue);
  } catch (error) {
    next(error);
  }
};

const getWaitingQueuesByBranchIdLoket = async (req, res, next) => {
  try {
    const branchId = req.loket.branchId;

    if (!branchId) {
      throw Object.assign(new Error("Cabang tidak ditemukan."), {
        status: 400,
      });
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

const getWaitingQueuesByBranchIdCS = async (req, res, next) => {
  try {
    const branchId = req.cs.branchId;

    if (!branchId) {
      throw Object.assign(new Error("Cabang tidak ditemukan."), {
        status: 400,
      });
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

const getOldestWaitingQueueCS = async (req, res, next) => {
  try {
    const branchId = req.cs?.branchId;
    if (!branchId)
      throw Object.assign(new Error("Cabang tidak ditemukan pada akun CS."), {
        status: 400,
      });

    const queue = await prisma.queue.findFirst({
      where: {
        branchId,
        status: "waiting",
      },
      include: {
        services: { include: { service: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!queue)
      throw Object.assign(
        new Error("Tidak ada antrian yang sedang menunggu."),
        {
          status: 404,
        }
      );

    res.status(200).json(queue);
  } catch (error) {
    next(error);
  }
};

const getOldestWaitingQueueLoket = async (req, res, next) => {
  try {
    const branchId = req.loket?.branchId;
    if (!branchId)
      throw Object.assign(new Error("Cabang tidak ditemukan pada akun CS."), {
        status: 400,
      });

    const queue = await prisma.queue.findFirst({
      where: {
        branchId,
        status: "waiting",
      },
      include: {
        services: { include: { service: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!queue)
      throw Object.assign(
        new Error("Tidak ada antrian yang sedang menunggu."),
        {
          status: 404,
        }
      );

    res.status(200).json(queue);
  } catch (error) {
    next(error);
  }
};

const getOldestWaitingQueueUser = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId)
      throw Object.assign(new Error("User not authenticated."), {
        status: 401,
      });

    const latestUserQueue = await prisma.queue.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!latestUserQueue || !latestUserQueue.branchId)
      throw Object.assign(new Error("Tidak ada antrian saat ini."), {
        status: 404,
      });

    const queue = await prisma.queue.findFirst({
      where: {
        branchId: latestUserQueue.branchId,
        status: "waiting",
      },
      include: {
        services: { include: { service: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!queue)
      throw Object.assign(
        new Error("Tidak ada antrian yang sedang menunggu."),
        { status: 404 }
      );

    res.status(200).json(queue);
  } catch (error) {
    next(error);
  }
};

const getAllQueues = async (req, res, next) => {
  try {
    let { page = 1, size = 10 } = req.query;
    page = parseInt(page);
    size = parseInt(size);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(size) || size < 1) size = 10;

    const allowedSizes = [5, 10, 15, 20];
    if (!allowedSizes.includes(size)) size = 10;

    const skip = (page - 1) * size;

    const total = await prisma.queue.count();

    const queuesRaw = await prisma.queue.findMany({
      skip,
      take: size,
      orderBy: { createdAt: "desc" },
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
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    const censorPhone = (phone) => {
      if (!phone || phone.length < 4) return phone;
      return phone.slice(0, 2) + "*".repeat(phone.length - 4) + phone.slice(-2);
    };

    const censorEmail = (email) => {
      if (!email || !email.includes("@")) return email;

      const [user, domain] = email.split("@");

      let censoredUser;
      if (user.length <= 3) {
        censoredUser = user[0] + "*".repeat(Math.max(user.length - 1, 0));
      } else {
        const visible = user.slice(0, 2);
        const hidden = "*".repeat(Math.max(user.length - 2, 0));
        censoredUser = visible + hidden;
      }

      const domainParts = domain.split(".");
      const domainMain = domainParts[0] || "";
      const domainExt = domainParts[1] || "";

      const censoredDomainMain =
        domainMain.length <= 2
          ? "*".repeat(domainMain.length)
          : domainMain[0] +
            "*".repeat(Math.max(domainMain.length - 2, 0)) +
            domainMain.slice(-1);

      const censoredDomainExt =
        domainExt.length <= 2
          ? "*".repeat(domainExt.length)
          : "*".repeat(Math.max(domainExt.length - 1, 0)) + domainExt.slice(-1);

      const censoredDomain = `${censoredDomainMain}.${censoredDomainExt}`;

      return `${censoredUser}@${censoredDomain}`;
    };

    const queues = queuesRaw.map((queue) => ({
      ...queue,
      services: queue.services.map((qs) => qs.service),
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

    res.json({
      success: true,
      data: queues,
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

const getTicketById = async (req, res, next) => {
  try {
    const queueId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    if (!queueId) {
      throw Object.assign(new Error("queueId wajib diisi"), { status: 400 });
    }

    if (!userId) {
      throw Object.assign(new Error("User tidak ditemukan."), { status: 400 });
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
      throw Object.assign(new Error("Antrian tidak ditemukan"), {
        status: 404,
      });
    }

    if (req.user && queue.userId !== userId) {
      throw Object.assign(new Error("Tidak berhak mengakses tiket ini"), {
        status: 403,
      });
    }

    const services = queue.services.map((qs) => qs.service);

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
      throw Object.assign(new Error("queueId wajib diisi"), { status: 400 });
    }

    if (!loketId) {
      throw Object.assign(new Error("Loket tidak ditemukan."), { status: 400 });
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
      throw Object.assign(new Error("Antrian tidak ditemukan"), {
        status: 404,
      });
    }

    if (req.loket && queue.loketId !== loketId) {
      throw Object.assign(new Error("Tidak berhak mengakses tiket ini"), {
        status: 403,
      });
    }

    const services = queue.services.map((qs) => qs.service);

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
      throw Object.assign(new Error("User tidak ditemukan."), { status: 400 });
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
      services: queue.services.map((qs) => qs.service),
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
      throw Object.assign(new Error("Cabang tidak ditemukan pada akun CS."), {
        status: 400,
      });
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

const getActiveCustomerByCS = async (req, res, next) => {
  try {
    const csId = req.cs?.csId;
    if (!csId) {
      throw Object.assign(new Error("CS ID tidak ditemukan pada akun CS."), {
        status: 400,
      });
    }

    const queue = await prisma.queue.findFirst({
      where: {
        status: "in progress",
        csId: csId,
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

    if (!queue) {
      throw Object.assign(
        new Error("CS tidak sedang melayani nasabah manapun."),
        {
          status: 404,
        }
      );
    }

    const result = {
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
    };

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getQueueDetailByCSId = async (req, res, next) => {
  try {
    const csId = req.cs?.csId;
    if (!csId) {
      throw Object.assign(
        new Error("Unauthorized: CS ID tidak ditemukan dalam token."),
        {
          status: 401,
        }
      );
    }

    const queue = await prisma.queue.findFirst({
      where: {
        csId,
        status: "in progress",
      },
    });

    if (!queue) {
      return res.status(200).json({
        id: null,
        ticketNumber: null,
        status: null,
        calledAt: null,
        name: null,
        services: null,
      });
    }

    const queueServices = await prisma.queueService.findMany({
      where: { queueId: queue.id },
      include: {
        service: {
          select: { serviceName: true },
        },
      },
    });

    const services = queueServices.map((qs) => qs.service.serviceName);

    res.json({
      id: queue.id,
      ticketNumber: queue.ticketNumber,
      status: queue.status,
      calledAt: queue.calledAt,
      name: queue.name,
      services,
    });
  } catch (error) {
    next(error);
  }
};

const getCalledCustomerByCS = async (req, res, next) => {
  try {
    const csId = req.cs?.csId;
    if (!csId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: CS ID tidak ditemukan dalam token." });
    }

    const queue = await prisma.queue.findFirst({
      where: {
        csId,
        status: "called",
      },
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
      },
    });

    if (!queue) {
      return res.status(200).json({
        isCalling: false,
        queueId: null,
        ticketNumber: null,
        calledAt: null,
        nasabah: null,
        status: null,
      });
    }

    res.status(200).json({
      isCalling: true,
      queueId: queue.id,
      ticketNumber: queue.ticketNumber,
      calledAt: queue.calledAt,
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
    });
  } catch (error) {
    next(error);
  }
};

const getCalledCustomerTV = async (req, res, next) => {
  try {
    const csId = req.cs?.csId;

    if (!csId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: CS ID tidak ditemukan." });
    }

    const csLogin = await prisma.cS.findUnique({
      where: { id: csId },
      select: {
        branchId: true,
      },
    });

    if (!csLogin) {
      return res.status(404).json({ message: "CS tidak ditemukan." });
    }

    const queue = await prisma.queue.findFirst({
      where: {
        branchId: csLogin.branchId,
        status: "called",
        NOT: { calledAt: null },
      },
      orderBy: {
        calledAt: "desc",
      },
      select: {
        ticketNumber: true,
        status: true,
        calledAt: true,
        csId: true,
      },
    });

    if (!queue) {
      return res
        .status(404)
        .json({ message: "Tidak ada antrian dengan status 'called'." });
    }

    let queueCS = null;
    if (queue.csId) {
      queueCS = await prisma.cS.findUnique({
        where: { id: queue.csId },
        select: {
          name: true,
        },
      });
    }

    res.json({
      csId: queue.csId,
      csName: queueCS?.name || null,
      ticketNumber: queue.ticketNumber,
      status: queue.status,
      calledAt: queue.calledAt,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bookQueueOnline,
  bookQueueOffline,
  cancelQueue: updateStatus("canceled"),
  skipQueue: updateStatus("skipped"),
  callQueue,
  takeQueue,
  doneQueue: updateStatus("done"),
  getQueueCountByBranchIdLoket,
  getQueueCountAdmin,
  getLatestInProgressQueueCS,
  getLatestInProgressQueueLoket,
  getWaitingQueuesByBranchIdCS,
  getWaitingQueuesByBranchIdLoket,
  getOldestWaitingQueueCS,
  getOldestWaitingQueueLoket,
  getOldestWaitingQueueUser,
  getAllQueues,
  getTicketById,
  getLoketTicketById,
  getUserQueueHistory,
  getActiveCSCustomer,
  getActiveCustomerByCS,
  getQueueDetailByCSId,
  getCalledCustomerByCS,
  getCalledCustomerTV,
};
