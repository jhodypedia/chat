const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isGuest, isAuth } = require('../middlewares/authMiddleware');

router.get('/login', isGuest, authController.showLoginPage);
router.post('/login', isGuest, authController.login);
router.get('/register', isGuest, authController.showRegisterPage);
router.post('/register', isGuest, authController.register);
router.get('/logout', isAuth, authController.logout);

module.exports = router;
