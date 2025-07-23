import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

app.set("io", io);

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {};

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);
    socket.to(roomId).emit("peer:joined");
  });

  socket.on("webrtc:offer", ({ roomId, offer }) =>
    socket.to(roomId).emit("webrtc:offer", { offer })
  );
  socket.on("webrtc:answer", ({ roomId, answer }) =>
    socket.to(roomId).emit("webrtc:answer", { answer })
  );
  socket.on("webrtc:ice", ({ roomId, candidate }) =>
    socket.to(roomId).emit("webrtc:ice", { candidate })
  );

  socket.on("webrtc:end", ({ roomId }) => {
    socket.to(roomId).emit("webrtc:end");
    socket.leave(roomId);
  });

  socket.on("typing:start", ({ to }) => {
    const recv = getReceiverSocketId(to);
    recv && io.to(recv).emit("typing:start", { from: userId });
  });
  socket.on("typing:stop", ({ to }) => {
    const recv = getReceiverSocketId(to);
    recv && io.to(recv).emit("typing:stop", { from: userId });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
