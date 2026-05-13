let socket = null;
let username = null;
let selectedUser = null;

/* ================= ACCEPTED USERS ================= */

let connectedUsers = [];

/* ================= USER ================= */

username = localStorage.getItem("username");

if (!username) {
  window.location.href = "/login.html";
}

/* ================= SOCKET ================= */

socket = io();

socket.on("connect", () => {

  console.log("Connected:", socket.id);

  socket.emit("user-online", username);

});

/* ================= DOM ================= */

const userList = document.getElementById("userList");
const requestList = document.getElementById("requestList");
const messages = document.getElementById("messages");
const input = document.getElementById("message-input");
const form = document.getElementById("message-form");
const typingDiv = document.getElementById("typing");
const chatTitle = document.getElementById("chat-title");
const loggedUser = document.getElementById("loggedUser");
const themeToggle = document.getElementById("themeToggle");

loggedUser.textContent = username;

/* ================= USERS LIST ================= */

socket.on("update-users", (users) => {

  userList.innerHTML = "";

  users.forEach((user) => {

    if (user === username) return;

    const div = document.createElement("div");

    div.className = "user";
    div.textContent = user;

    /* SELECT USER */

    div.addEventListener("click", () => {

      selectedUser = user;
      chatTitle.textContent = user;

      typingDiv.textContent = "";

    });

    /* SEND REQUEST */

    div.addEventListener("contextmenu", (e) => {

      e.preventDefault();

      socket.emit("send-request", {
        to: user
      });

      alert(`Request sent to ${user}`);

    });

    userList.appendChild(div);

  });

});

/* ================= RECEIVE REQUEST ================= */

socket.on("receive-request", ({ from }) => {

  const div = document.createElement("div");

  div.className = "request";

  div.innerHTML = `
    <span>${from}</span>
    <button class="accept">Accept</button>
    <button class="reject">Reject</button>
  `;

  /* ACCEPT */

  div.querySelector(".accept").addEventListener("click", () => {

    socket.emit("accept-request", {
      from
    });

    /* ADD CONNECTION */

    if (!connectedUsers.includes(from)) {
      connectedUsers.push(from);
    }

    alert(`Connected with ${from}`);

    div.remove();

  });

  /* REJECT */

  div.querySelector(".reject").addEventListener("click", () => {

    socket.emit("reject-request", {
      from
    });

    div.remove();

  });

  requestList.appendChild(div);

});

/* ================= ACCEPTED ================= */

socket.on("request-accepted", ({ by }) => {

  if (!connectedUsers.includes(by)) {
    connectedUsers.push(by);
  }

  alert(`${by} accepted your request`);

});

/* ================= REJECTED ================= */

socket.on("request-rejected", ({ by }) => {

  alert(`${by} rejected your request`);

});

/* ================= SEND MESSAGE ================= */

form.addEventListener("submit", (e) => {

  e.preventDefault();

  const message = input.value.trim();

  if (!message || !selectedUser) return;

  /* BLOCK IF NOT CONNECTED */

  if (!connectedUsers.includes(selectedUser)) {

    alert("Request not accepted yet");

    return;

  }

  socket.emit("send-message", {
    to: selectedUser,
    message
  });

  appendMessage("You", message);

  input.value = "";

  socket.emit("stop-typing", {
    to: selectedUser
  });

});

/* ================= RECEIVE MESSAGE ================= */

socket.on("receive-message", ({ from, message }) => {

  appendMessage(from, message);

});

/* ================= MESSAGE UI ================= */

function appendMessage(sender, text) {

  const div = document.createElement("div");

  div.className =
    sender === "You"
      ? "message me"
      : "message other";

  div.innerHTML = `
    <strong>${sender}:</strong> ${text}
  `;

  messages.appendChild(div);

  messages.scrollTop =
    messages.scrollHeight;

}

/* ================= TYPING ================= */

let typingTimeout;

input.addEventListener("input", () => {

  if (!selectedUser) return;

  /* ONLY CONNECTED USERS */

  if (!connectedUsers.includes(selectedUser)) {
    return;
  }

  socket.emit("typing", {
    to: selectedUser
  });

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {

    socket.emit("stop-typing", {
      to: selectedUser
    });

  }, 1000);

});

/* ================= SHOW TYPING ================= */

socket.on("show-typing", ({ from }) => {

  if (from === selectedUser) {

    typingDiv.textContent =
      `${from} is typing...`;

  }

});

/* ================= HIDE TYPING ================= */

socket.on("hide-typing", ({ from }) => {

  if (from === selectedUser) {

    typingDiv.textContent = "";

  }

});

/* ================= THEME TOGGLE ================= */

themeToggle.addEventListener("click", () => {

  const html = document.documentElement;

  const currentTheme =
    html.getAttribute("data-theme");

  if (currentTheme === "dark") {

    html.setAttribute("data-theme", "light");

    themeToggle.textContent = "☀️";

  } else {

    html.setAttribute("data-theme", "dark");

    themeToggle.textContent = "🌙";

  }

});
