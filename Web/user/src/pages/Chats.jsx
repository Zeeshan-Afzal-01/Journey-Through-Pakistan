import React, { useState, useEffect, useRef } from "react";
import { FiSearch, FiPlus, FiPhone, FiVideo, FiImage, FiSmile, FiSend, FiMoreVertical, FiCamera, FiMessageSquare, FiX } from "react-icons/fi";
import { ChatListSkeleton, ChatMessageSkeleton } from "../components/SkeletonLoader";
import NewChatModal from "../components/NewChatModal";
import CallModal from "../components/CallModal";
import MessageContextMenu from "../components/MessageContextMenu";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { getConversations, getMessages, getOrCreateConversation, markMessagesAsRead, getUnreadCount, uploadChatImage } from "../api/messageApi";
import api from "../api/api";
import { toast } from "react-toastify";
import moment from "moment";
import EmojiPicker from '../components/EmojiPicker';
import { useNavigate, useLocation } from "react-router-dom";
import "../assests/css/chats.css";
import "../assests/css/skeleton.css";
import "../assests/css/message-context-menu.css";
import { getProfilePictureUrl, getImageUrl } from '../utils/imageUtils.js';

export default function Chats() {
  const { socket, isConnected, onlineUsers } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState({}); // { userId: { name, userId } }
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [lastSoundTime, setLastSoundTime] = useState({}); // Track last sound time per conversation
  const [unreadCounts, setUnreadCounts] = useState({}); // Track unread counts per conversation
  const [imagePreview, setImagePreview] = useState(null); // For image preview before sending
  const [pendingImageUrl, setPendingImageUrl] = useState(null); // Cloudinary URL for image to send
  const [showCamera, setShowCamera] = useState(false); // Camera modal state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Emoji picker state
  const [callState, setCallState] = useState(null); // { type: 'voice'|'video', isIncoming: bool, callerId: string, callerName: string, callerAvatar: string, isActive: bool }
  const [contextMenu, setContextMenu] = useState({ isOpen: false, message: null, position: { x: 0, y: 0 } });
  const [editingMessage, setEditingMessage] = useState(null); // { id, text }
  const longPressTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const conversationIdRef = useRef(null);
  const notificationSoundRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const messageInputRef = useRef(null);
  const callRingtoneRef = useRef(null);
  const callRingtoneIntervalRef = useRef(null);
  const incomingSignalRef = useRef(null); // Store incoming call signal separately
  const processedUserIdRef = useRef(null); // Track processed user ID from query param
  
  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        !event.target.closest('.btn-icon') &&
        !event.target.closest('.emoji-picker-container')
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEmojiPicker]);

  // Create notification sound using Web Audio API
  useEffect(() => {
    let audioContext = null;
    
    const createNotificationSound = () => {
      try {
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // First tone
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.value = 800;
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        osc1.start(audioContext.currentTime);
        osc1.stop(audioContext.currentTime + 0.15);
        
        // Second tone (slightly higher)
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1000;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc2.start(audioContext.currentTime + 0.15);
        osc2.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.log('Sound play error:', error);
      }
    };
    
    notificationSoundRef.current = createNotificationSound;
    
    return () => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, []);

  // Fetch conversations on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Handle user query parameter to auto-open conversation
  useEffect(() => {
    if (!user || loading || chatList.length === 0) return;

    const searchParams = new URLSearchParams(location.search);
    const userId = searchParams.get('user');
    
    // Prevent processing the same user ID multiple times
    if (userId && processedUserIdRef.current === userId) return;
    
    if (userId) {
      processedUserIdRef.current = userId;
      
      // Find existing chat with this user
      const existingChat = chatList.find(chat => {
        const chatUserId = chat.userId?.toString();
        return chatUserId === userId.toString();
      });

      if (existingChat) {
        // Chat exists, select it
        handleSelectChat(existingChat);
        // Clean up URL parameter
        navigate('/chats', { replace: true });
      } else {
        // Chat doesn't exist, create it
        const openChatWithUser = async () => {
          try {
            // Ensure userId is a string
            const userIdString = userId?.toString() || userId;
            if (!userIdString) {
              toast.error('Invalid user ID');
              navigate('/chats', { replace: true });
              return;
            }
            
            const convResponse = await getOrCreateConversation(userIdString);
            const conversationId = convResponse.data._id?.toString() || convResponse.data._id;
            
            // Get user info from API to create chat object
            const userResponse = await api.get(`/users/${userId}`);
            const userData = userResponse.data;
            
            const newChat = {
              id: conversationId,
              conversationId: conversationId,
              userId: userId,
              name: userData.name || 'Unknown',
              avatar: getProfilePictureUrl(userData.profilePicture, userData.hasProfilePicture),
              snippet: 'No messages yet',
              time: '',
              unread: 0,
              isOnline: onlineUsers.has(userId.toString())
            };

            // Add to chat list and select it
            setChatList(prev => [newChat, ...prev]);
            await handleSelectChat(newChat);
            // Clean up URL parameter
            navigate('/chats', { replace: true });
          } catch (error) {
            console.error('Error opening chat with user:', error);
            toast.error('Failed to open conversation');
            // Clean up URL parameter even on error
            navigate('/chats', { replace: true });
          }
        };
        
        openChatWithUser();
      }
    } else {
      // Reset processed user ID when no user param
      processedUserIdRef.current = null;
    }
  }, [user, loading, chatList, location.search, navigate, onlineUsers]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new messages
    const handleNewMessage = (newMessage) => {
      console.log('📨 New message received:', {
        id: newMessage._id,
        text: newMessage.text,
        imageUrl: newMessage.imageUrl?.substring(0, 50) + '...',
        hasImage: !!newMessage.imageUrl,
        conversationId: newMessage.conversationId
      });
      
      // Normalize conversationId for comparison
      const messageConvId = newMessage.conversationId?.toString();
      const currentConvId = currentConversationId?.toString();
      
      // Check if message is for current conversation
      if (messageConvId && currentConvId && messageConvId === currentConvId) {
        // Format message for display
        const formattedMessage = {
          id: newMessage._id?.toString() || newMessage._id || Date.now(),
          text: newMessage.text || '',
          imageUrl: newMessage.imageUrl || null, // Preserve imageUrl
          time: newMessage.createdAt 
            ? moment(newMessage.createdAt).format('h:mm A') 
            : moment().format('h:mm A'),
          type: (newMessage.sender?._id?.toString() || newMessage.sender?._id) === (user?._id?.toString() || user?._id) 
            ? 'sent' 
            : 'received',
          sender: newMessage.sender || {},
          createdAt: newMessage.createdAt || new Date(),
          conversationId: messageConvId
        };
        
        console.log('✅ Formatted message for display:', {
          id: formattedMessage.id,
          imageUrl: formattedMessage.imageUrl?.substring(0, 50),
          hasImage: !!formattedMessage.imageUrl
        });
        
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          // Also check by imageUrl for image messages
          const exists = prev.some(msg => 
            msg.id === formattedMessage.id || 
            (msg.text === formattedMessage.text && 
             Math.abs(new Date(msg.createdAt) - new Date(formattedMessage.createdAt)) < 2000) ||
            (msg.imageUrl === formattedMessage.imageUrl && formattedMessage.imageUrl)
          );
          if (exists) {
            console.log('⚠️ Duplicate message detected, skipping');
            return prev;
          }
          console.log('✅ Adding new message to state');
          return [...prev, formattedMessage];
        });
        scrollToBottom();
        
        // Mark as read if user is viewing this conversation
        if (currentConversationId) {
          markMessagesAsRead(currentConversationId).catch(console.error);
        }
        
        // Clear sound time for this conversation since user is viewing it
        setLastSoundTime(prev => {
          const updated = { ...prev };
          delete updated[messageConvId];
          return updated;
        });
        
        // Clear unread count for this conversation
        setUnreadCounts(prev => {
          const updated = { ...prev };
          updated[messageConvId] = 0;
          return updated;
        });
      } else {
        // Message is for a different conversation
        // Sound will be handled globally by SocketContext
        // Update chat list with new message
        updateChatListWithNewMessage(newMessage);
      }
    };

    // Listen for message notifications (update chat list - sound handled globally)
    const handleNewMessageNotification = (data) => {
      const message = data.message || data;
      const messageConvId = data.conversationId?.toString() || message?.conversationId?.toString();
      const currentConvId = currentConversationId?.toString();
      
      // Update chat list (sound will be handled globally by SocketContext)
      if (message) {
        updateChatListWithNewMessage(message);
      }
    };

    // Listen for typing indicators
    const handleTyping = (data) => {
      const messageConvId = data.conversationId?.toString();
      const currentConvId = currentConversationId?.toString();
      
      // Only show typing indicator for current conversation
      if (messageConvId && currentConvId && messageConvId === currentConvId) {
        // Don't show typing indicator for own messages
        const isCurrentUser = (data.userId?.toString() || data.userId) === (user?._id?.toString() || user?._id);
        if (isCurrentUser) return;
        
        if (data.isTyping) {
          // Add typing user
          setTypingUsers(prev => ({
            ...prev,
            [data.userId]: {
              name: data.userName || 'Someone',
              userId: data.userId
            }
          }));
          
          // Auto-remove typing indicator after 3 seconds if no stop-typing received
          setTimeout(() => {
            setTypingUsers(prev => {
              const updated = { ...prev };
              delete updated[data.userId];
              return updated;
            });
          }, 3000);
        } else {
          // Remove typing user
          setTypingUsers(prev => {
            const updated = { ...prev };
            delete updated[data.userId];
            return updated;
          });
        }
      }
    };

    // Listen for online/offline status
    const handleUserOnline = (data) => {
      setChatList(prev => prev.map(chat => 
        chat.userId === data.userId 
          ? { ...chat, isOnline: true }
          : chat
      ));
    };

    const handleUserOffline = (data) => {
      setChatList(prev => prev.map(chat => 
        chat.userId === data.userId 
          ? { ...chat, isOnline: false }
          : chat
      ));
    };

    // Handle message edited
    const handleMessageEdited = (editedMessage) => {
      const messageConvId = editedMessage.conversationId?.toString();
      const currentConvId = currentConversationId?.toString();
      
      if (messageConvId === currentConvId) {
        setMessages(prev => prev.map(msg => {
          if (msg.id?.toString() === editedMessage._id?.toString() || 
              msg.id === editedMessage._id) {
            return {
              ...msg,
              text: editedMessage.text,
              edited: true,
              editedAt: editedMessage.editedAt
            };
          }
          return msg;
        }));
      }
    };

    // Handle message deleted (for everyone)
    const handleMessageDeleted = (deletedMessage) => {
      const messageConvId = deletedMessage.conversationId?.toString();
      const currentConvId = currentConversationId?.toString();
      
      if (messageConvId === currentConvId) {
        setMessages(prev => prev.map(msg => {
          if (msg.id?.toString() === deletedMessage._id?.toString() || 
              msg.id === deletedMessage._id) {
            return {
              ...msg,
              deleted: true,
              deletedAt: deletedMessage.deletedAt,
              text: 'This message was deleted'
            };
          }
          return msg;
        }));
      }
    };

    // Handle message deleted for me (hide from current user - sender or recipient)
    const handleMessageDeletedForMe = (deletedMessage) => {
      const messageConvId = deletedMessage.conversationId?.toString();
      const currentConvId = currentConversationId?.toString();
      
      if (messageConvId === currentConvId) {
        // Remove message from current user's view (whether they're sender or recipient)
        setMessages(prev => prev.filter(msg => {
          const msgId = msg.id?.toString() || msg.id;
          const deletedId = deletedMessage._id?.toString() || deletedMessage._id;
          return msgId !== deletedId;
        }));
      }
    };

    // Handle message unsent
    const handleMessageUnsent = (unsentMessage) => {
      const messageConvId = unsentMessage.conversationId?.toString();
      const currentConvId = currentConversationId?.toString();
      
      if (messageConvId === currentConvId) {
        setMessages(prev => prev.filter(msg => {
          const msgId = msg.id?.toString() || msg.id;
          const unsentId = unsentMessage._id?.toString() || unsentMessage._id;
          return msgId !== unsentId;
        }));
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('new-message-notification', handleNewMessageNotification);
    socket.on('user-typing', handleTyping);
    socket.on('user-online', handleUserOnline);
    socket.on('user-offline', handleUserOffline);
    socket.on('message-edited', handleMessageEdited);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('message-deleted-for-me', handleMessageDeletedForMe);
    socket.on('message-unsent', handleMessageUnsent);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('new-message-notification', handleNewMessageNotification);
      socket.off('user-typing', handleTyping);
      socket.off('user-online', handleUserOnline);
      socket.off('user-offline', handleUserOffline);
      socket.off('message-edited', handleMessageEdited);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('message-deleted-for-me', handleMessageDeletedForMe);
      socket.off('message-unsent', handleMessageUnsent);
    };
  }, [socket, isConnected, currentConversationId]);

  // Notify SocketContext whenever current conversation changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('chat-conversation-changed', {
      detail: { conversationId: currentConversationId }
    }));
  }, [currentConversationId]);

  // Join conversation room when conversation is selected
  useEffect(() => {
    if (socket && isConnected && currentConversationId) {
      socket.emit('join-conversation', currentConversationId);
      conversationIdRef.current = currentConversationId;

      return () => {
        if (conversationIdRef.current) {
          socket.emit('leave-conversation', conversationIdRef.current);
        }
        // Clear conversation when leaving
        window.dispatchEvent(new CustomEvent('chat-conversation-changed', {
          detail: { conversationId: null }
        }));
      };
    }
  }, [socket, isConnected, currentConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await getConversations();
      if (!response || !response.data || !Array.isArray(response.data)) {
        setChatList([]);
        setLoading(false);
        return;
      }
      
      const formattedConversations = response.data.map(conv => {
        // Handle both populated and non-populated participants
        let otherParticipant;
        if (conv.participants && Array.isArray(conv.participants)) {
          otherParticipant = conv.participants.find(
            p => {
              const pId = p._id?.toString() || p.toString();
              const userId = user?._id?.toString();
              return pId !== userId;
            }
          );
        }
        
        const otherParticipantId = otherParticipant?._id?.toString() || otherParticipant?.toString() || conv.userId;
        
        const hasProfilePicture = (otherParticipant?.hasProfilePicture !== undefined) 
          ? otherParticipant.hasProfilePicture 
          : (conv.hasProfilePicture !== undefined ? conv.hasProfilePicture : false);
        const profilePicture = otherParticipant?.profilePicture || conv.avatar;
        
        return {
          id: conv.id || conv._id?.toString() || conv.conversationId,
          conversationId: conv.conversationId || conv._id?.toString() || conv.id,
          userId: otherParticipantId,
          name: otherParticipant?.name || conv.name || 'Unknown',
          avatar: getProfilePictureUrl(profilePicture, hasProfilePicture),
          snippet: conv.snippet || conv.lastMessage || 'No messages yet',
          time: conv.time || (conv.lastMessageAt ? moment(conv.lastMessageAt).fromNow() : ''),
          lastMessageAt: conv.lastMessageAt || conv.time,
          unread: conv.unreadCount || 0,
          isOnline: otherParticipantId ? onlineUsers.has(otherParticipantId) : false
        };
      });
      
      setChatList(formattedConversations);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
      setLoading(false);
    }
  };

  const updateChatListWithNewMessage = (newMessage) => {
    if (!newMessage || !newMessage.conversationId) return;
    
    const messageConvId = newMessage.conversationId?.toString();
    const currentConvId = currentConversationId?.toString();
    const isCurrentConversation = messageConvId === currentConvId;
    
    setChatList(prev => {
      if (!prev || !Array.isArray(prev)) return prev || [];
      
      const updated = [...prev];
      const index = updated.findIndex(
        chat => chat && (chat.conversationId?.toString() === messageConvId || chat.id?.toString() === messageConvId)
      );
      
      if (index !== -1 && updated[index]) {
        // Calculate unread count
        const newUnread = isCurrentConversation ? 0 : ((updated[index].unread || 0) + 1);
        
        updated[index] = {
          ...updated[index],
          snippet: newMessage.text || updated[index].snippet || 'No messages yet',
          time: newMessage.createdAt 
            ? moment(newMessage.createdAt).fromNow() 
            : updated[index].time || '',
          lastMessageAt: newMessage.createdAt || updated[index].lastMessageAt,
          unread: newUnread
        };
        
        // Update unread counts
        setUnreadCounts(prev => ({
          ...prev,
          [messageConvId]: newUnread
        }));
        
        // Move to top
        const [moved] = updated.splice(index, 1);
        updated.unshift(moved);
      } else {
        // New conversation - add to list
        const senderHasProfilePicture = newMessage.sender?.hasProfilePicture || false;
        const senderProfilePicture = newMessage.sender?.profilePicture;
        
        const newChat = {
          id: messageConvId,
          conversationId: messageConvId,
          userId: newMessage.sender?._id?.toString() || newMessage.sender?._id,
          name: newMessage.sender?.name || 'Unknown',
          avatar: getProfilePictureUrl(senderProfilePicture, senderHasProfilePicture),
          snippet: newMessage.text || 'No messages yet',
          time: newMessage.createdAt ? moment(newMessage.createdAt).fromNow() : '',
          lastMessageAt: newMessage.createdAt,
          unread: isCurrentConversation ? 0 : 1,
          isOnline: false
        };
        updated.unshift(newChat);
        
        setUnreadCounts(prev => ({
          ...prev,
          [messageConvId]: isCurrentConversation ? 0 : 1
        }));
      }
      
      return updated;
    });
  };

  const handleSelectChat = async (chat) => {
    try {
      setSelectedChat(chat);
      setMessagesLoading(true);
      setMessages([]);
      
      // Fetch or create conversation
      let conversationId = chat.conversationId || chat.id;
      
      // Convert to string if it's an object
      if (conversationId && typeof conversationId === 'object') {
        conversationId = conversationId.toString();
      }
      
      if (!conversationId && chat.userId) {
        const convResponse = await getOrCreateConversation(chat.userId);
        conversationId = convResponse.data._id?.toString() || convResponse.data._id;
        setCurrentConversationId(conversationId);
        // Notify SocketContext about current conversation
        window.dispatchEvent(new CustomEvent('chat-conversation-changed', {
          detail: { conversationId: conversationId }
        }));
      } else if (conversationId) {
        const convIdString = conversationId.toString();
        setCurrentConversationId(convIdString);
        // Notify SocketContext about current conversation
        window.dispatchEvent(new CustomEvent('chat-conversation-changed', {
          detail: { conversationId: convIdString }
        }));
      } else {
        toast.error('Unable to load conversation');
        setMessagesLoading(false);
        return;
      }

      // Fetch messages
      const messagesResponse = await getMessages(conversationId);
      
      if (!messagesResponse || !messagesResponse.data || !Array.isArray(messagesResponse.data)) {
        setMessages([]);
        setMessagesLoading(false);
        return;
      }
      
      const formattedMessages = messagesResponse.data.map(msg => {
        // Ensure imageUrl is properly preserved (could be Cloudinary URL or local path)
        const imageUrl = msg.imageUrl || null;
        
        return {
          id: msg._id?.toString() || msg._id,
          text: msg.text || '',
          imageUrl: imageUrl, // Preserve imageUrl as-is (Cloudinary URL or local path)
          time: msg.createdAt ? moment(msg.createdAt).format('h:mm A') : '',
          type: (msg.sender?._id?.toString() || msg.sender?._id) === (user?._id?.toString() || user?._id) ? 'sent' : 'received',
          sender: msg.sender || {},
          createdAt: msg.createdAt || new Date(),
          conversationId: conversationId
        };
      });

      setMessages(formattedMessages);
      setMessagesLoading(false);

      // Mark messages as read
      if (conversationId) {
        await markMessagesAsRead(conversationId);
        // Update unread count in chat list
        setChatList(prev => prev.map(c => 
          c.conversationId === conversationId || c.id === conversationId
            ? { ...c, unread: 0 }
            : c
        ));
        
        // Notify sidebar to update unread count
        window.dispatchEvent(new CustomEvent('chatsMessagesRead'));
        
        // Also update unread counts state
        setUnreadCounts(prev => {
          const updated = { ...prev };
          updated[conversationId] = 0;
          return updated;
        });
      }
    } catch (error) {
      console.error('Error selecting chat:', error);
      toast.error('Failed to load conversation');
      setMessagesLoading(false);
    }
  };

  const handleSelectFriend = async (friend) => {
    try {
      // Create or get conversation with friend
      const convResponse = await getOrCreateConversation(friend._id);
      const conversationId = convResponse.data._id;

      // Create chat object
      const friendHasProfilePicture = friend.hasProfilePicture || false;
      const friendProfilePicture = friend.profilePicture;
      
      const newChat = {
        id: conversationId,
        conversationId: conversationId,
        userId: friend._id,
        name: friend.name,
        avatar: getProfilePictureUrl(friendProfilePicture, friendHasProfilePicture),
        snippet: 'No messages yet',
        time: '',
        unread: 0,
        isOnline: onlineUsers.has(friend._id.toString())
      };

      // Check if chat already exists in list
      const existingChatIndex = chatList.findIndex(c => c.userId === friend._id);
      if (existingChatIndex !== -1) {
        // Chat exists, select it
        await handleSelectChat(chatList[existingChatIndex]);
      } else {
        // New chat, add to list and select it
        setChatList(prev => [newChat, ...prev]);
        await handleSelectChat(newChat);
      }
    } catch (error) {
      console.error('Error selecting friend:', error);
      toast.error('Failed to start conversation');
    }
  };

  const handleSelectGroup = (group) => {
    // For now, show a message that group chat is coming soon
    // Later we can implement group messaging
    toast.info('Group messaging coming soon!');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const textToSend = message.trim();
    // Use pendingImageUrl (Cloudinary URL) from state, never fallback to imagePreview (base64)
    let finalImageUrl = pendingImageUrl || null;
    
    // Safety check: Reject base64 strings
    if (finalImageUrl && (finalImageUrl.startsWith('data:image/') || finalImageUrl.startsWith('data:video/'))) {
      console.error('❌ Attempted to send base64 string as imageUrl:', finalImageUrl.substring(0, 50));
      toast.error('Image upload failed. Please try uploading again.');
      setImagePreview(null);
      setPendingImageUrl(null);
      return;
    }
    
    if ((!textToSend && !finalImageUrl) || !socket || !isConnected || !selectedChat) return;

    const recipientId = selectedChat.userId;
    if (!recipientId) {
      toast.error('Unable to send message');
      return;
    }

    const messageData = {
      conversationId: currentConversationId,
      recipientId: recipientId,
      text: textToSend || (finalImageUrl ? '📷 Photo' : ''),
      imageUrl: finalImageUrl || undefined
    };

    console.log('📤 Sending message:', {
      text: messageData.text,
      imageUrl: messageData.imageUrl?.substring(0, 50) + '...',
      hasImage: !!messageData.imageUrl,
      isBase64: messageData.imageUrl?.startsWith('data:')
    });

    // Optimistically add message to UI
    const tempMessage = {
      id: `temp_${Date.now()}`,
      text: textToSend || (finalImageUrl ? '📷 Photo' : ''),
      imageUrl: finalImageUrl,
      time: moment().format('h:mm A'),
      type: 'sent',
      sender: user,
      createdAt: new Date()
    };

    console.log('📝 Temp message created:', {
      id: tempMessage.id,
      imageUrl: tempMessage.imageUrl?.substring(0, 50) + '...',
      hasImage: !!tempMessage.imageUrl
    });

    setMessages(prev => [...prev, tempMessage]);
    setMessage("");
    setImagePreview(null);
    setPendingImageUrl(null);
    scrollToBottom();

    // Stop typing indicator
    if (currentConversationId) {
      socket.emit('stop-typing', { conversationId: currentConversationId });
    }

    // Send via socket
    socket.emit('send-message', messageData);

    // Handle error
    const errorHandler = (error) => {
      console.error('Message send error:', error);
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    };

    socket.once('message-error', errorHandler);

    // Replace temp message with real message when received via socket
    const realMessageHandler = (realMessage) => {
      const realConvId = realMessage.conversationId?.toString();
      const currentConvId = currentConversationId?.toString();
      
      // Match by text OR by imageUrl (for image messages)
      const textMatches = realMessage.text === messageData.text;
      const imageMatches = realMessage.imageUrl && messageData.imageUrl && 
                          realMessage.imageUrl === messageData.imageUrl;
      const isMatchingMessage = textMatches || imageMatches;
      
      if (realConvId === currentConvId && isMatchingMessage) {
        console.log('✅ Real message received via socket:', {
          id: realMessage._id,
          text: realMessage.text,
          imageUrl: realMessage.imageUrl?.substring(0, 50) + '...',
          hasImage: !!realMessage.imageUrl
        });
        
        // Remove temp message and add real one
        setMessages(prev => {
          const withoutTemp = prev.filter(m => !m.id.toString().startsWith('temp_'));
          const exists = withoutTemp.some(m => 
            (m.id?.toString() === realMessage._id?.toString()) ||
            (m.text === realMessage.text && Math.abs(new Date(m.createdAt) - new Date(realMessage.createdAt)) < 5000) ||
            (m.imageUrl === realMessage.imageUrl && realMessage.imageUrl)
          );
          if (exists) return withoutTemp;
          
          const formattedMessage = {
            id: realMessage._id?.toString() || realMessage._id,
            text: realMessage.text || '',
            imageUrl: realMessage.imageUrl || null, // Ensure imageUrl is preserved
            time: realMessage.createdAt 
              ? moment(realMessage.createdAt).format('h:mm A') 
              : moment().format('h:mm A'),
            type: 'sent',
            sender: realMessage.sender || user,
            createdAt: realMessage.createdAt || new Date(),
            conversationId: realConvId
          };
          
          console.log('✅ Formatted message with imageUrl:', formattedMessage.imageUrl?.substring(0, 50));
          
          return [...withoutTemp, formattedMessage];
        });
        socket.off('new-message', realMessageHandler);
      }
    };

    socket.on('new-message', realMessageHandler);

    // Cleanup handlers after 5 seconds
    setTimeout(() => {
      socket.off('message-error', errorHandler);
      socket.off('new-message', realMessageHandler);
      // Remove temp message if real message not received
      setMessages(prev => prev.filter(m => !m.id.toString().startsWith('temp_')));
    }, 5000);
  };

  const handleTyping = () => {
    if (!socket || !isConnected || !currentConversationId || !selectedChat) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Emit typing indicator (only if user is typing)
    if (message.trim().length === 0) {
      // If message is empty, stop typing
      socket.emit('stop-typing', { conversationId: currentConversationId });
      return;
    }

    socket.emit('typing', {
      conversationId: currentConversationId,
      recipientId: selectedChat.userId
    });

    // Stop typing after 2 seconds of inactivity (WhatsApp-like behavior)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { conversationId: currentConversationId });
    }, 2000);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Handle image selection from gallery
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    try {
      // Show preview (local base64) for UI only
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      // Upload image to Cloudinary (for sending later with text)
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await uploadChatImage(formData);
      const cloudinaryImageUrl = response?.data?.imageUrl;
      
      // Validate that we got a Cloudinary URL (not base64)
      if (!cloudinaryImageUrl) {
        console.error('❌ No imageUrl received from server');
        toast.error('Failed to get image URL from server');
        setImagePreview(null);
        setPendingImageUrl(null);
        return;
      }
      
      // Safety check: Ensure it's a Cloudinary URL, not base64
      if (cloudinaryImageUrl.startsWith('data:image/') || cloudinaryImageUrl.startsWith('data:video/')) {
        console.error('❌ Server returned base64 instead of Cloudinary URL:', cloudinaryImageUrl.substring(0, 50));
        toast.error('Image upload failed. Please try again.');
        setImagePreview(null);
        setPendingImageUrl(null);
        return;
      }
      
      // Ensure it's a valid URL
      if (!cloudinaryImageUrl.startsWith('http://') && !cloudinaryImageUrl.startsWith('https://')) {
        console.error('❌ Invalid imageUrl format from server:', cloudinaryImageUrl);
        toast.error('Invalid image URL format');
        setImagePreview(null);
        setPendingImageUrl(null);
        return;
      }

      // Store Cloudinary URL to send later together with optional text
      setPendingImageUrl(cloudinaryImageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      setImagePreview(null);
      setPendingImageUrl(null);
    }
  };

  // Handle camera capture
  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera. Please check permissions.');
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!cameraVideoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = cameraVideoRef.current.videoWidth;
    canvas.height = cameraVideoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraVideoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        // Stop camera stream
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach(track => track.stop());
          cameraStreamRef.current = null;
        }
        setShowCamera(false);

        // Upload to Cloudinary (will be attached to the next message)
        const formData = new FormData();
        formData.append('image', blob, 'camera-photo.jpg');
        
        const response = await uploadChatImage(formData);
        const cloudinaryImageUrl = response?.data?.imageUrl;
        
        // Validate that we got a Cloudinary URL (not base64)
        if (!cloudinaryImageUrl) {
          console.error('❌ No imageUrl received from server');
          toast.error('Failed to get image URL from server');
          return;
        }
        
        // Safety check: Ensure it's a Cloudinary URL, not base64
        if (cloudinaryImageUrl.startsWith('data:image/') || cloudinaryImageUrl.startsWith('data:video/')) {
          console.error('❌ Server returned base64 instead of Cloudinary URL:', cloudinaryImageUrl.substring(0, 50));
          toast.error('Image upload failed. Please try again.');
          setPendingImageUrl(null);
          return;
        }
        
        // Ensure it's a valid URL
        if (!cloudinaryImageUrl.startsWith('http://') && !cloudinaryImageUrl.startsWith('https://')) {
          console.error('❌ Invalid imageUrl format from server:', cloudinaryImageUrl);
          toast.error('Invalid image URL format');
          setPendingImageUrl(null);
          return;
        }

        // Store Cloudinary URL and show a local preview so user can add text before sending
        setPendingImageUrl(cloudinaryImageUrl);
        const previewUrl = URL.createObjectURL(blob);
        setImagePreview(previewUrl);
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast.error('Failed to upload photo');
        setPendingImageUrl(null);
      }
    }, 'image/jpeg', 0.9);
  };

  // Close camera
  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setShowCamera(false);
  };

  // Initialize WebRTC peer connection
  const initializePeerConnection = async () => {
    try {
      const pc = new RTCPeerConnection(rtcConfig);
      
      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        remoteStreamRef.current = remoteStream;
        setCallState(prev => prev ? { ...prev, isActive: true } : null);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            userIdToCall: callState?.callerId || selectedChat?.userId
          });
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    } catch (error) {
      console.error('Error initializing peer connection:', error);
      toast.error('Failed to initialize call');
    }
  };

  // Handle voice call
  const handleVoiceCall = async () => {
    if (!selectedChat || !socket || !isConnected) return;

    try {
      // Get user media for audio only
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false
      });
      localStreamRef.current = stream;

      // Initialize peer connection
      const pc = await initializePeerConnection();
      if (!pc) return;

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Set call state
      setCallState({
        type: 'voice',
        isIncoming: false,
        callerId: selectedChat.userId,
        callerName: selectedChat.name,
        callerAvatar: selectedChat.avatar,
        isActive: false
      });

      // Send call signal
      socket.emit('call-user', {
        userIdToCall: selectedChat.userId,
        signalData: offer,
        from: user._id,
        name: user.name,
        callType: 'voice'
      });

    } catch (error) {
      console.error('Error starting voice call:', error);
      toast.error('Failed to start call. Please check permissions.');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    }
  };

  // Handle video call
  const handleVideoCall = async () => {
    if (!selectedChat || !socket || !isConnected) return;

    try {
      // Get user media for audio and video
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: true
      });
      localStreamRef.current = stream;

      // Initialize peer connection
      const pc = await initializePeerConnection();
      if (!pc) return;

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Set call state
      setCallState({
        type: 'video',
        isIncoming: false,
        callerId: selectedChat.userId,
        callerName: selectedChat.name,
        callerAvatar: selectedChat.avatar,
        isActive: false
      });

      // Send call signal
      socket.emit('call-user', {
        userIdToCall: selectedChat.userId,
        signalData: offer,
        from: user._id,
        name: user.name,
        callType: 'video'
      });

    } catch (error) {
      console.error('Error starting video call:', error);
      toast.error('Failed to start call. Please check permissions.');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    }
  };

  // Stop call ringtone
  const stopCallRingtone = React.useCallback(() => {
    if (callRingtoneIntervalRef.current) {
      clearInterval(callRingtoneIntervalRef.current);
      callRingtoneIntervalRef.current = null;
    }
    
    if (callRingtoneRef.current) {
      try {
        if (callRingtoneRef.current.state !== 'closed') {
          callRingtoneRef.current.close();
        }
      } catch (error) {
        console.error('Error stopping ringtone:', error);
      }
      callRingtoneRef.current = null;
    }
  }, []);

  // Play call ringtone
  const playCallRingtone = React.useCallback(() => {
    stopCallRingtone(); // Stop any existing ringtone
    
    try {
      console.log('Starting ringtone...');
      // Create audio context for ringtone
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create a function to play a ring tone
      const playRing = () => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Ringtone pattern: two tones (louder and clearer)
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
          
          // Second tone after a short pause
          setTimeout(() => {
            try {
              const oscillator2 = audioContext.createOscillator();
              const gainNode2 = audioContext.createGain();
              
              oscillator2.connect(gainNode2);
              gainNode2.connect(audioContext.destination);
              
              oscillator2.frequency.value = 1000;
              oscillator2.type = 'sine';
              
              gainNode2.gain.setValueAtTime(0.5, audioContext.currentTime);
              gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
              
              oscillator2.start(audioContext.currentTime);
              oscillator2.stop(audioContext.currentTime + 0.5);
            } catch (err) {
              console.error('Error playing second tone:', err);
            }
          }, 300);
        } catch (err) {
          console.error('Error playing ring:', err);
        }
      };
      
      // Start playing ringtone
      const startRinging = () => {
        // Play ringtone immediately
        playRing();
        
        // Repeat ringtone every 2 seconds
        callRingtoneIntervalRef.current = setInterval(() => {
          playRing();
        }, 2000);
      };
      
      // Resume audio context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        console.log('AudioContext suspended, resuming...');
        audioContext.resume().then(() => {
          console.log('AudioContext resumed, starting ringtone...');
          startRinging();
        }).catch(err => {
          console.error('Error resuming audio context:', err);
        });
      } else {
        console.log('AudioContext ready, starting ringtone...');
        startRinging();
      }
      
      callRingtoneRef.current = audioContext;
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  }, [stopCallRingtone]);

  // Handle incoming call
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleCallReceived = async (data) => {
      const { signal, from, name, callType } = data;
      
      // Find caller info
      const callerChat = chatList.find(chat => 
        (chat.userId?.toString() || chat.userId) === (from?.toString() || from)
      );

      setCallState({
        type: callType || 'voice',
        isIncoming: true,
        callerId: from,
        callerName: callerChat?.name || name || 'Unknown',
        callerAvatar: callerChat?.avatar || '',
        isActive: false
      });

      // Store signal for later (separate from peer connection)
      incomingSignalRef.current = signal;

      // Play call ringtone
      console.log('Call received, playing ringtone...');
      playCallRingtone();
    };

    const handleCallAccepted = async (signal) => {
      if (peerConnectionRef.current && typeof peerConnectionRef.current.setRemoteDescription === 'function') {
        await peerConnectionRef.current.setRemoteDescription(signal);
        setCallState(prev => prev ? { ...prev, isActive: true } : null);
      }
    };

    const handleIceCandidate = async (data) => {
      if (peerConnectionRef.current && typeof peerConnectionRef.current.addIceCandidate === 'function') {
        try {
          await peerConnectionRef.current.addIceCandidate(data.candidate);
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    };

    const handleCallEnded = () => {
      stopCallRingtone();
      endCall();
    };

    const handleCallRejected = () => {
      stopCallRingtone();
      toast.info('Call rejected');
      endCall();
    };

    socket.on('call-received', handleCallReceived);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-rejected', handleCallRejected);
    socket.on('ice-candidate', handleIceCandidate);

    return () => {
      socket.off('call-received', handleCallReceived);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-rejected', handleCallRejected);
      socket.off('ice-candidate', handleIceCandidate);
    };
  }, [socket, isConnected, chatList, playCallRingtone, stopCallRingtone]);

  // Answer incoming call
  const answerCall = async () => {
    if (!callState || !socket) return;

    // Stop ringtone
    stopCallRingtone();

    try {
      // Get user media first
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callState.type === 'video'
      });
      localStreamRef.current = stream;

      // Get the incoming signal
      const incomingSignal = incomingSignalRef.current;
      if (!incomingSignal) {
        toast.error('Call signal not found');
        endCall();
        return;
      }

      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfig);
      
      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        remoteStreamRef.current = remoteStream;
        setCallState(prev => prev ? { ...prev, isActive: true } : null);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            userIdToCall: callState.callerId
          });
        }
      };

      // Store peer connection
      peerConnectionRef.current = pc;

      // Set remote description from incoming signal FIRST
      await pc.setRemoteDescription(incomingSignal);
      console.log('Remote description set, creating answer...');

      // Create answer AFTER setting remote description
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('Answer created and local description set');

      // Send answer
      socket.emit('answer-call', {
        signal: answer,
        to: callState.callerId
      });

      // Clear incoming signal
      incomingSignalRef.current = null;

      setCallState(prev => prev ? { ...prev, isActive: true, isIncoming: false } : null);
    } catch (error) {
      console.error('Error answering call:', error);
      toast.error('Failed to answer call');
      incomingSignalRef.current = null;
      endCall();
    }
  };

  // Reject call
  const rejectCall = () => {
    // Stop ringtone
    stopCallRingtone();
    
    if (socket && callState) {
      socket.emit('call-rejected', {
        userIdToCall: callState.callerId
      });
    }
    endCall();
  };

  // End call
  const endCall = () => {
    // Stop ringtone
    stopCallRingtone();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current && typeof peerConnectionRef.current.close === 'function') {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear incoming signal
    incomingSignalRef.current = null;

    // Notify other user
    if (socket && callState && !callState.isIncoming) {
      socket.emit('call-ended', {
        userIdToCall: callState.callerId
      });
    }

    setCallState(null);
    remoteStreamRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCallRingtone();
    };
  }, []);

  // Context menu handlers
  const handleMessageContextMenu = (e, message) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      isOpen: true,
      message: message,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleLongPress = (e, message) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      handleMessageContextMenu(e, message);
    }, 500); // 500ms for long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, message: null, position: { x: 0, y: 0 } });
  };

  // Edit message handler
  const handleEditMessage = () => {
    if (!contextMenu.message) return;
    
    setEditingMessage({
      id: contextMenu.message.id,
      text: contextMenu.message.text
    });
    closeContextMenu();
  };

  const handleSaveEdit = () => {
    if (!editingMessage || !socket || !isConnected) return;

    const messageId = editingMessage.id;
    const newText = editingMessage.text.trim();

    if (!newText) {
      toast.error('Message cannot be empty');
      return;
    }

    socket.emit('edit-message', {
      messageId: messageId,
      text: newText
    });

    setEditingMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  // Delete message handler (delete for everyone)
  const handleDeleteMessage = () => {
    if (!contextMenu.message || !socket || !isConnected) return;

    const messageId = contextMenu.message.id;

    if (window.confirm('Are you sure you want to delete this message for everyone?')) {
      socket.emit('delete-message', { messageId });
      closeContextMenu();
    }
  };

  // Delete for me handler (only hide from sender)
  const handleDeleteForMe = () => {
    if (!contextMenu.message || !socket || !isConnected) return;

    const messageId = contextMenu.message.id;

    socket.emit('delete-for-me', { messageId });
    closeContextMenu();
  };

  // Unsend message handler (delete from both users, only within 1 hour)
  const handleUnsendMessage = () => {
    if (!contextMenu.message || !socket || !isConnected) return;

    const messageId = contextMenu.message.id;
    const messageDate = new Date(contextMenu.message.createdAt);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (messageDate < oneHourAgo) {
      toast.error('Can only unsend messages within 1 hour');
      closeContextMenu();
      return;
    }

    if (window.confirm('Are you sure you want to unsend this message?')) {
      socket.emit('unsend-message', { messageId });
      closeContextMenu();
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const momentDate = moment(date);
    if (momentDate.isSame(moment(), 'day')) {
      return momentDate.format('h:mm A');
    } else if (momentDate.isSame(moment().subtract(1, 'day'), 'day')) {
      return 'Yesterday';
    } else {
      return momentDate.format('MMM D');
    }
  };

  const filteredChatList = (chatList || []).filter(chat =>
    chat && chat.name && chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentMessages = Array.isArray(messages) ? messages : [];

  return (
    <div className="container-fluid instagram-chat-page px-0">
      <div className="chat-shell">
        {/* Left column: Chat list */}
        <aside className="chat-list-col">
          <div className="chat-list-header">
            <div className="d-flex align-items-center justify-content-between px-3 py-3">
              <h5 className="mb-0 fw-bold">Messages</h5>
              <button className="btn-icon" onClick={() => setShowNewChatModal(true)}>
                <FiPlus size={20} />
              </button>
            </div>
            <div className="px-3 pb-3">
              <div className="search-container">
                <FiSearch className="search-icon" size={16} />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
          </div>
            </div>
          </div>
          
          <div className="chat-list">
            {loading ? (
              <ChatListSkeleton />
            ) : filteredChatList.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FiMessageSquare size={48} className="mb-3" />
                <p>No conversations yet</p>
          </div>
            ) : (
              filteredChatList.map((chat) => {
                if (!chat || !chat.id) return null;
                return (
                  <button
                    key={chat.id}
                    className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                    onClick={() => handleSelectChat(chat)}
                  >
                    <div className="avatar-container">
                      <img 
                        className="chat-avatar" 
                        src={chat.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                        alt={chat.name || 'User'}
                        onClick={(e) => { e.stopPropagation(); navigate(`/profile?userId=${chat.userId}`); }}
                        style={{ cursor: 'pointer' }}
                      />
                      {chat.isOnline && <span className="online-indicator"></span>}
                    </div>
                    <div className="chat-info">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span 
                          className="chat-name"
                          onClick={(e) => { e.stopPropagation(); navigate(`/profile?userId=${chat.userId}`); }}
                          style={{ cursor: 'pointer' }}
                        >
                          {chat.name || 'Unknown'}
                        </span>
                        <span className="chat-time">{formatTime(chat.lastMessageAt || chat.time)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="chat-snippet">{chat.snippet || 'No messages yet'}</span>
                        {chat.unread > 0 && (
                          <span className="unread-badge">{chat.unread}</span>
                        )}
                  </div>
                </div>
              </button>
                );
              }).filter(Boolean)
            )}
          </div>
        </aside>

        {/* Right column: Conversation */}
        <section className="chat-thread-col">
          {messagesLoading ? (
            <ChatMessageSkeleton />
          ) : selectedChat ? (
          <div className="d-flex flex-column h-100">
              {/* Header */}
              <div className="chat-header">
                <div className="d-flex align-items-center gap-3">
                  <div className="avatar-container">
                    <img 
                      className="chat-avatar" 
                      src={selectedChat.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                      alt={selectedChat.name}
                      onClick={() => navigate(`/profile?userId=${selectedChat.userId}`)}
                      style={{ cursor: 'pointer' }}
                    />
                    {selectedChat.isOnline && <span className="online-indicator"></span>}
                  </div>
                  <div>
                    <div 
                      className="fw-semibold"
                      onClick={() => navigate(`/profile?userId=${selectedChat.userId}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {selectedChat.name}
                    </div>
                    <div className="status-text">
                      {Object.keys(typingUsers).length > 0 
                        ? `${typingUsers[Object.keys(typingUsers)[0]]?.name || 'Someone'} is typing...`
                        : selectedChat.isOnline 
                          ? "Active now" 
                          : "Offline"}
              </div>
              </div>
            </div>
                <div className="d-flex align-items-center gap-3">
                  <button 
                    className="btn-icon"
                    onClick={handleVideoCall}
                    title="Video Call"
                  >
                    <FiVideo size={20} />
                  </button>
                  <button 
                    className="btn-icon"
                    onClick={handleVoiceCall}
                    title="Voice Call"
                  >
                    <FiPhone size={20} />
                  </button>
                  <button className="btn-icon">
                    <FiMoreVertical size={20} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="chat-thread">
                {currentMessages.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  currentMessages.map((msg) => {
                    if (!msg || !msg.id) return null;
                    const imageUrl = msg.imageUrl;
                    // Use getImageUrl for all image URLs (handles both Cloudinary and local paths)
                    const imageSrc = imageUrl ? getImageUrl(imageUrl) : null;
                    
                    // Debug logging for image messages
                    if (imageUrl) {
                      console.log('🖼️ Rendering message with image:', {
                        msgId: msg.id,
                        imageUrl: imageUrl.substring(0, 50) + '...',
                        imageSrc: imageSrc?.substring(0, 50) + '...',
                        isBase64: imageUrl.startsWith('data:'),
                        isCloudinary: imageUrl.includes('cloudinary')
                      });
                    }
                    
                    const isEditing = editingMessage?.id === msg.id;
                    const isDeleted = msg.deleted || msg.text === 'This message was deleted';
                    const isUnsent = msg.unsent;
                    const isDeletedForSender = msg.deletedForSender;
                    const isDeletedForRecipient = msg.deletedForRecipient;
                    
                    // Check if current user is sender or recipient
                    const isCurrentUserSender = msg.sender?._id?.toString() === user?._id?.toString() || 
                                                 msg.sender?._id === user?._id ||
                                                 msg.type === 'sent';
                    const isCurrentUserRecipient = !isCurrentUserSender;
                    
                    // Skip rendering unsent messages, messages deleted for sender (if user is sender), 
                    // or messages deleted for recipient (if user is recipient)
                    if (isUnsent || 
                        (isDeletedForSender && isCurrentUserSender) || 
                        (isDeletedForRecipient && isCurrentUserRecipient)) {
                      return null;
                    }

                    return (
                      <div 
                        key={msg.id} 
                        className={`message-wrapper ${msg.type || 'received'}`}
                        onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                        onMouseDown={(e) => handleLongPress(e, msg)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={(e) => handleLongPress(e, msg)}
                        onTouchEnd={handleLongPressEnd}
                        onTouchCancel={handleLongPressEnd}
                      >
                        <div className={`message-bubble ${msg.type || 'received'} ${isDeleted ? 'deleted' : ''}`}>
                          {imageSrc && !isDeleted && (
                            <div className="message-image-container">
                              <img 
                                src={imageSrc} 
                                alt="Shared" 
                                className="message-image"
                                onClick={() => window.open(imageSrc, '_blank')}
                                onError={(e) => {
                                  console.error('❌ Failed to load chat image:', {
                                    originalUrl: imageUrl?.substring(0, 50),
                                    processedUrl: imageSrc?.substring(0, 50),
                                    msgId: msg.id
                                  });
                                  e.target.style.display = 'none';
                                }}
                                onLoad={() => {
                                  console.log('✅ Image loaded successfully:', imageSrc?.substring(0, 50));
                                }}
                              />
                            </div>
                          )}
                          {isEditing ? (
                            <div className="message-edit-container">
                              <input
                                type="text"
                                className="message-edit-input"
                                value={editingMessage.text}
                                onChange={(e) => setEditingMessage({ ...editingMessage, text: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit();
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                autoFocus
                              />
                              <div className="message-edit-actions">
                                <button className="btn-icon-small" onClick={handleSaveEdit} title="Save">
                                  <FiSend size={14} />
                                </button>
                                <button className="btn-icon-small" onClick={handleCancelEdit} title="Cancel">
                                  <FiX size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {msg.text && msg.text !== '📷 Photo' && (
                                <div className={`message-text ${isDeleted ? 'deleted-text' : ''}`}>
                                  {isDeleted ? 'This message was deleted' : msg.text}
                                </div>
                              )}
                              {msg.edited && !isDeleted && (
                                <span className="message-edited-indicator">edited</span>
                              )}
                            </>
                          )}
                        </div>
                        <span className="message-time">{msg.time || ''}</span>
                      </div>
                    );
                  }).filter(Boolean)
                )}
                
                {/* Typing indicator - WhatsApp style */}
                {Object.keys(typingUsers).length > 0 && (
                  <div className="message-wrapper received">
                    <div className="message-bubble received typing-indicator">
                      <span className="typing-text">
                        {Object.keys(typingUsers).length === 1
                          ? `${typingUsers[Object.keys(typingUsers)[0]]?.name || 'Someone'} is typing`
                          : `${Object.keys(typingUsers).length} people are typing`}
                      </span>
                      <span className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="image-preview-container">
                  <div className="image-preview-wrapper">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <button 
                      className="image-preview-close"
                      onClick={() => {
                        setImagePreview(null);
                        setPendingImageUrl(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="chat-input">
                <form onSubmit={handleSendMessage} className="input-form">
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageSelect}
                  />
                  <button 
                    type="button" 
                    className="btn-icon"
                    onClick={handleCameraCapture}
                    title="Camera"
                  >
                    <FiCamera size={20} />
                  </button>
                  <button 
                    type="button" 
                    className="btn-icon"
                    onClick={() => imageInputRef.current?.click()}
                    title="Gallery"
                  >
                    <FiImage size={20} />
                  </button>
                  <input
                    ref={messageInputRef}
                    type="text"
                    className="message-input"
                    placeholder="Message..."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      handleTyping();
                    }}
                    onFocus={() => setShowEmojiPicker(false)}
                    disabled={!isConnected}
                  />
                  {(message.trim() || pendingImageUrl) ? (
                    <button type="submit" className="btn-send" disabled={!isConnected}>
                      <FiSend size={18} />
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      className="btn-icon"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      title="Emoji"
                    >
                      <FiSmile size={20} />
                    </button>
                  )}
                </form>
                
                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerRef}
                    className="emoji-picker-container"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EmojiPicker
                      onEmojiSelect={(emoji) => {
                        setMessage(prev => prev + emoji.native);
                        setShowEmojiPicker(false);
                        messageInputRef.current?.focus();
                      }}
                    />
                  </div>
                )}
                {!isConnected && (
                  <div className="text-center text-muted small mt-2">
                    Connecting...
              </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-chat">
              <div className="empty-chat-content">
                <FiMessageSquare size={64} className="mb-3" />
                <h5>Select a conversation</h5>
                <p className="text-muted">Choose a chat from the list to start messaging</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectFriend={handleSelectFriend}
        onSelectGroup={handleSelectGroup}
      />

      {/* Camera Modal */}
      {showCamera && (
        <div className="camera-modal-overlay" onClick={closeCamera}>
          <div className="camera-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="camera-modal-header">
              <h5 className="mb-0">Take Photo</h5>
              <button className="btn-icon" onClick={closeCamera}>
                ×
              </button>
            </div>
            <div className="camera-modal-body">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                className="camera-video"
              />
            </div>
            <div className="camera-modal-footer">
              <button className="btn-capture" onClick={capturePhoto}>
                <span className="capture-button"></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {callState && (
        <CallModal
          isOpen={!!callState}
          callType={callState.type}
          callerName={callState.callerName}
          callerAvatar={callState.callerAvatar}
          isIncoming={callState.isIncoming}
          localStream={localStreamRef.current}
          remoteStream={remoteStreamRef.current}
          isCallActive={callState.isActive}
          onAnswer={answerCall}
          onReject={rejectCall}
          onEnd={endCall}
        />
      )}

      {/* Message Context Menu */}
      <MessageContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        message={contextMenu.message}
        currentUserId={user?._id}
        onClose={closeContextMenu}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onDeleteForMe={handleDeleteForMe}
        onUnsend={handleUnsendMessage}
      />
    </div>
  );
}
