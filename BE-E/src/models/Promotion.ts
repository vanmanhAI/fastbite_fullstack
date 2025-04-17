import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Coupon } from "./Coupon";

export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED_AMOUNT = "fixed_amount"
}

@Entity("promotions")
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({
    name: "discount_type",
    type: "enum",
    enum: DiscountType
  })
  discountType: DiscountType;

  @Column({ name: "discount_value", type: "decimal", precision: 10, scale: 2 })
  discountValue: number;

  @Column({ name: "start_date", type: "datetime" })
  startDate: Date;

  @Column({ name: "end_date", type: "datetime" })
  endDate: Date;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(() => Coupon, coupon => coupon.promotion)
  coupons: Coupon[];
} 