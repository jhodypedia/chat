// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.use('/', authRoutes);
app.use('/user', userRoutes);
app.use('/chat', chatRoutes);

app.get('/', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.redirect('/chat');
});

// Socket.IO Connection
const userSockets = {}; // Menyimpan mapping userId ke socketId

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    const userId = socket.handshake.query.userId;

    if (userId) {
        userSockets[userId] = socket.id;
        // Broadcast user online
        socket.broadcast.emit('user online', { userId });
    }

    // Handle private message
    socket.on('private message', ({ to, message }) => {
        const receiverSocketId = userSockets[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('private message', { from: userId, message });
        }
        // Simpan pesan ke DB di sini melalui controller
    });

    // Handle typing indicator
    socket.on('typing', ({ to }) => {
        const receiverSocketId = userSockets[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing', { from: userId });
        }
    });

    // Handle read receipt
    socket.on('message read', ({ from }) => {
        const senderSocketId = userSockets[from];
        if (senderSocketId) {
            io.to(senderSocketId).emit('message read', { by: userId });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const [id, socketId] of Object.entries(userSockets)) {
            if (socketId === socket.id) {
                delete userSockets[id];
                // Broadcast user offline
                socket.broadcast.emit('user offline', { userId: id, last_seen: new Date() });
                break;
            }
        }
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
