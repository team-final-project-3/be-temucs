module.exports = (req, res, next) => {
  res.on("finish", () => {
    let statusColor;
    if (res.statusCode >= 500) {
      statusColor = "\x1b[31m"; // red
    } else if (res.statusCode >= 400) {
      statusColor = "\x1b[33m"; // yellow
    } else if (res.statusCode >= 300) {
      statusColor = "\x1b[36m"; // cyan
    } else if (res.statusCode >= 200) {
      statusColor = "\x1b[32m"; // green
    } else {
      statusColor = "\x1b[0m"; // reset
    }
    const resetColor = "\x1b[0m";
    console.log(
      `${req.method} ${statusColor}${res.statusCode}${resetColor} ${req.originalUrl}`
    );
  });
  next();
};
