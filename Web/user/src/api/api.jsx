import axios from "axios";

const API_URL = "http://localhost:3000"; // root; individual modules will append paths

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default api;