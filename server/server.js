const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= STATIC FILES ================= */

app.use(express.static(path.join(__dirname, "../client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/login.html"));
});

/* ================= LOGIN ================= */

app.post("/login", (req, res) => {

  try {

    const { username, password } = req.body;

    if (!username || !password) {

      return res.json({
        success: false,
        message: "Enter username and password"
      });

    }

    return res.json({
      success: true
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: "Server error"
    });

  }

});

/* ================= STORAGE ================= */

const onlineUsers = {};
const socketToUser = {};
const pendingRequests = {};
const connections = {};

/* ================= SOCKET ================= */

io.on("connection", (socket) => {

  console.log("Socket Connected:", socket.id);

  /* ================= USER ONLINE ================= */

  socket.on("user-online", (username) => {

    if (!username) return;

    console.log(username, "joined");

    onlineUsers[username] = socket.id;
    socketToUser[socket.id] = username;

    if (!pendingRequests[username]) {
      pendingRequests[username] = [];
    }

    if (!connections[username]) {
      connections[username] = [];
    }

    io.emit(
      "update-users",
      Object.keys(onlineUsers)
    );

    console.log("ONLINE USERS:", onlineUsers);

  });

  /* ================= SEND REQUEST ================= */

  socket.on("send-request", ({ to }) => {

    const from = socketToUser[socket.id];

    if (!from || !to) return;

    console.log(`${from} sent request to ${to}`);

    const targetSocketId = onlineUsers[to];

    if (!targetSocketId) {
      console.log("Target user offline");
      return;
    }

    if (!pendingRequests[to]) {
      pendingRequests[to] = [];
    }

    /* prevent duplicates */

    if (
      pendingRequests[to].includes(from) ||
      connections[to]?.includes(from)
    ) {
      return;
    }

    pendingRequests[to].push(from);

    io.to(targetSocketId).emit(
      "receive-request",
      { from }
    );

  });

  /* ================= ACCEPT REQUEST ================= */

  socket.on("accept-request", ({ from }) => {

    const to = socketToUser[socket.id];

    if (!from || !to) return;

    console.log(`${to} accepted ${from}`);

    if (!connections[from]) {
      connections[from] = [];
    }

    if (!connections[to]) {
      connections[to] = [];
    }

    if (!connections[from].includes(to)) {
      connections[from].push(to);
    }

    if (!connections[to].includes(from)) {
      connections[to].push(from);
    }

    pendingRequests[to] =
      pendingRequests[to].filter(
        user => user !== from
      );

    console.log("CONNECTIONS:", connections);

    const senderSocketId = onlineUsers[from];

    if (senderSocketId) {

      io.to(senderSocketId).emit(
        "request-accepted",
        { by: to }
      );

    }

    socket.emit(
      "request-accepted",
      { by: from }
    );

  });

  /* ================= REJECT REQUEST ================= */

  socket.on("reject-request", ({ from }) => {

    const to = socketToUser[socket.id];

    console.log(`${to} rejected ${from}`);

    pendingRequests[to] =
      pendingRequests[to].filter(
        user => user !== from
      );

    const senderSocketId = onlineUsers[from];

    if (senderSocketId) {

      io.to(senderSocketId).emit(
        "request-rejected",
        { by: to }
      );

    }

  });

  /* ================= SEND MESSAGE ================= */

  socket.on("send-message", ({ to, message }) => {

    const from = socketToUser[socket.id];

    if (!from || !to || !message) return;

    console.log(`${from} -> ${to}: ${message}`);

    /* only connected users can message */

    if (
      !connections[from] ||
      !connections[from].includes(to)
    ) {

      console.log("Users not connected");
      return;

    }

    const targetSocketId = onlineUsers[to];

    if (!targetSocketId) {
      console.log("Target offline");
      return;
    }

    io.to(targetSocketId).emit(
      "receive-message",
      {
        from,
        message
      }
    );

  });

  /* ================= TYPING ================= */

  socket.on("typing", ({ to }) => {

    const from = socketToUser[socket.id];

    if (
      !connections[from] ||
      !connections[from].includes(to)
    ) {
      return;
    }

    const targetSocketId = onlineUsers[to];

    if (!targetSocketId) return;

    io.to(targetSocketId).emit(
      "show-typing",
      { from }
    );

  });

  /* ================= STOP TYPING ================= */

  socket.on("stop-typing", ({ to }) => {

    const from = socketToUser[socket.id];

    const targetSocketId = onlineUsers[to];

    if (!targetSocketId) return;

    io.to(targetSocketId).emit(
      "hide-typing",
      { from }
    );

  });

  /* ================= DISCONNECT ================= */

  socket.on("disconnect", () => {

    const username =
      socketToUser[socket.id];

    console.log(username, "disconnected");

    delete onlineUsers[username];
    delete socketToUser[socket.id];

    io.emit(
      "update-users",
      Object.keys(onlineUsers)
    );

  });

});

/* ================= START ================= */

server.listen(3000, () => {

  console.log(
    "Server running on http://localhost:3000"
  );

});
