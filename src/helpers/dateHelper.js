function getStartEndOfBookingDateWIB(bookingDate) {
  const offsetMs = 7 * 60 * 60 * 1000; // GMT+7
  const start = new Date(bookingDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(bookingDate);
  end.setHours(23, 59, 59, 999);

  const startUTC = new Date(start.getTime() - offsetMs);
  const endUTC = new Date(end.getTime() - offsetMs);

  return { startUTC, endUTC };
}

function wibToUTC(dateWIB) {
  return new Date(dateWIB.getTime() - 7 * 60 * 60 * 1000);
}

module.exports = { getStartEndOfBookingDateWIB, wibToUTC };
