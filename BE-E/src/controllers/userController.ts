import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../config/database";
import { User, UserRole } from "../models/User";
import { generateToken } from "../config/auth";

const userRepository = AppDataSource.getRepository(User);

// Đăng ký người dùng mới
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Kiểm tra email đã tồn tại
    const existingUser = await userRepository.findOneBy({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo người dùng mới
    const newUser = userRepository.create({
      name,
      email,
      password: hashedPassword,
      role: UserRole.CUSTOMER
    });

    // Lưu vào database
    await userRepository.save(newUser);

    // Tạo token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    return res.status(201).json({
      message: "Đăng ký thành công",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
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

    // Tìm user theo email
    const user = await userRepository.findOneBy({ email });
    if (!user) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Tạo token
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
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi đăng nhập" });
  }
};

// Lấy thông tin profile người dùng
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await userRepository.findOne({ 
      where: { id: req.user.id },
      select: ["id", "name", "email", "phone", "role", "createdAt"] 
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Lỗi lấy thông tin người dùng:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy thông tin người dùng" });
  }
};

// Cập nhật thông tin profile người dùng 
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;

    // Tìm người dùng
    const user = await userRepository.findOneBy({ id: userId });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Cập nhật thông tin
    if (name) user.name = name;
    if (phone) user.phone = phone;

    // Lưu vào database
    await userRepository.save(user);

    return res.status(200).json({
      message: "Cập nhật thông tin thành công",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Lỗi cập nhật thông tin người dùng:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật thông tin người dùng" });
  }
};

// Đổi mật khẩu
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Kiểm tra yêu cầu
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới" });
    }

    // Tìm người dùng
    const user = await userRepository.findOneBy({ id: userId });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Kiểm tra mật khẩu hiện tại
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Lưu vào database
    await userRepository.save(user);

    return res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Lỗi đổi mật khẩu:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi đổi mật khẩu" });
  }
};

// [Admin] Lấy danh sách tất cả người dùng
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await userRepository.find({
      select: ["id", "name", "email", "role", "isActive", "createdAt"]
    });

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Lỗi lấy danh sách người dùng:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy danh sách người dùng" });
  }
};

// [Admin] Cập nhật quyền của người dùng
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Tìm người dùng
    const user = await userRepository.findOneBy({ id: parseInt(userId) });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Cập nhật quyền
    user.role = role as UserRole;

    // Lưu vào database
    await userRepository.save(user);

    return res.status(200).json({
      message: "Cập nhật quyền người dùng thành công",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Lỗi cập nhật quyền người dùng:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật quyền người dùng" });
  }
}; 