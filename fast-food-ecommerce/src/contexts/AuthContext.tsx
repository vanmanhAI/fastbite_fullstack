"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserData, login as loginApi, register as registerApi, getCurrentUser } from '../services/authService';
import { AUTH_TOKEN_KEY, USER_INFO_KEY } from '@/lib/constants';
import { isTokenValid, refreshIfNeeded } from '@/lib/auth';
import { syncAllUserBehaviors } from '../services/userBehaviorService';
import chatbotService from '@/services/chatbotService';

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
  refreshToken: () => Promise<boolean>;
}

// Định nghĩa kiểu dữ liệu cho đăng ký
export interface RegisterData {
  name: string
  email: string
  password: string
  phone?: string
}

// Kiểm tra token và user từ localStorage
const getUserFromStorage = (): UserData | null => {
  if (typeof window === 'undefined') return null;
  const storedUser = localStorage.getItem(USER_INFO_KEY);
  return storedUser ? JSON.parse(storedUser) : null;
};

const getTokenFromStorage = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

// Kiểm tra xác thực ban đầu
const checkInitialAuth = (): boolean => {
  const token = getTokenFromStorage();
  const user = getUserFromStorage();
  return !!(token && user && isTokenValid());
};

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
  // Khởi tạo state với giá trị từ localStorage
  const [user, setUser] = useState<UserData | null>(getUserFromStorage());
  const [token, setToken] = useState<string | null>(getTokenFromStorage());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(checkInitialAuth());
  const [isLoading, setIsLoading] = useState(false);

  // Kiểm tra xác thực khi component mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthContext: Initializing auth state');
      // Kiểm tra token trong localStorage khi component mount
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_INFO_KEY);
      
      if (storedToken && storedUser) {
        if (isTokenValid()) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
          console.log('AuthContext: Đã khởi tạo trạng thái đăng nhập từ localStorage');
          
          // Thử làm mới token nếu cần
          await refreshIfNeeded();
        } else {
          // Nếu token không hợp lệ 
          console.log('AuthContext: Token không hợp lệ, đặt lại trạng thái đăng nhập');
          setIsAuthenticated(false);
          setUser(null);
          setToken(null);
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(USER_INFO_KEY);
        }
      } else if (isAuthenticated) {
        // Nếu trạng thái là đăng nhập nhưng không có token, đặt lại trạng thái
        console.log('AuthContext: Không tìm thấy token, đặt lại trạng thái đăng nhập');
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
      }
    };
    
    initializeAuth();
  }, []);

  // Hàm để làm mới token
  const refreshToken = async (): Promise<boolean> => {
    return await refreshIfNeeded();
  };

  // Đăng nhập
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await loginApi({ email, password });
      
      // Xóa giỏ hàng khách khi đăng nhập
      localStorage.removeItem('cart_guest');
      
      // Lưu token và thông tin người dùng
      if (response && response.token) {
        setUser(response.user);
        setToken(response.token);
        setIsAuthenticated(true);
        
        localStorage.setItem(AUTH_TOKEN_KEY, response.token);
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(response.user));
        
        // Đảm bảo token được lưu trước khi tiếp tục
        console.log('Token đã được lưu:', response.token);
        
        // Đồng bộ token với chatbot service
        chatbotService.syncAuthToken();
        
        // Đồng bộ dữ liệu hành vi người dùng từ localStorage lên server
        try {
          await syncAllUserBehaviors();
        } catch (syncError) {
          console.error('Lỗi đồng bộ hành vi người dùng:', syncError);
          // Không ném lỗi để không ảnh hưởng đến luồng đăng nhập
        }
      } else {
        console.error('Không nhận được token từ API');
      }
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng ký
  const register = async (name: string, email: string, password: string, phone?: string) => {
    setIsLoading(true);
    
    try {
      const response = await registerApi({ name, email, password, phone });
      
      // Lưu token và thông tin người dùng
      if (response && response.token) {
        setUser(response.user);
        setToken(response.token);
        setIsAuthenticated(true);
        
        localStorage.setItem(AUTH_TOKEN_KEY, response.token);
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(response.user));
        
        // Đảm bảo token được lưu trước khi tiếp tục
        console.log('Token đã được lưu:', response.token);
        
        // Đồng bộ token với chatbot service
        chatbotService.syncAuthToken();
      } else {
        console.error('Không nhận được token từ API');
      }
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng xuất
  const logout = () => {
    // Lấy ID người dùng trước khi xóa
    const userData = localStorage.getItem(USER_INFO_KEY);
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
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    
    // Cập nhật trạng thái token cho chatbot
    chatbotService.syncAuthToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 