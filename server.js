require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const db = require('./models');
const setupSocket = require('./utils/socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Konfigurasi Session
const sessionStore = new SequelizeStore({
  db: db.sequelize,
});

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 jam
  },
});
app.use(sessionMiddleware);
sessionStore.sync();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// View Engine (EJS)
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layout');

// Global variables for views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/chatRoutes'));

// Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});
setupSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));
