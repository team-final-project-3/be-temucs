const { getStartEndOfBookingDateWIB } = require("./dateHelper");

async function generateTicketNumberAndEstimate(
  tx,
  branchId,
  bookingDate,
  serviceIds,
  username
) {
  const { startUTC, endUTC } = getStartEndOfBookingDateWIB(bookingDate);

  const count = await tx.queue.count({
    where: {
      branchId,
      estimatedTime: {
        gte: startUTC,
        lte: endUTC,
      },
    },
  });

  const branch = await tx.branch.findUnique({ where: { id: branchId } });
  const paddingNumber = String(count + 1).padStart(3, "0");
  const ticketNumber = `${branch.branchCode}-${paddingNumber}`;

  const activeQueues = await tx.queue.findMany({
    where: {
      branchId,
      estimatedTime: {
        gte: startUTC,
        lte: endUTC,
      },
      status: "waiting",
    },
    orderBy: { createdAt: "asc" },
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

  const estimatedTimeDate = new Date(startUTC.getTime() + totalMinutes * 60000);
  const notification = activeQueues.length < 5;

  return { ticketNumber, estimatedTimeDate, notification };
}

module.exports = { generateTicketNumberAndEstimate };
