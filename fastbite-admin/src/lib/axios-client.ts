import axios from 'axios';
import API_URL from './api-config';

// Tạo instance axios
const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor xử lý JWT token cho mỗi request
axiosClient.interceptors.request.use(
  (config) => {
    // Thêm token từ localStorage vào header nếu có
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('fastbite_admin_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor xử lý response
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Xử lý lỗi 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // Xóa token và redirect về trang đăng nhập
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fastbite_admin_token');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient; 