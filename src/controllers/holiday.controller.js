const prisma = require("../../prisma/client");

const addHoliday = async (req, res, next) => {
  try {
    const username = req.user.username;
    const { holidayName, date } = req.body;
    if (!holidayName || !date) {
      throw Object.assign(new Error(), { status: 400 });
    }
    const holiday = await prisma.holiday.create({
      data: {
        holidayName,
        date: new Date(date),
        createdBy: username,
        updatedBy: username,
      },
    });
    res.status(201).json({ message: "Holiday added", holiday });
  } catch (error) {
    next(error);
  }
};

const editHoliday = async (req, res, next) => {
  try {
    const username = req.user.username;
    const id = parseInt(req.params.id, 10);
    const { holidayName, date } = req.body;

    if (isNaN(id)) {
      throw Object.assign(new Error(), { status: 400 });
    }

    if (!holidayName && !date) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        holidayName,
        date: date ? new Date(date) : undefined,
        updatedBy: username,
      },
    });
    res.json({ message: "Holiday updated", holiday });
  } catch (error) {
    next(error);
  }
};

const updateHolidayStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const username = req.user.username;

    const holiday = await prisma.holiday.findUnique({ where: { id } });

    if (!holiday) {
      throw Object.assign(new Error("Holiday not found"), { status: 404 });
    }

    const status = !holiday.status;

    const updatedHoliday = await prisma.holiday.update({
      where: { id },
      data: {
        status: status,
        updatedBy: username,
      },
    });

    res.status(200).json({
      message: `Holiday ${status ? "activated" : "deactivated"} successfully`,
      holiday: updatedHoliday,
    });
  } catch (error) {
    next(error);
  }
};

const getHoliday = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw Object.assign(new Error(), { status: 400 });
    }
    const holiday = await prisma.holiday.findUnique({ where: { id } });
    if (!holiday) {
      throw Object.assign(new Error(), { status: 404 });
    }
    res.json({ holiday });
  } catch (error) {
    next(error);
  }
};

const getAllHoliday = async (req, res, next) => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: "asc" },
    });
    res.json({ holidays });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addHoliday,
  editHoliday,
  updateHolidayStatus,
  getHoliday,
  getAllHoliday,
};
