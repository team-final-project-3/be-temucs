const { getStartEndOfBookingDateWIB } = require("./dateHelper");

function toWIB(date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000);
}
function toUTCfromWIB(date) {
  return new Date(date.getTime() - 7 * 60 * 60 * 1000);
}
function getNextWorkingDay(date) {
  let next = new Date(date);
  do {
    next.setUTCDate(next.getUTCDate() + 1);
  } while (next.getUTCDay() === 0 || next.getUTCDay() === 6);
  next.setUTCHours(8, 0, 0, 0);
  return next;
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
  console.log("branch found", branch);
  if (!branch) {
    throw new Error("Branch tidak ditemukan.");
  }

  const csList = await tx.cS.findMany({
    where: {
      branchId,
      NOT: {
        username: {
          contains: "tv",
          mode: "insensitive",
        },
      },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  console.log("csList", csList);
  const csCountWithoutTV = csList.length;

  if (csCountWithoutTV <= 0) {
    throw new Error("Tidak ada CS yang tersedia di cabang ini.");
  }

  let csAvailableTimes = Array(csCountWithoutTV)
    .fill(0)
    .map(() => new Date(toWIB(bookingDate)));
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

  console.log("allQueuesToday", allQueuesToday);

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

  async function getNextAvailableSlot(dateWIB) {
    if (dateWIB.getUTCHours() < 8) {
      dateWIB.setUTCHours(8, 0, 0, 0);
    } else if (
      dateWIB.getUTCHours() > 15 ||
      (dateWIB.getUTCHours() === 15 && dateWIB.getUTCMinutes() > 0)
    ) {
      const nextDay = getNextWorkingDay(dateWIB);

      const { startUTC: nextStartUTC, endUTC: nextEndUTC } =
        getStartEndOfBookingDateWIB(nextDay);

      let csAvailableTimesNext = Array(csCountWithoutTV)
        .fill(0)
        .map(() => new Date(nextDay));
      const allQueuesNextDay = await tx.queue.findMany({
        where: {
          branchId,
          estimatedTime: {
            gte: nextStartUTC,
            lte: nextEndUTC,
          },
        },
        orderBy: { estimatedTime: "asc" },
        include: {
          services: {
            include: { service: { select: { estimatedTime: true } } },
          },
        },
      });

      for (const queue of allQueuesNextDay) {
        let selectedSlot = 0;
        let earliestTime = csAvailableTimesNext[0];
        for (let i = 1; i < csAvailableTimesNext.length; i++) {
          if (csAvailableTimesNext[i] < earliestTime) {
            earliestTime = csAvailableTimesNext[i];
            selectedSlot = i;
          }
        }
        let totalDuration = 0;
        for (const s of queue.services) {
          totalDuration += s.service.estimatedTime || 0;
        }
        csAvailableTimesNext[selectedSlot] = new Date(
          Math.max(
            csAvailableTimesNext[selectedSlot].getTime(),
            toWIB(queue.estimatedTime).getTime()
          ) +
            totalDuration * 60000
        );
      }

      let selectedSlotNext = 0;
      let earliestTimeNext = csAvailableTimesNext[0];
      for (let i = 1; i < csAvailableTimesNext.length; i++) {
        if (csAvailableTimesNext[i] < earliestTimeNext) {
          earliestTimeNext = csAvailableTimesNext[i];
          selectedSlotNext = i;
        }
      }

      return getNextAvailableSlot(new Date(earliestTimeNext));
    }
    return dateWIB;
  }

  estimatedTimeWIB = await getNextAvailableSlot(estimatedTimeWIB);

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
  const ticketNumber = `B-${branch.branchCode}-${String(nextNumber).padStart(
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
