"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserData, login as loginApi, register as registerApi, getCurrentUser } from '../services/authService';

// Định nghĩa kiểu dữ liệu cho User
export interface User {
  id: number
  name: string
  email: string
  phone?: string
  role?: string
}

// Định nghĩa kiểu dữ liệu cho context
interface AuthContextType {
  user: UserData | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
}

// Định nghĩa kiểu dữ liệu cho đăng ký
export interface RegisterData {
  name: string
  email: string
  password: string
  phone?: string
}

// Tạo context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook để sử dụng AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra token trong localStorage khi component mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setIsLoading(false);
  }, []);

  // Đăng nhập
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await loginApi({ email, password });
      
      // Xóa giỏ hàng khách khi đăng nhập
      localStorage.removeItem('cart_guest');
      
      setUser(response.user);
      setToken(response.token);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng ký
  const register = async (name: string, email: string, password: string, phone?: string) => {
    setIsLoading(true);
    
    try {
      const response = await registerApi({ name, email, password, phone });
      
      setUser(response.user);
      setToken(response.token);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng xuất
  const logout = () => {
    // Lấy ID người dùng trước khi xóa
    const userData = localStorage.getItem('user');
    const userObj = userData ? JSON.parse(userData) : null;
    const userId = userObj?.id;
    
    // Xóa giỏ hàng của người dùng cụ thể
    if (userId) {
      localStorage.removeItem(`cart_${userId}`);
    }
    
    // Xóa giỏ hàng khách (phòng trường hợp)
    localStorage.removeItem('cart_guest');
    
    // Xóa dữ liệu người dùng
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 