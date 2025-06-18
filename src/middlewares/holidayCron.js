const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cron = require("node-cron");

let isHolidayCache = false;
let todayStr = null;

// Fungsi untuk update cache holiday
const updateHolidayCache = async () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  todayStr = `${yyyy}-${mm}-${dd}`;

  const holidays = await prisma.holiday.findMany();
  isHolidayCache = holidays.some((h) => {
    const holidayDate = new Date(h.date);
    const hyyyy = holidayDate.getFullYear();
    const hmm = String(holidayDate.getMonth() + 1).padStart(2, "0");
    const hdd = String(holidayDate.getDate()).padStart(2, "0");
    const holidayStr = `${hyyyy}-${hmm}-${hdd}`;
    return holidayStr === todayStr;
  });
};

updateHolidayCache();

cron.schedule("1 0 * * *", () => {
  updateHolidayCache();
});

const holidayBlock = async (req, res, next) => {
  try {
    if (isHolidayCache) {
      const role = req.user?.role;
      if (role !== "admin") {
        return res
          .status(503)
          .json({
            message:
              "Hari ini libur, hanya admin yang dapat mengakses layanan.",
          });
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = holidayBlock;
