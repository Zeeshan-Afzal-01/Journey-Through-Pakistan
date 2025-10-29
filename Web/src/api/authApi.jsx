import api from "./api.jsx";

// REGISTER user
export const signup = async (data) => {
  const formData = new FormData();

  if (data.name) formData.append("name", data.name);
  if (data.email) formData.append("email", data.email);
  if (data.password) formData.append("password", data.password);
  if (data.role) formData.append("role", data.role);
  if (data.phone) formData.append("phone", data.phone);
  if (data.city) formData.append("city", data.city);
  if (data.country) formData.append("country", data.country);
  if (data.profilePicture)
    formData.append("profilePicture", data.profilePicture);

  return api.post("/users/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// LOGIN
export const login = (payload) => api.post("/users/login", payload);

// GET logged-in user (note: backend route is /users/getMe)
export const getMe = () => api.get("/users/getMe");

// VERIFY OTP
export const verifyOtp = (payload) => api.post("/users/verify-otp", payload);

// RESEND OTP
export const resendOtp = (payload) => api.post("/users/resend-otp", payload);

// LOGOUT (optional)
export const logout = () => api.post("/users/logout");

// UPDATE ME (profile picture and other fields)
export const updateMe = (data) => {
  const fd = new FormData();
  if (data.profilePicture) fd.append("profilePicture", data.profilePicture);
  if (data.name) fd.append("name", data.name);
  if (data.city) fd.append("city", data.city);
  return api.put("/users/me", fd, { headers: { "Content-Type": "multipart/form-data" } });
};

export const searchUsers = (q) => api.get('/users/search', { params: { q } });
export const getTopCreators = () => api.get('/users/top-creators');