async function generateTicketNumberAndEstimate(
  tx,
  branchId,
  bookingDate,
  serviceIds,
  username
) {
  const startOfDay = new Date(bookingDate);
  startOfDay.setHours(8, 0, 0, 0);
  const endOfDay = new Date(bookingDate);
  endOfDay.setHours(15, 0, 0, 0);

  // Hitung jumlah queue pada hari itu di dalam transaksi
  const count = await tx.queue.count({
    where: {
      branchId,
      bookingDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const branch = await tx.branch.findUnique({ where: { id: branchId } });
  const paddingNumber = String(count + 1).padStart(3, "0");
  const ticketNumber = `${branch.branchCode}-${paddingNumber}`;

  const bookingDateObj = new Date(bookingDate);
  bookingDateObj.setHours(0, 0, 0, 0);

  const activeQueues = await tx.queue.findMany({
    where: {
      branchId,
      bookingDate: {
        gte: bookingDateObj,
        lte: endOfDay,
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

  // Hitung estimatedTime untuk queue baru
  const estimatedTimeDate = new Date(
    bookingDate.getTime() + totalMinutes * 60000
  );
  const notification = activeQueues.length < 5;

  return { ticketNumber, estimatedTimeDate, notification };
}

module.exports = { generateTicketNumberAndEstimate };

