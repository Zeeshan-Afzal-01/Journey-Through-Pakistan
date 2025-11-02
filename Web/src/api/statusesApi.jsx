import api from './api.jsx';

export const listStatuses = () => api.get('/statuses');

export const getUserStatuses = (userId) => api.get(`/statuses/user/${userId}`);

export const createStatus = ({ file, caption }) => {
  const form = new FormData();
  if (file) form.append('media', file);
  if (caption) form.append('caption', caption);
  return api.post('/statuses', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const markStatusViewed = (id) => api.post(`/statuses/${id}/view`);

export const addStatusReaction = (id, type) => api.post(`/statuses/${id}/reaction`, { type });

export const removeStatusReaction = (id) => api.delete(`/statuses/${id}/reaction`);

export const addStatusMessage = (id, text) => api.post(`/statuses/${id}/message`, { text });


