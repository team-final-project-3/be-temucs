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
  let activeQueues = await tx.queue.findMany({
    where: {
      branchId,
      estimatedTime: {
        gte: startUTC,
        lte: endUTC,
      },
      status: "waiting",
    },
    orderBy: { estimatedTime: "asc" },
    include: {
      services: {
        include: { service: { select: { estimatedTime: true } } },
      },
    },
  });

  // Ambil branchCode
  const branch = await tx.branch.findUnique({ where: { id: branchId } });

  // Hitung ticketNumber
  let ticketNumber = `${branch.branchCode}-${String(
    activeQueues.length + 1
  ).padStart(3, "0")}`;

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

  // Jika estimatedTimeDate lewat jam 15:00 WIB, geser ke hari berikutnya jam 08:00 WIB
  let estimatedTimeWIB = toWIB(estimatedTimeDate);
  if (
    estimatedTimeWIB.getHours() > 15 ||
    (estimatedTimeWIB.getHours() === 15 && estimatedTimeWIB.getMinutes() > 0)
  ) {
    estimatedTimeWIB.setDate(estimatedTimeWIB.getDate() + 1);
    estimatedTimeWIB.setHours(8, 0, 0, 0);
    estimatedTimeDate = toUTC(estimatedTimeWIB);
    ticketNumber = `${branch.branchCode}-001`;
  }

  const notification = activeQueues.length < 5;

  return { ticketNumber, estimatedTimeDate, notification };
}

module.exports = generateTicketNumberAndEstimate;
