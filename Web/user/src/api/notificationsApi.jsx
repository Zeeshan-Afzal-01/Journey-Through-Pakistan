import api from "./api.jsx";

export const listNotifications = () => api.get("/notifications");
export const markAllRead = () => api.post("/notifications/read-all");
export const listActivity = (actorId) => api.get("/notifications/activity", { params: actorId ? { actor: actorId } : {} });


