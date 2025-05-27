import { DataSource } from "typeorm";
import { User } from "./models/User";
import { Product } from "./models/Product";
import { Category } from "./models/Category";
import { Order } from "./models/Order";
import { OrderItem } from "./models/OrderItem";
import { Payment } from "./models/Payment";
import { Address } from "./models/Address";
import { Review } from "./models/Review";
import { Promotion } from "./models/Promotion";
import { Coupon } from "./models/Coupon";
import { ChatLog } from "./models/ChatLog";
import { InventoryTransaction } from "./models/InventoryTransaction";
import { UserBehavior } from "./models/UserBehavior";
import { Cart } from "./models/Cart";
import { ProductLike } from "./models/ProductLike";
import { Banner } from "./models/Banner";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "InternLOL123.",
  database: process.env.DB_DATABASE || "fastbite_db",
  synchronize: process.env.NODE_ENV !== "production",
  logging: process.env.NODE_ENV !== "production",
  entities: [
    User,
    Product,
    Category,
    Order,
    OrderItem,
    Payment,
    Address,
    Review,
    Promotion,
    Coupon,
    ChatLog,
    InventoryTransaction,
    UserBehavior,
    Cart,
    ProductLike,
    Banner
  ],
  subscribers: [],
  migrations: [],
});

// Khởi tạo kết nối
(async () => {
  try {
    if (!AppDataSource.isInitialized) {
      console.log("Khởi tạo kết nối từ data-source.ts...");
      await AppDataSource.initialize();
      console.log("Kết nối database từ data-source.ts thành công");
    }
  } catch (error) {
    console.error("Lỗi khi khởi tạo kết nối từ data-source.ts:", error);
  }
})(); 