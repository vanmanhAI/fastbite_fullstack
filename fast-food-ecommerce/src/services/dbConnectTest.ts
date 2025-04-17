import axios from 'axios';

// API endpoint cho chatbot
const CHAT_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/chat`;

/**
 * Kiểm tra kết nối cơ sở dữ liệu thông qua API
 */
export async function testDatabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log('Kiểm tra kết nối DB tại URL:', `${CHAT_API_URL}/db-test`);
    
    // Gọi API để kiểm tra kết nối DB với timeout
    const response = await axios.get(`${CHAT_API_URL}/db-test`, {
      timeout: 5000, // 5 giây timeout
    });
    
    // Phân tích kết quả
    if (response.data && response.data.success) {
      console.log('Kết nối DB thành công');
      return { 
        success: true, 
        message: 'Kết nối cơ sở dữ liệu thành công',
        details: response.data
      };
    }
    
    console.log('Kết nối DB thất bại:', response.data);
    return { 
      success: false, 
      message: response.data?.message || 'Không thể kết nối đến cơ sở dữ liệu',
      details: response.data
    };
  } catch (error) {
    console.error('Lỗi khi kiểm tra kết nối DB:', error);
    
    let errorDetails = {};
    let errorMessage = 'Lỗi không xác định khi kiểm tra kết nối DB';
    
    // Trường hợp không thể kết nối đến API
    if (axios.isAxiosError(error)) {
      errorDetails = {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      };
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Máy chủ API không hoạt động hoặc sai địa chỉ';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'TIMEOUT') {
        errorMessage = 'Kết nối đến máy chủ API bị timeout';
      } else if (!error.response) {
        errorMessage = 'Không thể kết nối đến máy chủ API: ' + (error.message || 'Lỗi không xác định');
      } else if (error.response?.data) {
        // Trường hợp API trả về lỗi cụ thể
        errorMessage = error.response.data.message || 
                        error.response.data.error || 
                        `Lỗi API (mã: ${error.response?.status || 'không có'})`;
      }
    }
    
    return {
      success: false,
      message: errorMessage,
      details: errorDetails
    };
  }
}

export default {
  testDatabaseConnection
}; 