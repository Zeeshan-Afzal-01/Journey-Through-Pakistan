import api from "./api.jsx";

export const listPosts = () => api.get("/posts");
export const createPost = (payload) => {
  // payload can be { text, imageUrl, place, feeling } or { text, file, place, feeling }
  if (payload?.file) {
    const fd = new FormData();
    fd.append("text", payload.text);
    if (payload.place) fd.append("place", payload.place);
    if (payload.feeling) fd.append("feeling", payload.feeling);
    fd.append("image", payload.file);
    return api.post("/posts", fd, { headers: { "Content-Type": "multipart/form-data" } });
  }
  return api.post("/posts", payload);
};
export const getPost = (postId) => api.get(`/posts/${postId}`);
export const toggleLike = (postId) => api.post(`/posts/${postId}/like`);
export const addComment = (postId, text) => api.post(`/posts/${postId}/comment`, { text });
export const sharePost = (postId) => api.post(`/posts/${postId}/share`);


