import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Address } from "../models/Address";

const addressRepository = AppDataSource.getRepository(Address);

// Lấy danh sách địa chỉ của người dùng hiện tại
export const getUserAddresses = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    console.log("userId", userId);
    
    const addresses = await addressRepository.find({
      where: { userId },
      order: { isDefault: "DESC", createdAt: "DESC" }
    });
    
    return res.status(200).json({ addresses });
  } catch (error) {
    console.error("Lỗi lấy danh sách địa chỉ:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy danh sách địa chỉ" });
  }
};

// Lấy địa chỉ mặc định của người dùng
export const getDefaultAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    const address = await addressRepository.findOneBy({ userId, isDefault: true });
    
    if (!address) {
      return res.status(404).json({ message: "Không tìm thấy địa chỉ mặc định" });
    }
    
    return res.status(200).json({ address });
  } catch (error) {
    console.error("Lỗi lấy địa chỉ mặc định:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy địa chỉ mặc định" });
  }
};

// Thêm địa chỉ mới
export const createAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, province, district, ward, streetAddress, isDefault } = req.body;
    
    // Tạo địa chỉ mới
    const newAddress = addressRepository.create({
      userId,
      fullName,
      phone,
      province,
      district,
      ward,
      streetAddress,
      isDefault: isDefault || false
    });
    
    // Nếu là địa chỉ mặc định, cập nhật tất cả các địa chỉ khác của người dùng
    if (newAddress.isDefault) {
      await addressRepository.update({ userId, isDefault: true }, { isDefault: false });
    }
    
    // Lưu địa chỉ mới
    await addressRepository.save(newAddress);
    
    return res.status(201).json({
      message: "Thêm địa chỉ thành công",
      address: newAddress
    });
  } catch (error) {
    console.error("Lỗi thêm địa chỉ:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi thêm địa chỉ" });
  }
};

// Cập nhật địa chỉ
export const updateAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { fullName, phone, province, district, ward, streetAddress, isDefault } = req.body;
    
    // Tìm địa chỉ
    const address = await addressRepository.findOneBy({ id: parseInt(id), userId });
    if (!address) {
      return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
    }
    
    // Cập nhật thông tin
    address.fullName = fullName || address.fullName;
    address.phone = phone || address.phone;
    address.province = province || address.province;
    address.district = district || address.district;
    address.ward = ward || address.ward;
    address.streetAddress = streetAddress || address.streetAddress;
    
    // Nếu đặt làm địa chỉ mặc định
    if (isDefault && !address.isDefault) {
      await addressRepository.update({ userId, isDefault: true }, { isDefault: false });
      address.isDefault = true;
    }
    
    // Lưu thay đổi
    await addressRepository.save(address);
    
    return res.status(200).json({
      message: "Cập nhật địa chỉ thành công",
      address
    });
  } catch (error) {
    console.error("Lỗi cập nhật địa chỉ:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật địa chỉ" });
  }
};

// Xóa địa chỉ
export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Tìm địa chỉ
    const address = await addressRepository.findOneBy({ id: parseInt(id), userId });
    if (!address) {
      return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
    }
    
    // Xóa địa chỉ
    await addressRepository.remove(address);
    
    return res.status(200).json({ message: "Xóa địa chỉ thành công" });
  } catch (error) {
    console.error("Lỗi xóa địa chỉ:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa địa chỉ" });
  }
};

// Đặt địa chỉ làm mặc định
export const setDefaultAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Tìm địa chỉ
    const address = await addressRepository.findOneBy({ id: parseInt(id), userId });
    if (!address) {
      return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
    }
    
    // Cập nhật tất cả các địa chỉ khác
    await addressRepository.update({ userId, isDefault: true }, { isDefault: false });
    
    // Đặt địa chỉ này làm mặc định
    address.isDefault = true;
    await addressRepository.save(address);
    
    return res.status(200).json({
      message: "Đã đặt địa chỉ làm mặc định",
      address
    });
  } catch (error) {
    console.error("Lỗi đặt địa chỉ mặc định:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi đặt địa chỉ mặc định" });
  }
}; 