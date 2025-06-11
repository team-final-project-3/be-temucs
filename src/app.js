const express = require("express");
const authMiddleware = require("./middlewares/auth");
const userRoutes = require("./routes/user.routes");
const csRoutes = require("./routes/cs.routes");
const loketRoutes = require("./routes/loket.routes");
const dummyRoutes = require("./routes/dummy.routes");
const branchRoutes = require("./routes/branch.routes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./configs/swagger");

const app = express();

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

module.exports = app;
