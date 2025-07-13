const Chat = require('../models/Chat');
const User = require('../models/User');

// @desc    Get chat history for a user or guest
// @route   GET /api/v1/chat/history
// @access  Public/Private
exports.getChatHistory = async (req, res) => {
  try {
    // Determine the session ID based on whether an admin is requesting history for a specific user,
    // or if it's a logged-in user, or a guest.
    const sessionId = (req.user && req.user.isAdmin && req.query.userId) 
                     ? req.query.userId 
                     : (req.user ? req.user.id : req.query.guestId);
    
    if (!sessionId) {
        return res.status(400).json({ success: false, message: 'User or guest ID is required.' });
    }

    // Call Chat.findByUserId, which now returns Chat objects with 'timestamp' as JavaScript Date objects.
    const messages = await Chat.findByUserId(sessionId);
    
    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("Error in getChatHistory:", error); // Detailed logging for debugging server errors.
    res.status(500).json({ success: false, message: 'Server error fetching chat history.' });
  }
};

// @desc    Send a message
// @route   POST /api/v1/chat/send
// @access  Public/Private
exports.sendMessage = async (req, res) => {
  try {
    const { message, userId: targetUserId, guestId } = req.body;
    let sender;
    let chatSessionId;

    if (!message) {
        return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    if (req.user && req.user.isAdmin) {
        // Case 1: An admin is sending a message.
        sender = 'admin';
        // The message should be associated with the user they are replying to.
        chatSessionId = targetUserId; 
        if (!chatSessionId) {
            return res.status(400).json({ success: false, message: 'Target user ID is required for admin replies.' });
        }
    } else if (req.user) {
        // Case 2: A logged-in user is sending a message.
        sender = 'user';
        chatSessionId = req.user.id;
    } else {
        // Case 3: A guest is sending a message.
        sender = 'user';
        chatSessionId = guestId;
        if (!chatSessionId) {
            return res.status(400).json({ success: false, message: 'Guest ID is required for unauthenticated users.' });
        }
    }

    // Create a new Chat instance. The `save` method of Chat model will handle the timestamp.
    const newMessage = new Chat({
      userId: chatSessionId, 
      message,
      sender,
    });

    await newMessage.save();
    // Return the created message. Its timestamp will be a JavaScript Date object due to Chat model's constructor.
    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error in sendMessage:", error); // Detailed logging for debugging server errors.
    res.status(500).json({ success: false, message: 'Server error sending message.' });
  }
};

// @desc    Get all active chat sessions for admins
// @route   GET /api/v1/chat/sessions
// @access  Private/Admin
exports.getChatSessions = async (req, res) => {
    try {
        // Chat.findActiveSessions now returns sessions with 'lastMessageTimestamp' as JavaScript Date objects.
        const activeSessions = await Chat.findActiveSessions();
        const sessionsWithUserDetails = [];

        for (const session of activeSessions) {
            const user = await User.findById(session.userId);
            // Only include sessions from non-admin users or guests.
            // Also adds the username for display in the admin panel.
            if (!user || user.is_admin !== 1) {
                sessionsWithUserDetails.push({
                    userId: session.userId,
                    username: user ? user.username : `Guest (${session.userId.substring(0, 6)})`,
                    lastMessage: session.lastMessage,
                    lastMessageTimestamp: session.lastMessageTimestamp, // This is already a JS Date object from the Chat model.
                    isGuest: !user
                });
            }
        }
        
        res.status(200).json({ success: true, sessions: sessionsWithUserDetails });
    } catch (error) {
        console.error('Error fetching chat sessions:', error); // Detailed logging for debugging server errors.
        res.status(500).json({ success: false, message: 'Server error fetching chat sessions.' });
    }
};