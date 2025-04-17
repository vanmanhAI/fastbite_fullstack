import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Promotion, DiscountType } from "../models/Promotion";
import { Coupon } from "../models/Coupon";
import { In, LessThanOrEqual, MoreThanOrEqual } from "typeorm";

const promotionRepository = AppDataSource.getRepository(Promotion);
const couponRepository = AppDataSource.getRepository(Coupon);

// Lấy danh sách khuyến mãi đang hoạt động
export const getActivePromotions = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    
    const promotions = await promotionRepository.find({
      where: {
        isActive: true,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now)
      },
      order: { createdAt: "DESC" }
    });
    
    return res.status(200).json({ promotions });
  } catch (error) {
    console.error("Lỗi lấy danh sách khuyến mãi:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy danh sách khuyến mãi" });
  }
};

// Áp dụng mã giảm giá
export const applyCoupon = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: "Vui lòng nhập mã giảm giá" });
    }
    
    // Tìm coupon
    const coupon = await couponRepository.findOne({
      where: { code },
      relations: ["promotion"]
    });
    
    if (!coupon) {
      return res.status(404).json({ message: "Mã giảm giá không tồn tại" });
    }
    
    // Kiểm tra giới hạn sử dụng
    if (coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ message: "Mã giảm giá đã hết lượt sử dụng" });
    }
    
    // Kiểm tra khuyến mãi còn hoạt động
    const now = new Date();
    const promotion = coupon.promotion;
    
    if (!promotion.isActive) {
      return res.status(400).json({ message: "Khuyến mãi đã kết thúc" });
    }
    
    if (promotion.startDate > now || promotion.endDate < now) {
      return res.status(400).json({ message: "Khuyến mãi chưa bắt đầu hoặc đã kết thúc" });
    }
    
    // Thông tin khuyến mãi
    return res.status(200).json({
      message: "Áp dụng mã giảm giá thành công",
      coupon,
      promotion: {
        id: promotion.id,
        name: promotion.name,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue
      }
    });
  } catch (error) {
    console.error("Lỗi áp dụng mã giảm giá:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi áp dụng mã giảm giá" });
  }
};

// [Admin] Lấy tất cả khuyến mãi
export const getAllPromotions = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const [promotions, total] = await promotionRepository.findAndCount({
      order: { createdAt: "DESC" },
      skip,
      take: limit,
      relations: ["coupons"]
    });
    
    return res.status(200).json({
      promotions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Lỗi lấy tất cả khuyến mãi:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy tất cả khuyến mãi" });
  }
};

// [Admin] Tạo khuyến mãi mới
export const createPromotion = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      description, 
      discountType, 
      discountValue, 
      startDate, 
      endDate,
      isActive 
    } = req.body;
    
    // Tạo khuyến mãi mới
    const newPromotion = promotionRepository.create({
      name,
      description,
      discountType: discountType as DiscountType,
      discountValue,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? isActive : true
    });
    
    // Lưu vào database
    await promotionRepository.save(newPromotion);
    
    return res.status(201).json({
      message: "Tạo khuyến mãi thành công",
      promotion: newPromotion
    });
  } catch (error) {
    console.error("Lỗi tạo khuyến mãi:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi tạo khuyến mãi" });
  }
};

// [Admin] Cập nhật khuyến mãi
export const updatePromotion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      discountType, 
      discountValue, 
      startDate, 
      endDate,
      isActive 
    } = req.body;
    
    // Tìm khuyến mãi
    const promotion = await promotionRepository.findOneBy({ id: parseInt(id) });
    if (!promotion) {
      return res.status(404).json({ message: "Không tìm thấy khuyến mãi" });
    }
    
    // Cập nhật thông tin
    promotion.name = name || promotion.name;
    promotion.description = description !== undefined ? description : promotion.description;
    
    if (discountType) {
      promotion.discountType = discountType as DiscountType;
    }
    
    if (discountValue !== undefined) {
      promotion.discountValue = discountValue;
    }
    
    if (startDate) {
      promotion.startDate = new Date(startDate);
    }
    
    if (endDate) {
      promotion.endDate = new Date(endDate);
    }
    
    if (isActive !== undefined) {
      promotion.isActive = isActive;
    }
    
    // Lưu vào database
    await promotionRepository.save(promotion);
    
    return res.status(200).json({
      message: "Cập nhật khuyến mãi thành công",
      promotion
    });
  } catch (error) {
    console.error("Lỗi cập nhật khuyến mãi:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật khuyến mãi" });
  }
};

// [Admin] Xóa khuyến mãi
export const deletePromotion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Tìm khuyến mãi
    const promotion = await promotionRepository.findOne({
      where: { id: parseInt(id) },
      relations: ["coupons"]
    });
    
    if (!promotion) {
      return res.status(404).json({ message: "Không tìm thấy khuyến mãi" });
    }
    
    // Xóa các mã giảm giá liên quan
    if (promotion.coupons && promotion.coupons.length > 0) {
      await couponRepository.remove(promotion.coupons);
    }
    
    // Xóa khuyến mãi
    await promotionRepository.remove(promotion);
    
    return res.status(200).json({ message: "Xóa khuyến mãi thành công" });
  } catch (error) {
    console.error("Lỗi xóa khuyến mãi:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa khuyến mãi" });
  }
};

// [Admin] Tạo mã giảm giá
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const { promotionId, code, usageLimit } = req.body;
    
    // Kiểm tra promotion tồn tại
    const promotion = await promotionRepository.findOneBy({ id: promotionId });
    if (!promotion) {
      return res.status(404).json({ message: "Không tìm thấy khuyến mãi" });
    }
    
    // Kiểm tra mã đã tồn tại
    const existingCoupon = await couponRepository.findOneBy({ code });
    if (existingCoupon) {
      return res.status(400).json({ message: "Mã giảm giá đã tồn tại" });
    }
    
    // Tạo mã giảm giá mới
    const newCoupon = couponRepository.create({
      promotionId,
      code,
      usageLimit: usageLimit || 1,
      usageCount: 0
    });
    
    // Lưu vào database
    await couponRepository.save(newCoupon);
    
    return res.status(201).json({
      message: "Tạo mã giảm giá thành công",
      coupon: newCoupon
    });
  } catch (error) {
    console.error("Lỗi tạo mã giảm giá:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi tạo mã giảm giá" });
  }
}; 