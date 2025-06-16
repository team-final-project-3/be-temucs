const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cron = require("node-cron");

const updateBranchHolidayStatus = async () => {
  try {
    // Ambil tanggal hari ini dalam format YYYY-MM-DD (lokal)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Ambil semua holiday
    const holidays = await prisma.holiday.findMany();

    // Cek apakah ada holiday dengan tanggal sama (hanya tanggal, tanpa jam)
    const isHoliday = holidays.some((h) => {
      const holidayDate = new Date(h.date);
      const hyyyy = holidayDate.getFullYear();
      const hmm = String(holidayDate.getMonth() + 1).padStart(2, "0");
      const hdd = String(holidayDate.getDate()).padStart(2, "0");
      const holidayStr = `${hyyyy}-${hmm}-${hdd}`;
      return holidayStr === todayStr;
    });

    if (isHoliday) {
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

// Jalankan juga sekali saat server start
updateBranchHolidayStatus();

module.exports = {};
