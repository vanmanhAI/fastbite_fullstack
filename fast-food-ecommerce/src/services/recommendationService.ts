import { AUTH_TOKEN_KEY } from '../lib/constants';
import { Product } from './productService';

// Cấu hình API URL
const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Lấy token từ localStorage
 */
const getTokenFromLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return null;
};

export interface UserPreference {
  categoryPreferences: string[];
  dietaryRestrictions: string[];
  spiceLevel: string;
  tastePreferences: string[];
  allergens: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

export interface UserBehavior {
  viewedProducts: number[];
  purchasedProducts: number[];
  searchQueries: string[];
  ratings: {
    productId: number;
    rating: number;
  }[];
}

export interface RecommendationRequest {
  userId?: number;
  query?: string;
  contextType?: 'meal_time' | 'weather' | 'season' | 'trending';
  location?: string;
  limit?: number;
  includeReasoning?: boolean;
}

export interface RecommendationResponse {
  products: (Product & { 
    confidence: number;
    reasoning?: string; 
  })[];
  timestamp: string;
  baseFactors: string[];
}

/**
 * Lấy đề xuất sản phẩm cá nhân hóa
 */
export const getPersonalizedRecommendations = async (
  options: RecommendationRequest
): Promise<RecommendationResponse> => {
  const token = localStorage.getItem('token');
  
  if (!token && !options.query) {
    throw new Error('Cần đăng nhập để nhận gợi ý cá nhân hóa hoặc cần cung cấp nội dung tìm kiếm');
  }
  
  const queryParams = new URLSearchParams();
  
  if (options.query) queryParams.append('query', options.query);
  if (options.contextType) queryParams.append('contextType', options.contextType);
  if (options.location) queryParams.append('location', options.location);
  if (options.limit) queryParams.append('limit', options.limit.toString());
  if (options.includeReasoning) queryParams.append('includeReasoning', 'true');
  
  const url = `${BASE_API_URL}/recommendations?${queryParams.toString()}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Không thể lấy đề xuất sản phẩm');
  }
  
  return response.json();
};

/**
 * Theo dõi hành vi xem sản phẩm
 * @param productId ID sản phẩm
 */
export const trackProductView = async (productId: number) => {
  try {
    const token = getTokenFromLocalStorage()
    if (!token) {
      console.log('User not logged in, skipping tracking')
      return false
    }

    const response = await fetch(`${BASE_API_URL}/recommendations/track-view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId
      })
    })

    if (!response.ok) {
      console.error('Error tracking product view:', await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Error tracking product view:', error)
    return false
  }
}

/**
 * Theo dõi hành vi tìm kiếm 
 * @param searchQuery Chuỗi tìm kiếm
 */
export const trackSearchQuery = async (searchQuery: string) => {
  try {
    const token = getTokenFromLocalStorage()
    if (!token) {
      console.log('User not logged in, skipping tracking')
      return false
    }

    const response = await fetch(`${BASE_API_URL}/recommendations/track-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        searchQuery
      })
    })

    if (!response.ok) {
      console.error('Error tracking search query:', await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Error tracking search query:', error)
    return false
  }
}

/**
 * Theo dõi hành vi xem sản phẩm từ kết quả tìm kiếm
 * @param productId ID sản phẩm
 * @param searchQuery Chuỗi tìm kiếm gốc
 */
export const trackProductViewFromSearch = async (productId: number, searchQuery: string) => {
  try {
    const token = getTokenFromLocalStorage()
    if (!token) {
      console.log('User not logged in, skipping tracking')
      return false
    }

    const response = await fetch(`${BASE_API_URL}/recommendations/track-view-from-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId,
        searchQuery
      })
    })

    if (!response.ok) {
      console.error('Error tracking product view from search:', await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Error tracking product view from search:', error)
    return false
  }
}

/**
 * Theo dõi hành vi click vào danh mục
 * @param categoryId ID danh mục
 * @param categoryName Tên danh mục (đã được cập nhật để tương thích với BE mới)
 */
export const trackCategoryClick = async (categoryId: number, categoryName: string = '') => {
  try {
    const token = getTokenFromLocalStorage()
    if (!token) {
      console.log('User not logged in, skipping tracking')
      return false
    }
    
    console.log(`Theo dõi click vào danh mục: ${categoryId} - ${categoryName}`);
    
    const response = await fetch(`${BASE_API_URL}/recommendations/track-category`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        categoryId
      })
    })

    if (!response.ok) {
      console.error('Error tracking category click:', await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Error tracking category click:', error)
    return false
  }
}

/**
 * Lấy đề xuất sản phẩm dựa trên lịch sử tìm kiếm
 * @param limit Số lượng sản phẩm cần lấy
 */
export const getRecommendationsBySearch = async (limit: number = 8) => {
  try {
    const token = getTokenFromLocalStorage()
    if (!token) {
      console.log('User not logged in, skipping recommendations')
      return []
    }
    
    const userId = getUserIdFromToken(token)
    if (!userId) {
      console.log('Could not get userId from token')
      return []
    }

    const response = await fetch(`${BASE_API_URL}/recommendations/${userId}/search-based?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      console.error('Error getting search-based recommendations:', await response.text())
      return []
    }

    const data = await response.json()
    return data.success ? data.products : []
  } catch (error) {
    console.error('Error getting search-based recommendations:', error)
    return []
  }
}

/**
 * Lấy đề xuất sản phẩm cá nhân hóa cho chatbot
 * @param query Nội dung tìm kiếm hoặc từ khóa
 * @param limit Số lượng kết quả trả về
 */
export const getChatRecommendations = async (query?: string, limit: number = 5): Promise<any> => {
  try {
    const token = getTokenFromLocalStorage();
    
    const queryParams = new URLSearchParams();
    if (query) queryParams.append('query', query);
    if (limit) queryParams.append('limit', limit.toString());
    
    const url = `${BASE_API_URL}/chat/recommendations?${queryParams.toString()}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log(`[GEMINI] Gửi yêu cầu đề xuất với query: "${query}"`);
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Lỗi khi lấy đề xuất sản phẩm:', errorData);
      throw new Error(errorData.message || 'Không thể lấy đề xuất sản phẩm');
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Không thể lấy đề xuất sản phẩm');
    }
    
    console.log(`[GEMINI] Nhận được ${data.products?.length || 0} đề xuất sản phẩm`);
    if (data.queryAnalysis) {
      console.log(`[GEMINI] Kết quả phân tích Gemini:`, data.queryAnalysis);
    }
    
    return {
      products: data.products.map((product: any) => ({
        id: product.id,
        name: product.name,
        image: product.imageUrl || '/images/placeholder-food.jpg',
        price: product.price,
        description: product.description || '',
        stock: product.stock || 0,
        reasoning: product.reasoning || 'Gợi ý từ Gemini',
        confidence: product.confidence || 0.5,
        category: product.categories?.[0]?.name || ''
      })),
      reasonings: data.reasonings || [],
      isNewUser: data.isNewUser || false,
      queryAnalysis: data.queryAnalysis || null
    };
  } catch (error) {
    console.error('[GEMINI] Lỗi khi lấy đề xuất sản phẩm:', error);
    return {
      products: [],
      reasonings: ['Không thể lấy đề xuất từ Gemini lúc này'],
      isNewUser: false,
      queryAnalysis: null
    };
  }
};

/**
 * Giải mã token JWT để lấy userId
 * @param token JWT token
 * @returns userId hoặc null nếu không tìm thấy
 */
function getUserIdFromToken(token: string): number | null {
  try {
    // Giải mã JWT token (phần payload)
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))

    const payload = JSON.parse(jsonPayload)
    return payload.id || payload.userId || null
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

/**
 * Lấy hoặc cập nhật tùy chọn người dùng
 * @deprecated Tính năng này đã bị loại bỏ, trả về dữ liệu mặc định
 */
export const getUserPreferences = async (): Promise<UserPreference> => {
  // Thông báo tính năng đã bị loại bỏ
  console.log('Tính năng UserPreferences đã bị loại bỏ. Sử dụng hành vi người dùng để cá nhân hóa');
  
  // Trả về đối tượng mặc định
  return {
    categoryPreferences: [],
    dietaryRestrictions: [],
    spiceLevel: "medium",
    tastePreferences: [],
    allergens: [],
    priceRange: {
      min: 0,
      max: 1000000
    }
  };
};

/**
 * Cập nhật tùy chọn người dùng
 * @deprecated Tính năng này đã bị loại bỏ, trả về dữ liệu đầu vào
 */
export const updateUserPreferences = async (preferences: Partial<UserPreference>): Promise<UserPreference> => {
  // Thông báo tính năng đã bị loại bỏ
  console.log('Tính năng UserPreferences đã bị loại bỏ. Sử dụng hành vi người dùng để cá nhân hóa');
  
  // Giả lập thành công, trả về đối tượng đầu vào như là kết quả
  return {
    categoryPreferences: preferences.categoryPreferences || [],
    dietaryRestrictions: preferences.dietaryRestrictions || [],
    spiceLevel: preferences.spiceLevel || "medium",
    tastePreferences: preferences.tastePreferences || [],
    allergens: preferences.allergens || [],
    priceRange: {
      min: preferences.priceRange?.min || 0,
      max: preferences.priceRange?.max || 1000000
    }
  };
};

/**
 * Cập nhật hành vi người dùng (thích sản phẩm)
 * @param productId ID sản phẩm
 * @param isLiked Trạng thái thích/không thích (mặc định là true)
 */
export const trackLikeProduct = async (productId: number, isLiked: boolean = true): Promise<void> => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    // Nếu không đăng nhập, bỏ qua vì hành vi này phụ thuộc vào đăng nhập
    if (!token) {
      console.log(`Bỏ qua theo dõi thích sản phẩm ID ${productId} (chưa đăng nhập)`);
      return;
    }
    
    console.log(`[DEBUG] Gửi ${isLiked ? 'thích' : 'bỏ thích'} sản phẩm ID ${productId} lên server (đã đăng nhập)`);
    console.log(`[DEBUG] Endpoint: ${BASE_API_URL}/recommendations/track-like`);
    
    try {
      // Thử sử dụng API mới trước
      const endpoint = `${BASE_API_URL}/recommendations/track-like`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId, isLiked })
      });
      
      console.log(`[DEBUG] Status code: ${response.status}`);
      
      const data = await response.json();
      console.log('[DEBUG] Kết quả theo dõi thích sản phẩm:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Lỗi khi theo dõi thích sản phẩm');
      }
    } catch (error) {
      console.error('[DEBUG] Lỗi khi theo dõi thích sản phẩm:', error);
      // Thử sử dụng API cũ nếu API mới gặp lỗi
      try {
        const fallbackEndpoint = `${BASE_API_URL}/recommendations/user-behavior/like`;
        console.log(`[DEBUG] Dùng fallback endpoint: ${fallbackEndpoint}`);
        
        const fallbackResponse = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ productId, isLiked })
        });
        
        console.log(`[DEBUG] Fallback status code: ${fallbackResponse.status}`);
        
        if (!fallbackResponse.ok) {
          console.error('[DEBUG] Cả API mới và cũ đều thất bại khi theo dõi thích sản phẩm');
        } else {
          console.log('[DEBUG] Đã gọi API cũ thành công');
        }
      } catch (fallbackError) {
        console.error('[DEBUG] Lỗi khi gọi API fallback:', fallbackError);
      }
    }
  } catch (error) {
    console.error('[DEBUG] Lỗi ngoại lệ khi theo dõi thích sản phẩm:', error);
  }
};

/**
 * Cập nhật hành vi người dùng (thêm vào giỏ hàng)
 */
export const trackAddToCart = async (productId: number): Promise<void> => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    // Nếu không đăng nhập, bỏ qua vì hành vi này sẽ được CartService xử lý
    if (!token) {
      console.log(`Bỏ qua theo dõi thêm vào giỏ hàng ID ${productId} (chưa đăng nhập)`);
      return;
    }
    
    console.log(`Gửi thêm vào giỏ hàng ID ${productId} lên server (đã đăng nhập)`);
    try {
      // Thử sử dụng API mới trước
      const endpoint = `${BASE_API_URL}/recommendations/track-add-to-cart`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });
      
      const data = await response.json();
      console.log('Kết quả theo dõi thêm vào giỏ hàng:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Lỗi khi theo dõi thêm vào giỏ hàng');
      }
    } catch (error) {
      console.error('Lỗi khi theo dõi thêm vào giỏ hàng (API mới):', error);
      // Thử sử dụng API cũ nếu API mới gặp lỗi
      try {
        const fallbackEndpoint = `${BASE_API_URL}/recommendations/user-behavior/add-to-cart`;
        const fallbackResponse = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ productId })
        });
        
        if (!fallbackResponse.ok) {
          console.error('Cả API mới và cũ đều thất bại khi theo dõi thêm vào giỏ hàng');
        } else {
          console.log('Đã gọi API cũ thành công');
        }
      } catch (fallbackError) {
        console.error('Lỗi khi gọi API fallback:', fallbackError);
      }
    }
  } catch (error) {
    console.error('Lỗi ngoại lệ khi theo dõi thêm vào giỏ hàng:', error);
  }
};

/**
 * Cập nhật hành vi người dùng (đánh giá sản phẩm)
 * @param productId ID sản phẩm
 * @param rating Số sao đánh giá
 * @param reviewContent Nội dung đánh giá (tuỳ chọn)
 */
export const trackReview = async (productId: number, rating: number, reviewContent?: string): Promise<void> => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    // Nếu không đăng nhập, bỏ qua vì hành vi này yêu cầu đăng nhập
    if (!token) {
      console.log(`Bỏ qua theo dõi đánh giá sản phẩm ID ${productId} (chưa đăng nhập)`);
      return;
    }
    
    console.log(`Gửi đánh giá sản phẩm ID ${productId} với số sao ${rating} lên server (đã đăng nhập)`);
    
    // Tạo body request, thêm reviewContent nếu có
    const requestBody: any = { productId, rating };
    if (reviewContent) {
      requestBody.reviewContent = reviewContent;
    }
    
    try {
      const response = await fetch(`${BASE_API_URL}/recommendations/user-behavior/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      console.log('Kết quả theo dõi đánh giá sản phẩm:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Lỗi khi theo dõi đánh giá sản phẩm');
      }
    } catch (error) {
      console.error('Lỗi khi theo dõi đánh giá sản phẩm:', error);
    }
  } catch (error) {
    console.error('Lỗi ngoại lệ khi theo dõi đánh giá sản phẩm:', error);
  }
};

export default {
  getPersonalizedRecommendations,
  trackProductView,
  trackSearchQuery,
  getUserPreferences,
  updateUserPreferences,
  trackLikeProduct,
  trackAddToCart,
  trackReview,
  trackCategoryClick,
  getRecommendationsBySearch,
  getChatRecommendations
}; 