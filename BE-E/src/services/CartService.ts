import { Cart } from "../models/Cart";
import { Product } from "../models/Product";
import { HttpException } from "../utils/HttpException";
import { AppDataSource } from "../config/database";
import { UserBehaviorService } from "./UserBehaviorService";

export class CartService {
  private cartRepository;
  private productRepository;
  private userBehaviorService;

  constructor() {
    this.cartRepository = AppDataSource.getRepository(Cart);
    this.productRepository = AppDataSource.getRepository(Product);
    this.userBehaviorService = new UserBehaviorService();
  }

  async getUserCart(userId: number) {
    return this.cartRepository.find({
      where: { userId },
      relations: ["product"]
    });
  }

  async addToCart(userId: number, productId: number, quantity: number) {
    // Kiểm tra sản phẩm có tồn tại không
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new HttpException(404, "Sản phẩm không tồn tại");
    }

    // Kiểm tra số lượng tồn kho
    if (product.stock < quantity) {
      throw new HttpException(400, `Chỉ còn ${product.stock} sản phẩm trong kho`);
    }

    // Kiểm tra sản phẩm đã có trong giỏ hàng chưa
    let cartItem = await this.cartRepository.findOne({
      where: { userId, productId }
    });

    if (cartItem) {
      // Kiểm tra số lượng mới có vượt quá tồn kho không
      if (cartItem.quantity + quantity > product.stock) {
        throw new HttpException(400, `Chỉ còn ${product.stock} sản phẩm trong kho`);
      }
      
      // Cập nhật số lượng
      cartItem.quantity += quantity;
      await this.cartRepository.save(cartItem);
    } else {
      // Tạo mới item trong giỏ hàng
      const newCartItem = this.cartRepository.create({
        userId,
        productId,
        quantity
      });
      cartItem = await this.cartRepository.save(newCartItem);
    }

    // Theo dõi hành vi thêm vào giỏ hàng
    try {
      await this.userBehaviorService.trackAddToCart(userId, productId);
      console.log(`[UserBehavior] Đã lưu hành vi thêm vào giỏ hàng: User ${userId}, Product ${productId}, Quantity ${quantity}`);
    } catch (error) {
      console.error("Lỗi khi lưu hành vi thêm vào giỏ hàng:", error);
      // Không ném lỗi để không ảnh hưởng đến luồng chính
    }

    return cartItem;
  }

  async updateCartItem(userId: number, productId: number, quantity: number) {
    // Kiểm tra sản phẩm có tồn tại không
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new HttpException(404, "Sản phẩm không tồn tại");
    }

    // Kiểm tra số lượng tồn kho
    if (product.stock < quantity) {
      throw new HttpException(400, `Chỉ còn ${product.stock} sản phẩm trong kho`);
    }

    // Tìm item trong giỏ hàng
    const cartItem = await this.cartRepository.findOne({
      where: { userId, productId }
    });

    if (!cartItem) {
      throw new HttpException(404, "Sản phẩm không có trong giỏ hàng");
    }

    // Cập nhật số lượng
    cartItem.quantity = quantity;
    return this.cartRepository.save(cartItem);
  }

  async removeFromCart(userId: number, productId: number) {
    const result = await this.cartRepository.delete({
      userId,
      productId
    });
    
    if (result.affected === 0) {
      throw new HttpException(404, "Sản phẩm không có trong giỏ hàng");
    }
    
    return { message: "Đã xóa sản phẩm khỏi giỏ hàng" };
  }

  async clearCart(userId: number) {
    await this.cartRepository.delete({ userId });
    return { message: "Đã xóa toàn bộ giỏ hàng" };
  }
} 