const Chat = require('../models/Chat');
const User = require('../models/User');

// @desc    Get chat history for a user
// @route   GET /api/v1/chat/history
// @access  Private
exports.getChatHistory = async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const messages = await Chat.findByUserId(userId);
    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Send a message
// @route   POST /api/v1/chat/send
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { message, userId } = req.body;
    const sender = req.user.isAdmin ? 'admin' : 'user';
    const messageUserId = req.user.isAdmin ? userId : req.user.id;

    const newMessage = new Chat({
      userId: messageUserId,
      message,
      sender,
    });
    await newMessage.save();
    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all active chat sessions for admins
// @route   GET /api/v1/chat/sessions
// @access  Private/Admin
exports.getChatSessions = async (req, res) => {
    try {
        const activeSessions = await Chat.findActiveSessions();
        const sessionsWithUserDetails = await Promise.all(
            activeSessions.map(async (session) => {
                const user = await User.findById(session.userId);
                return {
                    userId: session.userId,
                    username: user ? user.username : 'Unknown User',
                    lastMessage: session.lastMessage,
                    lastMessageTimestamp: session.lastMessageTimestamp,
                };
            })
        );
        res.status(200).json({ success: true, sessions: sessionsWithUserDetails });
    } catch (error) {
        console.error('Error fetching chat sessions:', error);
        res.status(500).json({ success: false, message: 'Server error fetching chat sessions.' });
    }
};
