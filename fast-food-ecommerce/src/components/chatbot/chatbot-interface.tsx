"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { 
  Send, 
  User, 
  Bot, 
  Loader2, 
  RefreshCw, 
  X, 
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Image,
  Settings
} from "lucide-react"
import RecommendationCarousel from "./recommendation-carousel"
import chatbotService, { ChatMessage, MessageMetadata } from "@/services/chatbotService"
import dbConnectTest from "@/services/dbConnectTest"
import { useRouter } from 'next/navigation'
import { toast } from "@/components/ui/use-toast"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { motion, AnimatePresence } from "framer-motion"
import { CHATBOT_CONFIG } from "@/lib/api-config"
import recommendationService from "@/services/recommendationService"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
  metadata?: MessageMetadata
}

interface Recommendation {
  id: number
  name: string
  image: string
  imageUrl?: string
  price: number
  description?: string
  stock?: number
  category?: string
  confidence?: number
  reasoning?: string
  matchScore?: number
}

interface ChatbotInterfaceProps {
  onClose: () => void
}

export default function ChatbotInterface({ onClose }: ChatbotInterfaceProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(() => {
    // Khôi phục tin nhắn từ localStorage nếu có
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('chatbot_messages')
      if (savedMessages) {
        try {
          // Phân tích chuỗi JSON thành mảng tin nhắn
          const parsedMessages = JSON.parse(savedMessages)
          // Chuyển đổi các chuỗi timestamp thành đối tượng Date
          return parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        } catch (error) {
          console.error('Lỗi khi khôi phục lịch sử chat:', error)
        }
      }
    }
    
    // Nếu không có dữ liệu lưu trữ hoặc có lỗi, sử dụng tin nhắn mặc định
    return [
      {
        id: "1",
        text: "Xin chào! Tôi là trợ lý ảo của FastBite. Tôi có thể giúp bạn tìm món ăn, đặt hàng hoặc trả lời câu hỏi về nhà hàng. Tôi có thể làm gì cho bạn hôm nay?",
        sender: "bot",
        timestamp: new Date(),
      },
    ]
  })
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>(() => {
    // Khôi phục danh sách gợi ý từ localStorage nếu có
    if (typeof window !== 'undefined') {
      const savedRecommendations = localStorage.getItem('chatbot_recommendations')
      if (savedRecommendations) {
        try {
          return JSON.parse(savedRecommendations)
        } catch (error) {
          console.error('Lỗi khi khôi phục danh sách gợi ý:', error)
        }
      }
    }
    return []
  })
  const [showRecommendations, setShowRecommendations] = useState<boolean>(() => {
    // Khôi phục trạng thái từ localStorage nếu có, mặc định là true
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('chatbot_show_recommendations')
      return savedState === null ? true : savedState === 'true'
    }
    return true
  })
  const [lastViewedProducts, setLastViewedProducts] = useState<Recommendation[]>(() => {
    // Khôi phục danh sách sản phẩm đã xem từ localStorage nếu có
    if (typeof window !== 'undefined') {
      const savedProducts = localStorage.getItem('chatbot_last_viewed')
      if (savedProducts) {
        try {
          return JSON.parse(savedProducts)
        } catch (error) {
          console.error('Lỗi khi khôi phục danh sách sản phẩm đã xem:', error)
        }
      }
    }
    return []
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    // Khôi phục lịch sử chat từ localStorage nếu có
    if (typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem('chatbot_history')
      if (savedHistory) {
        try {
          return JSON.parse(savedHistory)
        } catch (error) {
          console.error('Lỗi khi khôi phục lịch sử chat API:', error)
        }
      }
    }
    return []
  })
  const aiEnabled = process.env.NEXT_PUBLIC_AI_ENABLED === "true"
  const maxHistoryLength = parseInt(process.env.NEXT_PUBLIC_MAX_CHAT_HISTORY || "10")
  const inputRef = useRef<HTMLInputElement>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  const [chatPosition, setChatPosition] = useState<'top' | 'center'>('center')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Lưu tin nhắn vào localStorage mỗi khi messages thay đổi
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('chatbot_messages', JSON.stringify(messages))
    }
  }, [messages])

  // Lưu danh sách gợi ý vào localStorage mỗi khi recommendations thay đổi
  useEffect(() => {
    if (typeof window !== 'undefined' && recommendations.length > 0) {
      localStorage.setItem('chatbot_recommendations', JSON.stringify(recommendations))
    }
  }, [recommendations])
  
  // Lưu danh sách sản phẩm đã xem vào localStorage mỗi khi lastViewedProducts thay đổi
  useEffect(() => {
    if (typeof window !== 'undefined' && lastViewedProducts.length > 0) {
      localStorage.setItem('chatbot_last_viewed', JSON.stringify(lastViewedProducts))
    }
  }, [lastViewedProducts])

  useEffect(() => {
    const formattedHistory = messages.map(msg => ({
      role: msg.sender === "user" ? "user" as const : "model" as const,
      content: msg.text
    }));

    const limitedHistory = formattedHistory.slice(-maxHistoryLength);
    
    setChatHistory(limitedHistory);
    
    // Lưu lịch sử chat vào localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatbot_history', JSON.stringify(limitedHistory))
    }
    
    console.log("Chat history updated:", limitedHistory);
  }, [messages, maxHistoryLength]);

  useEffect(() => {
    checkConnection();
    
    // Kiểm tra đăng nhập
    const token = localStorage.getItem(CHATBOT_CONFIG.tokenStorageKey);
    setIsLoggedIn(!!token);
    
    if (token) {
      console.log(`[DEBUG] Người dùng đã đăng nhập, token: ${token.substring(0, 15)}...`);
    } else {
      console.log(`[DEBUG] Không tìm thấy token đăng nhập: ${CHATBOT_CONFIG.tokenStorageKey}`);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const extractKeywords = (userInput: string): string => {
    return userInput.toLowerCase()
      .replace(/gợi ý|đề xuất|món gì|món nào|muốn ăn|recomm|tìm|kiếm|có|không|cho|tôi|xem|thử|thêm|bạn|ơi|nhé/g, '')
      .trim()
  }

  const detectIntent = async (userInput: string): Promise<'recommendation' | 'product_query' | 'order_status' | 'general'> => {
    try {
      // Sử dụng API để phân tích ý định
      const { intent } = await chatbotService.analyzeUserIntent(userInput);
      return intent;
    } catch (error) {
      console.error('Lỗi khi phân tích ý định, sử dụng phương pháp dự phòng:', error);
      // Phương pháp dự phòng khi API lỗi
      const text = userInput.toLowerCase();
      
      if (text.includes("gợi ý") || 
          text.includes("đề xuất") || 
          text.includes("món gì") || 
          text.includes("món nào") || 
          text.includes("recommend") || 
          text.includes("recomm") || 
          (text.includes("muốn") && text.includes("ăn"))) {
        return 'recommendation';
      }
      
      if (text.includes("sản phẩm") || 
          text.includes("món") || 
          text.includes("đồ ăn") || 
          text.includes("thức ăn") || 
          text.includes("thức uống") || 
          text.includes("đồ uống") || 
          text.includes("nước")) {
        return 'product_query';
      }
      
      if (text.includes("đơn hàng") || 
          text.includes("trạng thái") || 
          text.includes("theo dõi")) {
        return 'order_status';
      }
      
      return 'general';
    }
  };

  const checkConnection = async () => {
    try {
      setIsCheckingConnection(true)
      const connected = await chatbotService.checkChatbotConnection()
      setIsConnected(connected)
      
      if (connected) {
        setMessages([
          {
            id: Date.now().toString(),
            text: 'Xin chào! Tôi là trợ lý ảo của nhà hàng. Tôi có thể giúp bạn tìm kiếm món ăn, đặt hàng hoặc trả lời các câu hỏi về nhà hàng. Tôi có thể làm gì cho bạn hôm nay?',
            sender: "bot",
            timestamp: new Date(),
          },
        ])
      } else {
        setMessages([
          {
            id: Date.now().toString(),
            text: 'Không thể kết nối đến dịch vụ chatbot. Vui lòng thử lại sau.',
            sender: "bot",
            timestamp: new Date(),
          },
        ])
      }
    } catch (error) {
      console.error('Lỗi kiểm tra kết nối:', error)
      setIsConnected(false)
    } finally {
      setIsCheckingConnection(false)
    }
  }

  const handleMessageMetadata = (metadata: MessageMetadata) => {
    if (!metadata) return
    
    if (metadata.type === 'product_carousel') {
      const products = metadata.products
      
      if (products && products.length > 0) {
        console.log("Đã nhận được sản phẩm:", products.length, products)
        setRecommendations(products)
        setShowRecommendations(true)
        
        setLastViewedProducts(products)
        
        setTimeout(() => {
          scrollToBottom()
        }, 50)
      } else {
        console.warn("Không có sản phẩm nào được tìm thấy trong metadata")
      }
    } 
    else if (metadata.type === 'action' && metadata.action === 'checkout') {
      toast({
        title: 'Đang chuyển hướng đến trang thanh toán',
        description: 'Bạn sẽ được chuyển đến trang thanh toán trong giây lát',
        duration: 3000,
      })
      
      setTimeout(() => {
        router.push(metadata.url || '/checkout')
      }, 1000)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    try {
      const token = localStorage.getItem(CHATBOT_CONFIG.tokenStorageKey);
      const loggedIn = !!token;
      if (loggedIn !== isLoggedIn) {
        setIsLoggedIn(loggedIn);
        console.log(`[DEBUG] Cập nhật trạng thái đăng nhập: ${loggedIn ? 'Đã đăng nhập' : 'Chưa đăng nhập'}`);
      }
      
      if (!loggedIn) {
        console.log('[DEBUG] Gửi tin nhắn khi chưa đăng nhập, đề xuất cá nhân hóa có thể không hoạt động');
        if (input.toLowerCase().includes('gợi ý') || input.toLowerCase().includes('đề xuất') || 
            input.toLowerCase().includes('món ngon') || input.toLowerCase().includes('món gì')) {
          setMessages(prev => [
            ...prev, 
            {
              id: Date.now().toString(),
              text: 'Lưu ý: Hãy đăng nhập để nhận đề xuất món ăn cá nhân hóa tốt hơn.',
              sender: 'bot',
              timestamp: new Date()
            }
          ]);
        }
      }

      const userMessageId = Date.now().toString()
      
      const userMessage: Message = {
        id: userMessageId,
        text: input,
        sender: "user",
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, userMessage])
      setInput("")
      setLoading(true)

      const intent = await detectIntent(input);
      
      if (intent === 'recommendation') {
        const { text, metadata: responseMetadata } = await handleRecommendationIntent(input);
        
        if (responseMetadata && responseMetadata.type === 'product_carousel') {
          handleMessageMetadata(responseMetadata as MessageMetadata);
          
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        const botMessageId = Date.now().toString();
        const botMessage: Message = {
          id: botMessageId,
          text: text,
          sender: "bot",
          timestamp: new Date(),
          metadata: responseMetadata as MessageMetadata
        }
        
        setMessages(prev => [...prev, botMessage]);
        setChatHistory([...chatHistory, { role: "model" as const, content: text }]);
        setLoading(false);
        
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        
        return;
      }

      // Tạo mảng lịch sử chat mới, bổ sung tin nhắn hiện tại
      const updatedHistory: ChatMessage[] = [
        ...chatHistory,
        { role: "user" as const, content: input }
      ];

      const processingId = `processing-${Date.now()}`;
      const processingMessage: Message = {
        id: processingId,
        text: "Đang xử lý câu hỏi của bạn...",
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, processingMessage])
      
      const { content, metadata } = await chatbotService.sendMessage(input, updatedHistory);
      
      // Xóa tin nhắn "đang xử lý"
      setMessages(prev => prev.filter(msg => msg.id !== processingId));
      
      // Nếu có metadata, xử lý nó trước để đảm bảo gợi ý sản phẩm hiển thị trước tin nhắn
      if (metadata) {
        handleMessageMetadata(metadata);
        
        // Thêm thời gian chờ dài hơn để đảm bảo gợi ý sản phẩm đã được hiển thị
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Sau đó mới hiển thị tin nhắn phản hồi từ bot
      const botMessageId = Date.now().toString();
      const botMessage: Message = {
        id: botMessageId,
        text: content,
        sender: "bot",
        timestamp: new Date(),
        metadata: metadata as MessageMetadata
      }
      
      setMessages(prev => [...prev, botMessage]);
      
      // Cập nhật lịch sử chat
      setChatHistory([...updatedHistory, { role: "model" as const, content }]);
      
      setLoading(false);
      
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      
      // Xóa thông báo "đang xử lý" và hiển thị thông báo lỗi
      setMessages(prev => {
        // Loại bỏ thông báo "đang xử lý" nếu có
        const filtered = prev.filter(msg => !msg.id.startsWith('processing-'));
      
        // Thêm thông báo lỗi
        return [...filtered, {
          id: Date.now().toString(),
          text: "Xin lỗi, đã xảy ra lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại sau.",
          sender: "bot",
          timestamp: new Date()
        }];
      });
      
      setLoading(false);
    }
  };

  const showLastViewedProducts = () => {
    if (lastViewedProducts && lastViewedProducts.length > 0) {
      setRecommendations(lastViewedProducts);
      setShowRecommendations(true);
      
      // Thêm tin nhắn giải thích
      const botMessage: Message = {
        id: Date.now().toString(),
        text: "Đây là những sản phẩm đã xem gần đây của bạn:",
        sender: "bot",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } else {
      const botMessage: Message = {
        id: Date.now().toString(),
        text: "Bạn chưa xem sản phẩm nào gần đây.",
        sender: "bot",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessage]);
    }
  };

  const handleResetChat = () => {
    const resetMessage = {
      id: Date.now().toString(),
      text: "Chat đã được làm mới. Tôi có thể giúp gì cho bạn?",
      sender: "bot" as const,
      timestamp: new Date(),
    };
    
    setMessages([resetMessage]);
    setRecommendations([]);
    setShowRecommendations(false);
    setChatHistory([]);
    
    // Xóa các dữ liệu lưu trữ khi làm mới chat
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chatbot_messages');
      localStorage.removeItem('chatbot_recommendations');
      localStorage.removeItem('chatbot_history');
      localStorage.removeItem('chatbot_session_id'); 
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRecommendationIntent = async (userInput: string) => {
    try {
      
      const recommendationData = await recommendationService.getChatRecommendations(userInput, 5);
      
      if (recommendationData && recommendationData.products && recommendationData.products.length > 0) {
        const enhancedProducts = recommendationData.products.map((product: Recommendation) => ({
          ...product,
          image: product.imageUrl || product.image || '/images/placeholder-food.jpg'
        }));
        
        setRecommendations(enhancedProducts);
        setShowRecommendations(true);
        
        const queryAnalysis = recommendationData.queryAnalysis || null;
        const reasonings = recommendationData.reasonings || [];
        let responseText = "";
        
        
        const hasDirectMatches = enhancedProducts.some((p: Recommendation) => 
          p.confidence! > 0.9 || (p.reasoning && p.reasoning.includes("chính là món"))
        );
        
        const exactProductMatches = queryAnalysis?.exactProductMatch || false;
        const isDirectProductRequest = queryAnalysis?.isDirectProductRequest || false;
        
        if (hasDirectMatches || exactProductMatches || isDirectProductRequest) {
          const sortedProducts = [...enhancedProducts].sort((a, b) => {
            const confidenceA = a.confidence || 0;
            const confidenceB = b.confidence || 0;
            
            const specialReasonA = a.reasoning && (a.reasoning.includes("chính là món") || a.reasoning.includes("Phù hợp với yêu cầu"));
            const specialReasonB = b.reasoning && (b.reasoning.includes("chính là món") || b.reasoning.includes("Phù hợp với yêu cầu"));
            
            if (specialReasonA && !specialReasonB) return -1;
            if (!specialReasonA && specialReasonB) return 1;
            
            return confidenceB - confidenceA;
          });
          
          setRecommendations(sortedProducts);
          
          // Tạo phản hồi cá nhân hóa sử dụng kết quả phân tích từ Gemini
          if (exactProductMatches && queryAnalysis?.primaryProductIntent) {
            responseText = `Đây là món ${queryAnalysis.primaryProductIntent} mà bạn yêu cầu. Gemini đã phân tích yêu cầu của bạn và tìm thấy món phù hợp nhất.`;
          } else if (isDirectProductRequest) {
            const matchingKeywords = queryAnalysis?.extractedKeywords?.join(', ') || '';
            responseText = `Tôi đã sử dụng Gemini để phân tích yêu cầu "${matchingKeywords}" của bạn và tìm được những món ăn phù hợp nhất:`;
          } else {
            responseText = `Dựa trên phân tích của Gemini về yêu cầu của bạn, đây là những món ăn phù hợp nhất:`;
          }
        } else if (recommendationData.isNewUser) {
          responseText = "Đây là một số món ăn phổ biến tại nhà hàng chúng tôi. Hãy đăng nhập và tương tác nhiều hơn để nhận đề xuất cá nhân hóa tốt hơn!";
        } else if (reasonings.length > 0) {
          responseText = "Gemini đã phân tích thông tin và đưa ra đề xuất dựa trên " + reasonings.join(", ") + " của bạn.";
        } else {
          responseText = "Dựa trên phân tích của Gemini, đây là một số món ăn có thể phù hợp với bạn:";
        }
        
        return {
          text: responseText,
          metadata: {
            type: 'product_carousel' as const,
            products: enhancedProducts
          }
        };
      } else {
        // Fallback khi không có đề xuất
        return {
          text: "Gemini không tìm thấy đề xuất phù hợp lúc này. Vui lòng thử mô tả rõ hơn về món ăn bạn muốn.",
          metadata: null
        };
      }
    } catch (error) {
      console.error("Lỗi khi xử lý ý định đề xuất:", error);
      return {
        text: "Xin lỗi, đã xảy ra lỗi khi sử dụng Gemini để lấy đề xuất món ăn. Vui lòng thử lại sau.",
        metadata: null
      };
    }
  };

  const toggleRecommendations = () => {
    const newState = !showRecommendations
    setShowRecommendations(newState)
    // Lưu trạng thái vào localStorage
    localStorage.setItem('chatbot_show_recommendations', String(newState))
  }

  return (
    <Card className="w-full max-w-[400px] shadow-md border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      <CardHeader className="bg-red-600 text-white p-3 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <h3 className="font-medium text-white">Trợ lý ảo FastBite</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 hover:bg-red-700 text-white"
            onClick={handleResetChat}
            title="Tạo cuộc hội thoại mới"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 hover:bg-red-700 text-white"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle>Tùy chỉnh chatbot</SheetTitle>
                <SheetDescription>
                  Điều chỉnh giao diện và chức năng trợ lý ảo
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Hiển thị gợi ý</h3>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="show-recommendations" 
                      checked={showRecommendations}
                      onCheckedChange={(checked) => {
                        setShowRecommendations(checked)
                        localStorage.setItem('chatbot_show_recommendations', String(checked))
                      }}
                    />
                    <Label htmlFor="show-recommendations">Hiển thị gợi ý sản phẩm</Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Kiểu hiển thị chatbot</h3>
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <RadioGroup 
                        value={chatPosition} 
                        onValueChange={(value) => setChatPosition(value as 'top' | 'center')}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="center" id="position-center" />
                          <Label htmlFor="position-center">Giữa màn hình</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="top" id="position-top" />
                          <Label htmlFor="position-top">Đầu cuộc trò chuyện</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <Button variant="outline" className="w-full" onClick={handleResetChat}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Bắt đầu cuộc trò chuyện mới
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 hover:bg-red-700 text-white"
            onClick={onClose}
            title="Đóng chatbot"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="h-[350px] overflow-y-auto p-3 bg-white dark:bg-gray-950 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg shadow-sm ${
                  message.sender === "user"
                    ? "bg-red-600 text-white rounded-tr-none"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none"
                }`}
              >
                {message.id.startsWith('processing') ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm">{message.text}</p>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                )}
              </div>
            </div>
          ))}
          
          <AnimatePresence>
            {showRecommendations && recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="relative w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <div className="absolute top-0 right-0 z-10 flex space-x-1 p-1">
                  <Button
                    size="icon"
                    variant="outline" 
                    className="h-6 w-6 bg-white hover:bg-white text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-800 border-0 shadow-sm"
                    onClick={toggleRecommendations}
                    title={showRecommendations ? "Ẩn gợi ý" : "Hiện gợi ý"}
                  >
                    {showRecommendations ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-6 w-6 bg-white hover:bg-white text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-800 border-0 shadow-sm"
                    onClick={() => setShowRecommendations(false)}
                    title="Đóng gợi ý"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <RecommendationCarousel recommendations={recommendations} />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      
      <CardFooter className="p-3 border-t bg-gray-50 dark:bg-gray-900">
        {isCheckingConnection ? (
          <div className="w-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-red-600" />
            <span className="ml-2 text-sm text-gray-500">Đang kết nối...</span>
          </div>
        ) : !isConnected ? (
          <div className="w-full">
            <p className="text-sm text-red-600 mb-2 text-center">
              Không thể kết nối đến dịch vụ chatbot
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={checkConnection}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Thử lại
            </Button>
          </div>
        ) : (
          <div className="flex w-full space-x-2">
            <Input
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              ref={inputRef}
              className="border border-red-200 focus-visible:ring-red-500 bg-white dark:bg-gray-800"
            />
            
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleRecommendations()}
                disabled={loading || recommendations.length === 0}
                className="bg-white hover:bg-gray-100 border-red-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                title={showRecommendations ? "Ẩn gợi ý sản phẩm" : "Hiện gợi ý sản phẩm"}
              >
                {showRecommendations ? (
                  <ChevronUp className="h-4 w-4 text-red-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-red-600" />
                )}
              </Button>
              
              {lastViewedProducts.length > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={showLastViewedProducts}
                  disabled={loading}
                  className="bg-white hover:bg-gray-100 border-red-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                  title="Xem lại sản phẩm đã xem"
                >
                  <Image className="h-4 w-4 text-red-600" />
                </Button>
              )}
              
              <Button
                variant="default"
                size="icon"
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}