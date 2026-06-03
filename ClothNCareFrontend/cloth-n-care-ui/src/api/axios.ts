import axios from "axios";

const isDev = window.location.port === "5173";
const baseURL = isDev ? `${window.location.protocol}//${window.location.hostname}:8080` : "";

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
