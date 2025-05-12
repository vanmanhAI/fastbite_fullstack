import { Request, Response, NextFunction } from "express";
import { CartService } from "../services/CartService";
import { AppDataSource } from '../config/database';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { User } from '../models/User';

const cartRepository = AppDataSource.getRepository(Cart);
const productRepository = AppDataSource.getRepository(Product);
const userRepository = AppDataSource.getRepository(User);

export class CartController {
  private cartService = new CartService();

  // Lấy giỏ hàng của người dùng
  getCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Log thông tin xác thực để debug
      console.log("=== GET CART DEBUG ===");
      console.log("Request headers:", req.headers);
      console.log("User info:", req.user);
      
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa đăng nhập'
        });
      }
      
      // Tìm tất cả items trong giỏ hàng của user, kèm thông tin sản phẩm
      const cartItems = await cartRepository.find({
        where: { user: { id: userId } },
        relations: ['product']
      });
      
      // Chuyển đổi định dạng trả về để phù hợp với frontend
      const formattedCart = cartItems.map(item => ({
        id: item.id,
        productId: item.product.id,
        userId: userId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          description: item.product.description,
          image: item.product.imageUrl,
          stock: item.product.stock
        }
      }));
      
      return res.status(200).json({
        success: true,
        data: formattedCart
      });
    } catch (error) {
      console.error('Lỗi khi lấy giỏ hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi lấy giỏ hàng'
      });
    }
  };

  // Thêm sản phẩm vào giỏ hàng
  addToCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const { productId, quantity } = req.body;
      
      if (!productId || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin sản phẩm hoặc số lượng'
        });
      }
      
      // Kiểm tra sản phẩm tồn tại
      const product = await productRepository.findOne({
        where: { id: productId }
      });
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm'
        });
      }
      
      // Kiểm tra số lượng tồn kho
      if (quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Chỉ còn ${product.stock} sản phẩm trong kho`
        });
      }
      
      // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
      let cartItem = await cartRepository.findOne({
        where: {
          user: { id: userId },
          product: { id: productId }
        },
        relations: ['product']
      });
      
      if (cartItem) {
        // Cập nhật số lượng nếu sản phẩm đã có trong giỏ hàng
        const newQuantity = cartItem.quantity + quantity;
        
        // Kiểm tra lại số lượng tồn kho
        if (newQuantity > product.stock) {
          return res.status(400).json({
            success: false,
            message: `Chỉ còn ${product.stock} sản phẩm trong kho`
          });
        }
        
        cartItem.quantity = newQuantity;
        await cartRepository.save(cartItem);
      } else {
        // Tạo mới item trong giỏ hàng nếu sản phẩm chưa có
        const user = await userRepository.findOne({
          where: { id: userId }
        });
        
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy người dùng'
          });
        }
        
        cartItem = cartRepository.create({
          product,
          user,
          quantity
        });
        
        await cartRepository.save(cartItem);
      }
      
      // Format dữ liệu trả về
      const formattedCartItem = {
        id: cartItem.id,
        productId: cartItem.product.id,
        userId: userId,
        quantity: cartItem.quantity,
        product: {
          id: cartItem.product.id,
          name: cartItem.product.name,
          price: cartItem.product.price,
          description: cartItem.product.description,
          image: cartItem.product.imageUrl,
          stock: cartItem.product.stock
        }
      };
      
      return res.status(200).json({
        success: true,
        message: 'Đã thêm sản phẩm vào giỏ hàng',
        data: formattedCartItem
      });
    } catch (error) {
      console.error('Lỗi khi thêm vào giỏ hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi thêm vào giỏ hàng'
      });
    }
  };

  // Cập nhật số lượng sản phẩm trong giỏ hàng
  updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const { productId, quantity } = req.body;
      
      if (!productId || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin sản phẩm hoặc số lượng'
        });
      }
      
      // Tìm sản phẩm trong giỏ hàng
      const cartItem = await cartRepository.findOne({
        where: {
          user: { id: userId },
          product: { id: productId }
        },
        relations: ['product']
      });
      
      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm trong giỏ hàng'
        });
      }
      
      // Kiểm tra số lượng tồn kho
      if (quantity > cartItem.product.stock) {
        return res.status(400).json({
          success: false,
          message: `Chỉ còn ${cartItem.product.stock} sản phẩm trong kho`
        });
      }
      
      // Cập nhật số lượng
      cartItem.quantity = quantity;
      await cartRepository.save(cartItem);
      
      // Format dữ liệu trả về
      const formattedCartItem = {
        id: cartItem.id,
        productId: cartItem.product.id,
        userId: userId,
        quantity: cartItem.quantity,
        product: {
          id: cartItem.product.id,
          name: cartItem.product.name,
          price: cartItem.product.price,
          description: cartItem.product.description,
          image: cartItem.product.imageUrl,
          stock: cartItem.product.stock
        }
      };
      
      return res.status(200).json({
        success: true,
        message: 'Đã cập nhật số lượng sản phẩm',
        data: formattedCartItem
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật giỏ hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi cập nhật giỏ hàng'
      });
    }
  };

  // Xóa sản phẩm khỏi giỏ hàng
  removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const { productId } = req.params;
      
      // Tìm sản phẩm trong giỏ hàng
      const cartItem = await cartRepository.findOne({
        where: {
          user: { id: userId },
          product: { id: parseInt(productId) }
        }
      });
      
      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm trong giỏ hàng'
        });
      }
      
      // Xóa sản phẩm khỏi giỏ hàng
      await cartRepository.remove(cartItem);
      
      return res.status(200).json({
        success: true,
        message: 'Đã xóa sản phẩm khỏi giỏ hàng'
      });
    } catch (error) {
      console.error('Lỗi khi xóa khỏi giỏ hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi xóa khỏi giỏ hàng'
      });
    }
  };

  // Xóa toàn bộ giỏ hàng
  clearCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      
      // Tìm tất cả sản phẩm trong giỏ hàng của user
      const cartItems = await cartRepository.find({
        where: { user: { id: userId } }
      });
      
      if (cartItems.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Giỏ hàng đã trống'
        });
      }
      
      // Xóa tất cả sản phẩm
      await cartRepository.remove(cartItems);
      
      return res.status(200).json({
        success: true,
        message: 'Đã xóa toàn bộ giỏ hàng'
      });
    } catch (error) {
      console.error('Lỗi khi xóa giỏ hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi xóa giỏ hàng'
      });
    }
  };

  /**
   * Đồng bộ giỏ hàng từ localStorage lên server
   */
  async syncCart(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const { items } = req.body;
      
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu giỏ hàng để đồng bộ'
        });
      }
      
      // Xử lý từng sản phẩm trong mảng items
      const syncResults = await Promise.all(
        items.map(async (item) => {
          const { productId, quantity } = item;
          
          // Kiểm tra sản phẩm tồn tại
          const product = await productRepository.findOne({
            where: { id: productId }
          });
          
          if (!product) {
            return {
              success: false,
              productId,
              message: 'Không tìm thấy sản phẩm'
            };
          }
          
          // Kiểm tra số lượng tồn kho
          const validQuantity = Math.min(quantity, product.stock);
          
          // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
          let cartItem = await cartRepository.findOne({
            where: {
              user: { id: userId },
              product: { id: productId }
            }
          });
          
          if (cartItem) {
            // Cập nhật số lượng nếu sản phẩm đã có trong giỏ hàng
            cartItem.quantity = validQuantity;
          } else {
            // Tạo mới item trong giỏ hàng
            const user = await userRepository.findOne({
              where: { id: userId }
            });
            
            if (!user) {
              return {
                success: false,
                productId,
                message: 'Không tìm thấy người dùng'
              };
            }
            
            cartItem = cartRepository.create({
              product,
              user,
              quantity: validQuantity
            });
          }
          
          await cartRepository.save(cartItem);
          
          return {
            success: true,
            productId,
            quantity: validQuantity,
            message: 'Đã đồng bộ sản phẩm'
          };
        })
      );
      
      // Kiểm tra kết quả đồng bộ
      const allSuccess = syncResults.every(result => result.success);
      
      return res.status(200).json({
        success: true,
        message: allSuccess 
          ? 'Đã đồng bộ giỏ hàng thành công' 
          : 'Đã đồng bộ giỏ hàng với một số lỗi',
        results: syncResults
      });
    } catch (error) {
      console.error('Lỗi khi đồng bộ giỏ hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi đồng bộ giỏ hàng'
      });
    }
  }

  /**
   * Thêm sản phẩm vào giỏ hàng cho khách vãng lai (không yêu cầu đăng nhập)
   */
  addGuestToCart = async (req: Request, res: Response) => {
    try {
      console.log("=== GUEST CART DEBUG ===");
      console.log("Request headers:", req.headers);
      console.log("Request body:", req.body);
      
      const { productId, quantity } = req.body;
      
      if (!productId || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin sản phẩm hoặc số lượng'
        });
      }
      
      // Kiểm tra sản phẩm tồn tại
      const product = await productRepository.findOne({
        where: { id: productId }
      });
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm'
        });
      }
      
      // Kiểm tra số lượng tồn kho
      if (quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Chỉ còn ${product.stock} sản phẩm trong kho`
        });
      }
      
      // Trả về thông tin sản phẩm để lưu vào localStorage ở client
      const productInfo = {
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        image: product.imageUrl,
        stock: product.stock
      };
      
      return res.status(200).json({
        success: true,
        message: 'Đã nhận thông tin sản phẩm',
        data: productInfo
      });
    } catch (error) {
      console.error('Lỗi khi xử lý yêu cầu từ khách vãng lai:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi xử lý yêu cầu'
      });
    }
  };
} 