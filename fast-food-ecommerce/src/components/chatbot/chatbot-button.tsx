"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, X } from "lucide-react"
import ChatbotInterface from "./chatbot-interface"

export default function ChatbotButton() {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    // Khôi phục trạng thái từ localStorage nếu có
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatbot_is_open') === 'true'
    }
    return false
  })

  // Lưu trạng thái mở/đóng vào localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatbot_is_open', String(isOpen))
    }
  }, [isOpen])

  // Thêm xử lý sự kiện chuyển trang
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Đảm bảo lưu trạng thái trước khi chuyển trang
      if (typeof window !== 'undefined') {
        localStorage.setItem('chatbot_is_open', String(isOpen))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isOpen])

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 p-0 shadow-lg bg-red-600 hover:bg-red-700 z-50"
        aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-10rem)] shadow-md rounded-lg overflow-hidden">
          <ChatbotInterface onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  )
}

