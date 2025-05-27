import axios from 'axios';
import { AppDataSource } from '../config/database';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import dotenv from 'dotenv';
import { geminiProModel } from '../config/gemini';

dotenv.config();

// Định nghĩa cấu trúc kết quả phân tích 
export interface QueryAnalysisResult {
  originalQuery: string;
  extractedKeywords: string[];
  exactProductMatch: boolean;
  isDirectProductRequest: boolean;
  primaryProductIntent: string;
  suggestedProducts?: any[];
  confidence: number;
  possibleCategories: string[];
  filters: {
    priceRange?: { min?: number; max?: number };
    dietaryPreferences?: string[];
    mealType?: string;
    flavor?: string[];
  };
}

export class QueryUnderstandingService {
  private productRepository = AppDataSource.getRepository(Product);
  private categoryRepository = AppDataSource.getRepository(Category);
  
  /**
   * Phân tích yêu cầu của người dùng sử dụng model AI
   * Đây là hàm chính để phân tích ngữ cảnh yêu cầu
   */
  async analyzeQuery(query: string): Promise<QueryAnalysisResult> {
    try {
      // Sử dụng Gemini để phân tích
      return await this.analyzeWithAI(query);
    } catch (error) {
      console.error("Lỗi khi phân tích yêu cầu:", error);
      // Fallback về phương pháp phân tích đơn giản
      return await this.analyzeWithRules(query);
    }
  }
  
  /**
   * Sử dụng model Gemini để phân tích yêu cầu
   * Phương pháp này sẽ gửi yêu cầu đến Gemini
   */
  private async analyzeWithAI(query: string): Promise<QueryAnalysisResult> {
    try {
      // Tạo prompt để gửi tới Gemini
      const prompt = `Phân tích yêu cầu sau đây của khách hàng về đồ ăn/thức uống:
      "${query}"
      
      Cần xác định:
      1. Khách hàng có đang yêu cầu một món cụ thể không?
      2. Nếu có, món đó là gì?
      3. Các từ khóa chính trong yêu cầu
      4. Có yêu cầu về giá cả không?
      5. Có yêu cầu về khẩu vị không?
      
      Trả về kết quả dưới dạng JSON với cấu trúc:
      {
        "isSpecificProduct": boolean,
        "isDirectRequest": boolean,
        "specificProduct": "tên món nếu có",
        "keywords": ["từ khóa1", "từ khóa2"],
        "categories": ["danh mục1", "danh mục2"],
        "priceRange": {"min": số, "max": số},
        "dietaryPreferences": ["preference1", "preference2"],
        "mealType": "loại bữa ăn nếu có",
        "flavors": ["vị1", "vị2"],
        "confidence": số từ 0-1
      }`;
      
      // Gọi Gemini API
      const result = await geminiProModel.generateContent(prompt);
      const response = await result.response;
      const textResult = response.text();
      
      // Cố gắng parse JSON từ phản hồi
      try {
        // Tìm và trích xuất JSON từ phản hồi
        const jsonMatch = textResult.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : null;
        
        if (!jsonString) {
          console.error("Không tìm thấy JSON trong phản hồi từ Gemini:", textResult);
          return await this.analyzeWithRules(query);
        }
        
        const aiResult = JSON.parse(jsonString);
        
        // Map kết quả từ AI về cấu trúc QueryAnalysisResult
        return {
          originalQuery: query, // Câu hỏi gốc
          extractedKeywords: aiResult.keywords || [], // Từ khóa chính
          exactProductMatch: aiResult.isSpecificProduct || false, // Có phải là yêu cầu về món ăn cụ thể
          isDirectProductRequest: aiResult.isDirectRequest || false, // Yêu cầu trực tiếp về món ăn
          primaryProductIntent: aiResult.specificProduct || '', // Tên món ăn cụ thể
          confidence: aiResult.confidence || 0.7, // Độ tin cậy của kết quả
          possibleCategories: aiResult.categories || [], // Danh mục có thể
          filters: {
            priceRange: aiResult.priceRange, // Phạm vi giá cả
            dietaryPreferences: aiResult.dietaryPreferences, // Khẩu vị
            mealType: aiResult.mealType, // Loại bữa ăn
            flavor: aiResult.flavors // Vị
          }
        };
      } catch (error) {
        console.error("Lỗi khi phân tích kết quả từ Gemini:", error);
        console.log("Phản hồi từ Gemini:", textResult);
        // Fallback về phương pháp phân tích đơn giản
        return await this.analyzeWithRules(query);
      }
    } catch (error) {
      console.error("Lỗi khi gọi Gemini API:", error);
      // Fallback về phương pháp phân tích đơn giản
      return await this.analyzeWithRules(query);
    }
  }
  
  /**
   * Phân tích yêu cầu dựa trên quy tắc nội bộ
   * Được sử dụng khi không có AI hoặc AI gặp lỗi
   */
  private async analyzeWithRules(query: string): Promise<QueryAnalysisResult> {
    const lowerQuery = query.toLowerCase().trim();
    
    // Danh sách từ khóa chỉ định món ăn cụ thể
    const directRequestPhrases = [
      'tôi muốn', 'tôi thích', 'cho tôi', 'có món', 'làm ơn cho',
      'tôi đang tìm', 'tôi cần', 'tôi đang muốn', 'tôi đang thèm',
      'muốn ăn', 'muốn uống', 'muốn đặt', 'muốn mua', 'muốn gọi'
    ];
    
    // Danh sách các từ khóa về đặc điểm món ăn
    const flavorKeywords = ['cay', 'ngọt', 'mặn', 'chua', 'đắng', 'béo', 'giòn', 'mềm'];
    const priceKeywords = ['rẻ', 'đắt', 'giá cả', 'giá', 'tiền'];
    
    // Phát hiện xem có phải là yêu cầu trực tiếp không
    const isDirectRequest = directRequestPhrases.some(phrase => lowerQuery.includes(phrase));
    
    // Tìm danh sách sản phẩm từ database để so sánh
    const allProducts = await this.productRepository.find();
    const allCategories = await this.categoryRepository.find();
    
    // Tìm sản phẩm khớp với yêu cầu
    const exactMatches = allProducts.filter(product => 
      lowerQuery.includes(product.name.toLowerCase())
    );
    
    // Tìm danh mục khớp với yêu cầu
    const categoryMatches = allCategories.filter(category => 
      lowerQuery.includes(category.name.toLowerCase())
    );
    
    // Trích xuất từ khóa từ câu hỏi
    const extractedKeywords = this.extractKeywords(lowerQuery);
    
    // Phát hiện yêu cầu về giá cả
    const priceRange: { min?: number; max?: number } = {};
    if (lowerQuery.includes('rẻ') || lowerQuery.includes('giá thấp')) {
      priceRange.max = 50000; // Giả sử 50k VND là ngưỡng giá rẻ
    } else if (lowerQuery.includes('đắt') || lowerQuery.includes('cao cấp')) {
      priceRange.min = 100000; // Giả sử 100k VND là ngưỡng giá cao
    }
    
    // Phát hiện yêu cầu về khẩu vị
    const flavors = flavorKeywords.filter(flavor => lowerQuery.includes(flavor));
    
    // Kết quả phân tích
    return {
      originalQuery: query,
      extractedKeywords,
      exactProductMatch: exactMatches.length > 0,
      isDirectProductRequest: isDirectRequest,
      primaryProductIntent: exactMatches.length > 0 ? exactMatches[0].name : '',
      confidence: exactMatches.length > 0 ? 0.9 : (isDirectRequest ? 0.7 : 0.5),
      possibleCategories: categoryMatches.map(cat => cat.name),
      filters: {
        priceRange: Object.keys(priceRange).length > 0 ? priceRange : undefined,
        flavor: flavors.length > 0 ? flavors : undefined
      }
    };
  }
  
  /**
   * Trích xuất từ khóa từ yêu cầu
   */
  private extractKeywords(text: string): string[] {
    // Danh sách stop words tiếng Việt
    const stopWords = [
      'và', 'hoặc', 'là', 'có', 'một', 'những', 'các', 'để', 'tôi', 'cho', 
      'với', 'được', 'trong', 'của', 'rất', 'thì', 'mà', 'không', 'nào',
      'này', 'có thể', 'bạn', 'tại', 'sau', 'khi', 'từ', 'như', 'là', 'vì'
    ];
    
    // Tách từ và loại bỏ stop words
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.includes(word));
  }
  
  /**
   * Tìm kiếm sản phẩm dựa trên kết quả phân tích
   */
  async findProductsFromAnalysis(analysis: QueryAnalysisResult, limit: number = 5): Promise<Product[]> {
    try {
      // Tạo query builder cơ bản
      let queryBuilder = this.productRepository.createQueryBuilder('product')
        .leftJoinAndSelect('product.categories', 'category')
        .where('product.isActive = :isActive', { isActive: true });
      
      // Nếu có yêu cầu trực tiếp về một sản phẩm cụ thể
      if (analysis.exactProductMatch && analysis.primaryProductIntent) {
        queryBuilder = queryBuilder.andWhere(
          'LOWER(product.name) LIKE :productName',
          { productName: `%${analysis.primaryProductIntent.toLowerCase()}%` }
        );
      } 
      // Nếu không có yêu cầu cụ thể, tìm kiếm theo từ khóa
      else if (analysis.extractedKeywords.length > 0) {
        const keywordConditions = analysis.extractedKeywords.map((keyword, index) => {
          return `(LOWER(product.name) LIKE :keyword${index} OR LOWER(product.description) LIKE :keyword${index} OR LOWER(product.tags) LIKE :keyword${index})`;
        }).join(' OR ');
        
        const params: any = {};
        analysis.extractedKeywords.forEach((keyword, index) => {
          params[`keyword${index}`] = `%${keyword}%`;
        });
        
        queryBuilder = queryBuilder.andWhere(`(${keywordConditions})`, params);
      }
      
      // Thêm điều kiện lọc theo danh mục
      if (analysis.possibleCategories && analysis.possibleCategories.length > 0) {
        queryBuilder = queryBuilder.andWhere(
          'LOWER(category.name) IN (:...categories)',
          { categories: analysis.possibleCategories.map(c => c.toLowerCase()) }
        );
      }
      
      // Thêm điều kiện lọc theo giá (nếu có)
      if (analysis.filters.priceRange) {
        if (analysis.filters.priceRange.min !== undefined) {
          queryBuilder = queryBuilder.andWhere('product.price >= :minPrice', { minPrice: analysis.filters.priceRange.min });
        }
        if (analysis.filters.priceRange.max !== undefined) {
          queryBuilder = queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice: analysis.filters.priceRange.max });
        }
      }
      
      // Sắp xếp kết quả: ưu tiên sản phẩm có rating cao và khớp với tên trực tiếp
      queryBuilder = queryBuilder
        .orderBy('product.rating', 'DESC')
        .addOrderBy('product.numReviews', 'DESC');
      
      // Lấy kết quả với giới hạn số lượng
      const products = await queryBuilder.take(limit).getMany();
      
      return products;
    } catch (error) {
      console.error("Lỗi khi tìm sản phẩm từ kết quả phân tích:", error);
      // Trả về mảng rỗng trong trường hợp lỗi
      return [];
    }
  }
} 