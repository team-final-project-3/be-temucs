const app = require("./app");
const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const setupSocketIO = require("../socket");
const io = setupSocketIO(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
