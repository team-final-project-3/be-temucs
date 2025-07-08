const { Server } = require("socket.io");

const setupSocketIO = (httpServer) => {
  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

    socket.on("message", (data) => {
      console.log("Message received:", data);
      io.emit("message", data);
    });
  });

  return io;
};

module.exports = setupSocketIO;
