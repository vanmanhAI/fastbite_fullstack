import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { IsEmail, Length, IsOptional, IsPhoneNumber } from "class-validator";
import { Order } from "./Order";
import { Address } from "./Address";
import { Review } from "./Review";
import { ChatLog } from "./ChatLog";

export enum UserRole {
  CUSTOMER = "customer",
  ADMIN = "admin"
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

  @OneToMany(() => Order, order => order.user)
  orders: Order[];

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