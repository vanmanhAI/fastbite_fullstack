import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export enum BannerType {
  HERO = "hero",
  PROMOTION = "promotion",
  PRODUCT = "product",
  CATEGORY = "category"
}

export enum BannerPosition {
  HOME_TOP = "home_top",
  HOME_MIDDLE = "home_middle",
  HOME_BOTTOM = "home_bottom",
  CATEGORY_PAGE = "category_page",
  PRODUCT_PAGE = "product_page"
}

@Entity("banners")
export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ name: "image_url", length: 255 })
  imageUrl: string;

  @Column({ length: 255, nullable: true })
  linkUrl: string;

  @Column({ name: "button_text", length: 50, nullable: true })
  buttonText: string;

  @Column({
    type: "enum",
    enum: BannerType,
    default: BannerType.HERO
  })
  type: BannerType;

  @Column({
    type: "enum",
    enum: BannerPosition,
    default: BannerPosition.HOME_TOP
  })
  position: BannerPosition;

  @Column({ type: "int", default: 0 })
  order: number;

  @Column({ name: "background_color", length: 20, nullable: true })
  backgroundColor: string;

  @Column({ name: "text_color", length: 20, nullable: true })
  textColor: string;

  @Column({ name: "start_date", type: "datetime", nullable: true })
  startDate: Date;

  @Column({ name: "end_date", type: "datetime", nullable: true })
  endDate: Date;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "boolean", default: false, name: "is_deleted" })
  isDeleted: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
} 