const express = require("express");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const dummyRoutes = require("./routes/dummy.routes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./configs/swagger");

const app = express();

app.use(express.json());
app.use("/api", userRoutes, adminRoutes, dummyRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = app;
