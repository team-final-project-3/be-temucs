const { getStartEndOfBookingDateWIB } = require("./dateHelper");

function toWIB(date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000);
}
function toUTCfromWIB(date) {
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
    where: {
      branchId,
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const csCount = csList.length;
  const csCountWithoutTV = csCount > 0 ? csCount - 1 : 0;

  let csAvailableTimes = Array(csCountWithoutTV).fill(toWIB(bookingDate));
  let csSlotIds = csList.slice(0, csCountWithoutTV).map((cs) => cs.id);

  const allQueuesToday = await tx.queue.findMany({
    where: {
      branchId,
      estimatedTime: {
        gte: startUTC,
        lte: endUTC,
      },
    },
    orderBy: { estimatedTime: "asc" },
    include: {
      services: {
        include: { service: { select: { estimatedTime: true } } },
      },
    },
  });

  for (const queue of allQueuesToday) {
    let selectedSlot = 0;
    let earliestTime = csAvailableTimes[0];
    for (let i = 1; i < csAvailableTimes.length; i++) {
      if (csAvailableTimes[i] < earliestTime) {
        earliestTime = csAvailableTimes[i];
        selectedSlot = i;
      }
    }
    let totalDuration = 0;
    for (const s of queue.services) {
      totalDuration += s.service.estimatedTime || 0;
    }
    csAvailableTimes[selectedSlot] = new Date(
      Math.max(
        csAvailableTimes[selectedSlot].getTime(),
        toWIB(queue.estimatedTime).getTime()
      ) +
        totalDuration * 60000
    );
  }

  let selectedSlot = 0;
  let earliestTime = csAvailableTimes[0];
  for (let i = 1; i < csAvailableTimes.length; i++) {
    if (csAvailableTimes[i] < earliestTime) {
      earliestTime = csAvailableTimes[i];
      selectedSlot = i;
    }
  }

  let estimatedTimeWIB = new Date(
    Math.max(earliestTime.getTime(), toWIB(bookingDate).getTime())
  );

  if (estimatedTimeWIB.getUTCHours() < 8) {
    estimatedTimeWIB.setUTCHours(8, 0, 0, 0);
  } else if (
    estimatedTimeWIB.getUTCHours() > 15 ||
    (estimatedTimeWIB.getUTCHours() === 15 &&
      estimatedTimeWIB.getUTCMinutes() > 0)
  ) {
    estimatedTimeWIB.setUTCDate(estimatedTimeWIB.getUTCDate() + 1);
    estimatedTimeWIB.setUTCHours(8, 0, 0, 0);
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

  const estimatedTimeDate = toUTCfromWIB(estimatedTimeWIB);
  const notification = allQueuesThisDay.length < 5;

  console.log({
    bookingDate,
    bookingWIB: toWIB(bookingDate),
    estimatedTimeWIB,
    estimatedTimeDate: toUTCfromWIB(estimatedTimeWIB),
  });

  return {
    ticketNumber,
    estimatedTimeDate,
    notification,
    csId: csSlotIds[selectedSlot],
  };
}

module.exports = { generateTicketNumberAndEstimate };
