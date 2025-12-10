import api from './api';

export const getConversations = () => {
  return api.get('/messages/conversations');
};

export const getOrCreateConversation = (userId) => {
  return api.get(`/messages/conversation/${userId}`);
};

export const getMessages = (conversationId) => {
  return api.get(`/messages/conversation/${conversationId}/messages`);
};

export const markMessagesAsRead = (conversationId) => {
  return api.put(`/messages/conversation/${conversationId}/read`);
};

export const getUnreadCount = () => {
  return api.get('/messages/unread-count');
};

export const uploadChatImage = (formData) => {
  return api.post('/messages/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const getLocalChats = () => {
  return api.get('/messages/local-chats');
};

