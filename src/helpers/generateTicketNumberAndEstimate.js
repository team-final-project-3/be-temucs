const { getStartEndOfBookingDateWIB } = require("./dateHelper");

function toWIB(date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000);
}
function toUTC(date) {
  return new Date(date.getTime() - 7 * 60 * 60 * 1000);
}

async function generateTicketNumberAndEstimate(
  tx,
  branchId,
  bookingDate,
  serviceIds,
  username
) {
  const { startUTC, endUTC } = getStartEndOfBookingDateWIB(bookingDate);

  const branch = await tx.branch.findUnique({ where: { id: branchId } });

  const csList = await tx.cS.findMany({
    where: { branchId },
    select: { id: true },
  });

  let csAvailableTimes = {};
  for (const cs of csList) {
    const lastQueue = await tx.queue.findFirst({
      where: {
        branchId,
        csId: cs.id,
        estimatedTime: {
          gte: startUTC,
          lte: endUTC,
        },
      },
      orderBy: { estimatedTime: "desc" },
      include: {
        services: {
          include: { service: { select: { estimatedTime: true } } },
        },
      },
    });

    if (lastQueue) {
      let lastFinish = toWIB(lastQueue.estimatedTime);
      let lastDuration = 0;
      for (const s of lastQueue.services)
        lastDuration += s.service.estimatedTime || 0;
      csAvailableTimes[cs.id] = new Date(
        lastFinish.getTime() + lastDuration * 60000
      );
    } else {
      let bookingWIB = toWIB(bookingDate);
      let startWIB = new Date(bookingWIB);
      if (startWIB.getHours() < 8) startWIB.setHours(8, 0, 0, 0);
      csAvailableTimes[cs.id] = startWIB;
    }
  }

  let selectedCSId = null;
  let earliestTime = null;
  for (const [csId, time] of Object.entries(csAvailableTimes)) {
    if (!earliestTime || time < earliestTime) {
      earliestTime = time;
      selectedCSId = csId;
    }
  }

  let estimatedTimeWIB = new Date(earliestTime);

  while (
    estimatedTimeWIB.getHours() > 15 ||
    (estimatedTimeWIB.getHours() === 15 && estimatedTimeWIB.getMinutes() > 0)
  ) {
    estimatedTimeWIB.setDate(estimatedTimeWIB.getDate() + 1);
    estimatedTimeWIB.setHours(8, 0, 0, 0);

    csAvailableTimes = {};
    for (const cs of csList) {
      const { startUTC: nextStartUTC, endUTC: nextEndUTC } =
        getStartEndOfBookingDateWIB(estimatedTimeWIB);
      const lastQueue = await tx.queue.findFirst({
        where: {
          branchId,
          csId: cs.id,
          estimatedTime: {
            gte: nextStartUTC,
            lte: nextEndUTC,
          },
        },
        orderBy: { estimatedTime: "desc" },
        include: {
          services: {
            include: { service: { select: { estimatedTime: true } } },
          },
        },
      });

      if (lastQueue) {
        let lastFinish = toWIB(lastQueue.estimatedTime);
        let lastDuration = 0;
        for (const s of lastQueue.services)
          lastDuration += s.service.estimatedTime || 0;
        csAvailableTimes[cs.id] = new Date(
          lastFinish.getTime() + lastDuration * 60000
        );
      } else {
        let bookingWIB = toWIB(estimatedTimeWIB);
        let startWIB = new Date(bookingWIB);
        if (startWIB.getHours() < 8) startWIB.setHours(8, 0, 0, 0);
        csAvailableTimes[cs.id] = startWIB;
      }
    }
    selectedCSId = null;
    earliestTime = null;
    for (const [csId, time] of Object.entries(csAvailableTimes)) {
      if (!earliestTime || time < earliestTime) {
        earliestTime = time;
        selectedCSId = csId;
      }
    }
    estimatedTimeWIB = new Date(earliestTime);
  }

  const { startUTC: ticketStartUTC, endUTC: ticketEndUTC } =
    getStartEndOfBookingDateWIB(estimatedTimeWIB);
  const allQueuesThisDay = await tx.queue.findMany({
    where: {
      branchId,
      estimatedTime: {
        gte: ticketStartUTC,
        lte: ticketEndUTC,
      },
    },
  });
  let nextNumber = allQueuesThisDay.length + 1;
  const ticketNumber = `${branch.branchCode}-${String(nextNumber).padStart(
    3,
    "0"
  )}`;

  const estimatedTimeDate = toUTC(estimatedTimeWIB);
  const notification = allQueuesThisDay.length < 5;

  return {
    ticketNumber,
    estimatedTimeDate,
    notification,
    csId: Number(selectedCSId),
  };
}

module.exports = { generateTicketNumberAndEstimate };
