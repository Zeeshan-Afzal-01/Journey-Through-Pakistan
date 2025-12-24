import api from "./api.jsx";

export const listPosts = () => api.get("/posts");
export const listPostsByAuthor = (authorId) => api.get(`/posts`, { params: { author: authorId } });
export const searchPosts = (q) => api.get('/posts', { params: { q } });
export const createPost = (payload) => {
  // payload can be { text, imageUrl, place, feeling, group } or { text, file, place, feeling, group }
  if (payload?.file) {
    const fd = new FormData();
    fd.append("text", payload.text || "");
    if (payload.place) fd.append("place", payload.place);
    if (payload.feeling) fd.append("feeling", payload.feeling);
    if (payload.group) fd.append("group", payload.group);
    fd.append("image", payload.file);
    return api.post("/posts", fd, { headers: { "Content-Type": "multipart/form-data" } });
  }
  return api.post("/posts", payload);
};
export const getPost = (postId) => api.get(`/posts/${postId}`);
export const toggleLike = (postId) => api.post(`/posts/${postId}/like`);
export const addComment = (postId, text, parentCommentId) => api.post(`/posts/${postId}/comment`, { text, parentCommentId });
export const sharePost = (postId) => api.post(`/posts/${postId}/share`);
export const updatePost = (postId, data) => api.put(`/posts/${postId}`, data);
export const deletePost = (postId) => api.delete(`/posts/${postId}`);
export const trendingHashtags = () => api.get('/posts/trending-hashtags');
export const toggleSavePost = (postId) => api.post(`/posts/${postId}/save`);
export const getSavedPosts = () => api.get('/posts/saved');
export const reportPost = (postId, reason, description) => api.post(`/posts/${postId}/report`, { reason, description });
export const reportComment = (postId, commentId, reason, description) => api.post(`/posts/${postId}/comment/${commentId}/report`, { reason, description });


