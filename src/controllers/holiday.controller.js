const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cron = require("node-cron");

const updateBranchHolidayStatus = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const holiday = await prisma.holiday.findFirst({
      where: { date: today },
    });

    if (holiday) {
      await prisma.branch.updateMany({ data: { holiday: true } });
      console.log("Hari ini libur, semua branch holiday = true");
    } else {
      await prisma.branch.updateMany({ data: { holiday: false } });
      console.log("Hari ini bukan libur, semua branch holiday = false");
    }
  } catch (error) {
    console.error("Error updating branch holiday status:", error);
  }
};

// Jalankan setiap hari jam 00:01 WIB
cron.schedule("1 0 * * *", updateBranchHolidayStatus, {
  timezone: "Asia/Jakarta",
});

module.exports = { updateBranchHolidayStatus };
