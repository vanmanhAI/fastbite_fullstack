import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Tạo interface cho dữ liệu người dùng
interface UserData {
  id: number;
  email: string;
  name: string;
  role: string;
}

// Cung cấp một cách tạm thời để xử lý mà không cần các module chưa cài đặt
// Trong dự án thực tế, bạn nên cài đặt các thư viện và sử dụng đúng cách
async function getUserFromToken(token: string): Promise<UserData | null> {
  try {
    // Giả lập giải mã token
    return {
      id: 1,
      email: 'user@example.com',
      name: 'Test User',
      role: 'user'
    };
  } catch (error) {
    console.error('Lỗi khi giải mã token:', error);
    return null;
  }
}

// Tạo cache cho user behavior
const behaviorCache = new Map();

// Interface cho user behavior
interface UserBehavior {
  viewedProducts: number[];
  purchasedProducts: number[];
  searchQueries: string[];
  ratings: { productId: number; rating: number }[];
  // Bổ sung thêm dữ liệu về hành vi
  favoriteCategories: string[]; // Danh mục yêu thích được suy ra từ hành vi
  dietaryPreferences: string[]; // Ưu tiên ăn uống được suy ra từ hành vi
  tastePreferences: string[]; // Sở thích khẩu vị được suy ra từ hành vi 
}

// Interface cho Product
interface Product {
  id: number;
  name: string;
  category: string;
  tags: string[];
  isVegetarian: boolean;
  spiceLevel: string;
  price: number;
  imageUrl: string;
  description: string;
}

// Interface cho Intent
interface UserIntent {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
}

// Interface cho recommendation
interface ProductRecommendation extends Product {
  confidence: number;
  reasoning: string;
}

// Sample product database - có thể thay thế bằng dữ liệu từ DB thật
const products: Product[] = [
  {
    id: 1,
    name: "Classic Cheeseburger",
    category: "burger",
    tags: ["beef", "popular"],
    isVegetarian: false,
    spiceLevel: "mild",
    price: 8.99,
    imageUrl: "/images/products/cheeseburger.jpg",
    description: "Burger bò truyền thống với phô mai, rau xà lách và cà chua.",
  },
  {
    id: 2,
    name: "Spicy Chicken Burger",
    category: "burger",
    tags: ["chicken", "spicy"],
    isVegetarian: false,
    spiceLevel: "hot",
    price: 7.99,
    imageUrl: "/images/products/spicy-chicken-burger.jpg",
    description: "Burger gà cay với sốt đặc biệt và các loại rau tươi.",
  },
  {
    id: 3,
    name: "Vegetarian Pizza",
    category: "pizza",
    tags: ["vegetarian"],
    isVegetarian: true,
    spiceLevel: "mild",
    price: 12.99,
    imageUrl: "/images/products/vegetarian-pizza.jpg",
    description: "Pizza chay với nhiều loại rau củ tươi ngon và phô mai.",
  },
  {
    id: 4,
    name: "Phở Bò",
    category: "vietnamese",
    tags: ["beef", "soup", "traditional"],
    isVegetarian: false,
    spiceLevel: "medium",
    price: 9.99,
    imageUrl: "/images/products/pho-bo.jpg",
    description: "Phở bò truyền thống với nước dùng thơm ngon và thịt bò mềm.",
  },
  {
    id: 5,
    name: "Gỏi Cuốn",
    category: "vietnamese",
    tags: ["fresh", "shrimp", "healthy"],
    isVegetarian: false,
    spiceLevel: "none",
    price: 6.49,
    imageUrl: "/images/products/goi-cuon.jpg",
    description: "Gỏi cuốn tôm thịt với rau sống và bún, chấm với nước mắm.",
  },
]

// Lấy hành vi người dùng từ token
async function getUserBehavior(token: string | null): Promise<UserBehavior | null> {
  if (!token) return null;
  
  try {
    // Kiểm tra cache
    if (behaviorCache.has(token)) {
      return behaviorCache.get(token);
    }
    
    const userData = await getUserFromToken(token);
    if (!userData || !userData.id) return null;
    
    // Tìm hành vi người dùng trong DB
    // Đây là giả lập
    /*
    const userBehaviors = await prisma.userBehavior.findMany({
      where: {
        userId: userData.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });
    */
    
    // Giả lập dữ liệu hành vi
    const behavior: UserBehavior = {
      viewedProducts: [1, 2, 4],
      purchasedProducts: [1],
      searchQueries: ["burger ngon", "món ăn nhanh", "pizza"],
      ratings: [{ productId: 1, rating: 5 }],
      favoriteCategories: ["burger", "pizza"],
      dietaryPreferences: [], // Không có dữ liệu, để trống
      tastePreferences: ["savory", "spicy"] // Dựa trên hành vi xem và mua hàng
    };
    
    // Lưu vào cache
    behaviorCache.set(token, behavior);
    
    return behavior;
  } catch (error) {
    console.error("Error getting user behavior:", error);
    return null;
  }
}

// Phân tích ý định người dùng từ tin nhắn
async function analyzeUserIntent(message: string, token: string | null): Promise<UserIntent> {
  try {
    // Simple intent classification
    const msg = message.toLowerCase();
    let intent = "general";
    let confidence = 0.7;
    const entities: Record<string, any> = {};
    
    // Recommend intent
    if (
      msg.includes("gợi ý") ||
      msg.includes("đề xuất") ||
      msg.includes("món ăn") ||
      msg.includes("món ngon") ||
      msg.includes("muốn ăn") ||
      msg.includes("món gì")
    ) {
      intent = "recommendation";
      confidence = 0.85;
      
      // Extract keywords
      const keywords = msg
        .replace(/gợi ý|đề xuất|món ăn|món ngon|muốn ăn|món gì|có|không|và|hoặc|với|cho|tôi/g, '')
        .trim()
        .split(' ')
        .filter(k => k.length > 2);
      
      if (keywords.length > 0) {
        entities.keywords = keywords;
      }
      
      // Check for meal time
      if (msg.includes("sáng") || msg.includes("breakfast")) {
        entities.timeOfDay = "breakfast";
      } else if (msg.includes("trưa") || msg.includes("lunch")) {
        entities.timeOfDay = "lunch";
      } else if (msg.includes("tối") || msg.includes("dinner")) {
        entities.timeOfDay = "dinner";
      }
      
      // Check for taste preferences
      if (msg.includes("cay") || msg.includes("spicy")) {
        entities.taste = "spicy";
      } else if (msg.includes("ngọt") || msg.includes("sweet")) {
        entities.taste = "sweet";
      }
    }
    // Product search intent
    else if (
      msg.includes("tìm") ||
      msg.includes("kiếm") ||
      msg.includes("search") ||
      msg.includes("có bán") ||
      msg.includes("bán không")
    ) {
      intent = "product_search";
      confidence = 0.8;
      
      // Extract search keywords
      const keywords = msg
        .replace(/tìm|kiếm|search|có bán|bán không|có|không|và|hoặc|với|cho|tôi/g, '')
        .trim()
        .split(' ')
        .filter(k => k.length > 2);
      
      if (keywords.length > 0) {
        entities.keywords = keywords;
      }
    }
    // Order status intent
    else if (
      msg.includes("đơn hàng") ||
      msg.includes("trạng thái") ||
      msg.includes("theo dõi") ||
      msg.includes("order")
    ) {
      intent = "order_status";
      confidence = 0.9;
    }
    
    return { intent, confidence, entities };
  } catch (error) {
    console.error("Error analyzing intent:", error);
    return { intent: "general", confidence: 0.5, entities: {} };
  }
}

// Generate personalized recommendations based on user behavior
async function generatePersonalizedRecommendations(
  query: string,
  userBehavior: UserBehavior | null,
  intentData: UserIntent
): Promise<ProductRecommendation[]> {
  // Nếu không có hành vi người dùng, trả về đề xuất phổ biến
  if (!userBehavior) {
    return products
      .slice(0, 3)
      .map(p => ({
        ...p, 
        confidence: 0.7,
        reasoning: "Đây là món ăn phổ biến"
      }));
  }
  
  // Sử dụng hành vi người dùng để đề xuất sản phẩm
  const recommendations: ProductRecommendation[] = [];
  
  // Đề xuất dựa trên sản phẩm đã xem gần đây
  if (userBehavior.viewedProducts.length > 0) {
    const viewedProducts = products.filter(p => userBehavior.viewedProducts.includes(p.id));
    viewedProducts.forEach(p => {
      recommendations.push({
        ...p,
        confidence: 0.8,
        reasoning: "Bạn đã xem sản phẩm này gần đây"
      });
    });
  }
  
  // Đề xuất dựa trên danh mục yêu thích
  if (userBehavior.favoriteCategories.length > 0) {
    const categoryProducts = products
      .filter(p => userBehavior.favoriteCategories.includes(p.category))
      .filter(p => !recommendations.some(r => r.id === p.id)); // Loại bỏ trùng lặp
      
    categoryProducts.forEach(p => {
      recommendations.push({
        ...p,
        confidence: 0.75,
        reasoning: "Thuộc danh mục bạn quan tâm"
      });
    });
  }
  
  // Đề xuất dựa trên khẩu vị
  if (userBehavior.tastePreferences.length > 0) {
    const tasteProducts = products
      .filter(p => p.tags.some(t => userBehavior.tastePreferences.includes(t)))
      .filter(p => !recommendations.some(r => r.id === p.id)); // Loại bỏ trùng lặp
      
    tasteProducts.forEach(p => {
      recommendations.push({
        ...p,
        confidence: 0.7,
        reasoning: "Phù hợp với khẩu vị của bạn"
      });
    });
  }
  
  // Nếu vẫn chưa đủ đề xuất, thêm sản phẩm phổ biến
  if (recommendations.length < 3) {
    const popularProducts = products
      .filter(p => !recommendations.some(r => r.id === p.id))
      .slice(0, 3 - recommendations.length);
      
    popularProducts.forEach(p => {
      recommendations.push({
        ...p,
        confidence: 0.6,
        reasoning: "Đây là món ăn phổ biến"
      });
    });
  }
  
  // Lọc đề xuất theo từ khóa nếu có
  if (intentData.entities.keywords && intentData.entities.keywords.length > 0) {
    const keywords = intentData.entities.keywords;
    const filteredRecommendations = recommendations.filter(p => {
      return keywords.some((keyword: string) => 
        p.name.toLowerCase().includes(keyword) || 
        p.description.toLowerCase().includes(keyword) ||
        p.tags.some(t => t.includes(keyword))
      );
    });
    
    // Nếu có kết quả sau khi lọc, sử dụng chúng
    if (filteredRecommendations.length > 0) {
      return filteredRecommendations;
    }
  }
  
  return recommendations.slice(0, 5); // Giới hạn số lượng đề xuất
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()

    // Lấy token từ request header
    const token = req.cookies.get('token')?.value || null
    
    // Lấy dữ liệu hành vi người dùng từ token
    const userBehavior = await getUserBehavior(token)
    
    // Phân tích ý định người dùng
    const userIntent = await analyzeUserIntent(message, token)
    console.log('User intent:', userIntent);

    let response = ""
    let metadata = null

    // Xử lý theo ý định người dùng
    if (userIntent.intent === "recommendation") {
      // Tạo đề xuất dựa trên hành vi người dùng
      const recommendations = await generatePersonalizedRecommendations(
        message,
        userBehavior,
        userIntent
      )

      if (recommendations.length > 0) {
        // Format recommendations for display
        const formattedRecommendations = recommendations.map(rec => ({
          id: rec.id,
          name: rec.name,
          price: rec.price,
          imageUrl: rec.imageUrl || '/images/placeholder.jpg',
          description: rec.description,
          reasoning: rec.reasoning
        }))

        response = userBehavior 
          ? "Dựa trên lịch sử hành vi của bạn, đây là một số món ăn có thể bạn sẽ thích:" 
          : "Đây là một số món ăn phổ biến tại nhà hàng chúng tôi:";

        metadata = {
          type: "product_carousel",
          products: formattedRecommendations
        }
      } else {
        response = await generateAIResponse(message, userIntent)
      }
    } else if (userIntent.intent === "product_search") {
      // Tìm sản phẩm dựa trên từ khóa
      if (userIntent.entities.keywords && userIntent.entities.keywords.length > 0) {
        const keywords = userIntent.entities.keywords;
        const matchingProducts = products.filter(p => {
          return keywords.some((keyword: string) => 
            p.name.toLowerCase().includes(keyword) || 
            p.description.toLowerCase().includes(keyword) ||
            p.tags.some(t => t.includes(keyword))
          );
        });

        if (matchingProducts.length > 0) {
          const formattedProducts = matchingProducts.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            imageUrl: p.imageUrl || '/images/placeholder.jpg',
            description: p.description
          }));

          response = `Tôi đã tìm thấy ${matchingProducts.length} sản phẩm phù hợp với yêu cầu của bạn:`;
          metadata = {
            type: "product_carousel",
            products: formattedProducts
          }
        } else {
          response = "Rất tiếc, tôi không tìm thấy sản phẩm nào phù hợp với yêu cầu của bạn.";
        }
      } else {
        response = await generateAIResponse(message, userIntent);
      }
    } else {
      // Xử lý các ý định khác bằng cách gọi AI
      response = await generateAIResponse(message, userIntent)
    }

    return NextResponse.json({ content: response, metadata })
  } catch (error: any) {
    console.error('Error processing chat request:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xử lý yêu cầu' },
      { status: 500 }
    )
  }
}

async function generateAIResponse(message: string, userIntent: UserIntent): Promise<string> {
  try {
    // Tạo prompt phù hợp
    const systemPrompt = `Bạn là trợ lý ảo của nhà hàng FastBite, chuyên về món ăn nhanh với đặc sản là burger, pizza và món Việt. Bạn cần:
1. Trả lời lịch sự, ngắn gọn (1-3 câu)
2. Nếu họ hỏi về món ăn, gợi ý một vài món có trong menu và giá tiền
3. Nếu họ hỏi về thông tin nhà hàng, giờ mở cửa là 7:00-22:00 tất cả các ngày
4. Đối với câu hỏi về công thức nấu ăn, hãy đưa ra hướng dẫn ngắn gọn
5. Đối với đơn hàng, hướng dẫn họ đến trang web hoặc cài đặt ứng dụng

Ý định người dùng hiện tại: ${userIntent.intent} (độ tin cậy: ${userIntent.confidence})`;

    const result = await generateText({
      model: openai('gpt-3.5-turbo'),
      system: systemPrompt,
      prompt: message
    });

    return result.toString();
  } catch (error) {
    console.error('Error generating AI response:', error);
    return "Xin lỗi, tôi đang gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.";
  }
}

