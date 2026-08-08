import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import fs from "fs";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// --- SISTEM PENYIMPANAN AKUN ---
const USERS_FILE = path.join(process.cwd(), 'users.json');
function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data || '[]');
}
function saveUsers(users: any) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  if (users.find((u: any) => u.username === username)) {
    return res.status(400).json({ success: false, error: "Username sudah dipakai!" });
  }
  users.push({ username, password });
  saveUsers(users);
  res.json({ success: true, message: "Pendaftaran berhasil!" });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find((u: any) => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, username: user.username });
  } else {
    res.status(400).json({ success: false, error: "Username atau password salah!" });
  }
});

// --- SISTEM PENCARI JODOH (MATCHMAKING) ---
let waitingQueue: string[] = [];

io.on("connection", (socket) => {
  console.log("Pengguna terhubung:", socket.id);

  socket.on("join_queue", () => {
    // Hindari masuk antrean ganda
    if (waitingQueue.includes(socket.id)) return;
    
    if (waitingQueue.length > 0) {
      // Ada orang lain di antrean! Langsung hubungkan mereka berdua.
      const partnerId = waitingQueue.shift(); 
      if (partnerId) {
        const roomName = `room_${partnerId}_${socket.id}`;
        
        // Masukkan keduanya ke dalam ruang virtual yang sama
        socket.join(roomName);
        io.sockets.sockets.get(partnerId)?.join(roomName);

        // Kirim notifikasi 'match_found' agar video menyala
        io.to(socket.id).emit("match_found", { room: roomName, initiator: true });
        io.to(partnerId).emit("match_found", { room: roomName, initiator: false });
        console.log(`[SUKSES] Memasangkan ${socket.id} dengan ${partnerId}`);
      }
    } else {
      // Belum ada orang, tunggu sendirian di antrean
      waitingQueue.push(socket.id);
      socket.emit("waiting_for_partner");
      console.log(`[TUNGGU] ${socket.id} masuk antrean...`);
    }
  });

  // --- JALUR KOMUNIKASI VIDEO & CHAT ---
  socket.on("webrtc_offer", (payload) => {
    socket.to(payload.room).emit("webrtc_offer", payload.sdp);
  });
  socket.on("webrtc_answer", (payload) => {
    socket.to(payload.room).emit("webrtc_answer", payload.sdp);
  });
  socket.on("webrtc_ice_candidate", (payload) => {
    socket.to(payload.room).emit("webrtc_ice_candidate", payload.candidate);
  });
  socket.on("send_text_message", (payload) => {
    socket.to(payload.room).emit("receive_text_message", payload.message);
  });
  socket.on("leave_room", (room) => {
    socket.leave(room);
    socket.to(room).emit("partner_left");
  });

  socket.on("disconnect", () => {
    waitingQueue = waitingQueue.filter(id => id !== socket.id);
    console.log("Pengguna terputus:", socket.id);
  });
});

// --- MENYALAKAN SERVER ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  server.listen(3000, () => {
    console.log("🚀 Server Berjalan Sempurna di port 3000");
  });
}

startServer();