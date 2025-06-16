const express = require("express");
const cors = require("cors");
const authMiddleware = require("./middlewares/auth");
const userRoutes = require("./routes/user.routes");
const csRoutes = require("./routes/cs.routes");
const loketRoutes = require("./routes/loket.routes");
const dummyRoutes = require("./routes/dummy.routes");
const branchRoutes = require("./routes/branch.routes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./configs/swagger");

require("./controllers/holiday.controller");

const app = express();

app.use((req, res, next) => {
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
});

app.use(cors());
app.use(express.json());
app.use(
  "/api",
  authMiddleware,
  userRoutes,
  csRoutes,
  loketRoutes,
  dummyRoutes,
  branchRoutes
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

module.exports = app;
