import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../css/AdminChat.css';

const AdminChat = ({ user }) => { // Ensure user prop is passed for adminId
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null); // This holds the userId of the selected chat session
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const messagesEndRef = useRef(null);

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const fetchSessions = async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/api/v1/chat/sessions', config);
            if (data.success) {
                // Sort sessions: claimed by current admin, then other claimed, then open, then closed
                const sortedSessions = data.sessions.sort((a, b) => {
                    // Closed sessions always last
                    if (a.status === 'closed' && b.status !== 'closed') return 1;
                    if (b.status === 'closed' && a.status !== 'closed') return -1;

                    // Sessions claimed by me first
                    const aClaimedByMe = a.status === 'claimed' && a.claimedBy === user?.id; // Use user?.id
                    const bClaimedByMe = b.status === 'claimed' && b.claimedBy === user?.id; // Use user?.id
                    if (aClaimedByMe && !bClaimedByMe) return -1;
                    if (bClaimedByMe && !aClaimedByMe) return 1;

                    // Other claimed sessions next
                    if (a.status === 'claimed' && b.status === 'active') return -1;
                    if (b.status === 'claimed' && a.status === 'active') return 1;

                    // Sort by most recent message otherwise
                    return new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp);
                });

                setSessions(sortedSessions);
                // If a session was selected and its status changed to closed, deselect it
                if (selectedSession) {
                    const updatedSession = sortedSessions.find(s => s.userId === selectedSession);
                    if (updatedSession && updatedSession.status === 'closed') {
                        setSelectedSession(null);
                        setMessages([]);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load chat sessions:', err);
            setError('Failed to load chat sessions. Make sure you are logged in as an admin and the server is running.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions(); // Fetch immediately on mount

        // Poll for new sessions every 5 seconds
        const intervalId = setInterval(fetchSessions, 5000);

        // Cleanup interval on component unmount
        return () => clearInterval(intervalId);
    }, [user?.id, selectedSession]); // Depend on user.id and selectedSession for real-time updates of session list and current chat

    const handleSelectSession = async (userId) => {
        setSelectedSession(userId);
        setError(''); // Clear previous errors
        try {
            // Pass the userId of the chat session we want to view
            const { data } = await axios.get(`http://localhost:5000/api/v1/chat/history?userId=${userId}`, config);
            if(data.success) {
                const formattedMessages = data.messages.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp) // Ensure timestamp is Date object for rendering
                }));
                setMessages(formattedMessages);
            }
        } catch (err) {
            console.error('Failed to load messages for this session:', err);
            setError('Failed to load messages for this session.');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedSession) return;

        try {
            const { data } = await axios.post('http://localhost:5000/api/v1/chat/send', {
                userId: selectedSession, // Send message to the currently selected user session
                message: newMessage,
                // sender is 'admin' by default on backend if admin token is used
            }, config);

            if (data.success) {
                // Add the new message to the state to update UI immediately
                // The backend now returns the full message object with a JS Date timestamp.
                setMessages(prev => [...prev, data.message]);
                setNewMessage('');
                // Optionally refetch sessions to update last message/timestamp
                fetchSessions();
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setError(err.response?.data?.message || 'Failed to send message.');
        }
    };

    const handleClaimChat = async (sessionUserId) => {
        if (!user || !user.id) { // Ensure admin user is logged in
            setError('Admin user information not available. Cannot claim chat.');
            return;
        }
        try {
            const { data } = await axios.post('http://localhost:5000/api/v1/chat/claim', { userId: sessionUserId }, config);
            if (data.success) {
                alert(data.message);
                fetchSessions(); // Refresh sessions to show claimed status
                // If currently viewing this chat, add a system message to the chat history
                if (selectedSession === sessionUserId) {
                    const adminUsername = user.username; // Assuming user.username is available from context
                    setMessages(prev => [...prev, {
                        message: `${adminUsername} has claimed this chat.`,
                        sender: 'system',
                        timestamp: new Date()
                    }]);
                }
            } else {
                setError(data.message || 'Failed to claim chat.');
            }
        } catch (err) {
            console.error('Error claiming chat:', err);
            setError(err.response?.data?.message || 'Server error claiming chat.');
        }
    };

    const handleCloseChat = async (sessionUserId) => {
        if (!window.confirm('Are you sure you want to close this chat session?')) {
            return;
        }
        if (!user || !user.id) { // Ensure admin user is logged in
            setError('Admin user information not available. Cannot close chat.');
            return;
        }
        try {
            const { data } = await axios.post('http://localhost:5000/api/v1/chat/close', { userId: sessionUserId }, config);
            if (data.success) {
                alert(data.message);
                fetchSessions(); // Refresh sessions to remove closed chat
                setSelectedSession(null); // Deselect the closed chat
                setMessages([]); // Clear messages
            } else {
                setError(data.message || 'Failed to close chat.');
            }
        } catch (err) {
            console.error('Error closing chat:', err);
            setError(err.response?.data?.message || 'Server error closing chat.');
        }
    };


    if (loading) return <div className="loading-container">Loading chat sessions...</div>;
    if (error && sessions.length === 0) return <div className="error-container">{error}</div>;

    // Get the full session object for the currently selected chat from the sessions state
    const currentChatSession = selectedSession ? sessions.find(s => s.userId === selectedSession) : null;
    const isClaimedByMe = currentChatSession && currentChatSession.status === 'claimed' && currentChatSession.claimedBy === user?.id;
    const isClaimedByOther = currentChatSession && currentChatSession.status === 'claimed' && currentChatSession.claimedBy !== user?.id;
    const isClosed = currentChatSession && currentChatSession.status === 'closed';


    return (
        <div className="admin-chat-container">
            <div className="session-list">
                <h2>Active Chats ({sessions.filter(s => s.status !== 'closed').length})</h2>
                {error && <div className="auth-error-message">{error}</div>}
                {sessions.length > 0 ? sessions.map(session => (
                    <div
                        key={session.userId}
                        className={`session-item 
                            ${selectedSession === session.userId ? 'active' : ''}
                            ${session.status === 'claimed' ? 'claimed' : ''}
                            ${session.claimedBy === user?.id ? 'claimed-by-me' : ''}
                            ${session.status === 'closed' ? 'closed' : ''}
                        `}
                        onClick={() => handleSelectSession(session.userId)}
                    >
                        <p className="session-username">
                            {session.username} 
                            {session.status === 'claimed' && session.claimedBy === user?.id && <span className="session-tag claimed-by-me-tag"> (Claimed by You)</span>}
                            {session.status === 'claimed' && session.claimedBy !== user?.id && <span className="session-tag claimed-tag"> (Claimed by {session.claimedByUsername})</span>}
                            {session.status === 'closed' && <span className="session-tag closed-tag"> (Closed)</span>}
                        </p>
                        <p className="session-last-message">
                            {session.lastMessage}
                            <span className="message-timestamp">
                                {session.lastMessageTimestamp ? new Date(session.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                        </p>
                        <div className="session-actions">
                            {session.status === 'active' && (
                                <button className="mc-button small primary" onClick={(e) => {e.stopPropagation(); handleClaimChat(session.userId);}}>Claim</button>
                            )}
                            {session.status === 'claimed' && session.claimedBy === user?.id && (
                                <button className="mc-button small danger" onClick={(e) => {e.stopPropagation(); handleCloseChat(session.userId);}}>Close</button>
                            )}
                            {/* If claimed by others, no action buttons for current admin */}
                        </div>
                    </div>
                )) : (
                    <p className="no-sessions-message">No active conversations.</p>
                )}
            </div>
            <div className="chat-area">
                {currentChatSession ? (
                    <>
                        <div className="chat-header">
                            <h3>Chat with {currentChatSession.username}</h3>
                            <div className="chat-actions">
                                {currentChatSession.status === 'active' && (
                                    <button className="mc-button primary small" onClick={() => handleClaimChat(selectedSession)}>Claim Chat</button>
                                )}
                                {currentChatSession.status === 'claimed' && isClaimedByMe && (
                                    <button className="mc-button danger small" onClick={() => handleCloseChat(selectedSession)}>Close Chat</button>
                                )}
                                {isClaimedByOther && (
                                    <span className="claimed-info">Claimed by {currentChatSession.claimedByUsername}</span>
                                )}
                                {isClosed && (
                                    <span className="closed-info">This chat is closed.</span>
                                )}
                            </div>
                        </div>
                        {error && <div className="auth-error-message">{error}</div>}
                        <div className="chat-messages admin-chat-messages">
                            {messages.map((msg, index) => (
                                <div key={index} className={`message ${msg.sender}`}>
                                    <p>
                                        {msg.message}
                                        <span className="message-timestamp">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    </p>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form className="chat-input-form" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={isClosed ? "Chat is closed." : (isClaimedByOther ? "Chat is claimed by another admin." : "Reply to user...")}
                                autoFocus
                                disabled={isClosed || isClaimedByOther}
                            />
                            <button type="submit" disabled={isClosed || isClaimedByOther}>Send</button>
                        </form>
                    </>
                ) : (
                    <div className="no-session-selected">
                        <p>Select a session to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChat;