const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/auth');
const { getChatHistory, sendMessage, getChatSessions } = require('../controllers/chatController');

// User-facing routes
router.get('/history', protect, getChatHistory);
router.post('/send', protect, sendMessage);

// Admin-facing routes
router.get('/sessions', protect, authorizeAdmin, getChatSessions);

module.exports = router;
