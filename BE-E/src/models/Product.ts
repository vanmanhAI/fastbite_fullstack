import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable } from "typeorm";
import { OrderItem } from "./OrderItem";
import { Review } from "./Review";
import { Category } from "./Category";
import { InventoryTransaction } from "./InventoryTransaction";

export enum ProductCategory {
  FOOD = "food",
  DRINK = "drink",
  COMBO = "combo"
}

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @Column({
    type: "enum",
    enum: ProductCategory,
    default: ProductCategory.FOOD
  })
  category: ProductCategory;

  @Column({ name: "image_url", length: 255, nullable: true })
  imageUrl: string;

  @Column({ type: "longtext", nullable: true })
  tags: string;

  @Column({ default: 0 })
  stock: number;

  @Column({ name: "meta_title", length: 100, nullable: true })
  metaTitle: string;

  @Column({ name: "meta_description", length: 255, nullable: true })
  metaDescription: string;

  @Column({ name: "preparation_time", type: "smallint", nullable: true })
  preparationTime: number;

  @Column({ nullable: true })
  calories: number;

  @Column({ name: "is_vegetarian", default: false })
  isVegetarian: boolean;

  @Column({ name: "is_featured", default: false })
  isFeatured: boolean;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  orderItems: OrderItem[];

  @OneToMany(() => Review, review => review.product)
  reviews: Review[];

  @ManyToMany(() => Category)
  @JoinTable({
    name: "product_categories",
    joinColumn: { name: "product_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "category_id", referencedColumnName: "id" }
  })
  categories: Category[];

  @OneToMany(() => InventoryTransaction, transaction => transaction.product)
  inventoryTransactions: InventoryTransaction[];
} 