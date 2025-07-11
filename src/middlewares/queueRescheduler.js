const prisma = require("../../prisma/client");
const cron = require("node-cron");
const sendExpoNotification = require("../helpers/sendExpoNotification");
const { wibToUTC } = require("../helpers/dateHelper");

function getNextWorkingDayWIB(date) {
  let next = new Date(date);
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6);
  next.setHours(8, 0, 0, 0);
  return next;
}

async function generateTicketNumberForReschedule(branchId, bookingDate, index) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new Error("Cabang tidak ditemukan");
  const paddingNumber = String(index + 1).padStart(3, "0");
  return `${branch.branchCode}-${paddingNumber}`;
}

const rescheduleWaitingQueues = async () => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const waitingQueues = await prisma.queue.findMany({
    where: {
      status: "waiting",
      bookingDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    orderBy: [{ branchId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  if (waitingQueues.length === 0) return;

  const nextWorkingDayWIB = getNextWorkingDayWIB(now);
  const tomorrow = wibToUTC(nextWorkingDayWIB);

  const branchQueuesMap = {};
  for (const queue of waitingQueues) {
    if (!branchQueuesMap[queue.branchId]) branchQueuesMap[queue.branchId] = [];
    branchQueuesMap[queue.branchId].push(queue);
  }

  for (const branchIdStr in branchQueuesMap) {
    const branchId = Number(branchIdStr);
    const queues = branchQueuesMap[branchId];

    let currentTime = new Date(tomorrow);

    for (let i = 0; i < queues.length; i++) {
      const queue = queues[i];

      const services = await prisma.serviceOnQueue.findMany({
        where: { queueId: queue.id },
        include: { service: { select: { estimatedTime: true } } },
      });
      const totalMinutes = services.reduce(
        (sum, s) => sum + (s.service.estimatedTime || 0),
        0
      );

      const ticketNumber = await generateTicketNumberForReschedule(
        branchId,
        tomorrow,
        i
      );

      await prisma.queue.update({
        where: { id: queue.id },
        data: {
          bookingDate: tomorrow,
          estimatedTime: new Date(currentTime),
          ticketNumber,
          updatedAt: new Date(),
          updatedBy: "system-cron",
        },
      });

      await prisma.queueLog.create({
        data: {
          queueId: queue.id,
          status: "waiting",
          createdBy: "system-cron",
          updatedBy: "system-cron",
        },
      });

      const user = queue.userId
        ? await prisma.user.findUnique({ where: { id: queue.userId } })
        : null;

      if (user && user.expoPushToken) {
        const jam = currentTime.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        await sendExpoNotification(
          user.expoPushToken,
          "Antrian Di-reschedule",
          `Antrian Anda telah dijadwalkan ulang ke besok jam ${jam} dengan nomor tiket ${ticketNumber}`,
          { ticketNumber, bookingDate: tomorrow, jam }
        );
      }

      currentTime = new Date(currentTime.getTime() + totalMinutes * 60000);
    }
  }

  console.log(
    `[${new Date().toISOString()}] Rescheduled ${
      waitingQueues.length
    } waiting queues to tomorrow 08:00 & reset ticketNumber`
  );
};

cron.schedule("0 15 * * *", rescheduleWaitingQueues, {
  timezone: "Asia/Jakarta",
});

module.exports = rescheduleWaitingQueues;
