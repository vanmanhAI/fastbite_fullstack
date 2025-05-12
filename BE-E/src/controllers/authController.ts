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

    // Set cookie cho đăng ký
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
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

    // Kiểm tra email tồn tại
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });
    }
    
    // Kiểm tra tài khoản có bị vô hiệu hóa không
    if (!user.isActive) {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa" });
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

    // Set cookie sử dụng tên "jwt" thay vì "token"
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
    });

    console.log('Login successful, set cookie: jwt =', token.substring(0, 20) + '...');

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

// Đăng xuất - xóa cookie
export const logout = (req: Request, res: Response) => {
  try {
    // Xóa cookie jwt
    res.clearCookie('jwt');
    
    // Xóa cookie token (nếu có) để đảm bảo tương thích ngược
    res.clearCookie('token');
    
    console.log('Logout successful, cleared cookies');
    
    return res.status(200).json({
      message: "Đăng xuất thành công"
    });
  } catch (error) {
    console.error("Lỗi đăng xuất:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi đăng xuất" });
  }
};

// Làm mới token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Lấy thông tin người dùng từ req.user (đã được xác thực bởi middleware)
    if (!req.user) {
      return res.status(401).json({ message: "Không có thông tin người dùng" });
    }
    
    const userId = req.user.id;
    
    // Lấy thông tin người dùng từ cơ sở dữ liệu
    const user = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'isActive']
    });
    
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
    
    // Kiểm tra trạng thái kích hoạt của người dùng
    if (!user.isActive) {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa" });
    }
    
    // Tạo JWT token mới
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    // Set cookie mới
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
    });
    
    console.log('Token refreshed successfully');
    
    return res.status(200).json({
      message: "Token đã được làm mới",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Lỗi khi làm mới token:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi làm mới token" });
  }
}; 