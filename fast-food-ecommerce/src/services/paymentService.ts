import {API_URL} from '../lib/api-config';
import { getAuthToken } from "@/lib/auth"

export type PaymentData = {
  orderId: number
  items: Array<{
    product_id: number
    product_name: string
    quantity: number
    price: number
  }>
  customerInfo: {
    name: string
    email: string
    phone: string
    address: string
    city: string
    postal_code: string
  }
  totalAmount: {
    subtotal: number
    shipping_fee: number
    discount: number
    total: number
  }
}

export const createStripeCheckout = async (paymentData: PaymentData): Promise<string> => {
  try {
    const token = getAuthToken()
    
    // Gọi API route để tạo phiên thanh toán Stripe
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(paymentData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Lỗi khi tạo phiên thanh toán")
    }

    const data = await response.json()
    return data.checkoutUrl
  } catch (error) {
    console.error("Lỗi tạo thanh toán Stripe:", error)
    throw error
  }
}

// Hàm cập nhật thông tin thanh toán cho đơn hàng
export const updateOrderPayment = async (orderId: number, paymentInfo: any) => {
  try {
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/orders/${orderId}/payment`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(paymentInfo)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Lỗi khi cập nhật thông tin thanh toán")
    }

    return await response.json()
  } catch (error) {
    console.error("Lỗi cập nhật thanh toán:", error)
    throw error
  }
}

// Tạo phiên thanh toán Stripe
export const createStripeCheckoutSession = async (
  orderId: number,
  token: string
): Promise<{ success: boolean, sessionId: string, url: string }> => {
  try {
    const response = await fetch(`${API_URL}/payments/stripe/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Không thể tạo phiên thanh toán")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Lỗi khi tạo phiên thanh toán Stripe:", error)
    throw error
  }
}

// Kiểm tra trạng thái thanh toán
export const checkPaymentStatus = async (
  sessionId: string,
  token: string
): Promise<{ success: boolean, status: string, payment: any }> => {
  try {
    console.log(`Gửi request kiểm tra trạng thái với sessionId: ${sessionId}, token: ${token?.substring(0, 10)}...`);
    
    // Kiểm tra token trước khi gửi request
    if (!token) {
      console.error("Token không tồn tại hoặc không hợp lệ");
      return {
        success: false,
        status: 'failed',
        payment: null
      };
    }
    
    const response = await fetch(`${API_URL}/payments/stripe/check-status/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Response status:", response.status);
    const responseText = await response.text();
    console.log("Response raw text:", responseText);
    
    let data;
    try {
      // Thử chuyển đổi dữ liệu từ text thành JSON
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Lỗi khi parse JSON từ response:", parseError);
      
      // Nếu không parse được nhưng response OK, thử kiểm tra sessionId trực tiếp
      if (response.ok) {
        console.log("Không parse được JSON nhưng response OK, thử lấy orderId từ URL hoặc session storage");
        const storedOrderId = sessionStorage.getItem('currentOrderId');
        return {
          success: true,
          status: 'succeeded',
          payment: {
            orderId: storedOrderId ? parseInt(storedOrderId) : null
          }
        };
      }
      
      return {
        success: false,
        status: 'failed',
        payment: null
      };
    }
    
    console.log("Dữ liệu trả về từ API:", data);
    
    // -- Kiểm tra nhiều trường hợp với Stripe --
    
    // Trường hợp 0: API trả về cấu trúc có field order.id (cấu trúc mới)
    if (data && data.success && data.order && data.order.id) {
      console.log("Tìm thấy order.id trong response:", data.order.id);
      return {
        success: true,
        status: 'succeeded',
        payment: {
          orderId: data.order.id,
          status: data.order.status,
          paymentStatus: data.order.paymentStatus
        }
      };
    }
    
    // Trường hợp 1: Đã có orderId trong dữ liệu trả về
    if (data && data.orderId) {
      console.log("Tìm thấy orderId trong response:", data.orderId);
      return {
        success: true,
        status: 'succeeded',
        payment: {
          orderId: data.orderId
        }
      };
    }
    
    // Trường hợp 2: Dữ liệu từ Stripe Checkout Session 
    if (data && data.id && data.id === sessionId) {
      console.log("Nhận được dữ liệu Stripe Session trực tiếp");
      
      // Kiểm tra trạng thái thanh toán của session Stripe
      if (data.payment_status === "paid" || data.status === "complete") {
        console.log("Session đã thanh toán thành công");
        
        // Thử lấy orderId từ metadata hoặc từ session storage
        let orderId = null;
        if (data.metadata && data.metadata.orderId) {
          orderId = parseInt(data.metadata.orderId);
        } else {
          const storedOrderId = sessionStorage.getItem('currentOrderId');
          if (storedOrderId) {
            orderId = parseInt(storedOrderId);
          }
        }
        
        return {
          success: true,
          status: 'succeeded',
          payment: {
            orderId: orderId,
            amount: data.amount_total,
            paymentMethod: 'stripe',
            paymentId: data.id
          }
        };
      }
    }
    
    // Trường hợp 3: API trả về object với success field
    if (data && data.hasOwnProperty('success')) {
      // Nếu API trả về success:true nhưng không có payment field, thêm payment với orderId từ session
      if (data.success === true && (!data.payment || !data.payment.orderId)) {
        console.log("API trả về success:true nhưng không có payment.orderId");
        const storedOrderId = sessionStorage.getItem('currentOrderId');
        return {
          ...data,
          payment: {
            ...(data.payment || {}),
            orderId: storedOrderId ? parseInt(storedOrderId) : null
          }
        };
      }
      return data;
    }
    
    // Trường hợp 4: API không trả về success field, nhưng response status là 200
    if (data && !data.hasOwnProperty('success') && response.status === 200) {
      console.log("API không trả về success field, nhưng có status 200, coi như thành công");
      
      // Thử lấy orderId từ session storage
      const storedOrderId = sessionStorage.getItem('currentOrderId');
      
      return {
        success: true,
        status: data.status || 'succeeded',
        payment: {
          ...data,
          orderId: storedOrderId ? parseInt(storedOrderId) : null
        }
      };
    }
    
    // Trường hợp 5: API trả về session_id và status là "complete"
    if (data && data.session_id && data.status === "complete") {
      console.log("API trả về session với status complete, thanh toán thành công");
      // Lấy orderId từ sessionStorage nếu có
      const storedOrderId = sessionStorage.getItem('currentOrderId');
      return {
        success: true,
        status: 'succeeded',
        payment: {
          orderId: storedOrderId ? parseInt(storedOrderId) : null
        }
      };
    }
    
    // Mặc định không phải trường hợp nào ở trên
    return {
      success: false,
      status: 'unknown',
      payment: data
    };
  } catch (error) {
    console.error("Lỗi chi tiết khi kiểm tra trạng thái thanh toán:", error);
    // Trả về đối tượng lỗi cấu trúc thay vì throw exception
    return {
      success: false,
      status: 'error',
      payment: null
    };
  }
}

// Tạo phiên thanh toán MoMo
export const createMomoPayment = async (
  orderId: number,
  token: string
): Promise<{ success: boolean, payUrl: string }> => {
  try {
    const response = await fetch(`${API_URL}/payments/momo/create-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Không thể tạo thanh toán MoMo")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Lỗi khi tạo thanh toán MoMo:", error)
    throw error
  }
}

// Kiểm tra trạng thái thanh toán MoMo
export const checkMomoPaymentStatus = async (
  orderId: number,
  token: string
): Promise<{ success: boolean, payment: any, order: any }> => {
  try {
    const response = await fetch(`${API_URL}/payments/momo/check-status/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Không thể kiểm tra trạng thái thanh toán MoMo")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái thanh toán MoMo:", error)
    throw error
  }
}

// Tạo phiên thanh toán VNPay
export const createVnpayPayment = async (
  orderId: number,
  token: string
): Promise<{ success: boolean, payUrl: string }> => {
  try {
    const response = await fetch(`${API_URL}/payments/vnpay/create-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Không thể tạo thanh toán VNPay")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Lỗi khi tạo thanh toán VNPay:", error)
    throw error
  }
}

// Kiểm tra trạng thái thanh toán VNPay
export const checkVnpayPaymentStatus = async (
  orderId: number,
  token: string
): Promise<{ success: boolean, payment: any, order: any }> => {
  try {
    const response = await fetch(`${API_URL}/payments/vnpay/check-status/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Không thể kiểm tra trạng thái thanh toán VNPay")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái thanh toán VNPay:", error)
    throw error
  }
}

// Xác minh thanh toán thành công
export const verifyPayment = async (sessionId: string, token: string): Promise<boolean> => {
  const response = await fetch(`${API_URL}/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId }),
  });
  
  if (!response.ok) {
    return false;
  }
  
  const data = await response.json();
  return data.success;
}; 