import {API_URL} from '../lib/api-config';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserData {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export interface AuthResponse {
  user: UserData;
  token: string;
  message: string;
}

// Đăng ký người dùng
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Đăng ký không thành công');
  }

  return response.json();
};

// Đăng nhập
export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Đăng nhập không thành công');
  }

  return response.json();
};

// Lấy thông tin người dùng hiện tại
export const getCurrentUser = async (token: string): Promise<UserData> => {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Không thể lấy thông tin người dùng');
  }

  const data = await response.json();
  return data.user;
};

// Đăng xuất (chỉ xóa token ở client, không cần gọi API)
export const logout = () => {
  // Có thể thêm logic xử lý đăng xuất ở đây nếu cần
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}; 