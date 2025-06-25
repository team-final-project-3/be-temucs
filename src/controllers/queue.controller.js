const prisma = require("../../prisma/client");
const {
  generateTicketNumberAndEstimate,
} = require("../helpers/generateTicketNumberAndEstimate");
const sendExpoNotification = require("../helpers/sendExpoNotification");

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
      throw Object.assign(new Error("Data tidak lengkap"), { status: 400 });
    }

    const now = new Date();
    // if (now.getHours() >= 15) {
    //   throw Object.assign(
    //     new Error("Booking offline hanya bisa dilakukan sebelum jam 15.00"),
    //     { status: 403 }
    //   );
    // }

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

        if (nextQueues.length === 5) {
          const queueKe5 = nextQueues[4];
          if (queueKe5.userId) {
            const user = await tx.user.findUnique({
              where: { id: queueKe5.userId },
            });
            if (user && user.expoPushToken) {
              await sendExpoNotification(
                user.expoPushToken,
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

    res.json({ message: "Queue status updated to in progress", queue });
  } catch (error) {
    next(error);
  }
};

// const getQueueCountByBranchIdCS = async (req, res, next) => {
//   try {
//     const branchId = req.cs.branchId;

//     if (!branchId) {
//       throw Object.assign(new Error("Cabang tidak ditemukan pada akun CS"), {
//         status: 400,
//       });
//     }

//     const count = await prisma.queue.count({
//       where: {
//         branchId: Number(branchId),
//         status: {
//           notIn: ["done", "skipped", "canceled"],
//         },
//       },
//     });

//     res.status(200).json({
//       branchId: Number(branchId),
//       totalQueue: count,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

const getQueueCountByBranchIdLoket = async (req, res, next) => {
  try {
    const branchId = req.loket.branchId;

    if (!branchId) {
      throw Object.assign(new Error("Cabang tidak ditemukan pada akun Loket"), {
        status: 400,
      });
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

// const getQueueCountByBranchIdUser = async (req, res, next) => {
//   try {
//     const branchId = req.user.branchId;

//     if (!branchId) {
//       throw Object.assign(new Error("Cabang tidak ditemukan pada akun Anda"), {
//         status: 400,
//       });
//     }

//     const count = await prisma.queue.count({
//       where: {
//         branchId: Number(branchId),
//         status: {
//           notIn: ["done", "skipped", "canceled"],
//         },
//       },
//     });

//     res.status(200).json({
//       branchId: Number(branchId),
//       totalQueue: count,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// const getRemainingQueueUser = async (req, res, next) => {
//   try {
//     const queueId = parseInt(req.params.id, 10);
//     const branchId = req.user?.branchId;

//     if (!queueId || !branchId) {
//       throw Object.assign(new Error("Data tidak valid"), {
//         status: 400,
//       });
//     }

//     const remaining = await prisma.queue.count({
//       where: {
//         branchId: Number(branchId),
//         id: { lt: queueId },
//         status: { notIn: ["done", "skipped", "canceled"] },
//       },
//     });

//     res.status(200).json({
//       queueId,
//       branchId,
//       remainingInFront: remaining,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// const getRemainingQueueLoket = async (req, res, next) => {
//   try {
//     const queueId = parseInt(req.params.id, 10);
//     const branchId = req.loket?.branchId;

//     if (!queueId || !branchId) {
//       throw Object.assign(new Error("Data tidak valid"), {
//         status: 400,
//       });
//     }

//     const remaining = await prisma.queue.count({
//       where: {
//         branchId: Number(branchId),
//         id: { lt: queueId },
//         status: { notIn: ["done", "skipped", "canceled"] },
//       },
//     });

//     res.status(200).json({
//       queueId,
//       branchId,
//       remainingInFront: remaining,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// const getRemainingQueueCS = async (req, res, next) => {
//   try {
//     const queueId = parseInt(req.params.id, 10);
//     const branchId = req.cs?.branchId;

//     if (!queueId || !branchId) {
//       throw Object.assign(new Error("Data tidak valid"), {
//         status: 400,
//       });
//     }

//     const remaining = await prisma.queue.count({
//       where: {
//         branchId: Number(branchId),
//         id: { lt: queueId },
//         status: { notIn: ["done", "skipped", "canceled"] },
//       },
//     });

//     res.status(200).json({
//       queueId,
//       branchId,
//       remainingInFront: remaining,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

const getLatestInProgressQueueCS = async (req, res, next) => {
  try {
    const branchId = req.cs?.branchId;

    if (!branchId) {
      throw Object.assign(new Error("ID Cabang tidak ditemukan di akun CS."), {
        status: 400,
      });
    }

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

    if (!branchId) {
      throw Object.assign(
        new Error("ID Cabang tidak ditemukan di akun Loket."),
        {
          status: 400,
        }
      );
    }

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

const getLatestInProgressQueueUser = async (req, res, next) => {
  try {
    const branchId = req.user?.branchId;

    if (!branchId) {
      throw Object.assign(
        new Error("ID Cabang tidak ditemukan di akun Loket."),
        {
          status: 400,
        }
      );
    }

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

    res.json({ success: true, data: queues });
  } catch (error) {
    console.error("Error fetching queues:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Internal Server Error" });
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
    console.log(csId);
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

    const services =
      Array.isArray(queueServices) && queueServices.length > 0
        ? queueServices.map((qs) => qs.service.serviceName)
        : [];

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

module.exports = {
  bookQueueOnline,
  bookQueueOffline,
  cancelQueue: updateStatus("canceled"),
  skipQueue: updateStatus("skipped"),
  callQueue,
  takeQueue,
  doneQueue: updateStatus("done"),
  // getQueueCountByBranchIdCS,
  getQueueCountByBranchIdLoket,
  // getQueueCountByBranchIdUser,
  // getRemainingQueueCS,
  // getRemainingQueueLoket,
  // getRemainingQueueUser,
  getLatestInProgressQueueCS,
  getLatestInProgressQueueLoket,
  getLatestInProgressQueueUser,
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
};
