import { API_URL, AUTH_TOKEN_KEY } from '../lib/constants';

// Đồng bộ lượt xem sản phẩm từ localStorage
export const syncViewedProducts = async (): Promise<void> => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      console.log('Không tìm thấy token để đồng bộ lượt xem sản phẩm');
      return;
    }

    // Lấy danh sách sản phẩm đã xem từ localStorage
    const viewedProducts = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
    if (!viewedProducts.length) {
      console.log('Không có lượt xem sản phẩm để đồng bộ');
      return;
    }

    console.log(`Đang đồng bộ ${viewedProducts.length} lượt xem sản phẩm...`);

    // Gửi từng lượt xem lên server
    for (const productId of viewedProducts) {
      console.log(`Đang gửi lượt xem sản phẩm ID: ${productId} lên server...`);
      try {
        const response = await fetch(`${API_URL}/recommendations/user-behavior/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ productId })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error(`Lỗi đồng bộ lượt xem sản phẩm ${productId}:`, result);
        } else {
          console.log(`Đã đồng bộ lượt xem sản phẩm ${productId} thành công:`, result);
        }
      } catch (error) {
        console.error(`Lỗi khi gửi lượt xem sản phẩm ${productId}:`, error);
      }
    }

    // Xóa danh sách sản phẩm đã xem trong localStorage sau khi đồng bộ
    localStorage.removeItem('viewedProducts');
    console.log('Đã đồng bộ lượt xem sản phẩm từ localStorage lên server');
  } catch (error) {
    console.error('Lỗi khi đồng bộ lượt xem sản phẩm:', error);
  }
};

// Đồng bộ lịch sử tìm kiếm từ localStorage
export const syncSearchQueries = async (): Promise<void> => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      console.log('Không tìm thấy token để đồng bộ lịch sử tìm kiếm');
      return;
    }

    // Lấy lịch sử tìm kiếm từ localStorage
    const searchQueries = JSON.parse(localStorage.getItem('searchQueries') || '[]');
    if (!searchQueries.length) {
      console.log('Không có lịch sử tìm kiếm để đồng bộ');
      return;
    }

    console.log(`Đang đồng bộ ${searchQueries.length} lịch sử tìm kiếm...`);

    // Gửi từng query lên server
    for (const item of searchQueries) {
      const query = typeof item === 'string' ? item : item.query;
      if (!query) continue;
      
      console.log(`Đang gửi lịch sử tìm kiếm: "${query}" lên server...`);
      try {
        const response = await fetch(`${API_URL}/recommendations/user-behavior/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ query })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error(`Lỗi đồng bộ lịch sử tìm kiếm "${query}":`, result);
        } else {
          console.log(`Đã đồng bộ lịch sử tìm kiếm "${query}" thành công:`, result);
        }
      } catch (error) {
        console.error(`Lỗi khi gửi lịch sử tìm kiếm "${query}":`, error);
      }
    }

    // Xóa lịch sử tìm kiếm trong localStorage sau khi đồng bộ
    localStorage.removeItem('searchQueries');
    console.log('Đã đồng bộ lịch sử tìm kiếm từ localStorage lên server');
  } catch (error) {
    console.error('Lỗi khi đồng bộ lịch sử tìm kiếm:', error);
  }
};

// Hàm đồng bộ tất cả dữ liệu hành vi người dùng
export const syncAllUserBehaviors = async (): Promise<void> => {
  console.log('Bắt đầu đồng bộ tất cả hành vi người dùng...');
  try {
    await syncViewedProducts();
    await syncSearchQueries();
    console.log('Đã đồng bộ tất cả hành vi người dùng từ localStorage lên server');
  } catch (error) {
    console.error('Lỗi khi đồng bộ hành vi người dùng:', error);
  }
};

export default {
  syncViewedProducts,
  syncSearchQueries,
  syncAllUserBehaviors
}; 