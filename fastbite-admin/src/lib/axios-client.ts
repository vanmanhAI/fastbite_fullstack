import axios from 'axios';
import API_URL from './api-config';

// Tạo instance axios
const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Thêm timeout 15 giây
});

// Interceptor xử lý JWT token cho mỗi request
axiosClient.interceptors.request.use(
  (config) => {
    // Kiểm tra nếu đang gửi FormData
    if (config.data instanceof FormData) {
      // Khi gửi FormData, xóa Content-Type để browser tự thêm boundary
      delete config.headers['Content-Type'];
    }
    
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
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Interceptor xử lý response
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Log lỗi chi tiết
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        data: error.config?.data
      }
    });

    // Xử lý lỗi 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // Xóa token và redirect về trang đăng nhập
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fastbite_admin_token');
        window.location.href = '/';
      }
    }

    // Thêm thông tin chi tiết về lỗi
    if (error.response && error.response.data && error.response.data.message) {
      error.message = error.response.data.message;
    } else if (!error.message) {
      if (error.code === 'ECONNABORTED') {
        error.message = 'Kết nối tới server quá lâu, vui lòng thử lại sau';
      } else if (!navigator.onLine) {
        error.message = 'Không có kết nối internet';
      } else {
        error.message = 'Đã có lỗi xảy ra, vui lòng thử lại sau';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient; 