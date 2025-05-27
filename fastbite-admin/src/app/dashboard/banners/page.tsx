"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getBanners, deleteBanner, deleteMultipleBanners } from "@/services/bannerService";
import { Banner } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { Loading, TableLoading } from "@/components/ui/loading";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, X, AlertTriangle } from "lucide-react";

export default function BannersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  // Thêm state cho chức năng chọn nhiều và modal xác nhận xóa
  const [selectedBanners, setSelectedBanners] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<number | null>(null);
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm || undefined,
        active: filter !== "all" ? filter : undefined,
        page: pagination.page,
        limit: pagination.limit,
      };

      const result = await getBanners(params);
      setBanners(result.banners);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (error: any) {
      console.error("Error fetching banners:", error);
      showToast("error", error.message || "Không thể tải danh sách banner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [pagination.page, pagination.limit]);

  // Reset selected banners khi load lại dữ liệu
  useEffect(() => {
    setSelectedBanners([]);
  }, [banners]);

  // Xử lý khi thay đổi filter hoặc search
  const handleFilterChange = () => {
    // Reset về trang 1 khi thay đổi bộ lọc
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchBanners();
  };

  // Xử lý chọn tất cả banner
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBanners(filteredBanners.map(banner => banner.id));
    } else {
      setSelectedBanners([]);
    }
  };

  // Xử lý chọn một banner
  const handleSelectBanner = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedBanners(prev => [...prev, id]);
    } else {
      setSelectedBanners(prev => prev.filter(bannerId => bannerId !== id));
    }
  };

  // Xử lý mở modal xác nhận xóa
  const confirmDelete = (id: number) => {
    setBannerToDelete(id);
    setShowDeleteModal(true);
  };

  // Xử lý xóa banner
  const handleDeleteBanner = async () => {
    if (!bannerToDelete) return;
    
    setDeleting(bannerToDelete);
    try {
      const success = await deleteBanner(bannerToDelete);
      if (success) {
        showToast("success", "Đã xóa banner thành công");
        // Xóa banner khỏi danh sách hiện tại trước khi gọi API để tránh hiển thị lại
        setBanners(prevBanners => prevBanners.filter(b => b.id !== bannerToDelete));
        // Sau đó mới cập nhật từ API
        fetchBanners();
      } else {
        showToast("error", "Không thể xóa banner");
      }
    } catch (error) {
      console.error("Error deleting banner:", error);
      showToast("error", "Đã xảy ra lỗi khi xóa banner");
    } finally {
      setDeleting(null);
      setShowDeleteModal(false);
      setBannerToDelete(null);
    }
  };

  // Xử lý xóa nhiều banner
  const handleDeleteMultipleBanners = async () => {
    if (selectedBanners.length === 0) return;
    
    setDeletingMultiple(true);
    try {
      const result = await deleteMultipleBanners(selectedBanners);
      
      if (result.success > 0) {
        showToast("success", `Đã xóa ${result.success} banner thành công${result.failed > 0 ? `, ${result.failed} banner thất bại` : ''}`);
        // Xóa các banner đã xóa thành công khỏi danh sách hiện tại
        setBanners(prevBanners => prevBanners.filter(b => !selectedBanners.includes(b.id)));
        // Sau đó cập nhật lại danh sách từ API
        fetchBanners();
      } else {
        showToast("error", "Không thể xóa các banner đã chọn");
      }
    } catch (error) {
      console.error("Error deleting multiple banners:", error);
      showToast("error", "Đã xảy ra lỗi khi xóa banner");
    } finally {
      setDeletingMultiple(false);
      setShowDeleteModal(false);
      setSelectedBanners([]);
    }
  };

  // Định dạng ngày
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Lọc banner từ danh sách đã fetch 
  const filteredBanners = banners.filter((banner) => {
    if (searchTerm && !banner.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filter === "true") {
      return banner.isActive === true;
    }
    if (filter === "false") {
      return banner.isActive === false;
    }
    return true;
  });

  // Xử lý phân trang
  const handlePrevPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  // Hiển thị vị trí banner
  const getBannerPosition = (position: string) => {
    const positions: {[key: string]: string} = {
      'home_top': 'Đầu trang chủ',
      'home_middle': 'Giữa trang chủ',
      'home_bottom': 'Cuối trang chủ',
      'category_page': 'Trang danh mục',
      'product_page': 'Trang sản phẩm'
    };
    return positions[position] || position;
  };

  // Hiển thị loại banner
  const getBannerType = (type: string) => {
    const types: {[key: string]: string} = {
      'hero': 'Hero',
      'promotion': 'Khuyến mãi',
      'product': 'Sản phẩm',
      'category': 'Danh mục'
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banner</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách banner hiển thị trên website</p>
        </div>
        <div className="flex gap-2">
          {selectedBanners.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa ({selectedBanners.length})
            </button>
          )}
          <Link
            href="/dashboard/banners/add"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Thêm banner
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center justify-between">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFilterChange()}
              placeholder="Tìm kiếm banner..."
              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                handleFilterChange();
              }}
              className="block rounded-md border border-gray-300 py-2 pl-3 pr-10 text-base focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
            >
              <option value="all">Tất cả banner</option>
              <option value="true">Đang hiển thị</option>
              <option value="false">Đã ẩn</option>
            </select>
            <button
              onClick={handleFilterChange}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Lọc
            </button>
          </div>
        </div>

        <div className="relative">
          {loading && <TableLoading />}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  <div className="flex items-center">
                    <Checkbox 
                      id="select-all" 
                      checked={
                        filteredBanners.length > 0 && 
                        selectedBanners.length === filteredBanners.length
                      }
                      onCheckedChange={(checked: boolean) => handleSelectAll(checked)}
                      className="rounded border-gray-300"
                    />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Banner
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vị trí
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian hiển thị
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBanners.map((banner) => (
                <tr key={banner.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Checkbox 
                        id={`select-${banner.id}`} 
                        checked={selectedBanners.includes(banner.id)}
                        onCheckedChange={(checked: boolean) => 
                          handleSelectBanner(banner.id, checked)
                        }
                        className="rounded border-gray-300"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-16 flex-shrink-0 rounded-md bg-gray-200 overflow-hidden">
                        {banner.imageUrl ? (
                          <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = '/file.svg';
                            }}
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-300 flex items-center justify-center text-gray-500">
                            <span className="text-xs">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{banner.title}</div>
                        <div className="text-sm text-gray-500">ID: {banner.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getBannerType(banner.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getBannerPosition(banner.position)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {banner.startDate && banner.endDate ? (
                      <span>{formatDate(banner.startDate)} - {formatDate(banner.endDate)}</span>
                    ) : (
                      <span>Không giới hạn</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      banner.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {banner.isActive ? "Đang hiển thị" : "Đã ẩn"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-3 items-center">
                      <Link 
                        href={`/dashboard/banners/edit/${banner.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Sửa
                      </Link>
                      <button 
                        onClick={() => confirmDelete(banner.id)}
                        disabled={deleting === banner.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting === banner.id ? (
                          <span className="flex items-center">
                            <Loading size="small" color="primary" />
                            <span className="ml-1">Đang xóa...</span>
                          </span>
                        ) : (
                          "Xóa"
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredBanners?.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                    Không tìm thấy banner nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-700 mb-4 sm:mb-0">
            Hiển thị <span className="font-medium">{filteredBanners.length}</span>
            {pagination && (
              <> / <span className="font-medium">{pagination.total}</span> banner</>
            )}
          </div>
          <div className="flex justify-center space-x-2">
            <button
              onClick={handlePrevPage}
              disabled={pagination.page <= 1}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <div className="px-4 py-2 text-sm text-gray-700">
              Trang {pagination.page} / {pagination.totalPages || 1}
            </div>
            <button
              onClick={handleNextPage}
              disabled={!pagination.totalPages || pagination.page >= pagination.totalPages}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
      
      {/* Modal xác nhận xóa */}
      {showDeleteModal && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50 transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
          
          <div className="bg-white rounded-lg shadow-xl transform transition-all sm:max-w-lg sm:w-full relative z-10">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                Xác nhận xóa
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4">
              {selectedBanners.length > 0 ? (
                <p className="text-gray-700">Bạn có chắc chắn muốn xóa {selectedBanners.length} banner đã chọn?</p>
              ) : (
                <p className="text-gray-700">Bạn có chắc chắn muốn xóa banner này?</p>
              )}
              <p className="text-gray-500 text-sm mt-2">Hành động này không thể hoàn tác.</p>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex flex-row-reverse gap-2">
              {selectedBanners.length > 0 ? (
                <button
                  onClick={handleDeleteMultipleBanners}
                  disabled={deletingMultiple}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {deletingMultiple ? 'Đang xóa...' : 'Xóa banner'}
                </button>
              ) : (
                <button
                  onClick={handleDeleteBanner}
                  disabled={deleting !== null}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {deleting !== null ? 'Đang xóa...' : 'Xóa banner'}
                </button>
              )}
              <button
                onClick={() => setShowDeleteModal(false)}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 