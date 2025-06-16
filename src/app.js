const express = require("express");
const cors = require("cors");

const authMiddleware = require("./middlewares/auth");

const userRoutes = require("./routes/user.routes");
const csRoutes = require("./routes/cs.routes");
const loketRoutes = require("./routes/loket.routes");
const dummyRoutes = require("./routes/dummy.routes");
const branchRoutes = require("./routes/branch.routes");
const queueRoutes = require("./routes/queue.routes");
const queueServiceRoutes = require("./routes/queueservice.routes");

const serviceRoutes = require("./routes/service.routes");
const documentRoutes = require("./routes/document.routes");
const holidayRoutes = require("./routes/holiday.routes");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./configs/swagger");

require("./middlewares/holidayCron");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./middlewares/logger");

const app = express();

app.use(logger);

app.use(cors());
app.use(express.json());
app.use(
  "/api",
  authMiddleware,
  userRoutes,
  csRoutes,
  loketRoutes,
  dummyRoutes,
  branchRoutes,
  queueRoutes,
  queueServiceRoutes,
  documentRoutes,
  serviceRoutes,
  holidayRoutes
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);

module.exports = app;
