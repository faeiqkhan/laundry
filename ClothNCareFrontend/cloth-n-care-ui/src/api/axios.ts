import axios, { type InternalAxiosRequestConfig } from "axios";

const isDev = window.location.port === "5173";
const baseURL = isDev
  ? `${window.location.protocol}//${window.location.hostname}:8080/api`
  : "/api";

const api = axios.create({
  baseURL,
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ data: { token: string; refreshToken: string } }>(
        `${baseURL}/auth/refresh`,
        { refreshToken },
      )
      .then((response) => {
        const nextToken = response.data.data.token;
        localStorage.setItem("token", nextToken);
        localStorage.setItem("refreshToken", response.data.data.refreshToken);
        return nextToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const isAuthRequest = original?.url?.includes("/auth/") ?? false;

    if (error.response?.status !== 401 || !original || original._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    original._retry = true;
    const nextToken = await refreshAccessToken();
    if (!nextToken) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("role");
      window.location.href = "/";
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${nextToken}`;
    return api(original);
  },
);

export default api;
