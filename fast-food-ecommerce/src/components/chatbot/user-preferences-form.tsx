"use client"

import React from "react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InfoIcon } from "lucide-react"

export default function UserPreferencesForm() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <InfoIcon className="h-5 w-5" />
          Thông báo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertTitle>Tính năng đã được cập nhật</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Chức năng "Tùy chọn cá nhân" đã được gỡ bỏ và thay thế bằng hệ thống thông minh hơn.
            </p>
            <p className="mb-2">
              Thay vì yêu cầu bạn điền thông tin về sở thích, hệ thống mới sẽ tự động theo dõi hành vi của bạn trên trang web để mang đến những đề xuất phù hợp nhất.
            </p>
            <p>
              Hệ thống sẽ phân tích các hoạt động như: xem sản phẩm, thêm vào giỏ hàng, mua hàng, đánh giá sản phẩm... để đưa ra các gợi ý cá nhân hóa mà không cần bạn phải thiết lập thủ công.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
} 