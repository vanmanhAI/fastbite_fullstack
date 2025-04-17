"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Send, User, Bot, Loader2, RefreshCw, X, ShoppingCart } from "lucide-react"
import RecommendationCarousel from "./recommendation-carousel"
import chatbotService, { ChatMessage, MessageMetadata } from "@/services/chatbotService"
import dbConnectTest from "@/services/dbConnectTest"
import { useRouter } from 'next/navigation'
import { toast } from "@/components/ui/use-toast"

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
  price: number
  description?: string
  stock?: number
  category?: string
}

interface ChatbotInterfaceProps {
  onClose: () => void
}

export default function ChatbotInterface({ onClose }: ChatbotInterfaceProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Xin chào! Tôi là trợ lý ảo của FastBite. Tôi có thể giúp bạn tìm món ăn, đặt hàng hoặc trả lời câu hỏi về nhà hàng. Tôi có thể làm gì cho bạn hôm nay?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [lastViewedProducts, setLastViewedProducts] = useState<Recommendation[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const aiEnabled = process.env.NEXT_PUBLIC_AI_ENABLED === "true"
  const maxHistoryLength = parseInt(process.env.NEXT_PUBLIC_MAX_CHAT_HISTORY || "10")
  const inputRef = useRef<HTMLInputElement>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  const [chatPosition, setChatPosition] = useState<'top' | 'center'>('center')

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const formattedHistory = messages.map(msg => ({
      role: msg.sender === "user" ? "user" as const : "model" as const,
      content: msg.text
    }));

    const limitedHistory = formattedHistory.slice(-maxHistoryLength);
    
    setChatHistory(limitedHistory);
  }, [messages, maxHistoryLength]);

  useEffect(() => {
    checkConnection();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const extractKeywords = (userInput: string): string => {
    return userInput.toLowerCase()
      .replace(/gợi ý|đề xuất|món gì|món nào|muốn ăn|recomm|tìm|kiếm|có|không|cho|tôi|xem|thử|thêm|bạn|ơi|nhé/g, '')
      .trim()
  }

  const detectIntent = (userInput: string): 'recommendation' | 'product_query' | 'general' => {
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
    
    return 'general';
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
        }, 100)
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

      const userIntent = detectIntent(input);
      let botResponse = { content: "", metadata: undefined as MessageMetadata | undefined };
      
      if (userIntent === 'recommendation' && aiEnabled) {
        try {
          console.log('input: ', input);
          
          const recommendedProducts = await chatbotService.generateProductRecommendations(input);
          
          if (recommendedProducts && recommendedProducts.length > 0) {
            setShowRecommendations(false);
            setTimeout(() => {
              setRecommendations(recommendedProducts);
              setShowRecommendations(true);
            }, 100);
            
            setMessages(prev => prev.filter(m => m.id !== processingId));
            
            botResponse = { 
              content: `Tôi đã tìm thấy ${recommendedProducts.length} món phù hợp với yêu cầu của bạn:`,
              metadata: {
                type: 'product_carousel',
                products: recommendedProducts
              }
            };
          } else {
            botResponse = await chatbotService.sendMessage(input, updatedHistory);
          }
        } catch (error) {
          console.error("Lỗi khi lấy gợi ý sản phẩm:", error);
          botResponse = await chatbotService.sendMessage(input, updatedHistory);
        }
      } else if (aiEnabled) {
        botResponse = await chatbotService.sendMessage(input, updatedHistory);
      } else {
        botResponse = { 
          content: "Xin lỗi, tôi không được kết nối với AI để trả lời câu hỏi này. Vui lòng liên hệ nhân viên để được hỗ trợ.",
          metadata: undefined
        };
      }

      // Xử lý metadata nếu có
      if (botResponse.metadata) {
        if (botResponse.metadata.type === 'product_carousel' && botResponse.metadata.products?.length > 0) {
          setShowRecommendations(false);
          setTimeout(() => {
            handleMessageMetadata(botResponse.metadata!);
          }, 100);
        } else {
          handleMessageMetadata(botResponse.metadata);
        }
      }

      const botMessage: Message = {
        id: Date.now().toString(),
        text: botResponse.content,
        sender: "bot",
        timestamp: new Date(),
        metadata: botResponse.metadata
      }
      
      setMessages(prev => [...prev.filter(m => !m.id.startsWith('processing-')), botMessage])
      setChatHistory([...updatedHistory, { role: "model", content: botResponse.content }])
      setLoading(false)
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Đã xảy ra lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.",
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev.filter(m => m.id.startsWith('processing-')), errorMessage])
      setLoading(false)
    }
  }

  const showLastViewedProducts = () => {
    if (lastViewedProducts.length > 0) {
      setRecommendations(lastViewedProducts)
      setShowRecommendations(true)
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }

  if (isCheckingConnection) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-red-600" />
        <p className="mt-4 text-gray-600">Đang kết nối đến dịch vụ chatbot...</p>
      </div>
    );
  }

  return (
    <Card className="flex flex-col h-full border-0 overflow-hidden">
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between bg-white dark:bg-gray-900">
        <div className="flex items-center">
          <Bot className="h-5 w-5 text-red-600 mr-2" />
          <span className="font-medium">FastBite Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          {lastViewedProducts.length > 0 && !showRecommendations && (
            <Button 
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={showLastViewedProducts}
              title="Hiển thị sản phẩm gần đây"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3 pt-4 space-y-3 mt-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex items-start max-w-[85%] ${
                message.sender === "user"
                  ? "bg-red-600 text-white rounded-l-lg rounded-tr-lg"
                  : "bg-gray-100 dark:bg-gray-800 text-foreground rounded-r-lg rounded-tl-lg"
              } p-3 shadow-sm`}
            >
              {message.sender === "bot" && message.id.startsWith("processing-") ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : message.sender === "bot" ? null : (
                <User className="h-4 w-4 mr-2 text-white" />
              )}
              <div>
                <div className="break-words whitespace-pre-wrap">{message.text}</div>
                <div className="text-xs mt-1 opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {showRecommendations && recommendations.length > 0 && (
          <div className="flex justify-start w-full max-w-full mt-3">
            <div className="relative w-[85%]">
              <RecommendationCarousel recommendations={recommendations} />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 h-6 w-6 rounded-full bg-white dark:bg-gray-800 shadow-sm"
                onClick={() => setShowRecommendations(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </CardContent>

      <CardFooter className="p-3 border-t bg-white dark:bg-gray-900">
        {!isConnected && !isCheckingConnection ? (
          <div className="w-full flex space-x-2">
            <Button 
              variant="outline" 
              className="flex-1 h-10"
              onClick={checkConnection}
              disabled={isCheckingConnection}
            >
              {isCheckingConnection ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Kiểm tra kết nối DB
            </Button>
          </div>
        ) : (
          <form 
            className="flex w-full space-x-2" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 h-10"
              disabled={loading || !isConnected}
            />
            <Button
              type="submit"
              size="icon" 
              className="h-10 w-10 bg-red-600 hover:bg-red-700 text-white"
              disabled={loading || !isConnected || !input.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  )
}