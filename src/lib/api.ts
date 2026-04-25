import axios from "axios";
import { useAuthStore } from "@/store/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from auth store
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      // Public endpoints that don't require authentication
      const isPublicEndpoint = 
        url.includes("/auth/reset-password") || 
        url.includes("/auth/forgot-password") ||
        url.includes("/student-form") ||
        url.includes("/invitations/validate") ||
        url.includes("/invitations/accept") ||
        url.includes("/instructor-registration/") ||
        url.includes("/student-registration/") ||
        url.includes("/disciplines/public/");
      
      if (!isPublicEndpoint) {
        useAuthStore.getState().logout();
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
