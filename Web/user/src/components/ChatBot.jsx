import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMessageCircle, FiX, FiSend, FiMinimize2, FiMaximize2, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { generateGeminiContent } from '../api/geminiApi';
import api from '../api/api';
import '../assests/css/chatbot.css';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [windowPosition, setWindowPosition] = useState({ x: null, y: null, isCustom: false });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatWindowRef = useRef(null);
  const chatButtonRef = useRef(null);
  const location = useLocation();
  const { user } = useAuth();

  // Get current page context
  const getPageContext = () => {
    const path = location.pathname;
    const pageInfo = {
      '/dashboard': 'Dashboard - Main page showing overview and recommendations',
      '/landmark': 'Landmark Identification - Upload images to identify landmarks in Pakistan',
      '/landmark/result': 'Landmark Result - View detailed information about identified landmarks',
      '/community': 'Community - Connect with other travelers, share posts and experiences',
      '/chats': 'Chats - Direct messaging with other users',
      '/profile': 'Profile - View and edit your profile information',
      '/search': 'Search - Search for places, users, and content',
      '/notifications': 'Notifications - View your notifications',
      '/settings': 'Settings - Manage your account settings',
      '/saved-posts': 'Saved Posts - View your saved posts',
    };
    return pageInfo[path] || `Currently on page: ${path}`;
  };

  // Load chat history and position from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatbot_history');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    } else {
      // Initialize with welcome message
      const welcomeMessage = {
        id: Date.now(),
        text: "Hello! I'm your AI assistant for Journey Through Pakistan. I can help you with:\n\n• Information about any page or feature\n• Answer questions about landmarks and places\n• Help with navigation and usage\n• Escalate issues to admin team if needed\n\nHow can I help you today?",
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }

    // Load saved window position (button always uses default CSS bottom/right)
    const savedPosition = localStorage.getItem('chatbot_window_position');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        // Only set position if it's a valid custom position
        if (parsed.x !== undefined && parsed.y !== undefined && parsed.isCustom) {
          // Validate position is within viewport
          const maxX = window.innerWidth - 380;
          const maxY = window.innerHeight - 600;
          const validX = Math.max(0, Math.min(parsed.x, maxX));
          const validY = Math.max(0, Math.min(parsed.y, maxY));
          setWindowPosition({ x: validX, y: validY, isCustom: true });
        } else {
          setWindowPosition({ x: null, y: null, isCustom: false });
        }
      } catch (error) {
        console.error('Error loading chatbot window position:', error);
        setWindowPosition({ x: null, y: null, isCustom: false });
      }
    } else {
      // Default position (use CSS bottom/right)
      setWindowPosition({ x: null, y: null, isCustom: false });
    }
  }, []);

  // Handle window resize to keep chat window within viewport
  useEffect(() => {
    const handleResize = () => {
      if (windowPosition.isCustom && isOpen) {
        setWindowPosition(prev => {
          const maxX = window.innerWidth - 380;
          const maxY = window.innerHeight - 600;
          return {
            x: Math.max(0, Math.min(prev.x || 0, maxX)),
            y: Math.max(0, Math.min(prev.y || 0, maxY)),
            isCustom: true
          };
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, windowPosition.isCustom]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatbot_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Format message text - convert markdown bold (**text**) to headings
  const formatMessageText = (text) => {
    if (!text) return '';

    // Split by newlines to process line by line
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      const trimmedLine = line.trim();
      
      // Check if entire line is bold (starts with ** and ends with **, optional colon)
      // This indicates a heading
      const headingMatch = trimmedLine.match(/^\*\*(.+?)\*\*[:：]?\s*$/);
      if (headingMatch) {
        // This is a heading - render as heading
        return (
          <React.Fragment key={lineIndex}>
            <div className="chatbot-message-heading">{headingMatch[1]}</div>
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        );
      }

      // Check for inline bold text (**text**) within the line
      const parts = trimmedLine.split(/(\*\*[^*]+\*\*)/g);
      if (parts.length > 1) {
        return (
          <React.Fragment key={lineIndex}>
            {parts.map((part, partIndex) => {
              const boldMatch = part.match(/\*\*(.+?)\*\*/);
              if (boldMatch) {
                return <strong key={partIndex} className="chatbot-message-bold">{boldMatch[1]}</strong>;
              }
              return <span key={partIndex}>{part}</span>;
            })}
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        );
      }

      // Regular line (empty or plain text)
      if (trimmedLine) {
        return (
          <React.Fragment key={lineIndex}>
            {trimmedLine}
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        );
      }

      // Empty line - add spacing
      return <React.Fragment key={lineIndex}><br /></React.Fragment>;
    });
  };

  // Build context-aware prompt
  const buildPrompt = (userMessage) => {
    const pageContext = getPageContext();
    const userName = user?.name || 'User';
    
    return `You are a helpful AI assistant for "Journey Through Pakistan" - a travel and tourism web application. 

Current Context:
- User: ${userName}
- Current Page: ${pageContext}
- Application Features: Landmark identification, Community posts, Chat messaging, Profile management, Search functionality, Notifications, Settings

Your role:
1. Help users understand how to use the application
2. Provide information about features and pages
3. Answer questions about landmarks and places in Pakistan
4. Assist with navigation and troubleshooting
5. If a user has a serious issue or complaint, suggest escalating to the admin team

User's question: ${userMessage}

Provide a helpful, concise, and friendly response. If the issue seems complex or requires admin attention, mention that you can escalate it to the admin team.`;
  };

  // Check if message needs escalation
  const needsEscalation = (message) => {
    const escalationKeywords = [
      'complaint', 'problem', 'issue', 'error', 'bug', 'broken', 'not working',
      'help', 'urgent', 'critical', 'admin', 'support', 'technical', 'fix'
    ];
    const lowerMessage = message.toLowerCase();
    return escalationKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  // Send message to Gemini
  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const prompt = buildPrompt(messageText);
      const response = await generateGeminiContent(prompt, 'gemini-2.5-flash-lite', 0.7);

      if (response.data.success && response.data.content) {
        const botMessage = {
          id: Date.now() + 1,
          text: response.data.content,
          sender: 'bot',
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, botMessage]);

        // Check if escalation is needed
        if (needsEscalation(messageText) && !escalating) {
          setTimeout(() => {
            const escalationMessage = {
              id: Date.now() + 2,
              text: "I noticed you mentioned an issue. Would you like me to escalate this to our admin team? They can provide more detailed assistance.",
              sender: 'bot',
              timestamp: new Date().toISOString(),
              showEscalationButton: true
            };
            setMessages(prev => [...prev, escalationMessage]);
          }, 1000);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  // Escalate to admin
  const escalateToAdmin = async (issueText) => {
    setEscalating(true);
    
    try {
      const response = await api.post('/support/escalate', {
        userId: user?._id || user?.id,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || 'No email',
        issue: issueText,
        currentPage: location.pathname,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        const escalationMessage = {
          id: Date.now(),
          text: "✅ Your issue has been escalated to our admin team. They will review it and get back to you soon. You'll receive a notification when they respond.",
          sender: 'bot',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, escalationMessage]);
        toast.success('Issue escalated to admin team successfully!');
      } else {
        throw new Error('Escalation failed');
      }
    } catch (error) {
      console.error('Error escalating to admin:', error);
      const errorMessage = {
        id: Date.now(),
        text: "I'm sorry, I couldn't escalate your issue right now. Please try again later or contact support directly.",
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to escalate issue. Please try again.');
    } finally {
      setEscalating(false);
    }
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && !isTyping) {
      sendMessage(inputMessage);
    }
  };

  // Quick action buttons
  const quickActions = [
    { text: 'How to identify landmarks?', action: () => sendMessage('How do I identify landmarks?') },
    { text: 'Tell me about this page', action: () => sendMessage(`Tell me about ${getPageContext()}`) },
    { text: 'Report an issue', action: () => sendMessage('I have an issue that needs admin attention') }
  ];

  // Clear chat history
  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear chat history?')) {
      localStorage.removeItem('chatbot_history');
      const welcomeMessage = {
        id: Date.now(),
        text: "Hello! I'm your AI assistant. How can I help you today?",
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
      toast.success('Chat history cleared');
    }
  };

  // Drag and drop handlers (only for chat window, not button)
  const handleMouseDown = (e) => {
    // Only allow dragging the chat window, not the button
    if (!isOpen) return;

    // Don't drag if clicking on buttons or input fields
    if (e.target.closest('button') && !e.target.closest('.chatbot-header')) {
      return;
    }
    if (e.target.closest('input') || e.target.closest('textarea')) {
      return;
    }

    // Only allow dragging from header
    if (!e.target.closest('.chatbot-header')) {
      return;
    }

    const element = chatWindowRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle mouse move and mouse up for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !isOpen) return;

      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      // Boundary constraints - keep within viewport
      const maxX = window.innerWidth - 380;
      const maxY = window.innerHeight - 600;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      setWindowPosition({ x: newX, y: newY, isCustom: true });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Save window position to localStorage after a small delay
        setTimeout(() => {
          const currentPos = {
            x: windowPosition.x,
            y: windowPosition.y,
            isCustom: true
          };
          localStorage.setItem('chatbot_window_position', JSON.stringify(currentPos));
        }, 100);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, dragOffset, windowPosition, isOpen]);

  if (!user) return null; // Don't show chatbot for non-authenticated users

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          ref={chatButtonRef}
          className="chatbot-button"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
        >
          <FiMessageCircle size={24} />
          <span className="chatbot-button-badge">AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          className={`chatbot-window ${isMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{
            ...(windowPosition.isCustom ? {
              left: `${windowPosition.x}px`,
              top: `${windowPosition.y}px`,
              bottom: 'auto',
              right: 'auto'
            } : {}),
            cursor: isDragging ? 'grabbing' : 'default'
          }}
        >
          {/* Header */}
          <div
            className="chatbot-header"
            onMouseDown={handleMouseDown}
            style={{ cursor: 'grab' }}
          >
            <div className="chatbot-header-left">
              <div className="chatbot-avatar">
                <FiMessageCircle size={20} />
              </div>
              <div>
                <div className="chatbot-title">AI Assistant</div>
                <div className="chatbot-subtitle">Journey Through Pakistan</div>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                className="chatbot-icon-button"
                onClick={() => setIsMinimized(!isMinimized)}
                aria-label={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <FiMaximize2 /> : <FiMinimize2 />}
              </button>
              <button
                className="chatbot-icon-button"
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(false);
                }}
                aria-label="Close chat"
              >
                <FiX />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <div className="chatbot-messages">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chatbot-message ${message.sender === 'user' ? 'user' : 'bot'}`}
                  >
                    {message.sender === 'bot' && (
                      <div className="chatbot-message-avatar">
                        <FiMessageCircle size={16} />
                      </div>
                    )}
                    <div className="chatbot-message-content">
                      <div className="chatbot-message-text">
                        {message.sender === 'bot' ? formatMessageText(message.text) : message.text}
                      </div>
                      {message.showEscalationButton && (
                        <button
                          className="chatbot-escalate-button"
                          onClick={() => {
                            const issueText = messages[messages.length - 2]?.text || '';
                            escalateToAdmin(issueText);
                          }}
                          disabled={escalating}
                        >
                          <FiAlertCircle className="me-1" />
                          {escalating ? 'Escalating...' : 'Escalate to Admin'}
                        </button>
                      )}
                      <div className="chatbot-message-time">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="chatbot-message bot">
                    <div className="chatbot-message-avatar">
                      <FiMessageCircle size={16} />
                    </div>
                    <div className="chatbot-message-content">
                      <div className="chatbot-typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              {messages.length <= 2 && (
                <div className="chatbot-quick-actions">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      className="chatbot-quick-action-button"
                      onClick={action.action}
                    >
                      {action.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="chatbot-input-area">
                <form onSubmit={handleSubmit} className="chatbot-form">
                  <input
                    ref={inputRef}
                    type="text"
                    className="chatbot-input"
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isTyping || escalating}
                  />
                  <button
                    type="submit"
                    className="chatbot-send-button"
                    disabled={!inputMessage.trim() || isTyping || escalating}
                  >
                    <FiSend size={18} />
                  </button>
                </form>
                <div className="chatbot-footer-actions">
                  <button
                    className="chatbot-clear-button"
                    onClick={clearChat}
                    title="Clear chat history"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatBot;

