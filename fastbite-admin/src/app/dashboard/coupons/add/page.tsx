"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AddCouponPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    expiry: "",
    maxUses: "100",
    minPurchase: "0",
    description: "",
    status: "active",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Tạo stripe coupon khi tích chọn
  const [createStripeComplementaryCoupon, setCreateStripeComplementaryCoupon] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Mô phỏng API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Mã giảm giá đã được tạo:", formData);
      console.log("Tạo coupon trên Stripe:", createStripeComplementaryCoupon);
      
      // Chuyển hướng về trang danh sách mã giảm giá
      router.push("/dashboard/coupons");
    } catch (error) {
      console.error("Lỗi khi tạo mã giảm giá:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thêm mã giảm giá</h1>
          <p className="text-sm text-gray-500 mt-1">Tạo mã giảm giá mới cho khách hàng</p>
        </div>
        <Link
          href="/dashboard/coupons"
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Quay lại
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Mã giảm giá <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="code"
                  id="code"
                  required
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="VD: SUMMER2025"
                  className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md uppercase"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Mã nên viết hoa, không dấu và không có ký tự đặc biệt.
              </p>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Trạng thái
              </label>
              <div className="mt-1">
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm khóa</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="discountType" className="block text-sm font-medium text-gray-700">
                Loại giảm giá <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <select
                  id="discountType"
                  name="discountType"
                  required
                  value={formData.discountType}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="percentage">Giảm theo phần trăm (%)</option>
                  <option value="fixed">Giảm số tiền cố định (VNĐ)</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="discountValue" className="block text-sm font-medium text-gray-700">
                Giá trị giảm <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  name="discountValue"
                  id="discountValue"
                  required
                  min={formData.discountType === "percentage" ? "1" : "1000"}
                  max={formData.discountType === "percentage" ? "100" : undefined}
                  value={formData.discountValue}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">
                    {formData.discountType === "percentage" ? "%" : "₫"}
                  </span>
                </div>
              </div>
              {formData.discountType === "percentage" && (
                <p className="mt-1 text-xs text-gray-500">
                  Giá trị từ 1% đến 100%.
                </p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="expiry" className="block text-sm font-medium text-gray-700">
                Ngày hết hạn <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  type="date"
                  name="expiry"
                  id="expiry"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.expiry}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="maxUses" className="block text-sm font-medium text-gray-700">
                Số lần sử dụng tối đa
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="maxUses"
                  id="maxUses"
                  min="1"
                  value={formData.maxUses}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Để trống hoặc 0 nếu không giới hạn số lần sử dụng.
              </p>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="minPurchase" className="block text-sm font-medium text-gray-700">
                Giá trị đơn hàng tối thiểu (VNĐ)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="minPurchase"
                  id="minPurchase"
                  min="0"
                  value={formData.minPurchase}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Để 0 nếu không yêu cầu giá trị đơn hàng tối thiểu.
              </p>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Mô tả
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                  placeholder="Mô tả về mã giảm giá và các điều kiện áp dụng"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <div className="relative flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="createStripeComplementaryCoupon"
                    name="createStripeComplementaryCoupon"
                    type="checkbox"
                    checked={createStripeComplementaryCoupon}
                    onChange={(e) => setCreateStripeComplementaryCoupon(e.target.checked)}
                    className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="createStripeComplementaryCoupon" className="font-medium text-gray-700">
                    Tạo mã giảm giá tương ứng trên Stripe
                  </label>
                  <p className="text-gray-500">
                    Đồng bộ mã giảm giá này lên hệ thống thanh toán Stripe để áp dụng khi thanh toán qua thẻ.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard/coupons"
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isSubmitting ? "Đang xử lý..." : "Tạo mã giảm giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 