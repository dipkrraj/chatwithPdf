import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Expiration and Auto-Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loops
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Attempt token refresh
          const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });

          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);

          // Retry the original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token expired or invalid -> logout user
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.reload(); // Redirect to auth
          return Promise.reject(refreshError);
        }
      }
    }

    // Standardize error message extraction
    const serverMessage = error.response?.data?.detail || error.response?.data?.message || error.message;
    return Promise.reject(new Error(serverMessage));
  }
);

export default api;
export { API_BASE_URL };
