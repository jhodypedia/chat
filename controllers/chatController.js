// controllers/chatController.js
const db = require('../models/db');

exports.getChat = async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    // Ambil daftar percakapan terakhir
    const sql = `
        SELECT u.id, u.username, u.avatar, u.status_online, u.last_seen,
        (SELECT message FROM chats WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?) ORDER BY created_at DESC LIMIT 1) as last_message
        FROM users u WHERE u.id != ?`;

    db.query(sql, [req.session.userId, req.session.userId, req.session.userId], (err, chatList) => {
        if (err) throw err;
        res.render('main/chat', {
            user: { id: req.session.userId, username: req.session.username },
            chatList: chatList
        });
    });
};

// Fungsi lain seperti getMessages, searchUsers, etc.
