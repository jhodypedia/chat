// controllers/authController.js
const bcrypt = require('bcryptjs');
const db = require('../models/db'); // Asumsi koneksi db ada di sini

exports.getLogin = (req, res) => res.render('auth/login', { error: null });
exports.getRegister = (req, res) => res.render('auth/register', { error: null });

exports.postRegister = async (req, res) => {
    const { username, email, password, no_hp } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, email, password, no_hp) VALUES (?, ?, ?, ?)';
    db.query(sql, [username, email, hashedPassword, no_hp], (err, result) => {
        if (err) return res.render('auth/register', { error: 'Username atau email sudah digunakan.' });
        res.redirect('/login');
    });
};

exports.postLogin = (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err || results.length === 0 || !(await bcrypt.compare(password, results[0].password))) {
            return res.render('auth/login', { error: 'Email atau password salah.' });
        }
        req.session.userId = results[0].id;
        req.session.username = results[0].username;
        // Update status online di DB
        db.query('UPDATE users SET status_online = TRUE WHERE id = ?', [results[0].id]);
        res.redirect('/chat');
    });
};

exports.logout = (req, res) => {
    // Update status offline dan last_seen
    db.query('UPDATE users SET status_online = FALSE, last_seen = NOW() WHERE id = ?', [req.session.userId]);
    req.session.destroy(() => res.redirect('/login'));
};
