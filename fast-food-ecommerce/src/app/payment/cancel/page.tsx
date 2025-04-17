"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Thanh toán đã bị hủy</CardTitle>
          </CardHeader>
          
          <CardContent className="text-center py-8">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-16 w-16 text-amber-500" />
              <div>
                <h3 className="text-xl font-medium">Bạn đã hủy thanh toán</h3>
                <p className="text-gray-500 mt-2">
                  Đơn hàng của bạn chưa được thanh toán. Bạn có thể thử lại hoặc chọn phương thức thanh toán khác.
                </p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-center space-x-3">
            <Button onClick={() => router.push("/checkout")}>
              Quay lại thanh toán
            </Button>
            <Button variant="outline" onClick={() => router.push("/cart")}>
              Xem giỏ hàng
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 