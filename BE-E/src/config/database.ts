import { DataSource } from "typeorm";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { Order } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { Review } from "../models/Review";
import { Address } from "../models/Address";
import { Promotion } from "../models/Promotion";
import { Coupon } from "../models/Coupon";
import { ChatLog } from "../models/ChatLog";
import { InventoryTransaction } from "../models/InventoryTransaction";
import { Payment } from "../models/Payment";
import { UserBehavior } from "../models/UserBehavior";
import { ProductLike } from "../models/ProductLike";
import { Cart } from "../models/Cart";
import { Banner } from "../models/Banner";
import path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Tạo kết nối TypeORM
export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "InternLOL123.",
  database: process.env.DB_DATABASE || "fastbite_db",
  entities: [
    User,
    Product,
    Category,
    Review,
    Order,
    OrderItem,
    Address,
    Payment,
    Coupon,
    InventoryTransaction,
    Promotion,
    ChatLog,
    UserBehavior,
    ProductLike,
    Cart,
    Banner
  ],
  migrations: [path.join(__dirname, "../database/migrations/*.{ts,js}")],
  synchronize: process.env.NODE_ENV === "development",
  logging: process.env.NODE_ENV === "development",
  timezone: "+07:00"
});

// Hàm khởi tạo kết nối cơ sở dữ liệu
export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    
    // Thực thi migration nếu cấu hình cho phép
    if (process.env.RUN_MIGRATIONS === "true") {
      console.log("Running migrations...");
      await AppDataSource.runMigrations();
    }
    
    return AppDataSource;
  } catch (error) {
    console.error("Error during Data Source initialization", error);
    throw error;
  }
}; 