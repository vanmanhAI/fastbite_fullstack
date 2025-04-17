import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { 
  ChatPromptTemplate, 
  HumanMessagePromptTemplate
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { AppDataSource } from "../data-source";
import dotenv from "dotenv";
dotenv.config();

// Định nghĩa kiểu dữ liệu cho ChatMessage
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// Định nghĩa kiểu dữ liệu cho ngữ cảnh hội thoại
export interface ConversationContext {
  recentProducts?: {
    id?: number;
    name?: string;
    price?: number;
    category?: string;
  }[];
  recentQueries?: string[];
  lastQueryType?: 'product_search' | 'price_query' | 'stock_query' | 'general';
}

// Lưu trữ ngữ cảnh cho các cuộc hội thoại
// Trong thực tế, nên lưu vào Redis hoặc database
const conversationContexts: Map<string, ConversationContext> = new Map();

// Map lưu trữ lịch sử chat theo phiên
const sessionHistory = new Map<string, Array<{role: string, content: string}>>();

// Khai báo biến môi trường
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/**
 * Phân tích câu hỏi của người dùng và cập nhật ngữ cảnh hội thoại
 * @param question Câu hỏi của người dùng
 * @param results Kết quả truy vấn
 * @param sessionId ID phiên người dùng
 * @param sqlQuery Câu truy vấn SQL đã thực thi
 */
function updateConversationContext(
  question: string, 
  results: any[], 
  sessionId: string = 'default',
  sqlQuery?: string
): ConversationContext {
  // Lấy ngữ cảnh hiện tại hoặc tạo mới
  let context = conversationContexts.get(sessionId) || {
    recentProducts: [],
    recentQueries: []
  };
  
  // Lưu trữ câu hỏi gần đây
  context.recentQueries = [
    question,
    ...(context.recentQueries || []).slice(0, 4)
  ];
  
  // Xác định loại truy vấn
  let queryType: 'product_search' | 'price_query' | 'stock_query' | 'general' = 'general';
  
  if (sqlQuery) {
    if (sqlQuery.toLowerCase().includes('stock')) {
      queryType = 'stock_query';
    } else if (sqlQuery.toLowerCase().includes('price')) {
      queryType = 'price_query';
    } else if (sqlQuery.toLowerCase().includes('product') || 
               sqlQuery.toLowerCase().includes('name') || 
               sqlQuery.toLowerCase().includes('description')) {
      queryType = 'product_search';
    }
  }
  
  context.lastQueryType = queryType;
  
  // Xử lý và cập nhật thông tin sản phẩm nếu kết quả truy vấn chứa sản phẩm
  if (results && results.length > 0) {
    const productResults = results.filter(item => item.name || item.id || item.price);
    
    if (productResults.length > 0) {
      // Xác định sản phẩm chính được đề cập trong câu hỏi
      const questionLower = question.toLowerCase();
      
      // Tìm sản phẩm được nhắc đến trực tiếp trong câu hỏi
      const matchedProducts = productResults.filter(product => 
        product.name && questionLower.includes(product.name.toLowerCase())
      );
      
      // Tạo danh sách sản phẩm mới với ưu tiên đúng
      let newRecentProducts: any[] = [];
      
      // Nếu có sản phẩm trùng khớp trực tiếp với câu hỏi, ưu tiên đưa lên đầu
      if (matchedProducts.length > 0) {
        console.log(`Ưu tiên sản phẩm được nhắc trực tiếp: ${matchedProducts.map(p => p.name).join(', ')}`);
        
        // Thêm sản phẩm khớp đầu tiên
        const prioritizedProducts = matchedProducts.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category
        }));
        
        // Thêm các sản phẩm khác không trùng khớp
        const otherProducts = productResults
          .filter(item => !matchedProducts.some(match => match.id === item.id))
          .map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category
          }));
        
        newRecentProducts = [...prioritizedProducts, ...otherProducts];
      } else {
        // Nếu không có sản phẩm trùng khớp, giữ nguyên thứ tự kết quả
        newRecentProducts = productResults.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category
        }));
      }
      
      // Cập nhật danh sách sản phẩm gần đây, giữ lại tối đa 5 sản phẩm
      context.recentProducts = [
        ...newRecentProducts,
        ...(context.recentProducts || []).filter(p => 
          !newRecentProducts.some(np => np.id === p.id) // Loại bỏ sản phẩm trùng lặp
        ).slice(0, 5 - newRecentProducts.length)
      ];
      
      console.log("Danh sách sản phẩm trong ngữ cảnh:", context.recentProducts.map(p => `${p.name} (ID: ${p.id})`).join(', '));
    }
  }
  
  // Lưu ngữ cảnh cập nhật
  conversationContexts.set(sessionId, context);
  return context;
}

// Hàm đơn giản thay thế việc truy vấn SQL trực tiếp
async function queryDatabase(query: string): Promise<any[]> {
  try {
    // Kiểm tra xem query có hợp lệ không
    if (!query || query.trim() === '') {
      throw new Error("Câu truy vấn SQL không được để trống");
    }

    console.log('Bắt đầu thực thi truy vấn SQL:', query);
    
    // Thực thi truy vấn
    const rows = await AppDataSource.query(query);
    console.log('Truy vấn thành công, số kết quả:', Array.isArray(rows) ? rows.length : 'không phải mảng');
    
    return rows as any[];
  } catch (error) {
    console.error("Lỗi chi tiết khi truy vấn database:", error);
    
    // Phân tích lỗi để đưa ra thông báo cụ thể hơn
    let errorMessage = "Không thể thực thi truy vấn SQL";
    
    if (error instanceof Error) {
      // Lỗi kết nối
      if (error.message.includes("ECONNREFUSED") || error.message.includes("connect") || error.message.includes("timeout")) {
        errorMessage = "Không thể kết nối đến máy chủ cơ sở dữ liệu. Vui lòng kiểm tra kết nối và thông tin đăng nhập.";
      } 
      // Lỗi xác thực
      else if (error.message.includes("Access denied") || error.message.includes("permission")) {
        errorMessage = "Không có quyền truy cập vào cơ sở dữ liệu. Vui lòng kiểm tra thông tin đăng nhập.";
      }
      // Lỗi cú pháp SQL
      else if (error.message.includes("syntax") || error.message.includes("SQL")) {
        errorMessage = "Câu truy vấn SQL không hợp lệ: " + error.message;
      }
      // Các lỗi khác
      else {
        errorMessage = `Lỗi cơ sở dữ liệu: ${error.message}`;
      }
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Khởi tạo LLM model
 */
export function initLLM() {
  if (!API_KEY) {
    throw new Error("API key không được cấu hình trong biến môi trường.");
  }

  return new ChatGoogleGenerativeAI({
    apiKey: API_KEY,
    model: MODEL_NAME,
    maxOutputTokens: 2048,
    temperature: 0.2,
  });
}

/**
 * Truy vấn sản phẩm động từ cơ sở dữ liệu dựa trên câu hỏi của người dùng
 * @param question Câu hỏi của người dùng
 */
export async function queryProductsFromDatabase(question: string, sessionId: string = 'default', chatHistory: ChatMessage[] = []) {
  try {
    // Lấy ngữ cảnh hiện tại
    const context = conversationContexts.get(sessionId) || {
      recentProducts: [],
      recentQueries: []
    };
    
    // Khởi tạo LLM
    const llm = initLLM();
    
    // Đưa thông tin ngữ cảnh đầy đủ vào prompt
    const contextInfo = `Ngữ cảnh hội thoại:
    ${context.recentProducts && context.recentProducts.length > 0 
      ? `- Sản phẩm gần đây: ${context.recentProducts.map(p => `${p.name} (id: ${p.id}, giá: ${p.price})`).join(', ')}` 
      : '- Chưa có sản phẩm được nhắc đến gần đây'}
    - Câu hỏi trước đó: ${context.recentQueries?.slice(1).join(', ') || 'không có'}
    - Loại truy vấn trước đó: ${context.lastQueryType || 'không có'}`;
    
    // Tạo chat prompt để biến câu hỏi thành câu truy vấn SQL
    const sqlGenerationPrompt = ChatPromptTemplate.fromMessages([
      HumanMessagePromptTemplate.fromTemplate(
        `Bạn là assistant AI giúp tạo các truy vấn SQL từ câu hỏi tiếng Việt. 
        
        ${contextInfo}
        
        Thông tin về cấu trúc cơ sở dữ liệu FastBite:
        
        1. Sản phẩm và Danh mục:
        - products: id, name, description, price, image_url, category, stock, is_active, is_featured, preparation_time, calories, is_vegetarian, tags, meta_title, meta_description, created_at, updated_at
        - categories: id, name, description, image_url, slug, parent_id, created_at, updated_at
        - product_categories: product_id, category_id
        
        2. Đơn hàng và Thanh toán:
        - orders: id, user_id, address_id, subtotal, shipping_fee, discount, total_amount, status, payment_status, payment_method, coupon_code, delivery_address, notes, created_at, updated_at
        - order_items: id, order_id, product_id, quantity, price
        - payments: id, order_id, method, status, amount, transaction_id, payment_intent_id, stripe_session_id, notes, created_at, updated_at
        
        3. Người dùng và Địa chỉ:
        - users: id, name, email, password, phone, role, is_active, created_at, updated_at
        - addresses: id, user_id, full_name, phone, province, district, ward, street_address, is_default, created_at, updated_at
        
        4. Khuyến mãi và Coupon:
        - promotions: id, name, description, discount_type, discount_value, start_date, end_date, is_active, created_at, updated_at
        - coupons: id, code, promotion_id, usage_limit, usage_count, created_at
        
        5. Đánh giá và Chat:
        - reviews: id, product_id, user_id, order_id, rating, comment, created_at
        - chat_logs: id, user_id, message, response, intent, created_at
        
        6. Quản lý kho:
        - inventory_transactions: id, product_id, quantity, type, reference_id, reference_type, notes, created_at
        
        Các trạng thái đơn hàng: pending, processing, shipping, delivered, completed, cancelled
        Các trạng thái thanh toán: pending, completed, failed, refunded
        Các phương thức thanh toán: cod, stripe, momo, vnpay
        Các loại giao dịch kho: in, out, adjustment
        
        Hướng dẫn tạo truy vấn SQL:
        1. Sử dụng mệnh đề JOIN khi cần lấy dữ liệu từ nhiều bảng liên quan
        2. Sử dụng GROUP BY và các hàm tổng hợp (COUNT, SUM, AVG) khi cần thống kê
        3. Sử dụng LIMIT 10 khi truy vấn danh sách để tránh trả về quá nhiều kết quả
        4. Đối với tìm kiếm, sử dụng LIKE %từ_khóa% hoặc FULLTEXT SEARCH nếu có thể
        5. Luôn đặt tên cho các cột được tính toán (VD: COUNT(*) AS total_orders)
        6. Đối với sắp xếp, mặc định sử dụng ORDER BY created_at DESC để hiển thị dữ liệu mới nhất
        7. Khi so sánh text, luôn dùng LOWER() để tránh phân biệt chữ hoa/thường
        8. Cho sản phẩm, chỉ hiển thị sản phẩm có is_active = 1
        9. Sử dụng date_format(created_at, '%d/%m/%Y') khi hiển thị ngày tháng
        10. Nếu câu hỏi có các từ như "món đó", "sản phẩm đó", "nó", "món này", hãy hiểu đó là đang tham chiếu đến sản phẩm trong ngữ cảnh hội thoại
        
        Ví dụ về các câu hỏi thông thường:
        
        1. "Hiển thị tất cả sản phẩm có giá dưới 50,000 đồng"
        SELECT id, name, price, description, image_url
        FROM products
        WHERE price < 50000 AND is_active = 1
        ORDER BY price ASC
        LIMIT 10;
        
        2. "Tìm những sản phẩm có chứa từ 'gà'"
        SELECT id, name, price, description, image_url
        FROM products
        WHERE LOWER(name) LIKE '%gà%' AND is_active = 1
        ORDER BY created_at DESC
        LIMIT 10;
        
        3. "Đơn hàng gần đây nhất của tôi là gì?"
        SELECT o.id, o.total_amount, o.status, date_format(o.created_at, '%d/%m/%Y') as order_date,
        oi.product_id, oi.quantity, oi.price,
        p.name as product_name
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.user_id = 1
        ORDER BY o.created_at DESC
        LIMIT 1;
        
        4. "Pizza Hà Nội còn bao nhiêu"
        SELECT stock
        FROM products
        WHERE LOWER(name) LIKE '%pizza hà nội%' AND is_active = 1;
        
        5. "Món đó giá bao nhiêu" (sau khi đã hỏi về "Pizza Hà Nội")
        SELECT id, name, price
        FROM products
        WHERE id = 42 AND is_active = 1;
        
        Dựa vào câu hỏi sau của người dùng và ngữ cảnh hội thoại, hãy tạo một câu truy vấn SQL CHÍNH XÁC:
        
        ${question}
        
        Hãy tạo câu truy vấn SQL đơn giản và chắc chắn sẽ chạy được, không chứa phần giải thích hoặc biến placeholder như [product_id].`
      ),
    ]);

    // Chuyển câu hỏi thành SQL query
    const chain = sqlGenerationPrompt.pipe(llm).pipe(new StringOutputParser());
    const sqlQuery = await chain.invoke({ question });
    
    // Xử lý để đảm bảo là câu truy vấn SQL hợp lệ
    const cleanedQuery = sqlQuery
      .replace(/```sql/g, '')
      .replace(/```/g, '')
      .replace(/--.*$/gm, '') // Xóa các comment
      .replace(/\[.*?\]/g, '1') // Thay thế các placeholder [xxx] bằng giá trị mặc định 1
      .trim();
    
    console.log("SQL query được tạo:", cleanedQuery);
    
    try {
      // Thực thi truy vấn
      const results = await queryDatabase(cleanedQuery);
      
      // Cập nhật ngữ cảnh hội thoại với kết quả mới
      updateConversationContext(question, results, sessionId, cleanedQuery);
      
      // Chuyển đổi kết quả thành JSON string để AI xử lý
      const resultsJson = JSON.stringify(results, null, 2);
      
      // Tạo nội dung cho AI để trả lời
      const promptText = `Bạn là trợ lý AI của cửa hàng FastBite, một ứng dụng đặt đồ ăn. 
      
Câu hỏi của người dùng: "${question}"

Truy vấn SQL đã thực thi: ${cleanedQuery}

Kết quả truy vấn (JSON):
\`\`\`json
${resultsJson}
\`\`\`

Số kết quả tìm thấy: ${results.length}

${contextInfo}

NHIỆM VỤ CỦA BẠN:
Hãy phân tích câu hỏi, truy vấn SQL, kết quả truy vấn và ngữ cảnh hội thoại, sau đó tạo một câu trả lời phù hợp.

Dựa vào loại truy vấn và dữ liệu nhận được, hãy định dạng câu trả lời một cách thông minh:

1. Nếu là truy vấn về số lượng (stock):
   - Tập trung vào số lượng sản phẩm còn lại
   - Ví dụ: "Hiện tại cửa hàng còn 42 hamburger"

2. Nếu là truy vấn về giá:
   - Định dạng giá với đơn vị VNĐ và dấu phẩy phân tách hàng nghìn
   - Ví dụ: "Giá của hamburger là 65,000 VNĐ"

3. Nếu là tìm kiếm sản phẩm:
   - Liệt kê các sản phẩm với tên, giá, mô tả và các thông tin quan trọng
   - Nếu có nhiều sản phẩm, hãy sắp xếp theo giá hoặc độ phổ biến

4. Nếu là thống kê:
   - Cung cấp thông tin tổng hợp một cách rõ ràng
   - Ví dụ: "Có 5 món nước, 10 món ăn, giá từ 25,000 VNĐ đến 120,000 VNĐ"

5. Nếu là câu hỏi tiếp theo về "món đó" hoặc sản phẩm trước đó:
   - Hãy tự xác định sản phẩm nào được đề cập dựa vào ngữ cảnh hội thoại
   - Ví dụ: "Pizza Hà Nội có giá là 120,000 VNĐ"

HƯỚNG DẪN THÊM:
- Trả lời bằng tiếng Việt, thân thiện và súc tích
- Chỉ sử dụng thông tin có trong kết quả truy vấn, không tự tạo thêm
- Nếu không có kết quả, hãy thông báo rõ ràng và đề xuất hành động khác
- TUYỆT ĐỐI KHÔNG sử dụng các biến mẫu như {products_list} trong câu trả lời
- Tập trung trả lời câu hỏi của người dùng một cách trực tiếp, không lan man
- Cung cấp chi tiết bổ sung nếu có thể giúp trải nghiệm người dùng tốt hơn`;

      // Sử dụng LLM để tạo câu trả lời dựa trên dữ liệu
      const response = await llm.invoke([
        {
          role: "user",
          content: promptText
        }
      ]);
      
      // Chuyển đổi MessageContent sang string
      return typeof response.content === 'string' 
        ? response.content 
        : Array.isArray(response.content)
          ? response.content.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join(" ")
          : JSON.stringify(response.content);
    } catch (dbError) {
      console.error("Lỗi khi thực thi SQL:", dbError);
      
      // Nếu lỗi SQL, thử xử lý câu hỏi trực tiếp
      const directPrompt = ChatPromptTemplate.fromMessages([
        HumanMessagePromptTemplate.fromTemplate(
          `Bạn là trợ lý ảo FastBite, giúp người dùng đặt đồ ăn, trả lời câu hỏi về menu, khuyến mãi và dịch vụ.
          
          Người dùng hỏi: ${question}
          
          Lỗi khi truy vấn cơ sở dữ liệu: ${dbError instanceof Error ? dbError.message : 'Không xác định'}
          
          Hãy trả lời người dùng mà không cần truy cập cơ sở dữ liệu:
          1. Giải thích rằng hệ thống đang gặp khó khăn khi truy vấn thông tin
          2. Đưa ra câu trả lời chung nhất có thể phù hợp với câu hỏi
          3. Hướng dẫn người dùng cách khác để tìm thông tin (menu trực tuyến, hotline 1900 1234)
          4. Gợi ý người dùng thử lại sau khoảng 5-10 phút
          5. Trả lời bằng tiếng Việt, thân thiện và hữu ích
          
          TUYỆT ĐỐI KHÔNG tạo ra thông tin sản phẩm, giá cả, hoặc chi tiết khuyến mãi cụ thể mà bạn không biết chắc chắn.`
        ),
      ]);
      
      const directChain = directPrompt.pipe(llm).pipe(new StringOutputParser());
      return await directChain.invoke({ 
        question,
        error: dbError instanceof Error ? dbError.message : 'Không xác định'
      });
    }
  } catch (error) {
    console.error("Lỗi khi truy vấn sản phẩm:", error);
    
    // Tạo thông báo lỗi thân thiện cho người dùng
    const errorMessage = error instanceof Error ? error.message : 'Không xác định';
    
    return `Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. 

Có vẻ như hệ thống đang gặp một số trục trặc kỹ thuật. Vui lòng thử lại sau vài phút hoặc liên hệ nhân viên hỗ trợ của FastBite qua số hotline 1900 1234 để được trợ giúp.

Bạn cũng có thể truy cập website của chúng tôi tại fastbite.vn để xem menu và thông tin khuyến mãi mới nhất.`;
  }
}

/**
 * Tạo SQL query từ câu hỏi tự nhiên và thực thi nó sử dụng Gemini
 * @param question Câu hỏi của người dùng
 */
export async function generateAndExecuteQuery(question: string): Promise<any> {
  try {
    // Khởi tạo Gemini LLM
    const llm = initLLM();
    
    // Tạo prompt để sinh câu truy vấn SQL
    const sqlGenerationPrompt = ChatPromptTemplate.fromMessages([
      HumanMessagePromptTemplate.fromTemplate(
        `Bạn là trợ lý SQL. Hãy phân tích câu hỏi và tạo ra một truy vấn SQL phù hợp. 
        Chỉ trả về truy vấn SQL, không có gì khác. Không bao gồm markdown, giải thích, hoặc bất kỳ văn bản nào khác.
        
        Cấu trúc cơ sở dữ liệu:
        
        1. Sản phẩm và Danh mục:
        - products: id, name, description, price, image_url, category, stock, is_active, is_featured
        - categories: id, name, description, image_url, slug, parent_id
        - product_categories: product_id, category_id
        
        2. Đơn hàng và Thanh toán:
        - orders: id, user_id, address_id, subtotal, shipping_fee, discount, total_amount, status, payment_status
        - order_items: id, order_id, product_id, quantity, price
        
        Dựa vào câu hỏi sau, hãy tạo truy vấn SQL:
        
        ${question}`
      ),
    ]);
    
    // Chuyển câu hỏi thành SQL query
    const chain = sqlGenerationPrompt.pipe(llm).pipe(new StringOutputParser());
    const sqlQuery = await chain.invoke({ question });
    
    // Xử lý để đảm bảo là câu truy vấn SQL hợp lệ
    const cleanedQuery = sqlQuery
      .replace(/```sql/g, '')
      .replace(/```/g, '')
      .replace(/--.*$/gm, '') // Xóa các comment
      .trim();
    
    // Trả về truy vấn SQL đã tạo để thực thi ở controller
    return cleanedQuery;
  } catch (error) {
    console.error('Lỗi khi tạo truy vấn SQL:', error);
    throw new Error('Đã xảy ra lỗi khi tạo truy vấn SQL.');
  }
}

/**
 * Tạo embedding vector từ văn bản sử dụng Gemini
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    // Sử dụng LLM của Google để tạo biểu diễn văn bản
    const llm = initLLM();
    
    // Tạo một prompt để yêu cầu mô hình sinh ra vector nhúng
    // Lưu ý: Đây là cách giải quyết tạm thời vì Gemini API chưa hỗ trợ trực tiếp việc tạo embeddings
    const embeddingPrompt = ChatPromptTemplate.fromMessages([
      HumanMessagePromptTemplate.fromTemplate(
        `Hãy biểu diễn văn bản sau dưới dạng danh sách 20 số thực từ -1 đến 1, cách nhau bởi dấu phẩy. 
        Không giải thích gì, chỉ trả về danh sách số.
        Văn bản cần biểu diễn: ${text}`
      ),
    ]);
    
    const chain = embeddingPrompt.pipe(llm).pipe(new StringOutputParser());
    const embeddingText = await chain.invoke({});
    
    // Xử lý kết quả để lấy ra mảng số
    const cleanedText = embeddingText.replace(/^\[|\]$/g, '').trim();
    const embedding = cleanedText.split(',').map(num => parseFloat(num.trim()));
    
    // Đảm bảo vector có đủ kích thước
    while (embedding.length < 20) {
      embedding.push(0);
    }
    
    return embedding;
  } catch (error) {
    console.error('Lỗi khi tạo embedding với Gemini:', error);
    
    // Trả về vector rỗng trong trường hợp lỗi
    return Array(20).fill(0);
  }
}

/**
 * Tìm kiếm các tài liệu liên quan từ database
 */
export async function searchSimilarDocuments(query: string, limit: number = 5): Promise<any[]> {
  try {
    console.log("Tìm kiếm sản phẩm với từ khóa:", query);
    
    // Tách từ khóa tìm kiếm
    const keywords = query.toLowerCase().split(/\s+/)
      .filter(word => word.length > 2); // Chỉ lấy từ có độ dài > 2
    
    if (keywords.length === 0) {
      return [];
    }
    
    // Tạo câu truy vấn SQL
    const searchConditions = keywords.map(word => 
      `LOWER(name) LIKE '%${word}%' OR LOWER(description) LIKE '%${word}%'`
    ).join(' OR ');
    
    const sql = `
      SELECT id, name, description, price, image_url, category, stock 
      FROM products 
      WHERE is_active = 1 AND (${searchConditions})
      LIMIT ${limit}
    `;
    
    console.log("SQL tìm kiếm sản phẩm:", sql);
    
    // Thực hiện truy vấn
    const products = await AppDataSource.query(sql);
    console.log("Kết quả tìm kiếm sản phẩm:", products.length > 0 ? products : "Không tìm thấy");
    
    // Chuyển đổi kết quả sang định dạng tài liệu
    const documents = products.map(product => ({
      content: `Sản phẩm: ${product.name}
Mô tả: ${product.description || 'Không có mô tả'}
Giá: ${Number(product.price).toLocaleString('vi-VN')} VNĐ
Còn lại: ${product.stock || 'Đang cập nhật'} sản phẩm`,
      metadata: { 
        id: product.id,
        category: product.category || 'food',
        type: 'product'
      },
      score: 1.0
    }));
    
    // Nếu không tìm thấy sản phẩm nào, thử tìm danh mục
    if (documents.length === 0) {
      const categoryConditions = keywords.map(word => 
        `LOWER(name) LIKE '%${word}%' OR LOWER(description) LIKE '%${word}%'`
      ).join(' OR ');
      
      const categorySql = `
        SELECT id, name, description, slug
        FROM categories
        WHERE ${categoryConditions}
        LIMIT ${limit}
      `;
      
      try {
        const categories = await AppDataSource.query(categorySql);
        
        if (categories && categories.length > 0) {
          const categoryDocuments = categories.map(category => ({
            content: `Danh mục: ${category.name}
Mô tả: ${category.description || 'Không có mô tả'}`,
            metadata: { 
              id: category.id,
              slug: category.slug,
              type: 'category'
            },
            score: 0.8
          }));
          
          return categoryDocuments;
        }
      } catch (err) {
        console.error("Lỗi khi tìm kiếm danh mục:", err);
      }
      
      // Nếu vẫn không tìm thấy, trả về một số thông tin chung
      return [
        {
          content: `FastBite là một chuỗi nhà hàng fast food với các món ăn ngon miệng gồm burger, pizza, gà rán và các món ăn nhanh khác. 
Bạn có thể tìm thấy hamburger, pizza, gà rán, khoai tây chiên trong menu của chúng tôi.`,
          metadata: { category: 'general', type: 'info' },
          score: 0.5
        }
      ];
    }
    
    return documents;
  } catch (error) {
    console.error('Lỗi khi tìm kiếm tài liệu:', error);
    return [
      {
        content: `FastBite có các món ăn nhanh, gồm burger, pizza, gà rán và đồ ăn nhẹ khác. 
Hiện tại hệ thống đang gặp trục trặc nhỏ nên không thể hiển thị thông tin chi tiết.`,
        metadata: { category: 'general', type: 'fallback' },
        score: 0.1
      }
    ];
  }
}

/**
 * Xử lý tin nhắn sử dụng Gemini với dữ liệu thực và hỗ trợ định dạng phong phú
 */
export async function processMessageWithRAG(userMessage: string, sessionId: string = 'default'): Promise<string> {
  try {
    // Lấy lịch sử chat hiện tại của phiên làm việc này
    if (!sessionHistory.has(sessionId)) {
      sessionHistory.set(sessionId, []);
    }
    
    const currentHistory = sessionHistory.get(sessionId) || [];
    
    // Tìm kiếm các tài liệu liên quan
    const relevantDocs = await searchSimilarDocuments(userMessage);
    
    // Khởi tạo biến assistantResponse trước khi sử dụng
    let assistantResponse = "";
    
    // Thử thực hiện truy vấn SQL động
    let sqlResults = [];
    let products = [];
    try {
      // Hãy thử xem nếu tin nhắn người dùng đang hỏi về sản phẩm cụ thể
      if (userMessage.toLowerCase().includes('giá') || 
          userMessage.toLowerCase().includes('bao nhiêu') ||
          userMessage.toLowerCase().includes('còn') ||
          userMessage.toLowerCase().includes('món') ||
          userMessage.toLowerCase().includes('thức ăn') ||
          userMessage.toLowerCase().includes('đồ ăn') ||
          userMessage.toLowerCase().includes('ảnh') ||
          userMessage.toLowerCase().includes('hình') ||
          userMessage.toLowerCase().includes('tất cả') ||
          userMessage.toLowerCase().includes('danh sách')) {
          
        // Kiểm tra xem có đang hỏi về ảnh của sản phẩm đã tham chiếu trước đó không
        if ((userMessage.toLowerCase().includes('ảnh') || userMessage.toLowerCase().includes('hình')) &&
            (userMessage.toLowerCase().includes('nó') || 
             userMessage.toLowerCase().includes('món đó') || 
             userMessage.toLowerCase().includes('sản phẩm đó'))) {
          
          // Lấy ngữ cảnh hội thoại hiện tại
          const conversationContext = conversationContexts.get(sessionId);
          
          if (conversationContext && 
              conversationContext.recentProducts && 
              conversationContext.recentProducts.length > 0) {
            
            const referencedProductId = conversationContext.recentProducts[0].id;
            console.log("Phát hiện yêu cầu ảnh của sản phẩm đã tham chiếu:", 
                       conversationContext.recentProducts[0].name, "ID:", referencedProductId);
            
            try {
              // Lấy thông tin chi tiết của sản phẩm được tham chiếu
              const referencedProductSql = `
                SELECT id, name, description, price, image_url, stock, category 
                FROM products 
                WHERE id = ${referencedProductId} AND is_active = 1
                LIMIT 1
              `;
              
              const referencedProducts = await AppDataSource.query(referencedProductSql);
              if (referencedProducts && referencedProducts.length > 0) {
                products = referencedProducts;
                console.log("Đã tìm thấy sản phẩm được tham chiếu:", products[0].name);
                
                // Tạo câu trả lời về hình ảnh của sản phẩm được tham chiếu
                assistantResponse = `Đây là hình ảnh của ${products[0].name} mà bạn yêu cầu:`;
                
                // Tạo JSON metadata chứa thông tin sản phẩm
                const productData = JSON.stringify({
                  type: "product_carousel",
                  products: products.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    image: p.image_url || "/placeholder.svg",
                    stock: p.stock,
                    category: p.category
                  }))
                });
                
                // Thêm tag JSON metadata vào cuối tin nhắn
                assistantResponse += `\n\n[[METADATA]]${productData}[[/METADATA]]`;
                
                // Cập nhật lịch sử chat và trả về kết quả
                currentHistory.push({ role: 'user', content: userMessage });
                currentHistory.push({ role: 'assistant', content: assistantResponse });
                sessionHistory.set(sessionId, currentHistory);
                
                return assistantResponse;
              }
            } catch (error) {
              console.error("Lỗi khi tìm sản phẩm tham chiếu:", error);
            }
          }
        }
        
        // Kiểm tra nếu người dùng đang hỏi về tất cả các món ăn
        if (userMessage.toLowerCase().includes('tất cả') || 
            userMessage.toLowerCase().includes('danh sách') || 
            userMessage.toLowerCase().includes('các món') || 
            userMessage.toLowerCase().includes('menu')) {
          
          try {
            // Lấy tất cả sản phẩm đang hoạt động
            const allProductsSql = `
              SELECT id, name, description, price, image_url, stock, category 
              FROM products 
              WHERE is_active = 1
              LIMIT 10
            `;
            
            products = await AppDataSource.query(allProductsSql);
            console.log(`Tìm thấy ${products.length} sản phẩm từ yêu cầu xem tất cả:`, products.map(p => p.name));
            
            if (products && products.length > 0) {
              // Thêm thông báo vào trả lời
              assistantResponse = `Đây là danh sách ${products.length} món hiện có tại FastBite:`;
              
              // Tạo JSON metadata chứa thông tin sản phẩm
              const productData = JSON.stringify({
                type: "product_carousel",
                products: products.map(p => ({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  price: p.price,
                  image: p.image_url || "/placeholder.svg",
                  stock: p.stock,
                  category: p.category
                }))
              });
              
              // Thêm tag JSON metadata vào cuối tin nhắn
              assistantResponse += `\n\n[[METADATA]]${productData}[[/METADATA]]`;
              
              // Cập nhật lịch sử chat và trả về kết quả
              currentHistory.push({ role: 'user', content: userMessage });
              currentHistory.push({ role: 'assistant', content: assistantResponse });
              sessionHistory.set(sessionId, currentHistory);
              
              return assistantResponse;
            }
          } catch (error) {
            console.error("Lỗi khi lấy tất cả sản phẩm:", error);
          }
        }
        
        // Tách từ khóa tìm kiếm từ câu hỏi
        const keywords = userMessage.toLowerCase()
          .replace(/[.,?!]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 2 && 
                         !['giá', 'bao', 'nhiêu', 'còn', 'lại', 'ăn', 'uống', 'đồ', 'món', 'có', 'không', 'ảnh', 'hình', 'tất', 'cả', 'danh', 'sách'].includes(word));
        
        // Nếu có từ khóa, tìm kiếm sản phẩm
        if (keywords.length > 0) {
          const searchConditions = keywords.map(word => 
            `LOWER(name) LIKE '%${word}%' OR LOWER(description) LIKE '%${word}%'`
          ).join(' OR ');
          
          const sql = `
            SELECT id, name, description, price, image_url, stock, category
            FROM products 
            WHERE is_active = 1 AND (${searchConditions})
            LIMIT 5
          `;
          
          const results = await AppDataSource.query(sql);
          if (results && results.length > 0) {
            sqlResults = results;
            products = results;
          } else {
            // Nếu không tìm thấy, lấy các sản phẩm nổi bật
            const featuredSql = `
              SELECT id, name, description, price, image_url, stock, category 
              FROM products 
              WHERE is_active = 1 AND is_featured = 1
              LIMIT 3
            `;
            products = await AppDataSource.query(featuredSql);
          }
        } else {
          // Nếu không có từ khóa cụ thể, lấy các sản phẩm mới nhất
          const recentSql = `
            SELECT id, name, description, price, image_url, stock, category 
            FROM products 
            WHERE is_active = 1
            ORDER BY id DESC
            LIMIT 3
          `;
          products = await AppDataSource.query(recentSql);
        }
      }
    } catch (dbError) {
      console.error("Lỗi khi thực hiện truy vấn database bổ sung:", dbError);
    }
    
    // Tạo context từ các tài liệu tìm thấy
    let context = '';
    if (relevantDocs.length > 0) {
      context = 'Thông tin từ cơ sở dữ liệu:\n\n' + 
        relevantDocs.map((doc, index) => 
          `Tài liệu ${index + 1}:\n${doc.content}`
        ).join('\n\n');
    }
    
    // Nếu có kết quả SQL, thêm vào context
    if (sqlResults && sqlResults.length > 0) {
      context += '\n\nSản phẩm từ database:\n' + 
        sqlResults.map((product, index) => 
          `Sản phẩm ${index + 1}: ${product.name}, Giá: ${Number(product.price).toLocaleString('vi-VN')} VNĐ, Còn lại: ${product.stock || 'Đang cập nhật'}`
        ).join('\n');
    }
    
    // Lấy lịch sử chat để thêm vào prompt
    const chatHistoryText = currentHistory.length > 0 
      ? currentHistory.slice(-4).map(msg => {
          // Loại bỏ metadata từ nội dung tin nhắn của trợ lý trước khi đưa vào lịch sử
          let content = msg.content;
          if (msg.role === 'assistant' && content.includes('[[METADATA]]')) {
            content = content.split('[[METADATA]]')[0].trim();
          }
          return `${msg.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${content}`;
        }).join('\n')
      : '';
    
    // Khởi tạo Gemini LLM
    const llm = initLLM();
    
    // Tạo prompt với ngữ cảnh và lịch sử
    const ragPrompt = ChatPromptTemplate.fromMessages([
      HumanMessagePromptTemplate.fromTemplate(
        `Bạn là trợ lý AI của cửa hàng FastBite, một ứng dụng đặt đồ ăn.
        
${context ? context : 'Không có thông tin cụ thể về câu hỏi này trong cơ sở dữ liệu.'}

${chatHistoryText ? 'Lịch sử hội thoại gần đây:\\n' + chatHistoryText : 'Đây là đầu cuộc hội thoại.'}

Câu hỏi hiện tại của người dùng: "${userMessage}"

HƯỚNG DẪN:
1. Nếu có thông tin sản phẩm từ database, hãy ưu tiên sử dụng thông tin này khi trả lời
2. Nếu không có thông tin cụ thể, hãy thừa nhận và đề xuất người dùng liên hệ tổng đài 1900 1234
3. KHÔNG được bịa ra thông tin hoặc giá cả của các sản phẩm nếu không có trong database
4. Trả lời một cách thân thiện, ngắn gọn và hữu ích bằng tiếng Việt
5. Nếu trong context có nói rằng có hamburger, pizza, thì đó là danh sách sản phẩm thực tế của cửa hàng
6. KHÔNG TẠO MARKDOWN hoặc HTML TRONG TIN NHẮN - hệ thống sẽ tự xử lý định dạng`
      ),
    ]);
    
    // Tạo câu trả lời
    const chain = ragPrompt.pipe(llm).pipe(new StringOutputParser());
    assistantResponse = await chain.invoke({});
    
    // Thêm metadata nếu có sản phẩm được tìm thấy
    if (products && products.length > 0) {
      // Tạo JSON metadata chứa thông tin sản phẩm và chuyển đổi thành chuỗi Base64
      const productData = JSON.stringify({
        type: "product_carousel",
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image_url || "/placeholder.svg",
          stock: p.stock,
          category: p.category
        }))
      });
      
      // Xử lý cho trường hợp hỏi về ảnh
      if (userMessage.toLowerCase().includes('ảnh') || userMessage.toLowerCase().includes('hình')) {
        assistantResponse = `Đây là hình ảnh của ${products.length > 1 ? 'các sản phẩm' : `sản phẩm ${products[0].name}`} mà bạn yêu cầu:`;
      }
      
      // Thêm tag JSON metadata vào cuối tin nhắn
      assistantResponse += `\n\n[[METADATA]]${productData}[[/METADATA]]`;
    } else if (userMessage.toLowerCase().includes('đặt') || 
               userMessage.toLowerCase().includes('mua') || 
               userMessage.toLowerCase().includes('thanh toán')) {
      // Nếu câu hỏi liên quan đến đặt hàng, thêm thẻ chuyển hướng
      const actionData = JSON.stringify({
        type: "action",
        action: "redirect",
        url: "/checkout"
      });
      
      assistantResponse += `\n\n[[METADATA]]${actionData}[[/METADATA]]`;
    }
    
    // Cập nhật lịch sử chat với tin nhắn mới
    currentHistory.push({ role: 'user', content: userMessage });
    currentHistory.push({ role: 'assistant', content: assistantResponse });
    
    // Giới hạn lịch sử chat để tránh quá dài
    const maxHistory = parseInt(process.env.CHATBOT_MAX_HISTORY || '20');
    if (currentHistory.length > maxHistory) {
      currentHistory.splice(0, 2); // Loại bỏ tin nhắn cũ nhất (user + assistant)
    }
    
    // Lưu lại lịch sử chat đã cập nhật
    sessionHistory.set(sessionId, currentHistory);
    
    return assistantResponse;
  } catch (error) {
    console.error('Lỗi khi xử lý tin nhắn:', error);
    return 'Xin lỗi, đã xảy ra lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại sau hoặc liên hệ tổng đài 1900 1234 để được hỗ trợ.';
  }
}

export default {
  initLLM,
  queryProductsFromDatabase,
  generateAndExecuteQuery,
  processMessageWithRAG
}; 