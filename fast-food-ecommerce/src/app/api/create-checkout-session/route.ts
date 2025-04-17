import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { API_URL, SITE_URL } from "@/config"

// Khởi tạo Stripe với khóa bí mật
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
})

export async function POST(req: NextRequest) {
  try {
    const { orderId, items, customerInfo, totalAmount } = await req.json()

    if (!orderId || !items || !customerInfo || !totalAmount) {
      return NextResponse.json(
        { error: "Thiếu thông tin đơn hàng" },
        { status: 400 }
      )
    }

    // Tạo line items cho Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product_name,
          description: `Số lượng: ${item.quantity}`,
        },
        unit_amount: Math.round(item.price * 100), // Stripe yêu cầu số tiền theo đơn vị cent
      },
      quantity: item.quantity,
    }))

    // Thêm phí vận chuyển nếu có
    if (totalAmount.shipping_fee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Phí vận chuyển",
          },
          unit_amount: Math.round(totalAmount.shipping_fee * 100),
        },
        quantity: 1,
      })
    }

    // Tạo session thanh toán
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${SITE_URL}/payment/success?method=stripe&session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
      cancel_url: `${SITE_URL}/payment/cancel?method=stripe&orderId=${orderId}`,
      customer_email: customerInfo.email,
      metadata: {
        orderId: orderId.toString(),
      },
    })

    // Trả về URL thanh toán cho client
    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    console.error("Lỗi khi tạo phiên thanh toán:", error)
    return NextResponse.json(
      { error: "Không thể tạo phiên thanh toán" },
      { status: 500 }
    )
  }
} 