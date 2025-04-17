import { AppDataSource } from "../data-source";
import { User, UserRole } from "../models/User";
import { Category } from "../models/Category";
import { Product, ProductCategory } from "../models/Product";
import { Address } from "../models/Address";
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { Promotion, DiscountType } from "../models/Promotion";
import { Coupon } from "../models/Coupon";
import { ChatLog } from "../models/ChatLog";
import { Review } from "../models/Review";
import { Payment } from "../models/Payment";
import { InventoryTransaction, TransactionType } from "../models/InventoryTransaction";
import * as bcrypt from "bcrypt";

async function seed() {
  console.log("Bắt đầu seed dữ liệu...");
  
  try {
    await AppDataSource.initialize();
    console.log("Đã kết nối đến cơ sở dữ liệu.");
    
    // Seed Users
    console.log("Thêm dữ liệu Users...");
    const hashedPassword = await bcrypt.hash("Password123", 10);
    
    const users = await AppDataSource.manager.save(User, [
      {
        name: "Admin User",
        email: "admin@example.com",
        password: hashedPassword,
        phone: "0912345678",
        role: UserRole.ADMIN,
        isActive: true
      },
      {
        name: "Nguyễn Văn A",
        email: "nguyenvana@example.com",
        password: hashedPassword,
        phone: "0923456789",
        role: UserRole.CUSTOMER,
        isActive: true
      },
      {
        name: "Trần Thị B",
        email: "tranthib@example.com",
        password: hashedPassword,
        phone: "0934567890",
        role: UserRole.CUSTOMER,
        isActive: true
      },
      {
        name: "Lê Văn C",
        email: "levanc@example.com",
        password: hashedPassword,
        phone: "0945678901",
        role: UserRole.CUSTOMER,
        isActive: true
      },
      {
        name: "Phạm Thị D",
        email: "phamthid@example.com",
        password: hashedPassword,
        phone: "0956789012",
        role: UserRole.CUSTOMER,
        isActive: true
      }
    ]);
    
    // Seed Addresses
    console.log("Thêm dữ liệu Addresses...");
    const addresses = await AppDataSource.manager.save(Address, [
      {
        userId: users[1].id,
        fullName: "Nguyễn Văn A",
        phone: "0923456789",
        province: "Hà Nội",
        district: "Cầu Giấy",
        ward: "Dịch Vọng",
        streetAddress: "Số 123 Xuân Thủy",
        isDefault: true
      },
      {
        userId: users[1].id,
        fullName: "Nguyễn Văn A",
        phone: "0923456789",
        province: "Hà Nội",
        district: "Hai Bà Trưng",
        ward: "Bách Khoa",
        streetAddress: "Số 56 Lê Thanh Nghị",
        isDefault: false
      },
      {
        userId: users[2].id,
        fullName: "Trần Thị B",
        phone: "0934567890",
        province: "Hồ Chí Minh",
        district: "Quận 1",
        ward: "Bến Nghé",
        streetAddress: "Số 78 Nguyễn Huệ",
        isDefault: true
      },
      {
        userId: users[3].id,
        fullName: "Lê Văn C",
        phone: "0945678901",
        province: "Đà Nẵng",
        district: "Hải Châu",
        ward: "Hải Châu 1",
        streetAddress: "Số 45 Bạch Đằng",
        isDefault: true
      }
    ]);
    
    // Seed Categories
    console.log("Thêm dữ liệu Categories...");
    const categories = await AppDataSource.manager.save(Category, [
      {
        name: "Burger",
        slug: "burger",
        description: "Các loại burger thơm ngon",
        imageUrl: "https://example.com/images/burger.jpg"
      },
      {
        name: "Pizza",
        slug: "pizza",
        description: "Pizza đế mỏng và đế dày các loại",
        imageUrl: "https://example.com/images/pizza.jpg"
      },
      {
        name: "Gà rán",
        slug: "fried-chicken",
        description: "Gà rán giòn, thơm ngon",
        imageUrl: "https://example.com/images/fried-chicken.jpg"
      },
      {
        name: "Nước uống",
        slug: "beverages",
        description: "Các loại đồ uống giải khát",
        imageUrl: "https://example.com/images/beverages.jpg"
      },
      {
        name: "Combo",
        slug: "combo",
        description: "Combo tiết kiệm",
        imageUrl: "https://example.com/images/combo.jpg"
      },
      {
        name: "Tráng miệng",
        slug: "desserts",
        description: "Các món tráng miệng ngọt ngào",
        imageUrl: "https://example.com/images/desserts.jpg"
      }
    ]);
    
    // Seed subcategories
    const subCategories = await AppDataSource.manager.save(Category, [
      {
        name: "Burger bò",
        slug: "beef-burger",
        description: "Burger với thịt bò ngon",
        imageUrl: "https://example.com/images/beef-burger.jpg",
        parentId: categories[0].id
      },
      {
        name: "Burger gà",
        slug: "chicken-burger",
        description: "Burger với thịt gà ngon",
        imageUrl: "https://example.com/images/chicken-burger.jpg",
        parentId: categories[0].id
      },
      {
        name: "Pizza hải sản",
        slug: "seafood-pizza",
        description: "Pizza với hải sản tươi ngon",
        imageUrl: "https://example.com/images/seafood-pizza.jpg",
        parentId: categories[1].id
      },
      {
        name: "Pizza rau củ",
        slug: "veggie-pizza",
        description: "Pizza với nhiều loại rau củ",
        imageUrl: "https://example.com/images/veggie-pizza.jpg",
        parentId: categories[1].id
      }
    ]);
    
    // Seed Products
    console.log("Thêm dữ liệu Products...");
    const products = await AppDataSource.manager.save(Product, [
      {
        name: "Burger bò phô mai",
        description: "Burger với thịt bò Úc và phô mai Cheddar",
        price: 89000,
        category: ProductCategory.FOOD,
        imageUrl: "https://example.com/images/cheeseburger.jpg",
        tags: JSON.stringify(["burger", "bò", "phô mai", "bestseller"]),
        stock: 100,
        metaTitle: "Burger bò phô mai đặc biệt",
        metaDescription: "Burger bò với lớp phô mai Cheddar tan chảy",
        preparationTime: 10,
        calories: 650,
        isVegetarian: false,
        isFeatured: true,
        isActive: true
      },
      {
        name: "Pizza hải sản",
        description: "Pizza hải sản với tôm, mực và nhiều phô mai",
        price: 199000,
        category: ProductCategory.FOOD,
        imageUrl: "https://example.com/images/seafood-pizza.jpg",
        tags: JSON.stringify(["pizza", "hải sản", "phô mai", "bestseller"]),
        stock: 50,
        metaTitle: "Pizza hải sản cao cấp",
        metaDescription: "Pizza với hải sản tươi ngon và phô mai Mozzarella",
        preparationTime: 15,
        calories: 800,
        isVegetarian: false,
        isFeatured: true,
        isActive: true
      },
      {
        name: "Gà rán giòn",
        description: "Gà rán với lớp vỏ giòn, thịt mềm, thơm ngon",
        price: 129000,
        category: ProductCategory.FOOD,
        imageUrl: "https://example.com/images/fried-chicken.jpg",
        tags: JSON.stringify(["gà rán", "giòn", "bestseller"]),
        stock: 80,
        metaTitle: "Gà rán giòn đặc biệt",
        metaDescription: "Gà rán với công thức ướp đặc biệt",
        preparationTime: 12,
        calories: 750,
        isVegetarian: false,
        isFeatured: true,
        isActive: true
      },
      {
        name: "Coca Cola",
        description: "Nước ngọt có gas Coca Cola",
        price: 25000,
        category: ProductCategory.DRINK,
        imageUrl: "https://example.com/images/coca-cola.jpg",
        tags: JSON.stringify(["nước ngọt", "có gas", "bestseller"]),
        stock: 200,
        metaTitle: "Coca Cola lon 330ml",
        metaDescription: "Nước ngọt Coca Cola lon 330ml",
        preparationTime: 1,
        calories: 140,
        isVegetarian: true,
        isFeatured: false,
        isActive: true
      },
      {
        name: "Combo burger bò + khoai tây + nước",
        description: "Combo tiết kiệm với burger bò, khoai tây chiên và nước",
        price: 149000,
        category: ProductCategory.COMBO,
        imageUrl: "https://example.com/images/burger-combo.jpg",
        tags: JSON.stringify(["combo", "burger", "khoai tây", "nước", "tiết kiệm"]),
        stock: 50,
        metaTitle: "Combo burger bò tiết kiệm",
        metaDescription: "Combo với burger bò, khoai tây chiên và nước ngọt",
        preparationTime: 12,
        calories: 950,
        isVegetarian: false,
        isFeatured: true,
        isActive: true
      },
      {
        name: "Kem Chocolate",
        description: "Kem chocolate mát lạnh",
        price: 35000,
        category: ProductCategory.FOOD,
        imageUrl: "https://example.com/images/chocolate-ice-cream.jpg",
        tags: JSON.stringify(["kem", "chocolate", "tráng miệng"]),
        stock: 100,
        metaTitle: "Kem Chocolate mát lạnh",
        metaDescription: "Kem chocolate thơm ngon, mát lạnh",
        preparationTime: 2,
        calories: 250,
        isVegetarian: true,
        isFeatured: false,
        isActive: true
      }
    ]);
    
    // Thêm các sản phẩm vào danh mục
    await AppDataSource.createQueryBuilder()
      .relation(Product, "categories")
      .of(products[0])
      .add([categories[0].id, subCategories[0].id]);
    
    await AppDataSource.createQueryBuilder()
      .relation(Product, "categories")
      .of(products[1])
      .add([categories[1].id, subCategories[2].id]);
    
    await AppDataSource.createQueryBuilder()
      .relation(Product, "categories")
      .of(products[2])
      .add([categories[2].id]);
    
    await AppDataSource.createQueryBuilder()
      .relation(Product, "categories")
      .of(products[3])
      .add([categories[3].id]);
    
    await AppDataSource.createQueryBuilder()
      .relation(Product, "categories")
      .of(products[4])
      .add([categories[4].id]);
    
    await AppDataSource.createQueryBuilder()
      .relation(Product, "categories")
      .of(products[5])
      .add([categories[5].id]);
    
    // Seed Promotions
    console.log("Thêm dữ liệu Promotions...");
    const promotions = await AppDataSource.manager.save(Promotion, [
      {
        name: "Khuyến mãi mùa hè",
        description: "Giảm giá 20% cho tất cả các món ăn",
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        startDate: new Date("2023-06-01"),
        endDate: new Date("2023-08-31"),
        isActive: true
      },
      {
        name: "Chào mừng khách hàng mới",
        description: "Giảm 50.000đ cho đơn hàng đầu tiên",
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 50000,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        isActive: true
      },
      {
        name: "Sinh nhật Fast Food",
        description: "Giảm 15% nhân dịp sinh nhật chuỗi cửa hàng",
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        startDate: new Date("2023-10-01"),
        endDate: new Date("2023-10-15"),
        isActive: true
      }
    ]);
    
    // Seed Coupons
    console.log("Thêm dữ liệu Coupons...");
    const coupons = await AppDataSource.manager.save(Coupon, [
      {
        code: "SUMMER2023",
        promotionId: promotions[0].id,
        usageLimit: 100,
        usageCount: 45
      },
      {
        code: "WELCOME50K",
        promotionId: promotions[1].id,
        usageLimit: 1000,
        usageCount: 320
      },
      {
        code: "BIRTHDAY15",
        promotionId: promotions[2].id,
        usageLimit: 200,
        usageCount: 0
      }
    ]);
    
    // Seed Orders
    console.log("Thêm dữ liệu Orders...");
    const orders = await AppDataSource.manager.save(Order, [
      {
        userId: users[1].id,
        addressId: addresses[0].id,
        subtotal: 328000,
        shippingFee: 15000,
        discount: 65600,
        totalAmount: 277400,
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.COD,
        couponCode: "SUMMER2023",
        deliveryAddress: "Số 123 Xuân Thủy, Dịch Vọng, Cầu Giấy, Hà Nội",
        notes: "Gọi trước khi giao"
      },
      {
        userId: users[2].id,
        addressId: addresses[2].id,
        subtotal: 199000,
        shippingFee: 15000,
        discount: 0,
        totalAmount: 214000,
        status: OrderStatus.PROCESSING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.MOMO,
        deliveryAddress: "Số 78 Nguyễn Huệ, Bến Nghé, Quận 1, Hồ Chí Minh",
        notes: null
      },
      {
        userId: users[3].id,
        addressId: addresses[3].id,
        subtotal: 149000,
        shippingFee: 15000,
        discount: 50000,
        totalAmount: 114000,
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.STRIPE,
        couponCode: "WELCOME50K",
        deliveryAddress: "Số 45 Bạch Đằng, Hải Châu 1, Hải Châu, Đà Nẵng",
        notes: null
      }
    ]);
    
    // Seed OrderItems
    console.log("Thêm dữ liệu OrderItems...");
    const orderItems = await AppDataSource.manager.save(OrderItem, [
      {
        orderId: orders[0].id,
        productId: products[0].id,
        quantity: 2,
        price: 89000
      },
      {
        orderId: orders[0].id,
        productId: products[3].id,
        quantity: 2,
        price: 25000
      },
      {
        orderId: orders[0].id,
        productId: products[2].id,
        quantity: 1,
        price: 129000
      },
      {
        orderId: orders[1].id,
        productId: products[1].id,
        quantity: 1,
        price: 199000
      },
      {
        orderId: orders[2].id,
        productId: products[4].id,
        quantity: 1,
        price: 149000
      }
    ]);
    
    // Seed Payments
    console.log("Thêm dữ liệu Payments...");
    const payments = await AppDataSource.manager.save(Payment, [
      {
        orderId: orders[0].id,
        method: PaymentMethod.COD,
        status: PaymentStatus.COMPLETED,
        amount: 277400,
        transactionId: null,
        paymentIntentId: null,
        stripeSessionId: null,
        notes: "Đã thanh toán khi nhận hàng"
      },
      {
        orderId: orders[1].id,
        method: PaymentMethod.MOMO,
        status: PaymentStatus.PENDING,
        amount: 214000,
        transactionId: "MOMO123456789",
        paymentIntentId: null,
        stripeSessionId: null,
        notes: "Đang chờ thanh toán qua MoMo"
      },
      {
        orderId: orders[2].id,
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.COMPLETED,
        amount: 114000,
        transactionId: "txn_1234567890",
        paymentIntentId: "pi_1234567890",
        stripeSessionId: "cs_1234567890",
        notes: "Đã thanh toán qua Stripe"
      }
    ]);
    
    // Seed Reviews
    console.log("Thêm dữ liệu Reviews...");
    const reviews = await AppDataSource.manager.save(Review, [
      {
        productId: products[0].id,
        userId: users[1].id,
        orderId: orders[0].id,
        rating: 5,
        comment: "Burger bò rất ngon, thịt mềm và phô mai béo ngậy. Sẽ mua lại lần sau!"
      },
      {
        productId: products[2].id,
        userId: users[1].id,
        orderId: orders[0].id,
        rating: 4,
        comment: "Gà rán giòn và thơm, nhưng hơi mặn một chút."
      },
      {
        productId: products[4].id,
        userId: users[3].id,
        orderId: orders[2].id,
        rating: 5,
        comment: "Combo đầy đủ và tiết kiệm, rất hài lòng!"
      }
    ]);
    
    // Seed InventoryTransactions
    console.log("Thêm dữ liệu InventoryTransactions...");
    const inventoryTransactions = await AppDataSource.manager.save(InventoryTransaction, [
      {
        productId: products[0].id,
        quantity: 100,
        type: TransactionType.IN,
        referenceId: null,
        referenceType: null,
        notes: "Nhập kho ban đầu"
      },
      {
        productId: products[1].id,
        quantity: 50,
        type: TransactionType.IN,
        referenceId: null,
        referenceType: null,
        notes: "Nhập kho ban đầu"
      },
      {
        productId: products[0].id,
        quantity: -2,
        type: TransactionType.OUT,
        referenceId: orders[0].id,
        referenceType: "order",
        notes: "Đơn hàng #" + orders[0].id
      },
      {
        productId: products[2].id,
        quantity: -1,
        type: TransactionType.OUT,
        referenceId: orders[0].id,
        referenceType: "order",
        notes: "Đơn hàng #" + orders[0].id
      },
      {
        productId: products[1].id,
        quantity: -1,
        type: TransactionType.OUT,
        referenceId: orders[1].id,
        referenceType: "order",
        notes: "Đơn hàng #" + orders[1].id
      },
      {
        productId: products[0].id,
        quantity: 50,
        type: TransactionType.IN,
        referenceId: null,
        referenceType: null,
        notes: "Bổ sung hàng"
      }
    ]);
    
    // Seed ChatLogs
    console.log("Thêm dữ liệu ChatLogs...");
    const chatLogs = await AppDataSource.manager.save(ChatLog, [
      {
        userId: users[1].id,
        message: "Cửa hàng mở cửa đến mấy giờ?",
        response: "Cửa hàng chúng tôi mở cửa từ 7:00 sáng đến 22:00 tối mỗi ngày.",
        intent: "opening_hours"
      },
      {
        userId: users[2].id,
        message: "Tôi có thể đặt hàng trực tuyến không?",
        response: "Vâng, bạn có thể đặt hàng trực tuyến qua website hoặc ứng dụng của chúng tôi.",
        intent: "order_online"
      },
      {
        userId: null,
        message: "Tôi muốn đặt 5 phần pizza cho buổi tiệc",
        response: "Bạn có thể đặt hàng qua website của chúng tôi hoặc gọi số 1900xxxx để được hỗ trợ đặt hàng số lượng lớn.",
        intent: "bulk_order"
      }
    ]);
    
    console.log("Seed dữ liệu thành công!");
    
  } catch (error) {
    console.error("Lỗi khi seed dữ liệu:", error);
  } finally {
    await AppDataSource.destroy();
    console.log("Đã đóng kết nối cơ sở dữ liệu.");
  }
}

seed(); 