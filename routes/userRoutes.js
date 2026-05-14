const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, changePassword, updateEmailReceive, forgotPassword, resetPassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);
router.put('/email-receive', authMiddleware, updateEmailReceive);

module.exports = router;
