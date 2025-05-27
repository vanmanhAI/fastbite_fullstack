import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Banner, BannerType, BannerPosition } from "../models/Banner";
import { Between, LessThanOrEqual, MoreThanOrEqual } from "typeorm";

const bannerRepository = AppDataSource.getRepository(Banner);

// Lấy danh sách banner với phân trang và lọc
export const getBanners = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as BannerType;
    const position = req.query.position as BannerPosition;
    const active = req.query.active as string;
    
    const skip = (page - 1) * limit;
    
    let query = bannerRepository.createQueryBuilder("banner")
      .where("banner.isDeleted = :isDeleted", { isDeleted: false });
    
    // Lọc theo type nếu có
    if (type) {
      query = query.andWhere("banner.type = :type", { type });
    }
    
    // Lọc theo position nếu có
    if (position) {
      query = query.andWhere("banner.position = :position", { position });
    }
    
    // Lọc theo trạng thái nếu có
    if (active === 'true') {
      query = query.andWhere("banner.isActive = :isActive", { isActive: true });
    } else if (active === 'false') {
      query = query.andWhere("banner.isActive = :isActive", { isActive: false });
    }
    
    // Đếm tổng số banner
    const total = await query.getCount();
    
    // Lấy danh sách banner với phân trang
    const banners = await query
      .orderBy("banner.order", "ASC")
      .addOrderBy("banner.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getMany();
    
    return res.status(200).json({
      data: banners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách banner:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy danh sách banner" });
  }
};

// Lấy banner theo ID
export const getBannerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const banner = await bannerRepository.findOne({
      where: { 
        id: parseInt(id),
        isDeleted: false
      }
    });
    
    if (!banner) {
      return res.status(404).json({ message: "Không tìm thấy banner" });
    }
    
    return res.status(200).json({ banner });
  } catch (error) {
    console.error("Lỗi lấy thông tin banner:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy thông tin banner" });
  }
};

// Lấy banner hiện đang active theo vị trí hoặc loại
export const getActiveBanners = async (req: Request, res: Response) => {
  try {
    const { type, position } = req.query;
    const currentDate = new Date();
    
    console.log('getActiveBanners - Request params:', { type, position });
    
    const queryOptions: any = {
      isActive: true,
      isDeleted: false
    };
    
    // Lọc theo type nếu có
    if (type) {
      queryOptions.type = type;
    }
    
    // Lọc theo position nếu có
    if (position) {
      queryOptions.position = position;
    }
    
    console.log('Query options:', queryOptions);
    
    // Tạo danh sách điều kiện để check ngày
    const dateConditions = [
      { startDate: null, endDate: null }, // Không có ngày bắt đầu và kết thúc
      { startDate: null, endDate: MoreThanOrEqual(currentDate) }, // Không có ngày bắt đầu, ngày kết thúc trong tương lai
      { startDate: LessThanOrEqual(currentDate), endDate: null }, // Ngày bắt đầu trong quá khứ, không có ngày kết thúc
      { startDate: LessThanOrEqual(currentDate), endDate: MoreThanOrEqual(currentDate) } // Ngày bắt đầu trong quá khứ, ngày kết thúc trong tương lai
    ];
    
    // Tạo mảng các điều kiện truy vấn
    const queryConditions = dateConditions.map(dateCondition => ({
      ...queryOptions,
      ...dateCondition
    }));
    
    console.log('Executing banner query with conditions');
    
    // Lấy danh sách banner
    const banners = await bannerRepository.find({
      where: queryConditions,
      order: {
        order: "ASC",
        createdAt: "DESC"
      }
    });
    
    console.log(`Found ${banners.length} active banners`);
    
    return res.status(200).json({ data: banners });
  } catch (error) {
    console.error("Lỗi lấy danh sách banner active:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy danh sách banner active" });
  }
};

// Tạo banner mới
export const createBanner = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      linkUrl,
      buttonText,
      type,
      position,
      order,
      backgroundColor,
      textColor,
      startDate,
      endDate,
      isActive
    } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: "Tiêu đề banner là bắt buộc" });
    }
    
    // Xử lý hình ảnh nếu có
    let imageUrl = '';
    if (req.file) {
      // Tạo URL đầy đủ tới hình ảnh
      const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 8001}`;
      imageUrl = `${baseUrl}/uploads/banners/${req.file.filename}`;
    } else if (!req.file && !req.body.imageUrl) {
      return res.status(400).json({ message: "Hình ảnh banner là bắt buộc" });
    } else {
      imageUrl = req.body.imageUrl;
    }
    
    // Tạo banner mới
    const newBanner = bannerRepository.create({
      title,
      description,
      imageUrl,
      linkUrl,
      buttonText,
      type: type || BannerType.HERO,
      position: position || BannerPosition.HOME_TOP,
      order: order ? parseInt(order) : 0,
      backgroundColor,
      textColor,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true
    });
    
    // Lưu banner
    await bannerRepository.save(newBanner);
    
    return res.status(201).json({
      message: "Thêm banner thành công",
      data: newBanner
    });
  } catch (error) {
    console.error("Lỗi tạo banner:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi tạo banner" });
  }
};

// Cập nhật banner
export const updateBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      linkUrl,
      buttonText,
      type,
      position,
      order,
      backgroundColor,
      textColor,
      startDate,
      endDate,
      isActive
    } = req.body;
    
    // Tìm banner
    const banner = await bannerRepository.findOneBy({ id: parseInt(id) });
    if (!banner) {
      return res.status(404).json({ message: "Không tìm thấy banner" });
    }
    
    // Xử lý hình ảnh nếu có
    if (req.file) {
      // Tạo URL đầy đủ tới hình ảnh
      const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 8001}`;
      banner.imageUrl = `${baseUrl}/uploads/banners/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      banner.imageUrl = req.body.imageUrl;
    }
    
    // Cập nhật thông tin banner
    banner.title = title || banner.title;
    banner.description = description !== undefined ? description : banner.description;
    banner.linkUrl = linkUrl !== undefined ? linkUrl : banner.linkUrl;
    banner.buttonText = buttonText !== undefined ? buttonText : banner.buttonText;
    if (type) banner.type = type;
    if (position) banner.position = position;
    banner.order = order !== undefined ? parseInt(order) : banner.order;
    banner.backgroundColor = backgroundColor !== undefined ? backgroundColor : banner.backgroundColor;
    banner.textColor = textColor !== undefined ? textColor : banner.textColor;
    banner.startDate = startDate ? new Date(startDate) : banner.startDate;
    banner.endDate = endDate ? new Date(endDate) : banner.endDate;
    banner.isActive = isActive !== undefined ? isActive === 'true' || isActive === true : banner.isActive;
    
    // Lưu banner
    await bannerRepository.save(banner);
    
    return res.status(200).json({
      message: "Cập nhật banner thành công",
      data: banner
    });
  } catch (error) {
    console.error("Lỗi cập nhật banner:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật banner" });
  }
};

// Xóa banner (soft delete)
export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Tìm banner
    const banner = await bannerRepository.findOneBy({ id: parseInt(id) });
    if (!banner) {
      return res.status(404).json({ message: "Không tìm thấy banner" });
    }
    
    // Đánh dấu đã xóa
    banner.isDeleted = true;
    banner.isActive = false;
    await bannerRepository.save(banner);
    
    return res.status(200).json({ message: "Xóa banner thành công" });
  } catch (error) {
    console.error("Lỗi xóa banner:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa banner" });
  }
}; 