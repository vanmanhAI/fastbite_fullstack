import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from "typeorm";
import { User } from "./User";
import { Category } from "./Category";

export enum PreferenceType {
  DIETARY = "dietary",        // Ăn chay, không ăn cay...
  ALLERGEN = "allergen",      // Dị ứng (tôm, cua, đậu...)
  FAVORITE_CATEGORY = "favorite_category", // Danh mục yêu thích
  FAVORITE_MEAL = "favorite_meal",  // Bữa ăn thích (sáng, trưa, tối)
  SPICY_LEVEL = "spicy_level",     // Mức độ cay
  PRICE_RANGE = "price_range",     // Khoảng giá
  OTHER = "other"             // Khác
}

@Entity("user_preferences")
@Index(["userId", "preferenceType"])
export class UserPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({
    type: "enum",
    enum: PreferenceType
  })
  preferenceType: PreferenceType;

  @Column({ nullable: true })
  categoryId: number;

  @Column({ type: "varchar", length: 100 })
  value: string;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 1.0 })
  weight: number;

  @ManyToOne(() => User, user => user.preferences)
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: "categoryId" })
  category: Category;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 