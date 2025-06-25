const app = require("./app");
const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const setupSocketIO = require("../socket");
// const io = setupSocketIO(server);

//web socket
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: '*', // atau sesuaikan ke domain frontend
    methods: ['GET', 'POST']
  }
});

// Simpan ke global scope jika perlu broadcast dari mana saja
global.io = io;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});