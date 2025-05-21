import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { IsEmail, Length, IsOptional, IsPhoneNumber } from "class-validator";
import { Order } from "./Order";
import { Address } from "./Address";
import { Review } from "./Review";
import { ChatLog } from "./ChatLog";
import { Cart } from "./Cart";
import { UserBehavior } from "./UserBehavior";

export enum UserRole {
  CUSTOMER = "customer",
  ADMIN = "admin"
}

export interface UserPreferences {
  favoriteCategories?: string[];
  dietaryRestrictions?: string[];
  tastePreferences?: {
    spicy?: boolean;
    sweet?: boolean;
    sour?: boolean;
    bitter?: boolean;
    savory?: boolean;
  };
  notificationSettings?: {
    email?: boolean;
    promotions?: boolean;
    orderUpdates?: boolean;
  };
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Length(2, 100)
  name: string;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsPhoneNumber("VN")
  phone: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.CUSTOMER
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "json", nullable: true })
  preferences: UserPreferences;

  @OneToMany(() => Cart, cart => cart.user)
  carts: Cart[];

  @OneToMany(() => Order, order => order.user)
  orders: Order[];

  @OneToMany(() => UserBehavior, behavior => behavior.user)
  behaviors: UserBehavior[];

  @OneToMany(() => Address, address => address.user)
  addresses: Address[];

  @OneToMany(() => Review, review => review.user)
  reviews: Review[];

  @OneToMany(() => ChatLog, chatLog => chatLog.user)
  chatLogs: ChatLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 