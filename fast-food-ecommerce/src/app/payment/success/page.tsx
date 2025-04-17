"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { checkPaymentStatus, checkMomoPaymentStatus, checkVnpayPaymentStatus } from "@/services/paymentService";
import LoadingSpinner from "@/components/loading-spinner";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isAuthenticated, isLoading } = useAuth();
  const { clearCart } = useCart();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clearCartExecuted, setClearCartExecuted] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  
  // Sử dụng useRef để theo dõi giá trị hiện tại của orderId mà không gây re-render
  const orderIdRef = useRef<number | null>(null);
  const isVerifyingRef = useRef<boolean>(true);
  const paymentCheckedRef = useRef<boolean>(false);
  
  // Cập nhật ref khi state thay đổi
  useEffect(() => {
    orderIdRef.current = orderId;
  }, [orderId]);
  
  useEffect(() => {
    isVerifyingRef.current = isVerifying;
  }, [isVerifying]);
  
  // Kiểm tra xác thực với độ trễ nhỏ để đảm bảo AuthContext đã được khởi tạo
  useEffect(() => {
    if (isLoading) return;
    
    // Hàm xử lý orderId từ URL
    const handleOrderIdFromUrl = () => {
      // Kiểm tra có session_id (đã thanh toán từ Stripe) không
      const hasStripeSession = searchParams.get("session_id") !== null;
      const hasMomoOrder = searchParams.get("orderId") !== null && searchParams.get("method") === "momo";
      const hasVnpayOrder = searchParams.get("orderId") !== null && searchParams.get("method") === "vnpay";
      
      // Nếu người dùng đang truy cập trang này từ một cổng thanh toán, không chuyển hướng
      const isFromPaymentGateway = hasStripeSession || hasMomoOrder || hasVnpayOrder;
      
      // Nếu có orderId trong query string, lưu lại
      const queryOrderId = searchParams.get("orderId");
      if (queryOrderId) {
        const orderIdNum = parseInt(queryOrderId);
        if (!isNaN(orderIdNum)) {
          console.log("Tìm thấy orderId trong URL:", orderIdNum);
          setOrderId(orderIdNum);
        }
      }
      
      // Chỉ chuyển hướng nếu không phải từ cổng thanh toán và không được xác thực
      if (!isAuthenticated && !isFromPaymentGateway) {
        console.log("Chuyển hướng đến trang đăng nhập...");
        router.push("/login?redirect=/account/orders");
      }
    };
    
    // Xử lý ngay lập tức
    handleOrderIdFromUrl();
    
    // Thiết lập timeout nhỏ để đảm bảo trạng thái auth đã được cập nhật
    const timeoutId = setTimeout(() => {
      setAuthCheckComplete(true);
    }, 500); // Đợi 500ms
    
    return () => clearTimeout(timeoutId);
  }, [isLoading, isAuthenticated, router, searchParams]);
  
  // Tách việc xác minh thanh toán ra thành một useEffect riêng biệt
  useEffect(() => {
    // Tránh chạy nhiều lần
    if (!authCheckComplete || paymentCheckedRef.current) return;
    
    const verifyPayment = async () => {
      try {
        // Đánh dấu đã bắt đầu xác minh thanh toán
        paymentCheckedRef.current = true;
        setIsVerifying(true);
        
        // Lấy thông tin từ URL
        const method = searchParams.get("method") || "stripe";
        console.log("Phương thức thanh toán:", method);
        
        // Lấy orderId từ URL hoặc sessionStorage
        const urlOrderId = searchParams.get("orderId");
        const sessionOrderId = sessionStorage.getItem('currentOrderId');
        console.log("Order ID từ URL:", urlOrderId, "Order ID từ sessionStorage:", sessionOrderId);
        
        // Sử dụng ref để kiểm tra giá trị hiện tại của orderId
        const currentOrderId = orderIdRef.current;
        
        // Thử cập nhật orderId từ URL nếu chưa được set
        if (urlOrderId && !currentOrderId) {
          const parsedOrderId = parseInt(urlOrderId);
          if (!isNaN(parsedOrderId)) {
            setOrderId(parsedOrderId);
          }
        } else if (sessionOrderId && !currentOrderId) {
          const parsedOrderId = parseInt(sessionOrderId);
          if (!isNaN(parsedOrderId)) {
            setOrderId(parsedOrderId);
          }
        }
        
        // Nếu đã có orderId, coi như thanh toán thành công
        if (currentOrderId) {
          console.log("Đã có orderId, coi như thanh toán thành công:", currentOrderId);
          setIsSuccess(true);
          
          if (!clearCartExecuted) {
            setClearCartExecuted(true);
          }
          
          // Xóa session storage
          sessionStorage.removeItem('selectedItems');
          sessionStorage.removeItem('currentOrderId');
          
          setIsVerifying(false);
          return;
        }
        
        if (method === "stripe") {
          // Xử lý cho Stripe
          const sessionId = searchParams.get("session_id");
          console.log("Stripe session ID:", sessionId);
          
          if (!sessionId) {
            console.error("Thiếu session_id");
            setError("Thông tin phiên thanh toán không hợp lệ");
            setIsVerifying(false);
            return;
          }
          
          if (!token) {
            console.error("Thiếu token");
            setError("Vui lòng đăng nhập lại để kiểm tra thanh toán");
            setIsVerifying(false);
            return;
          }
          
          // Kiểm tra trạng thái thanh toán
          console.log("Đang kiểm tra trạng thái thanh toán Stripe...");
          const result = await checkPaymentStatus(sessionId, token);
          console.log("Kết quả kiểm tra Stripe:", result);
          
          if (result.success && result.payment) {
            setIsSuccess(true);
            if (result.payment.orderId) {
              setOrderId(result.payment.orderId);
            } else {
              console.log("Không tìm thấy orderId trong kết quả thanh toán");
              // Thử lấy orderId từ session storage
              const storedOrderId = sessionStorage.getItem('currentOrderId');
              if (storedOrderId) {
                setOrderId(parseInt(storedOrderId));
              }
            }
            
            if (!clearCartExecuted) {
              setClearCartExecuted(true);
            }
            
            // Xóa session storage
            sessionStorage.removeItem('selectedItems');
            sessionStorage.removeItem('currentOrderId');
          } else {
            console.error("Lỗi xác minh thanh toán:", result);
            setError("Không thể xác nhận thanh toán. Vui lòng liên hệ bộ phận hỗ trợ!");
          }
        } else if (method === "momo") {
          // Xử lý cho MoMo
          // MoMo thường sẽ trả về orderId trực tiếp
          const orderIdParam = urlOrderId || sessionOrderId;
          console.log("MoMo orderId:", orderIdParam);
          
          if (!orderIdParam) {
            console.error("Thiếu orderId");
            setError("Thông tin đơn hàng không hợp lệ");
            setIsVerifying(false);
            return;
          }
          
          if (!token) {
            console.error("Thiếu token");
            setError("Vui lòng đăng nhập lại để kiểm tra thanh toán");
            setIsVerifying(false);
            return;
          }
          
          // Kiểm tra trạng thái thanh toán
          console.log("Đang kiểm tra trạng thái thanh toán MoMo...");
          const result = await checkMomoPaymentStatus(parseInt(orderIdParam), token);
          console.log("Kết quả kiểm tra MoMo:", result);
          
          if (result.success && result.payment) {
            setIsSuccess(true);
            setOrderId(parseInt(orderIdParam));
            
            if (!clearCartExecuted) {
              setClearCartExecuted(true);
            }
            
            // Xóa session storage
            sessionStorage.removeItem('selectedItems');
            sessionStorage.removeItem('currentOrderId');
          } else {
            console.error("Lỗi xác minh thanh toán MoMo:", result);
            setError("Không thể xác nhận thanh toán. Vui lòng liên hệ bộ phận hỗ trợ!");
          }
        } else if (method === "vnpay") {
          // Xử lý cho VNPay
          const orderIdParam = urlOrderId || sessionOrderId;
          console.log("VNPay orderId:", orderIdParam);
          
          if (!orderIdParam) {
            console.error("Thiếu orderId");
            setError("Thông tin đơn hàng không hợp lệ");
            setIsVerifying(false);
            return;
          }
          
          if (!token) {
            console.error("Thiếu token");
            setError("Vui lòng đăng nhập lại để kiểm tra thanh toán");
            setIsVerifying(false);
            return;
          }
          
          // Kiểm tra trạng thái thanh toán
          console.log("Đang kiểm tra trạng thái thanh toán VNPay...");
          const result = await checkVnpayPaymentStatus(parseInt(orderIdParam), token);
          console.log("Kết quả kiểm tra VNPay:", result);
          
          if (result.success && result.payment) {
            setIsSuccess(true);
            setOrderId(parseInt(orderIdParam));
            
            if (!clearCartExecuted) {
              setClearCartExecuted(true);
            }
            
            // Xóa session storage
            sessionStorage.removeItem('selectedItems');
            sessionStorage.removeItem('currentOrderId');
          } else {
            console.error("Lỗi xác minh thanh toán VNPay:", result);
            setError("Không thể xác nhận thanh toán. Vui lòng liên hệ bộ phận hỗ trợ!");
          }
        } else {
          console.error("Phương thức thanh toán không hỗ trợ:", method);
          setError("Phương thức thanh toán không được hỗ trợ");
        }
      } catch (error) {
        console.error("Lỗi khi xác minh thanh toán:", error);
        setError("Đã xảy ra lỗi khi xác minh thanh toán");
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyPayment();
  }, [authCheckComplete, searchParams, token, isAuthenticated, router, clearCartExecuted]);
  
  // Xóa giỏ hàng một lần khi thanh toán thành công (đã tách riêng khỏi luồng xác minh)
  useEffect(() => {
    if (clearCartExecuted && isSuccess) {
      console.log("Thực hiện xóa giỏ hàng...");
      clearCart();
    }
  }, [clearCartExecuted, isSuccess]);
  
  // Hiển thị trạng thái loading khi đang xác thực
  if (isLoading) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Đang xác thực</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="py-8 flex flex-col items-center gap-4">
                <LoadingSpinner size="large" />
                <p>Đang xác thực người dùng...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Xác nhận thanh toán</CardTitle>
          </CardHeader>
          
          <CardContent className="text-center">
            {isVerifying ? (
              <div className="py-8 flex flex-col items-center gap-4">
                <LoadingSpinner size="large" />
                <p>Đang xác nhận thanh toán...</p>
              </div>
            ) : isSuccess ? (
              <div className="py-8 flex flex-col items-center gap-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <div>
                  <h3 className="text-xl font-medium">Thanh toán thành công!</h3>
                  <p className="text-gray-500 mt-1">
                    Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đang được xử lý.
                  </p>
                  {orderId && (
                    <p className="text-sm mt-4">
                      Mã đơn hàng: <span className="font-semibold">#{orderId}</span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <h3 className="text-xl font-medium text-red-600">Thanh toán không thành công!</h3>
                <p className="text-gray-500 mt-2 mb-4">
                  {error || "Đã xảy ra lỗi trong quá trình thanh toán."}
                </p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center">
            {isSuccess ? (
              <div className="space-x-3">
                <Button onClick={() => router.push(`/orders/${orderId}`)}>
                  Xem chi tiết đơn hàng
                </Button>
                <Button variant="outline" onClick={() => router.push("/")}>
                  Trở về trang chủ
                </Button>
              </div>
            ) : (
              <div className="space-x-3">
                <Button onClick={() => router.push("/cart")}>
                  Quay lại giỏ hàng
                </Button>
                <Button variant="outline" onClick={() => router.push("/account/orders")}>
                  Xem đơn hàng của tôi
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 