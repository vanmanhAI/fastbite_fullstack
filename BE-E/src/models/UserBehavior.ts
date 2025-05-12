import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index
} from "typeorm";
import { User } from "./User";
import { Product } from "./Product";

export enum BehaviorType {
  VIEW = "view",        // Xem sản phẩm
  LIKE = "like",        // Thích sản phẩm
  ADD_TO_CART = "add_to_cart",  // Thêm vào giỏ hàng
  PURCHASE = "purchase",  // Mua sản phẩm
  REVIEW = "review",    // Đánh giá sản phẩm
  SEARCH = "search",    // Tìm kiếm
  CLICK_CATEGORY = "click_category"  // Click vào danh mục
}

@Entity("user_behaviors")
@Index(["userId", "behaviorType"])
@Index(["userId", "productId"])
export class UserBehavior {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ nullable: true })
  productId: number;

  @Column({
    type: "enum",
    enum: BehaviorType
  })
  behaviorType: BehaviorType;

  @Column({ type: "text", nullable: true })
  data: string;

  @Column({ default: 1 })
  count: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  weight: number;

  @ManyToOne(() => User, user => user.behaviors)
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: "productId" })
  product: Product;

  @CreateDateColumn()
  createdAt: Date;
} 