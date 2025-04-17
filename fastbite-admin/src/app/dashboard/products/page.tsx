"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProducts, deleteProduct, updateProductStatus, deleteMultipleProducts } from "@/services/productService";
import { Product } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { Loading, TableLoading } from "@/components/ui/loading";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, X, AlertTriangle } from "lucide-react";

export default function ProductsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [changingStatus, setChangingStatus] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  // Thêm state cho chức năng chọn nhiều và modal xác nhận xóa
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm || undefined,
        status: filter !== "all" ? filter : undefined,
        page: pagination.page,
        limit: pagination.limit,
      };

      const result = await getProducts(params);
      setProducts(result.products);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      showToast("error", "Không thể tải danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, pagination.limit]);

  // Reset selected products khi load lại dữ liệu
  useEffect(() => {
    setSelectedProducts([]);
  }, [products]);

  // Xử lý khi thay đổi filter hoặc search
  const handleFilterChange = () => {
    // Reset về trang 1 khi thay đổi bộ lọc
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchProducts();
  };

  // Xử lý chọn tất cả sản phẩm
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(product => product.id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Xử lý chọn một sản phẩm
  const handleSelectProduct = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, id]);
    } else {
      setSelectedProducts(prev => prev.filter(productId => productId !== id));
    }
  };

  // Xử lý mở modal xác nhận xóa
  const confirmDelete = (id: number) => {
    setProductToDelete(id);
    setShowDeleteModal(true);
  };

  // Xử lý xóa sản phẩm
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    setDeleting(productToDelete);
    try {
      const success = await deleteProduct(productToDelete);
      if (success) {
        showToast("success", "Đã xóa sản phẩm thành công");
        // Cập nhật lại danh sách sản phẩm sau khi xóa
        fetchProducts();
      } else {
        showToast("error", "Không thể xóa sản phẩm");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      showToast("error", "Đã xảy ra lỗi khi xóa sản phẩm");
    } finally {
      setDeleting(null);
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  // Xử lý xóa nhiều sản phẩm
  const handleDeleteMultipleProducts = async () => {
    if (selectedProducts.length === 0) return;
    
    setDeletingMultiple(true);
    try {
      const result = await deleteMultipleProducts(selectedProducts);
      
      if (result.success > 0) {
        showToast("success", `Đã xóa ${result.success} sản phẩm thành công${result.failed > 0 ? `, ${result.failed} sản phẩm thất bại` : ''}`);
        // Cập nhật lại danh sách sản phẩm sau khi xóa
        fetchProducts();
      } else {
        showToast("error", "Không thể xóa các sản phẩm đã chọn");
      }
    } catch (error) {
      console.error("Error deleting multiple products:", error);
      showToast("error", "Đã xảy ra lỗi khi xóa sản phẩm");
    } finally {
      setDeletingMultiple(false);
      setShowDeleteModal(false);
      setSelectedProducts([]);
    }
  };

  // Xử lý thay đổi trạng thái sản phẩm
  const handleStatusChange = async (id: number, newStatus: 'active' | 'unavailable') => {
    setChangingStatus(id);
    try {
      const success = await updateProductStatus(id, newStatus);
      if (success) {
        showToast("success", `Đã ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} sản phẩm thành công`);
        // Cập nhật lại trạng thái trong danh sách hiện tại
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product.id === id ? { ...product, status: newStatus } : product
          )
        );
      } else {
        showToast("error", "Không thể thay đổi trạng thái sản phẩm");
      }
    } catch (error) {
      console.error("Error updating product status:", error);
      showToast("error", "Đã xảy ra lỗi khi cập nhật trạng thái sản phẩm");
    } finally {
      setChangingStatus(null);
    }
  };

  // Format giá tiền
  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
  };

  // Lọc sản phẩm từ danh sách đã fetch 
  const filteredProducts = products.filter((product) => {
    if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filter !== "all") {
      return product.status === filter;
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sản phẩm</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách sản phẩm</p>
        </div>
        <div className="flex gap-2">
          {selectedProducts.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa ({selectedProducts.length})
            </button>
          )}
          <Link
            href="/dashboard/products/add"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Thêm sản phẩm
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
              placeholder="Tìm kiếm sản phẩm..."
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
              <option value="all">Tất cả sản phẩm</option>
              <option value="active">Đang bán</option>
              <option value="unavailable">Hết hàng</option>
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
                        filteredProducts.length > 0 && 
                        selectedProducts.length === filteredProducts.length
                      }
                      onCheckedChange={(checked: boolean) => handleSelectAll(checked)}
                      className="rounded border-gray-300"
                    />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Danh mục
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kho hàng
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
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Checkbox 
                        id={`select-${product.id}`} 
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked: boolean) => 
                          handleSelectProduct(product.id, checked)
                        }
                        className="rounded border-gray-300"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-200 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
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
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">ID: {product.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatPrice(product.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.stock} sản phẩm
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {product.status === "active" ? "Đang bán" : "Hết hàng"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-3 items-center">
                      <Link 
                        href={`/dashboard/products/edit/${product.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Sửa
                      </Link>
                      <button 
                        onClick={() => confirmDelete(product.id)}
                        disabled={deleting === product.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting === product.id ? (
                          <span className="flex items-center">
                            <Loading size="small" color="primary" />
                            <span className="ml-1">Đang xóa...</span>
                          </span>
                        ) : (
                          "Xóa"
                        )}
                      </button>
                      <button 
                        onClick={() => handleStatusChange(
                          product.id, 
                          product.status === "active" ? "unavailable" : "active"
                        )}
                        disabled={changingStatus === product.id}
                        className={`${
                          product.status === "active" 
                            ? "text-gray-600 hover:text-gray-900" 
                            : "text-green-600 hover:text-green-900"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {changingStatus === product.id ? (
                          <span className="flex items-center">
                            <Loading size="small" color="primary" />
                            <span className="ml-1">Đang xử lý...</span>
                          </span>
                        ) : (
                          product.status === "active" ? "Vô hiệu hóa" : "Kích hoạt"
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredProducts?.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                    Không tìm thấy sản phẩm nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-700 mb-4 sm:mb-0">
            Hiển thị <span className="font-medium">{filteredProducts.length}</span>
            {pagination && (
              <> / <span className="font-medium">{pagination.total}</span> sản phẩm</>
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
              {selectedProducts.length > 0 ? (
                <p className="text-gray-700">Bạn có chắc chắn muốn xóa {selectedProducts.length} sản phẩm đã chọn?</p>
              ) : (
                <p className="text-gray-700">Bạn có chắc chắn muốn xóa sản phẩm này?</p>
              )}
              <p className="text-gray-500 text-sm mt-2">Hành động này không thể hoàn tác.</p>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex flex-row-reverse gap-2">
              {selectedProducts.length > 0 ? (
                <button
                  onClick={handleDeleteMultipleProducts}
                  disabled={deletingMultiple}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {deletingMultiple ? 'Đang xóa...' : 'Xóa sản phẩm'}
                </button>
              ) : (
                <button
                  onClick={handleDeleteProduct}
                  disabled={deleting !== null}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {deleting !== null ? 'Đang xóa...' : 'Xóa sản phẩm'}
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