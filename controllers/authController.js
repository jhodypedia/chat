const bcrypt = require('bcrypt');
const { User } = require('../models');

exports.showLoginPage = (req, res) => res.render('auth/login', { layout: false, error: null });
exports.showRegisterPage = (req, res) => res.render('auth/register', { layout: false, error: null });

exports.register = async (req, res) => {
  try {
    const { username, email, password, no_hp } = req.body;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.render('auth/register', { layout: false, error: 'Email sudah terdaftar.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username,
      email,
      password: hashedPassword,
      no_hp,
      avatar: '/images/default-avatar.png',
      about: 'Hey there! I am using this chat app.',
      status_online: false,
    });
    res.redirect('/login');
  } catch (error) {
    res.render('auth/register', { layout: false, error: 'Terjadi kesalahan saat registrasi.' });
  }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('auth/login', { layout: false, error: 'Email atau password salah.' });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
        };

        // Update status online di DB
        await User.update({ status_online: true }, { where: { id: user.id } });

        res.redirect('/chat');
    } catch (error) {
        res.render('auth/login', { layout: false, error: 'Terjadi kesalahan saat login.' });
    }
};

exports.logout = async (req, res) => {
    if (req.session.user) {
        await User.update({ status_online: false, last_seen: new Date() }, { where: { id: req.session.user.id } });
    }
    req.session.destroy(() => {
        res.redirect('/login');
    });
};
