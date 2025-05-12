import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { ProductLike } from "../models/ProductLike";
import { Product } from "../models/Product";
import { getIO, emitProductLikeUpdate } from "../services/socketService";

const productLikeRepository = AppDataSource.getRepository(ProductLike);
const productRepository = AppDataSource.getRepository(Product);

// Thêm like cho sản phẩm
export const likeProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để thực hiện hành động này" });
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await productRepository.findOneBy({ id: parseInt(productId) });
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    // Kiểm tra xem người dùng đã like sản phẩm này chưa
    const existingLike = await productLikeRepository.findOneBy({
      userId,
      productId: parseInt(productId)
    });

    // Nếu đã like rồi thì bỏ like
    if (existingLike) {
      await productLikeRepository.remove(existingLike);
      
      // Giảm số lượng like của sản phẩm
      product.likeCount = Math.max(0, product.likeCount - 1);
      await productRepository.save(product);

      // Gửi thông báo cập nhật qua socket
      emitProductLikeUpdate(product.id, { isLiked: false, likeCount: product.likeCount });
      
      return res.status(200).json({ 
        message: "Đã bỏ thích sản phẩm",
        isLiked: false,
        likeCount: product.likeCount
      });
    }

    // Nếu chưa like thì thêm mới
    const newLike = productLikeRepository.create({
      userId,
      productId: parseInt(productId)
    });

    await productLikeRepository.save(newLike);
    
    // Tăng số lượng like của sản phẩm
    product.likeCount += 1;
    await productRepository.save(product);

    // Gửi thông báo cập nhật qua socket
    emitProductLikeUpdate(product.id, { isLiked: true, likeCount: product.likeCount });
    
    return res.status(201).json({ 
      message: "Đã thích sản phẩm",
      isLiked: true,
      likeCount: product.likeCount
    });
  } catch (error) {
    console.error("Lỗi khi thích/bỏ thích sản phẩm:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xử lý yêu cầu" });
  }
};

// Kiểm tra xem người dùng đã like sản phẩm chưa
export const checkProductLike = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(200).json({ isLiked: false });
    }

    const existingLike = await productLikeRepository.findOneBy({
      userId,
      productId: parseInt(productId)
    });

    return res.status(200).json({ 
      isLiked: !!existingLike,
      likeCount: await productLikeRepository.countBy({ productId: parseInt(productId) })
    });
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái thích sản phẩm:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xử lý yêu cầu" });
  }
};

// Lấy danh sách sản phẩm mà người dùng đã thích
export const getLikedProducts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để xem danh sách yêu thích" });
    }

    const likedProducts = await productLikeRepository
      .createQueryBuilder("productLike")
      .innerJoinAndSelect("productLike.product", "product")
      .where("productLike.userId = :userId", { userId })
      .getMany();

    const products = likedProducts.map(like => like.product);

    return res.status(200).json({ 
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm yêu thích:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xử lý yêu cầu" });
  }
}; 