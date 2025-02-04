const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 9001;

app.use(cors());

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join-room", (peerId) => {
    socket.peerId = peerId;
    socket.join("default-room");
    console.log(`Peer ${peerId} joined default-room.`);

    socket.to("default-room").emit("user-connected", peerId);

    const roomPeers = io.sockets.adapter.rooms.get("default-room") || new Set();
    const existingPeers = [];
    roomPeers.forEach((clientId) => {
      const clientSocket = io.sockets.sockets.get(clientId);
      if (clientSocket && clientSocket.peerId && clientSocket.peerId !== peerId) {
        existingPeers.push(clientSocket.peerId);
      }
    });
    socket.emit("all-users", existingPeers);
  });

  socket.on("chat-message", (msg) => {
    socket.to("default-room").emit("chat-message", {
      sender: socket.peerId,
      text: msg,
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.peerId);
    socket.to("default-room").emit("user-disconnected", socket.peerId);
  });
});

app.get("/", (req, res) => {
  res.send("Signaling server is running");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Signaling server is running on port ${port}`);
});
