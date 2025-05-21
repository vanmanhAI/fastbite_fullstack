# FastBite Backend

## Hệ thống phân tích ý định thông minh

Hệ thống phân tích ý định người dùng (Intent Classification System) mới có khả năng:

1. **Động và thích ứng**: Không dựa vào từ khóa cố định mà phân tích ngữ cảnh toàn bộ tin nhắn.

2. **Sử dụng AI**: Hệ thống sử dụng AI để hiểu ý định, giúp nhận diện ngay cả khi người dùng dùng từ ngữ không nằm trong danh sách cứng.

3. **Kết hợp nhiều phương pháp**: Hệ thống kết hợp AI và phương pháp phân tích từ khóa để tăng độ chính xác và khả năng chịu lỗi.

4. **Trích xuất từ khóa thông minh**: Tự động lọc các stopwords và tách từ khóa có ý nghĩa để tối ưu tìm kiếm.

### Các loại ý định được hỗ trợ

- **recommendation**: Đề xuất món ăn, sản phẩm phù hợp
- **product_query**: Hỏi về thông tin sản phẩm, món ăn
- **order_status**: Hỏi về trạng thái đơn hàng
- **general**: Các câu hỏi chung khác

### Tùy chỉnh hệ thống phân tích ý định

Dịch vụ `IntentClassifierService` cho phép tùy chỉnh:

```typescript
// Khởi tạo với cấu hình tùy chỉnh
const customIntentClassifier = new IntentClassifierService({
  useAI: true, // Bật/tắt phân tích AI
  confidenceThreshold: 0.7, // Ngưỡng độ tin cậy
  intentKeywords: {
    // Từ khóa tùy chỉnh cho mỗi loại ý định
    recommendation: [...],
    product_query: [...],
    order_status: [...]
  }
});
```

Cấu trúc này giúp hệ thống luôn được cập nhật linh hoạt và có thể mở rộng dễ dàng.

## Dịch vụ hiểu yêu cầu người dùng (Query Understanding Service)

Dịch vụ QueryUnderstandingService sử dụng Google Gemini để phân tích ngữ cảnh yêu cầu người dùng và cung cấp kết quả chính xác hơn.

### Cấu hình Gemini API

1. Cập nhật file `.env` với API key của Gemini:
   ```
   GEMINI_API_KEY=your-gemini-api-key
   ```

2. Dịch vụ sẽ tự động sử dụng Gemini để phân tích yêu cầu người dùng, hỗ trợ:
   - Xác định một món ăn cụ thể mà người dùng muốn
   - Trích xuất từ khóa chính từ yêu cầu
   - Phát hiện các yêu cầu về giá cả, khẩu vị, và loại món ăn
   - Đề xuất danh mục phù hợp

3. Trong trường hợp Gemini không khả dụng, hệ thống sẽ tự động chuyển sang phương pháp phân tích nội bộ. 