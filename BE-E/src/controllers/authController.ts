import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { User, UserRole } from "../models/User";
import bcrypt from "bcryptjs";
import { generateToken } from "../config/auth";
import { validate } from "class-validator";

const userRepository = AppDataSource.getRepository(User);

// Đăng ký người dùng mới
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;
    console.log(req.body);

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await userRepository.findOne({ where: { email } });
    console.log(existingUser);
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }

    // Tạo người dùng mới
    const user = new User();
    user.name = name;
    user.email = email;
    user.phone = phone || "";
    user.role = UserRole.CUSTOMER;
    
    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // Xác thực dữ liệu
    const errors = await validate(user);
    if (errors.length > 0) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors });
    }

    // Lưu người dùng vào database
    await userRepository.save(user);

    // Tạo JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return res.status(201).json({
      message: "Đăng ký thành công",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      token
    });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi đăng ký" });
  }
};

// Đăng nhập
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);

    // Kiểm tra email tồn tại
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Tạo JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return res.status(200).json({
      message: "Đăng nhập thành công",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi đăng nhập" });
  }
};

// Lấy thông tin người dùng hiện tại
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // req.user được đặt bởi middleware xác thực
    const user = await userRepository.findOne({ where: { id: req.user.id } });
    
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Lỗi lấy thông tin người dùng:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy thông tin người dùng" });
  }
}; 