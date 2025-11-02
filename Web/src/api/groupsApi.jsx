import api from './api.jsx';

export const createGroup = (data) => api.post('/groups', data);
export const listGroups = (params) => api.get('/groups', { params });
export const getGroup = (id) => api.get(`/groups/${id}`);
export const updateGroup = (id, data) => api.put(`/groups/${id}`, data);
export const deleteGroup = (id) => api.delete(`/groups/${id}`);
export const joinGroup = (id) => api.post(`/groups/${id}/join`);
export const leaveGroup = (id) => api.post(`/groups/${id}/leave`);
export const getMyGroups = () => api.get('/groups/my');
export const getGroupPosts = (id) => api.get(`/groups/${id}/posts`);
export const updateGroupCover = (id, file) => {
  const formData = new FormData();
  formData.append('coverImage', file);
  return api.post(`/groups/${id}/cover`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const updateGroupPhoto = (id, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return api.post(`/groups/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const addMember = (id, memberId) => api.post(`/groups/${id}/members`, { memberId });
export const removeMember = (id, memberId) => api.delete(`/groups/${id}/members`, { data: { memberId } });
export const approveJoinRequest = (id, userId) => api.post(`/groups/${id}/approve-request`, { userId });
export const declineJoinRequest = (id, userId) => api.post(`/groups/${id}/decline-request`, { userId });

