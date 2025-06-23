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

  // Ambil semua antrian waiting di hari itu
  let allQueuesToday = await tx.queue.findMany({
    where: {
      branchId,
      estimatedTime: {
        gte: startUTC,
        lte: endUTC,
      },
      // status: "waiting", // HAPUS filter status!
    },
    orderBy: { ticketNumber: "asc" },
  });

  // Ambil branchCode
  const branch = await tx.branch.findUnique({ where: { id: branchId } });

  let nextNumber = allQueuesToday.length + 1;
  ticketNumber = `${branch.branchCode}-${String(nextNumber).padStart(3, "0")}`;

  // Hitung estimasi waktu layanan baru
  let estimatedTimeDate;
  const now = new Date();
  const bookingWIB = toWIB(now);
  const minStartWIB = new Date(bookingWIB);
  minStartWIB.setHours(8, 0, 0, 0);

  // Hitung total waktu existing
  let lastEstimatedTime = null;
  if (activeQueues.length > 0) {
    const lastQueue = activeQueues[activeQueues.length - 1];
    lastEstimatedTime = lastQueue.estimatedTime;
    // Tambahkan total estimasi layanan antrian terakhir
    let lastDuration = 0;
    for (const s of lastQueue.services) {
      lastDuration += s.service.estimatedTime || 0;
    }
    estimatedTimeDate = new Date(
      new Date(lastEstimatedTime).getTime() + lastDuration * 60000
    );
  } else {
    // Slot pertama: max(jam booking, jam 08:00 WIB)
    estimatedTimeDate = toUTC(
      bookingWIB > minStartWIB ? bookingWIB : minStartWIB
    );
  }

  let estimatedTimeWIB = toWIB(estimatedTimeDate);
  if (
    estimatedTimeWIB.getHours() > 15 ||
    (estimatedTimeWIB.getHours() === 15 && estimatedTimeWIB.getMinutes() > 0)
  ) {
    // Geser ke hari berikutnya
    estimatedTimeWIB.setDate(estimatedTimeWIB.getDate() + 1);

    // Cek jumlah antrian di hari baru
    const { startUTC: nextStartUTC, endUTC: nextEndUTC } =
      getStartEndOfBookingDateWIB(estimatedTimeWIB);
    const nextDayQueues = await tx.queue.findMany({
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

    let nextNumber;
    if (nextDayQueues.length > 0) {
      const lastQueue = nextDayQueues[nextDayQueues.length - 1];
      let lastEstimatedTimeWIB = toWIB(lastQueue.estimatedTime);
      let lastDuration = 0;
      for (const s of lastQueue.services) {
        lastDuration += s.service.estimatedTime || 0;
      }
      estimatedTimeWIB = new Date(
        lastEstimatedTimeWIB.getTime() + lastDuration * 60000
      );

      nextNumber = nextDayQueues.length + 1;
    } else {
      // Tidak ada antrian, mulai dari jam 08:00 WIB
      estimatedTimeWIB.setHours(8, 0, 0, 0);
      nextNumber = 1;
    }

    estimatedTimeDate = toUTC(estimatedTimeWIB);
    ticketNumber = `${branch.branchCode}-${String(nextNumber).padStart(
      3,
      "0"
    )}`;
  }

  const notification = activeQueues.length < 5;

  return { ticketNumber, estimatedTimeDate, notification };
}

module.exports = { generateTicketNumberAndEstimate };
