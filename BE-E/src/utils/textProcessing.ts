/**
 * Danh sách stopwords tiếng Việt - các từ thường xuất hiện nhưng không mang nhiều ý nghĩa
 */
const vietnameseStopwords = [
  'và', 'của', 'cho', 'là', 'với', 'các', 'có', 'được', 'trong', 'đã',
  'những', 'này', 'tôi', 'bạn', 'anh', 'chị', 'mình', 'ông', 'bà', 'nó',
  'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười',
  'thì', 'mà', 'nhưng', 'vì', 'nếu', 'như', 'để', 'từ', 'khi', 'cùng',
  'đến', 'về', 'ở', 'tại', 'bởi', 'đây', 'đó', 'kia', 'thế', 'quá',
  'rất', 'vậy', 'còn', 'đang', 'sẽ', 'vừa', 'mới', 'rồi', 'xin', 'hãy',
  'làm', 'đi', 'lên', 'xuống', 'ra', 'vào', 'không', 'có', 'thể', 'hay',
  'lại', 'nên', 'cần', 'phải', 'trên', 'dưới', 'giữa', 'sau', 'trước', 'ngoài',
  'chỉ', 'bên', 'ai', 'gì', 'sao', 'thế', 'vậy', 'đâu'
];

/**
 * Trích xuất từ khóa quan trọng từ một chuỗi văn bản tiếng Việt
 * @param text Chuỗi văn bản cần trích xuất từ khóa
 * @returns Mảng các từ khóa quan trọng
 */
export function extractKeywords(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Chuyển về chữ thường và loại bỏ dấu
  const normalizedText = text.toLowerCase();
  
  // Hợp nhất danh sách stop words
  const stopWords = [...vietnameseStopwords, ...VIETNAMESE_STOP_WORDS, ...ENGLISH_STOP_WORDS];
  
  // Xử lý nâng cao cho text dài (phân tích cụm từ)
  if (text.length > 50) {
    // Phân tích cụm từ cho văn bản dài
    // Chuyển về chữ thường và loại bỏ dấu câu
    const normalizedForPhrases = normalizedText
      .replace(/[,.!?;:()"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Phân tách thành các từ
    const words = normalizedForPhrases.split(' ');
    
    // Loại bỏ stopwords và các từ quá ngắn
    const filteredWords = words.filter(word => 
      word.length > 1 && !stopWords.includes(word)
    );
    
    // Tìm các cụm từ quan trọng (từ 2-3 từ liên tiếp)
    const phrases: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      if (!stopWords.includes(words[i]) && 
          !stopWords.includes(words[i+1])) {
        phrases.push(`${words[i]} ${words[i+1]}`);
      }
      
      if (i < words.length - 2 && 
          !stopWords.includes(words[i]) && 
          !stopWords.includes(words[i+2])) {
        phrases.push(`${words[i]} ${words[i+1]} ${words[i+2]}`);
      }
    }
    
    // Kết hợp từ đơn và cụm từ, loại bỏ trùng lặp
    return Array.from(new Set([...filteredWords, ...phrases]));
  }
  
  // Xử lý đơn giản cho các chuỗi tìm kiếm ngắn
  const words = normalizedText
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Loại bỏ ký tự đặc biệt, giữ lại chữ và số
    .split(/\s+/) // Tách theo khoảng trắng
    .filter(word => 
      word.length > 1 && // Từ phải có ít nhất 2 ký tự
      !stopWords.includes(word) // Không nằm trong danh sách từ dừng
    );
  
  // Loại bỏ từ trùng lặp
  return [...new Set(words)];
}

/**
 * Tính điểm tương đồng giữa hai chuỗi văn bản
 * @param text1 Chuỗi văn bản thứ nhất
 * @param text2 Chuỗi văn bản thứ hai
 * @returns Điểm tương đồng từ 0-1
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);
  
  let matchCount = 0;
  
  // Đếm số từ khóa trùng nhau
  for (const keyword1 of keywords1) {
    for (const keyword2 of keywords2) {
      if (keyword1.includes(keyword2) || keyword2.includes(keyword1)) {
        matchCount++;
        break;
      }
    }
  }
  
  // Tính điểm tương đồng
  const totalKeywords = Math.max(keywords1.length, keywords2.length);
  return totalKeywords > 0 ? matchCount / totalKeywords : 0;
}

/**
 * Phân tích cảm xúc đơn giản từ văn bản
 * @param text Chuỗi văn bản cần phân tích
 * @returns Đối tượng chứa điểm cảm xúc từ -1 (tiêu cực) đến 1 (tích cực)
 */
export function analyzeSentiment(text: string): { score: number; sentiment: 'positive' | 'neutral' | 'negative' } {
  // Danh sách từ tích cực
  const positiveWords = [
    'tốt', 'hay', 'đẹp', 'ngon', 'thích', 'yêu', 'tuyệt', 'xuất sắc',
    'hài lòng', 'hạnh phúc', 'vui', 'thú vị', 'nhanh', 'tiện lợi',
    'hợp lý', 'tuyệt vời', 'hoàn hảo', 'ưng ý', 'đỉnh', 'siêu',
    'cảm ơn', 'tuyệt với', 'sạch sẽ', 'dễ chịu', 'chất lượng', 'giảm giá'
  ];
  
  // Danh sách từ tiêu cực
  const negativeWords = [
    'tệ', 'kém', 'chán', 'thất vọng', 'khó chịu', 'đắt', 'chậm',
    'không hài lòng', 'không thích', 'không ngon', 'không đẹp',
    'tồi', 'sai', 'lỗi', 'bẩn', 'trễ', 'lừa đảo', 'tồi tệ',
    'bực', 'kém chất lượng', 'quá đắt', 'hư', 'hỏng', 'không đúng'
  ];
  
  const lowerText = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;
  
  // Đếm số từ tích cực và tiêu cực
  for (const word of positiveWords) {
    if (lowerText.includes(word)) {
      positiveScore++;
    }
  }
  
  for (const word of negativeWords) {
    if (lowerText.includes(word)) {
      negativeScore++;
    }
  }
  
  // Tính điểm cảm xúc tổng hợp
  const totalWords = extractKeywords(text).length;
  const score = totalWords > 0 
    ? (positiveScore - negativeScore) / Math.max(totalWords, Math.max(positiveScore, negativeScore))
    : 0;
  
  // Xác định cảm xúc dựa trên điểm
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (score > 0.2) sentiment = 'positive';
  else if (score < -0.2) sentiment = 'negative';
  
  return { score, sentiment };
}

/**
 * Các hàm tiện ích xử lý văn bản sử dụng trong hệ thống
 */

// Danh sách từ dừng tiếng Việt phổ biến
const VIETNAMESE_STOP_WORDS = [
  "và", "hoặc", "là", "có", "một", "những", "các", "để", "tôi", "muốn", "cần", "cho",
  "với", "trong", "của", "được", "không", "này", "khi", "đã", "sẽ", "từ", "nếu", "làm",
  "thì", "ra", "vào", "bạn", "mình", "đó", "thế", "còn", "lại", "đến", "lên", "xuống",
  "ở", "về", "vì", "sao", "như", "thế", "đấy", "vậy", "mà", "nên", "rất", "quá"
];

// Danh sách từ dừng tiếng Anh phổ biến 
const ENGLISH_STOP_WORDS = [
  "the", "and", "a", "an", "to", "for", "of", "with", "in", "on", "at", "by", "from",
  "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did",
  "but", "or", "as", "if", "then", "else", "when", "up", "down", "i", "you", "he", "she", 
  "it", "we", "they", "my", "your", "his", "her", "its", "our", "their", "this", "that"
];

/**
 * Tính độ tương tự giữa hai chuỗi dựa trên thuật toán Levenshtein
 * @param str1 Chuỗi thứ nhất
 * @param str2 Chuỗi thứ hai
 * @returns Độ tương tự từ 0 (khác hoàn toàn) đến 1 (giống hoàn toàn)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Khởi tạo ma trận khoảng cách
  const dp: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // Điền giá trị ban đầu
  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;
  
  // Tính toán khoảng cách Levenshtein
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // Xóa
        dp[i][j - 1] + 1,      // Chèn
        dp[i - 1][j - 1] + cost // Thay thế
      );
    }
  }
  
  // Tính độ tương tự
  const maxLen = Math.max(len1, len2);
  return 1 - dp[len1][len2] / maxLen;
}

/**
 * Phân loại từ khóa dựa trên ngữ cảnh
 * @param keywords Mảng các từ khóa cần phân loại
 * @returns Đối tượng chứa các từ khóa đã phân loại
 */
export function categorizeKeywords(keywords: string[]): { 
  products: string[], 
  categories: string[],
  features: string[],
  others: string[]
} {
  // Từ khóa liên quan đến sản phẩm thực phẩm
  const productRelatedTerms = [
    "pizza", "burger", "gà", "chicken", "phở", "bún", "cơm", "rice", "pasta", "noodle", 
    "salad", "sandwich", "sushi", "cá", "fish", "thịt", "meat", "beef", "pork", "bò", "heo",
    "trà", "tea", "coffee", "cà phê", "nước", "drink", "soda", "juice", "nước ép", "sinh tố"
  ];
  
  // Từ khóa liên quan đến danh mục
  const categoryRelatedTerms = [
    "món", "dish", "khai vị", "tráng miệng", "dessert", "appetizer", "đồ", "đồ ăn", "food",
    "thức ăn", "thức uống", "beverage", "combo", "set", "menu", "món chính", "main", "đặc biệt",
    "special", "mới", "new", "hot", "trending", "phổ biến", "popular"
  ];
  
  // Từ khóa liên quan đến tính năng/thuộc tính
  const featureRelatedTerms = [
    "ngon", "delicious", "rẻ", "cheap", "affordable", "đắt", "expensive", "cay", "spicy", 
    "ngọt", "sweet", "mặn", "salty", "nóng", "hot", "lạnh", "cold", "size", "lớn", "nhỏ", 
    "small", "large", "đặc biệt", "special", "healthy", "lành mạnh", "organic", "chay", "vegetarian"
  ];
  
  const result = {
    products: [],
    categories: [],
    features: [],
    others: []
  };
  
  // Phân loại từng từ khóa
  for (const kw of keywords) {
    if (productRelatedTerms.includes(kw) || productRelatedTerms.some(term => kw.includes(term))) {
      result.products.push(kw);
    } else if (categoryRelatedTerms.includes(kw) || categoryRelatedTerms.some(term => kw.includes(term))) {
      result.categories.push(kw);
    } else if (featureRelatedTerms.includes(kw) || featureRelatedTerms.some(term => kw.includes(term))) {
      result.features.push(kw);
    } else {
      result.others.push(kw);
    }
  }
  
  return result;
} 