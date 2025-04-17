import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Category } from "../models/Category";
import { Like } from "typeorm";

const categoryRepository = AppDataSource.getRepository(Category);

// Lấy tất cả danh mục
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await categoryRepository.find({
      relations: ["parent", "children"],
      order: { name: "ASC" }
    });

    return res.status(200).json({ data: categories });
  } catch (error) {
    console.error("Lỗi lấy danh sách danh mục:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy danh mục" });
  }
};

// Lấy danh mục theo ID
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await categoryRepository.findOne({
      where: { id: parseInt(id) },
      relations: ["parent", "children", "products"]
    });

    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    }

    return res.status(200).json({ category });
  } catch (error) {
    console.error("Lỗi lấy thông tin danh mục:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy thông tin danh mục" });
  }
};

// Lấy danh mục theo slug
export const getCategoryBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const category = await categoryRepository.findOne({
      where: { slug },
      relations: ["parent", "children"]
    });
    
    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    }
    
    return res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh mục theo slug:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy danh mục" });
  }
};

// [Admin] Tạo danh mục mới
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, slug, description, imageUrl, parentId } = req.body;

    // Kiểm tra slug đã tồn tại
    const existingCategory = await categoryRepository.findOneBy({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: "Slug đã tồn tại" });
    }

    // Tạo danh mục mới
    const newCategory = categoryRepository.create({
      name,
      slug,
      description,
      imageUrl,
      parentId: parentId || null
    });

    // Lưu vào database
    await categoryRepository.save(newCategory);

    return res.status(201).json({
      message: "Tạo danh mục thành công",
      category: newCategory
    });
  } catch (error) {
    console.error("Lỗi tạo danh mục:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi tạo danh mục" });
  }
};

// [Admin] Cập nhật danh mục
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, description, imageUrl, parentId } = req.body;

    // Tìm danh mục
    const category = await categoryRepository.findOneBy({ id: parseInt(id) });
    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    }

    // Kiểm tra slug đã tồn tại (nếu thay đổi)
    if (slug && slug !== category.slug) {
      const existingCategory = await categoryRepository.findOneBy({ slug });
      if (existingCategory) {
        return res.status(400).json({ message: "Slug đã tồn tại" });
      }
    }

    // Cập nhật thông tin
    category.name = name || category.name;
    category.slug = slug || category.slug;
    category.description = description !== undefined ? description : category.description;
    category.imageUrl = imageUrl !== undefined ? imageUrl : category.imageUrl;
    category.parentId = parentId !== undefined ? parentId : category.parentId;

    // Lưu vào database
    await categoryRepository.save(category);

    return res.status(200).json({
      message: "Cập nhật danh mục thành công",
      category
    });
  } catch (error) {
    console.error("Lỗi cập nhật danh mục:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật danh mục" });
  }
};

// [Admin] Xóa danh mục
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Kiểm tra danh mục tồn tại
    const category = await categoryRepository.findOne({
      where: { id: parseInt(id) },
      relations: ["children", "products"]
    });

    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    }

    // Kiểm tra nếu danh mục có danh mục con
    if (category.children && category.children.length > 0) {
      return res.status(400).json({ 
        message: "Không thể xóa danh mục này vì có danh mục con. Vui lòng xóa danh mục con trước."
      });
    }

    // Kiểm tra nếu danh mục có sản phẩm
    if (category.products && category.products.length > 0) {
      return res.status(400).json({ 
        message: "Không thể xóa danh mục này vì có sản phẩm. Vui lòng xóa hoặc chuyển sản phẩm sang danh mục khác trước."
      });
    }

    // Xóa danh mục
    await categoryRepository.remove(category);

    return res.status(200).json({ 
      message: "Xóa danh mục thành công"
    });
  } catch (error) {
    console.error("Lỗi xóa danh mục:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa danh mục" });
  }
}; 