const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function generateTicketNumber(branchId, bookingDate) {
  // Ambil branchCode
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new Error("Branch not found");

  // Hitung jumlah antrian pada hari bookingDate di branch tersebut
  const startOfDay = new Date(bookingDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(bookingDate);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await prisma.queue.count({
    where: {
      branchId,
      bookingDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Ticket number = branchCode-NNN (increment per hari per branch)
  const paddingNumber = String(count + 1).padStart(3, "0");
  return `${branch.branchCode}-${paddingNumber}`;
}

const bookQueueOnline = async (req, res) => {
  const { userId, branchId, bookingDate, name, email, phoneNumber } = req.body;
  try {
    const ticketNumber = await generateTicketNumber(branchId, bookingDate);

    const queue = await prisma.queue.create({
      data: {
        userId,
        branchId,
        bookingDate: new Date(bookingDate),
        name,
        email,
        phoneNumber,
        ticketNumber,
        status: "waiting",
      },
    });
    res.status(201).json({ message: "Queue booked (online)", queue });
  } catch (error) {
    console.error("Book queue online error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const bookQueueOffline = async (req, res) => {
  const { loketId, branchId, bookingDate, name, email, phoneNumber } = req.body;
  try {
    const ticketNumber = await generateTicketNumber(branchId, bookingDate);

    const queue = await prisma.queue.create({
      data: {
        loketId,
        branchId,
        bookingDate: new Date(bookingDate),
        name,
        email,
        phoneNumber,
        ticketNumber,
        status: "waiting",
      },
    });
    res.status(201).json({ message: "Queue booked (offline)", queue });
  } catch (error) {
    console.error("Book queue offline error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateStatus = (newStatus) => async (req, res) => {
  const { id } = req.params;
  try {
    const queue = await prisma.queue.update({
      where: { id: Number(id) },
      data: { status: newStatus },
    });
    res.json({ message: `Queue status updated to ${newStatus}`, queue });
  } catch (error) {
    console.error(`Update queue status to ${newStatus} error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const takeQueue = async (req, res) => {
  const { id } = req.params;
  const { csId } = req.body;
  try {
    const queue = await prisma.queue.update({
      where: { id: Number(id) },
      data: { status: "in progress", csId },
    });
    res.json({ message: "Queue status updated to in progress", queue });
  } catch (error) {
    console.error("Update queue status to in progress error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  bookQueueOnline,
  bookQueueOffline,
  cancelQueue: updateStatus("canceled"),
  skipQueue: updateStatus("skipped"),
  takeQueue,
  doneQueue: updateStatus("done"),
};
