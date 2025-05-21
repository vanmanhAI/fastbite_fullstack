import { AUTH_TOKEN_KEY, USER_INFO_KEY } from './constants';
import { API_URL } from './constants';
import axios from 'axios';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

// Kiểm tra xem token có trong local storage không
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    console.log("getAuthToken - Reading token from localStorage:", token ? "Token exists" : "No token");
    return token;
  }
  return null;
};

// Thêm hàm kiểm tra tính hợp lệ của token
export const isTokenValid = (): boolean => {
  const token = getAuthToken();
  
  // Nếu không có token, coi như không hợp lệ
  if (!token) {
    console.log("isTokenValid - No token found");
    return false;
  }
  
  try {
    // Thử phân tích token (giả sử là JWT)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.log("isTokenValid - Invalid token format (not a JWT)");
      return false;
    }
    
    // Lấy phần payload và decode
    let payload;
    try {
      payload = JSON.parse(
        atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      console.log("isTokenValid - Successfully decoded token payload:", payload);
    } catch (decodeError) {
      console.error("isTokenValid - Error decoding token payload:", decodeError);
      return false;
    }
    
    // Kiểm tra thời gian hết hạn
    if (payload.exp) {
      const expiry = payload.exp * 1000; // Chuyển đổi từ giây sang mili giây
      const now = Date.now();
      const timeLeft = expiry - now;
      const isValid = timeLeft > 0;
      
      console.log(`isTokenValid - Token ${isValid ? 'is valid' : 'has expired'}`);
      console.log(`isTokenValid - Expires at: ${new Date(expiry).toISOString()}`);
      console.log(`isTokenValid - Current time: ${new Date(now).toISOString()}`);
      console.log(`isTokenValid - Time left: ${Math.floor(timeLeft / 1000 / 60)} minutes`);
      
      return isValid;
    }
    
    // Nếu không có thông tin hết hạn, coi như hợp lệ
    console.log("isTokenValid - Token has no expiry, assuming valid");
    return true;
  } catch (error) {
    console.error('isTokenValid - Error checking token:', error);
    return false;
  }
};

// Hàm lưu token xác thực
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    console.log("setAuthToken - Saving token to localStorage:", token ? token.substring(0, 15) + "..." : "No token");
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

// Hàm xóa token xác thực
export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    console.log("removeAuthToken - Removing token from localStorage");
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

// Hàm kiểm tra xem có token hay không
export const isLoggedIn = (): boolean => {
  const hasToken = !!getAuthToken();
  console.log("isLoggedIn -", hasToken ? "User is logged in" : "User is not logged in");
  return hasToken;
};

// Hàm lấy Header cho các yêu cầu có xác thực
export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    console.log("getAuthHeader - Adding Authorization header with token");
    return { Authorization: `Bearer ${token}` };
  } else {
    console.log("getAuthHeader - No Authorization header added (no token)");
    return {};
  }
}

// Hàm tạo fetch request với headers xác thực
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // Kiểm tra tính hợp lệ của token trước khi gửi request
  if (!isTokenValid()) {
    console.warn('Token không hợp lệ hoặc đã hết hạn');
    removeAuthToken();
    removeUserInfo();
    
    // Thay vì trả về lỗi, có thể trigger sự kiện hoặc callback để thông báo cho UI
    const authError = new Error('Unauthorized: Token không hợp lệ hoặc đã hết hạn');
    authError.name = 'AuthError';
    throw authError;
  }

  const authHeaders = getAuthHeader();
  
  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, mergedOptions);
    
    // Kiểm tra nếu token hết hạn
    if (response.status === 401 || response.status === 403) {
      console.warn('Token bị từ chối bởi server');
      removeAuthToken();
      removeUserInfo();
      
      const authError = new Error(`Lỗi xác thực (${response.status}): ${await response.text()}`);
      authError.name = 'AuthError';
      throw authError;
    }
    
    return response;
  } catch (error) {
    console.error('fetchWithAuth - Lỗi khi gửi request:', error);
    
    // Ném lại lỗi để xử lý ở UI
    if ((error as Error).name === 'AuthError') {
      throw error;
    }
    
    // Nếu là lỗi mạng, trả về lỗi tùy chỉnh
    const networkError = new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    networkError.name = 'NetworkError';
    throw networkError;
  }
}

export const getUserInfo = (): User | null => {
  if (typeof window !== 'undefined') {
    const userInfo = localStorage.getItem(USER_INFO_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
  }
  return null;
};

export const setUserInfo = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
  }
};

export const removeUserInfo = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_INFO_KEY);
  }
};

export const logout = (): void => {
  removeAuthToken();
  removeUserInfo();
};

export const isAdmin = (): boolean => {
  const user = getUserInfo();
  return user?.role === 'admin';
};

// Hàm refresh token nếu sắp hết hạn
export const refreshIfNeeded = async (): Promise<boolean> => {
  try {
    // Kiểm tra có token không
    const token = getAuthToken();
    if (!token) {
      console.log('refreshIfNeeded - No token available');
      return false;
    }
    
    // Phân tích token
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.log('refreshIfNeeded - Invalid token format');
      removeAuthToken(); // Xóa token không hợp lệ
      return false;
    }
    
    // Lấy payload
    let payload;
    try {
      payload = JSON.parse(
        atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
    } catch (e) {
      console.error('refreshIfNeeded - Error decoding token:', e);
      removeAuthToken(); // Xóa token không hợp lệ
      return false;
    }
    
    // Kiểm tra thời gian hết hạn
    if (!payload.exp) {
      console.log('refreshIfNeeded - Token has no expiry information');
      return false;
    }
    
    const expiry = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeLeft = expiry - now;
    
    // Nếu hết hạn, xóa token
    if (timeLeft <= 0) {
      console.log('refreshIfNeeded - Token has expired');
      removeAuthToken();
      removeUserInfo();
      return false;
    }
    
    // Nếu còn dưới 15 phút, thử refresh
    if (timeLeft < 15 * 60 * 1000) {
      console.log(`refreshIfNeeded - Token expires soon (${Math.floor(timeLeft / 1000 / 60)} minutes left), refreshing`);
      
      // Gọi API refresh token
      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data && response.data.token) {
          // Lưu token mới
          setAuthToken(response.data.token);
          console.log('refreshIfNeeded - Token refreshed successfully');
          return true;
        }
      } catch (error) {
        console.error('refreshIfNeeded - Error refreshing token:', error);
        
        // Nếu lỗi 401 hoặc 403, xóa token
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          console.log('refreshIfNeeded - Token was rejected, removing credentials');
          removeAuthToken();
          removeUserInfo();
        }
        
        return false;
      }
    } else {
      console.log(`refreshIfNeeded - Token still valid (${Math.floor(timeLeft / 1000 / 60)} minutes left)`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('refreshIfNeeded - Error:', error);
    return false;
  }
}; 