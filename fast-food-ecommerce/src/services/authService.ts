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
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Đăng ký không thành công');
    }

    return response.json();
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Đăng ký không thành công');
  }
};

// Đăng nhập
export const login = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Đăng nhập không thành công');
    }

    return response.json();
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Đăng nhập không thành công');
  }
};

// Lấy thông tin người dùng hiện tại
export const getCurrentUser = async (token: string): Promise<UserData> => {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Không thể lấy thông tin người dùng');
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Lỗi khi lấy thông tin người dùng:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Không thể lấy thông tin người dùng');
  }
};

// Đăng xuất
export const logout = async (): Promise<void> => {
  try {
    // Gọi API đăng xuất để xóa cookie
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
  }
  
  // Xóa token và user data ở client
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}; 