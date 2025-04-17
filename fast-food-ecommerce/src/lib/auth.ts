// Kiểm tra xem token có trong local storage không
export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || '';
  }
  return '';
}; 

// Thêm hàm kiểm tra tính hợp lệ của token
export const isTokenValid = (): boolean => {
  const token = getAuthToken();
  
  // Nếu không có token, coi như không hợp lệ
  if (!token) return false;
  
  try {
    // Thử phân tích token (giả sử là JWT)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return false;
    
    // Lấy phần payload và decode
    const payload = JSON.parse(
      atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    
    // Kiểm tra thời gian hết hạn
    if (payload.exp) {
      const expiry = payload.exp * 1000; // Chuyển đổi từ giây sang mili giây
      return expiry > Date.now();
    }
    
    // Nếu không có thông tin hết hạn, coi như hợp lệ
    return true;
  } catch (error) {
    console.error('Lỗi khi kiểm tra token:', error);
    return false;
  }
};

// Hàm lưu token xác thực
export function saveAuthToken(token: string) {
  localStorage.setItem("token", token);
}

// Hàm xóa token xác thực
export function removeAuthToken() {
  localStorage.removeItem("token");
}

// Hàm kiểm tra xem có token hay không
export function hasAuthToken(): boolean {
  return !!getAuthToken();
}

// Hàm lấy Header cho các yêu cầu có xác thực
export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Hàm tạo fetch request với headers xác thực
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // Kiểm tra tính hợp lệ của token trước khi gửi request
  if (!isTokenValid()) {
    console.warn('Token không hợp lệ hoặc đã hết hạn');
    removeAuthToken();
    
    // Chuyển hướng đến trang đăng nhập nếu cần
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
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

  const response = await fetch(url, mergedOptions);
  
  // Kiểm tra nếu token hết hạn
  if (response.status === 401) {
    removeAuthToken();
    
    // Chuyển hướng đến trang đăng nhập nếu cần
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }
  
  return response;
} 