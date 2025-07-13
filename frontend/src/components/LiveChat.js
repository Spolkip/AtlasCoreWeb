import React, { useState, useEffect, useRef } from 'react';
import '../css/LiveChat.css';

const LiveChat = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

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

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen && messages.length === 0) {
      // Initial greeting when chat is opened for the first time
      setMessages([
        {
          sender: 'admin',
          text: `Hello ${user ? user.username : 'Guest'}! How can I help you today?`,
        },
      ]);
    }
  };

  const handleSend = (text) => {
    if (text.trim() === '') return;

    const newMessage = { sender: 'user', text };
    setMessages((prevMessages) => [...prevMessages, newMessage]);

    // Simulate admin reply
    setTimeout(() => {
      let replyText = "Thanks for your message! An admin will be with you shortly.";
      if (text === "What is Atlas Core?") {
        replyText = "AtlasCore is an epic minecraft server.";
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          sender: 'admin',
          text: replyText,
        },
      ]);
    }, 1000);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend(inputValue);
    setInputValue('');
  };

  const handlePredefinedQuestionClick = (question) => {
    handleSend(question);
  };

  return (
    <div className="live-chat-container">
      <button className={`chat-toggle-button ${isOpen ? 'open' : ''}`} onClick={toggleChat}>
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        )}
      </button>

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Atlas Core Support</h3>
          </div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <p>{msg.text}</p>
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
