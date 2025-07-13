import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../css/AdminChat.css';

const AdminChat = () => {
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
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

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const { data } = await axios.get('http://localhost:5000/api/v1/chat/sessions', config);
                if (data.success) {
                    setSessions(data.sessions);
                }
            } catch (err) {
                // Don't set a persistent error for polling failures
                console.error('Failed to load chat sessions.');
            } finally {
                setLoading(false);
            }
        };

        fetchSessions(); // Fetch immediately on mount

        // Poll for new sessions every 5 seconds
        const intervalId = setInterval(fetchSessions, 5000);

        // Cleanup interval on component unmount
        return () => clearInterval(intervalId);
    }, []);

    const handleSelectSession = async (userId) => {
        setSelectedSession(userId);
        try {
            const { data } = await axios.get(`http://localhost:5000/api/v1/chat/history?userId=${userId}`, config);
            if(data.success) {
                setMessages(data.messages);
            }
        } catch (err) {
            setError('Failed to load messages for this session.');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedSession) return;

        try {
            const { data } = await axios.post('http://localhost:5000/api/v1/chat/send', {
                userId: selectedSession,
                message: newMessage,
                sender: 'admin'
            }, config);

            if (data.success) {
                // Add the new message to the state to update UI immediately
                const sentMessage = {
                    ...data.message,
                    // The backend returns a server timestamp object, we need a JS Date for display
                    timestamp: new Date() 
                };
                setMessages(prev => [...prev, sentMessage]);
                setNewMessage('');
            }
        } catch (err) {
            setError('Failed to send message.');
        }
    };

    if (loading) return <div className="loading-container">Loading chat sessions...</div>;
    if (error && sessions.length === 0) return <div className="error-container">{error}</div>;

    return (
        <div className="admin-chat-container">
            <div className="session-list">
                <h2>Active Chats ({sessions.length})</h2>
                {sessions.length > 0 ? sessions.map(session => (
                    <div
                        key={session.userId}
                        className={`session-item ${selectedSession === session.userId ? 'active' : ''}`}
                        onClick={() => handleSelectSession(session.userId)}
                    >
                        <p className="session-username">{session.username}</p>
                        <p className="session-last-message">{session.lastMessage}</p>
                    </div>
                )) : (
                    <p className="no-sessions-message">No active conversations.</p>
                )}
            </div>
            <div className="chat-area">
                {selectedSession ? (
                    <>
                        <div className="chat-messages admin-chat-messages">
                            {messages.map((msg, index) => (
                                <div key={index} className={`message ${msg.sender}`}>
                                    <p>{msg.message}</p>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form className="chat-input-form" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Reply to user..."
                                autoFocus
                            />
                            <button type="submit">Send</button>
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
