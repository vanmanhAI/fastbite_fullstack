"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getBannerById, updateBanner } from "@/services/bannerService";
import { Banner } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loading } from "@/components/ui/loading";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";

export default function EditBannerPage() {
  const router = useRouter();
  const params = useParams();
  const bannerId = params.id as string;
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [banner, setBanner] = useState<Banner | null>(null);
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
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Lấy thông tin banner theo ID
  useEffect(() => {
    const fetchBanner = async () => {
      setInitialLoading(true);
      try {
        const data = await getBannerById(bannerId);
        if (data) {
          setBanner(data);
          // Format dữ liệu ngày giờ từ server về định dạng datetime-local
          const formatDate = (dateString: string | undefined) => {
            if (!dateString) return "";
            const date = new Date(dateString);
            return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
          };
          
          setFormData({
            title: data.title || "",
            description: data.description || "",
            linkUrl: data.linkUrl || "",
            buttonText: data.buttonText || "",
            type: data.type || "hero",
            position: data.position || "home_top",
            order: data.order?.toString() || "0",
            backgroundColor: data.backgroundColor || "#ffffff",
            textColor: data.textColor || "#000000",
            startDate: formatDate(data.startDate),
            endDate: formatDate(data.endDate),
            isActive: data.isActive
          });
          
          setImagePreview(data.imageUrl || null);
        } else {
          showToast("error", "Không tìm thấy thông tin banner");
          router.push("/dashboard/banners");
        }
      } catch (error: any) {
        console.error("Error fetching banner:", error);
        showToast("error", error.message || "Đã xảy ra lỗi khi tải thông tin banner");
        router.push("/dashboard/banners");
      } finally {
        setInitialLoading(false);
      }
    };
    
    if (bannerId) {
      fetchBanner();
    }
  }, [bannerId, router, showToast]);

  // Xử lý khi thay đổi giá trị các trường
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));

    // Xóa lỗi khi người dùng thay đổi giá trị
    if (errors[name]) {
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Xử lý khi thay đổi checkbox
  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prevData => ({
      ...prevData,
      isActive: checked
    }));
  };

  // Xử lý khi chọn file hình ảnh
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, image: "Vui lòng chọn file hình ảnh" });
      return;
    }

    // Hiển thị preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setImageFile(file);

    // Xóa lỗi
    if (errors.image) {
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors.image;
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = "Tiêu đề không được để trống";
    }

    // Không bắt buộc phải có ảnh khi cập nhật
    // if (!imageFile && !imagePreview) {
    //   newErrors.image = "Vui lòng chọn hình ảnh cho banner";
    // }

    // Kiểm tra ngày bắt đầu < ngày kết thúc
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (startDate > endDate) {
        newErrors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Xử lý khi submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast("error", "Vui lòng kiểm tra lại thông tin banner");
      return;
    }
    
    setLoading(true);
    
    try {
      // Tạo FormData để gửi lên server
      const bannerFormData = new FormData();
      bannerFormData.append("title", formData.title);
      
      if (formData.description) {
        bannerFormData.append("description", formData.description);
      }
      
      if (formData.linkUrl) {
        bannerFormData.append("linkUrl", formData.linkUrl);
      }
      
      if (formData.buttonText) {
        bannerFormData.append("buttonText", formData.buttonText);
      }
      
      bannerFormData.append("type", formData.type);
      bannerFormData.append("position", formData.position);
      bannerFormData.append("order", formData.order);
      
      if (formData.backgroundColor) {
        bannerFormData.append("backgroundColor", formData.backgroundColor);
      }
      
      if (formData.textColor) {
        bannerFormData.append("textColor", formData.textColor);
      }
      
      if (formData.startDate) {
        bannerFormData.append("startDate", formData.startDate);
      }
      
      if (formData.endDate) {
        bannerFormData.append("endDate", formData.endDate);
      }
      
      bannerFormData.append("isActive", formData.isActive.toString());
      
      // Thêm file hình ảnh nếu có
      if (imageFile) {
        bannerFormData.append("image", imageFile);
      } else if (imagePreview && banner?.imageUrl) {
        // Giữ nguyên ảnh cũ
        bannerFormData.append("imageUrl", banner.imageUrl);
      }
      
      // Gọi API cập nhật banner
      const updatedBanner = await updateBanner(bannerId, bannerFormData);
      
      if (updatedBanner) {
        showToast("success", "Cập nhật banner thành công");
        router.push("/dashboard/banners");
      } else {
        showToast("error", "Không thể cập nhật banner");
      }
    } catch (error: any) {
      console.error("Error updating banner:", error);
      showToast("error", error.message || "Đã xảy ra lỗi khi cập nhật banner");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loading size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/banners"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa banner</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Thông tin cơ bản */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Tiêu đề <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Nhập tiêu đề banner"
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Nhập mô tả cho banner"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">
                    Loại banner <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                  >
                    <option value="hero">Hero (Banner chính)</option>
                    <option value="promotion">Khuyến mãi</option>
                    <option value="product">Sản phẩm</option>
                    <option value="category">Danh mục</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">
                    Vị trí hiển thị <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                  >
                    <option value="home_top">Đầu trang chủ</option>
                    <option value="home_middle">Giữa trang chủ</option>
                    <option value="home_bottom">Cuối trang chủ</option>
                    <option value="category_page">Trang danh mục</option>
                    <option value="product_page">Trang sản phẩm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkUrl">Đường dẫn liên kết</Label>
                  <Input
                    id="linkUrl"
                    name="linkUrl"
                    value={formData.linkUrl}
                    onChange={handleChange}
                    placeholder="Ví dụ: /products hoặc /categories/1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buttonText">Chữ nút nhấn</Label>
                  <Input
                    id="buttonText"
                    name="buttonText"
                    value={formData.buttonText}
                    onChange={handleChange}
                    placeholder="Ví dụ: Xem ngay, Mua ngay"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hình ảnh */}
          <Card>
            <CardHeader>
              <CardTitle>Hình ảnh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">
                  Hình ảnh <span className="text-red-500">*</span>
                </Label>
                <div 
                  className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-red-500 transition-colors ${errors.image ? "border-red-500" : "border-gray-300"}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={imagePreview}
                        alt="Banner preview"
                        className="mx-auto max-h-40 object-contain"
                      />
                      <p className="text-sm text-gray-500">Nhấp để thay đổi hình ảnh</p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="text-sm text-gray-500">
                        Nhấp để tải lên hình ảnh (PNG, JPG, JPEG)
                      </p>
                    </div>
                  )}
                  <input
                    id="image"
                    name="image"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
                {errors.image && <p className="text-red-500 text-sm">{errors.image}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Màu nền</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="backgroundColor"
                      name="backgroundColor"
                      value={formData.backgroundColor}
                      onChange={handleChange}
                      className="w-8 h-8 rounded-md border border-gray-300"
                    />
                    <Input
                      value={formData.backgroundColor}
                      onChange={handleChange}
                      name="backgroundColor"
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textColor">Màu chữ</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="textColor"
                      name="textColor"
                      value={formData.textColor}
                      onChange={handleChange}
                      className="w-8 h-8 rounded-md border border-gray-300"
                    />
                    <Input
                      value={formData.textColor}
                      onChange={handleChange}
                      name="textColor"
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Thứ tự hiển thị</Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={handleChange}
                  placeholder="0"
                />
                <p className="text-sm text-gray-500">Số nhỏ hơn sẽ hiển thị trước</p>
              </div>
            </CardContent>
          </Card>

          {/* Thời gian và trạng thái */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Thời gian hiển thị và trạng thái</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Ngày bắt đầu</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="startDate"
                      name="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Ngày kết thúc</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="endDate"
                      name="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={handleChange}
                      className={`pl-10 ${errors.endDate ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.endDate && <p className="text-red-500 text-sm">{errors.endDate}</p>}
                  <p className="text-sm text-gray-500">Để trống nếu không giới hạn thời gian</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={handleCheckboxChange}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Hiển thị banner
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            onClick={() => router.push('/dashboard/banners')}
            variant="outline"
            disabled={loading}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loading size="small" color="white" />
                <span className="ml-2">Đang lưu...</span>
              </>
            ) : (
              "Cập nhật banner"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 