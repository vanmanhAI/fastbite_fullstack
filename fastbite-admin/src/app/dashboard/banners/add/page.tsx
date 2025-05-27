"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBanner } from "@/services/bannerService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Enum từ backend
enum BannerType {
  HERO = "hero",
  PROMOTION = "promotion",
  PRODUCT = "product",
  CATEGORY = "category"
}

enum BannerPosition {
  HOME_TOP = "home_top",
  HOME_MIDDLE = "home_middle",
  HOME_BOTTOM = "home_bottom", 
  CATEGORY_PAGE = "category_page",
  PRODUCT_PAGE = "product_page"
}

export default function AddBannerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    linkUrl: "",
    buttonText: "",
    type: "hero", // hero, promotion, product, category
    position: "home_top", // home_top, home_middle, home_bottom, category_page, product_page
    order: "0",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    startDate: "",
    endDate: "",
    isActive: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      setError("Vui lòng chọn file hình ảnh");
      return;
    }

    // Hiển thị preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Kiểm tra dữ liệu bắt buộc
      if (!formData.title) {
        throw new Error("Tiêu đề banner là bắt buộc");
      }

      if (!fileInputRef.current?.files?.[0] && !imagePreview) {
        throw new Error("Hình ảnh banner là bắt buộc");
      }

      // Chuyển đổi object formData thành FormData
      const bannerFormData = new FormData();
      
      // Thêm từng trường vào FormData với xử lý đặc biệt cho từng loại dữ liệu
      bannerFormData.append('title', formData.title);
      if (formData.description) bannerFormData.append('description', formData.description);
      if (formData.linkUrl) bannerFormData.append('linkUrl', formData.linkUrl);
      if (formData.buttonText) bannerFormData.append('buttonText', formData.buttonText);
      bannerFormData.append('type', formData.type);
      bannerFormData.append('position', formData.position);
      bannerFormData.append('order', formData.order);
      bannerFormData.append('backgroundColor', formData.backgroundColor);
      bannerFormData.append('textColor', formData.textColor);
      if (formData.startDate) bannerFormData.append('startDate', formData.startDate);
      if (formData.endDate) bannerFormData.append('endDate', formData.endDate);
      bannerFormData.append('isActive', formData.isActive ? 'true' : 'false');

      // Thêm file hình ảnh nếu có
      if (fileInputRef.current?.files?.[0]) {
        bannerFormData.append('image', fileInputRef.current.files[0]);
      }

      // Kiểm tra FormData trước khi gửi
      console.log('Form data being sent:', {
        title: bannerFormData.get('title'),
        description: bannerFormData.get('description'),
        image: bannerFormData.get('image') ? 'File exists' : 'No file',
        type: bannerFormData.get('type'),
        position: bannerFormData.get('position'),
        isActive: bannerFormData.get('isActive'),
        allKeys: Array.from(bannerFormData.keys())
      });
      
      const response = await createBanner(bannerFormData);
      console.log('Create banner response:', response);
      
      router.push("/dashboard/banners");
      router.refresh();
    } catch (error: any) {
      console.error("Error adding banner:", error);
      setError(error.message || "Đã xảy ra lỗi khi thêm banner. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Thêm Banner Mới</h1>
          <p className="text-gray-600">Tạo banner mới hiển thị trên website</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
        >
          Quay lại
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow-md">
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="mb-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="title" className="mb-2 block">
                Tiêu đề <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Nhập tiêu đề banner"
              />
            </div>

            <div>
              <Label htmlFor="image" className="mb-2 block">
                Hình ảnh <span className="text-red-500">*</span>
              </Label>
              <Input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                required
                className="cursor-pointer"
              />
              {imagePreview && (
                <div className="mt-2">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="h-40 w-auto object-contain rounded border"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description" className="mb-2 block">
                Mô tả
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Nhập mô tả banner (tùy chọn)"
              />
            </div>

            <div>
              <Label htmlFor="type" className="mb-2 block">
                Loại banner
              </Label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="hero">Hero banner</option>
                <option value="promotion">Khuyến mãi</option>
                <option value="product">Sản phẩm</option>
                <option value="category">Danh mục</option>
              </select>
            </div>

            <div>
              <Label htmlFor="position" className="mb-2 block">
                Vị trí hiển thị
              </Label>
              <select
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="home_top">Trang chủ - Phía trên</option>
                <option value="home_middle">Trang chủ - Ở giữa</option>
                <option value="home_bottom">Trang chủ - Phía dưới</option>
                <option value="product_page">Trang sản phẩm</option>
                <option value="category_page">Trang danh mục</option>
              </select>
            </div>

            <div>
              <Label htmlFor="linkUrl" className="mb-2 block">
                Liên kết URL
              </Label>
              <Input
                id="linkUrl"
                name="linkUrl"
                value={formData.linkUrl}
                onChange={handleChange}
                placeholder="Nhập URL liên kết (tùy chọn)"
              />
            </div>

            <div>
              <Label htmlFor="buttonText" className="mb-2 block">
                Chữ nút bấm
              </Label>
              <Input
                id="buttonText"
                name="buttonText"
                value={formData.buttonText}
                onChange={handleChange}
                placeholder="Ví dụ: Xem ngay, Mua ngay (tùy chọn)"
              />
            </div>

            <div>
              <Label htmlFor="order" className="mb-2 block">
                Thứ tự hiển thị
              </Label>
              <Input
                id="order"
                name="order"
                type="number"
                min="0"
                value={formData.order}
                onChange={handleChange}
                placeholder="Thứ tự hiển thị (số nhỏ hơn hiển thị trước)"
              />
            </div>

            <div>
              <Label htmlFor="backgroundColor" className="mb-2 block">
                Màu nền
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  id="backgroundColor"
                  name="backgroundColor"
                  value={formData.backgroundColor}
                  onChange={handleChange}
                  className="h-10 w-16"
                />
                <Input
                  type="text"
                  value={formData.backgroundColor}
                  onChange={(e) =>
                    setFormData({ ...formData, backgroundColor: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="textColor" className="mb-2 block">
                Màu chữ
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  id="textColor"
                  name="textColor"
                  value={formData.textColor}
                  onChange={handleChange}
                  className="h-10 w-16"
                />
                <Input
                  type="text"
                  value={formData.textColor}
                  onChange={(e) =>
                    setFormData({ ...formData, textColor: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="startDate" className="mb-2 block">
                Ngày bắt đầu
              </Label>
              <Input
                type="datetime-local"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="endDate" className="mb-2 block">
                Ngày kết thúc
              </Label>
              <Input
                type="datetime-local"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <Label htmlFor="isActive">Hiển thị banner</Label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu banner"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 