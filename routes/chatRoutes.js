const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { isAuth } = require('../middlewares/authMiddleware');

// Halaman utama chat
router.get('/', isAuth, (req, res) => res.redirect('/chat'));
router.get('/chat', isAuth, chatController.showChatPage);

// API endpoints
router.get('/api/users/search', isAuth, chatController.searchUsers);
router.get('/api/chat/:userId', isAuth, chatController.getChatHistory);


module.exports = router;
