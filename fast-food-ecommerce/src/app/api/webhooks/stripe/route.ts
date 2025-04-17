import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { API_URL } from "@/config"

// Khởi tạo Stripe với khóa bí mật
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
})

// Webhook secret từ Stripe để xác minh webhook
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature") || ""

    // Xác minh webhook từ Stripe
    let event: Stripe.Event
    
    try {
      if (!webhookSecret) {
        throw new Error("Thiếu Stripe webhook secret")
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Lỗi xác minh chữ ký webhook", err)
      return NextResponse.json({ error: "Lỗi xác minh chữ ký webhook" }, { status: 400 })
    }

    // Xử lý các sự kiện khác nhau
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Cập nhật trạng thái thanh toán thành công cho đơn hàng
        if (session.metadata?.orderId) {
          const token = process.env.API_SECRET_KEY
          
          // Gọi API để cập nhật trạng thái đơn hàng
          const response = await fetch(`${API_URL}/orders/${session.metadata.orderId}/payment-success`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              payment_id: session.payment_intent,
              payment_status: "paid",
              payment_method: "credit_card"
            })
          })

          if (!response.ok) {
            console.error("Lỗi khi cập nhật trạng thái đơn hàng:", await response.text())
          }
        }
        break
      }
      
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Cập nhật trạng thái thanh toán thất bại cho đơn hàng
        if (session.metadata?.orderId) {
          const token = process.env.API_SECRET_KEY
          
          // Gọi API để cập nhật trạng thái đơn hàng
          const response = await fetch(`${API_URL}/orders/${session.metadata.orderId}/payment-failed`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              payment_status: "failed"
            })
          })

          if (!response.ok) {
            console.error("Lỗi khi cập nhật trạng thái đơn hàng:", await response.text())
          }
        }
        break
      }
      
      default:
        console.log(`Sự kiện không được xử lý: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Lỗi xử lý webhook:", error)
    return NextResponse.json(
      { error: "Lỗi xử lý webhook" },
      { status: 500 }
    )
  }
} 