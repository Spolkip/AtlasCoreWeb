import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/LiveChat.css';

const LiveChat = ({ user, isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const predefinedQuestions = [
    "What is Atlas Core?",
    "How do I link my Minecraft account?",
    "I have an issue with a purchase.",
    "How can I join a town?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Fetch chat history when the chat window opens
  useEffect(() => {
    if (isOpen && user && token) {
      const fetchHistory = async () => {
        try {
          const config = { headers: { Authorization: `Bearer ${token}` } };
          const { data } = await axios.get('http://localhost:5000/api/v1/chat/history', config);
          if (data.success && data.messages.length > 0) {
            const formattedMessages = data.messages.map(msg => ({
                ...msg,
                // Ensure timestamp is a JS Date object for consistency
                timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date()
            }));
            setMessages(formattedMessages);
          } else if (data.success) {
             // If there's no history, start with a fresh greeting
             setMessages([
                {
                  sender: 'admin',
                  text: `Hello ${user.username}! How can I help you today?`,
                  timestamp: new Date()
                },
              ]);
          }
        } catch (error) {
          console.error("Failed to fetch chat history:", error);
        }
      };
      fetchHistory();
    } else if (isOpen && !user) {
        // Handle guest users
        setMessages([
            {
              sender: 'admin',
              text: `Hello Guest! How can I help you today?`,
              timestamp: new Date()
            },
          ]);
    }
  }, [isOpen, user, token]);


  const toggleChat = () => {
    if (isAdmin) {
      navigate('/admin/chat');
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleSend = async (text) => {
    if (text.trim() === '') return;

    const userMessage = { sender: 'user', text };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');

    // Save user message to the backend if logged in
    if (user && token) {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post('http://localhost:5000/api/v1/chat/send', { message: text }, config);
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages(prev => [...prev, { sender: 'admin', text: "Error: Could not send message."}]);
        }
    }

    // Simulate admin reply for immediate user feedback
    setTimeout(() => {
      let replyText = "Thanks for your message! An admin will be with you shortly.";
      if (text === "What is Atlas Core?") {
        replyText = "AtlasCore is an epic minecraft server.";
      }

      const adminMessage = { sender: 'admin', text: replyText };
      setMessages((prevMessages) => [
        ...prevMessages,
        adminMessage,
      ]);
    }, 1000);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const handlePredefinedQuestionClick = (question) => {
    handleSend(question);
  };

  return (
    <div className={`live-chat-container ${isAdmin ? 'admin' : ''}`}>
      <button className={`chat-toggle-button ${isOpen ? 'open' : ''}`} onClick={toggleChat}>
        {isAdmin ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        ) : isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        )}
      </button>

      {isOpen && !isAdmin && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Atlas Core Support</h3>
          </div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <p>{msg.text || msg.message}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="predefined-questions">
            {predefinedQuestions.map((q, i) => (
              <button key={i} onClick={() => handlePredefinedQuestionClick(q)}>
                {q}
              </button>
            ))}
          </div>
          <form className="chat-input-form" onSubmit={handleFormSubmit}>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Type your message..."
              autoFocus
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default LiveChat;
