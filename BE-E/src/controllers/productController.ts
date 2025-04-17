import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Product, ProductCategory } from "../models/Product";
import { Category } from "../models/Category";
import { In, Like } from "typeorm";

const productRepository = AppDataSource.getRepository(Product);
const categoryRepository = AppDataSource.getRepository(Category);

// Lấy danh sách sản phẩm với phân trang và lọc
export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const featured = req.query.featured === "true";
    const vegetarian = req.query.vegetarian === "true";
    
    const skip = (page - 1) * limit;
    
    let query = productRepository.createQueryBuilder("product")
      .leftJoinAndSelect("product.categories", "category");
    
    // Áp dụng các điều kiện lọc
    if (category) {
      query = query.andWhere("category.slug = :slug", { slug: category });
    }
    
    if (search) {
      query = query.andWhere("(product.name LIKE :search OR product.description LIKE :search)", 
        { search: `%${search}%` });
    }
    
    if (featured) {
      query = query.andWhere("product.isFeatured = :featured", { featured: true });
    }
    
    if (vegetarian) {
      query = query.andWhere("product.isVegetarian = :vegetarian", { vegetarian: true });
    }
    
    // Chỉ lấy sản phẩm đang hoạt động
    query = query.andWhere("product.isActive = :isActive", { isActive: true });
    
    // Đếm tổng số sản phẩm
    const total = await query.getCount();
    
    // Lấy sản phẩm với phân trang
    const products = await query
      .orderBy("product.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getMany();
    
    return res.status(200).json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách sản phẩm:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy danh sách sản phẩm" });
  }
};

// Lấy thông tin chi tiết sản phẩm
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const product = await productRepository.findOne({
      where: { id: parseInt(id) },
      relations: ["categories", "reviews", "reviews.user"]
    });
    
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
    
    return res.status(200).json({ product });
  } catch (error) {
    console.error("Lỗi lấy thông tin sản phẩm:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy thông tin sản phẩm" });
  }
};

// [Admin] Thêm sản phẩm mới
export const createProduct = async (req: Request, res: Response) => {
  try {
    console.log("Body:", req.body);
    console.log("File:", req.file);
    
    const {
      name,
      description,
      price,
      stock,
      status,
      categoryId,
      isVegetarian,
      isFeatured
    } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ message: "Thiếu thông tin sản phẩm bắt buộc" });
    }
    
    // Xác định category dựa trên ID
    let category = ProductCategory.FOOD;
    if (categoryId) {
      const foundCategory = await categoryRepository.findOneBy({ id: parseInt(categoryId) });
      if (foundCategory) {
        // Xác định category enum từ slug của danh mục
        if (foundCategory.slug.includes("drink") || foundCategory.slug === "beverages") {
          category = ProductCategory.DRINK;
        } else if (foundCategory.slug === "combo") {
          category = ProductCategory.COMBO;
        }
      }
    }
    
    // Xử lý hình ảnh nếu có
    let imageUrl = '';
    if (req.file) {
      // Tạo URL đầy đủ tới hình ảnh
      const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 8001}`;
      imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;
    }
    
    // Tạo sản phẩm mới
    const newProduct = productRepository.create({
      name,
      description,
      price: parseFloat(price),
      category,
      imageUrl,
      stock: parseInt(stock) || 0,
      isVegetarian: isVegetarian === 'true' || false,
      isFeatured: isFeatured === 'true' || false,
      isActive: status === 'active'
    });
    
    // Lưu sản phẩm
    await productRepository.save(newProduct);
    
    // Thêm danh mục cho sản phẩm nếu có
    if (categoryId) {
      // Chuyển đổi từ categoryId đơn lẻ sang mảng để dễ xử lý
      const categoryIds = Array.isArray(categoryId) ? categoryId.map(id => parseInt(id)) : [parseInt(categoryId)];
      const categories = await categoryRepository.findBy({ id: In(categoryIds) });
      newProduct.categories = categories;
      await productRepository.save(newProduct);
    }
    
    return res.status(201).json({
      message: "Thêm sản phẩm thành công",
      data: newProduct
    });
  } catch (error) {
    console.error("Lỗi thêm sản phẩm:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi thêm sản phẩm" });
  }
};

// [Admin] Cập nhật sản phẩm
export const updateProduct = async (req: Request, res: Response) => {
  try {
    console.log("Body:", req.body);
    console.log("File:", req.file);
    
    const { id } = req.params;
    const {
      name,
      description,
      price,
      stock,
      status,
      categoryId,
      isVegetarian,
      isFeatured
    } = req.body;
    
    // Tìm sản phẩm
    const product = await productRepository.findOneBy({ id: parseInt(id) });
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
    
    // Xác định category nếu có thay đổi
    if (categoryId) {
      const foundCategory = await categoryRepository.findOneBy({ id: parseInt(categoryId) });
      if (foundCategory) {
        // Xác định category enum từ slug của danh mục
        if (foundCategory.slug.includes("drink") || foundCategory.slug === "beverages") {
          product.category = ProductCategory.DRINK;
        } else if (foundCategory.slug === "combo") {
          product.category = ProductCategory.COMBO;
        } else {
          product.category = ProductCategory.FOOD;
        }
      }
    }
    
    // Xử lý hình ảnh nếu có
    if (req.file) {
      // Tạo URL đầy đủ tới hình ảnh
      const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 8001}`;
      product.imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;
    }
    
    // Cập nhật thông tin sản phẩm
    product.name = name || product.name;
    product.description = description !== undefined ? description : product.description;
    product.price = price ? parseFloat(price) : product.price;
    product.stock = stock !== undefined ? parseInt(stock) : product.stock;
    product.isVegetarian = isVegetarian === 'true' || (isVegetarian === true) || 
      (isVegetarian !== undefined && isVegetarian !== 'false' && isVegetarian !== false ? product.isVegetarian : false);
    product.isFeatured = isFeatured === 'true' || (isFeatured === true) || 
      (isFeatured !== undefined && isFeatured !== 'false' && isFeatured !== false ? product.isFeatured : false);
    product.isActive = status === 'active' || status === undefined ? true : false;
    
    // Lưu thông tin cập nhật
    await productRepository.save(product);
    
    // Cập nhật danh mục nếu có
    if (categoryId) {
      // Chuyển đổi từ categoryId đơn lẻ sang mảng để dễ xử lý
      const categoryIds = Array.isArray(categoryId) ? categoryId.map(id => parseInt(id)) : [parseInt(categoryId)];
      const categories = await categoryRepository.findBy({ id: In(categoryIds) });
      product.categories = categories;
      await productRepository.save(product);
    }
    
    return res.status(200).json({
      message: "Cập nhật sản phẩm thành công",
      data: product
    });
  } catch (error) {
    console.error("Lỗi cập nhật sản phẩm:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật sản phẩm" });
  }
};

// [Admin] Xóa sản phẩm (soft delete - chỉ đánh dấu là không hoạt động)
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    console.log("deleteProduct");

    const { id } = req.params;
    
    // Tìm sản phẩm
    const product = await productRepository.findOneBy({ id: parseInt(id) });
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
    
    // Đánh dấu là không hoạt động
    product.isActive = false;
    await productRepository.save(product);
    
    return res.status(200).json({ message: "Xóa sản phẩm thành công" });
  } catch (error) {
    console.error("Lỗi xóa sản phẩm:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa sản phẩm" });
  }
}; 