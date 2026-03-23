/**
 * GEO (Generative Engine Optimization) Writing Guidelines
 * 
 * Shared module that provides GEO-optimized writing instructions
 * to inject into content generation prompts. Ensures AI-generated
 * content is optimized for AI search engines (ChatGPT, Gemini, Perplexity).
 * 
 * 8 factors with weights matching geo-score-content scoring:
 * - Answer-First (15%)
 * - Citation Signals (15%)
 * - Content Depth (15%)
 * - Entity Clarity (13%)
 * - Structured Data (12%)
 * - Extractability (12%)
 * - Heading Hierarchy (10%)
 * - Freshness (8%)
 */

// ============================================================================
// FULL GEO GUIDELINES (for Core Content & Website)
// ============================================================================

export function getFullGEOGuidelines(): string {
  return `
## 🌐 CHUẨN GEO — Generative Engine Optimization (BẮT BUỘC)
Nội dung PHẢI được viết theo 8 nguyên tắc GEO để AI search (ChatGPT, Gemini, Perplexity) có thể trích dẫn:

### 1. ANSWER-FIRST (15%) — Trả lời trực tiếp
- Mỗi section/đoạn MỞ ĐẦU bằng câu trả lời trực tiếp cho câu hỏi liên quan
- Dùng format "X là Y" hoặc "Theo [nguồn], X cho thấy Y" ngay dòng đầu
- Tránh mở đầu bằng câu hỏi tu từ hoặc giới thiệu dài dòng
- ✅ "Tỷ lệ chuyển đổi trung bình ngành là 3.2%, theo báo cáo 2025."
- ❌ "Bạn có bao giờ tự hỏi tỷ lệ chuyển đổi là bao nhiêu?"

### 2. CITATION SIGNALS (15%) — Tín hiệu trích dẫn
- LUÔN kèm số liệu cụ thể: %, con số, năm
- Dùng cụm từ trích dẫn: "theo nghiên cứu", "dữ liệu cho thấy", "báo cáo từ [nguồn]"
- Ít nhất 3-5 citation signals trong mỗi bài viết dài
- Bao gồm thống kê, khảo sát, case study có số liệu

### 3. CONTENT DEPTH (15%) — Chiều sâu nội dung
- Phân tích đa góc: nguyên nhân, hệ quả, giải pháp, so sánh
- Không viết hời hợt — mỗi điểm phải có giải thích + ví dụ
- Đưa ra framework/methodology rõ ràng
- Bao gồm cả pros & cons, không chỉ một chiều

### 4. ENTITY CLARITY (13%) — Rõ ràng thực thể
- Định nghĩa rõ brand, sản phẩm, khái niệm chuyên ngành khi nhắc lần đầu
- Dùng tên đầy đủ trước khi viết tắt: "Generative Engine Optimization (GEO)"
- Liên kết entities với nhau: "[Brand] cung cấp [Sản phẩm] giúp [Đối tượng] giải quyết [Vấn đề]"

### 5. STRUCTURED DATA (12%) — Dữ liệu có cấu trúc
- Dùng danh sách có đánh số hoặc bullet points cho các bước/tips
- Tạo bảng so sánh khi có 2+ lựa chọn
- Format FAQ (Hỏi-Đáp) cho phần giải đáp
- Dùng definition lists cho thuật ngữ chuyên ngành

### 6. EXTRACTABILITY (12%) — Khả năng trích xuất
- Viết đoạn ngắn 2-4 câu, mỗi đoạn TỰ CHỨA (self-contained)
- Mỗi đoạn có thể được AI trích dẫn độc lập mà vẫn có nghĩa
- Tránh đại từ mơ hồ ("nó", "điều này") — dùng danh từ cụ thể
- Câu đầu đoạn = summary sentence

### 7. HEADING HIERARCHY (10%) — Cấu trúc heading
- Cấu trúc rõ: H1 → H2 → H3 logic, không nhảy cấp
- Heading chứa keyword tự nhiên
- Heading là câu hỏi hoặc statement rõ ràng (không mơ hồ)
- Heading giúp AI scan nhanh cấu trúc bài

### 8. FRESHNESS (8%) — Tính thời sự
- Đề cập năm hiện tại, xu hướng mới nhất
- Dùng "năm 2025/2026", "xu hướng mới nhất", "cập nhật gần đây"
- Tránh thông tin cũ không còn chính xác
- Nếu có dữ liệu mới → ưu tiên dữ liệu mới

⚠️ QUAN TRỌNG: Các nguyên tắc GEO phải được áp dụng TỰ NHIÊN, không máy móc. Nội dung vẫn phải mượt mà, dễ đọc cho người thật.`;
}

// ============================================================================
// CHANNEL-SPECIFIC GEO GUIDELINES
// ============================================================================

/**
 * Get GEO guidelines adapted for a specific channel
 */
export function getChannelGEOGuidelines(channel: string): string {
  const channelGEO: Record<string, string> = {
    website: getFullGEOGuidelines(),
    
    facebook: `
## 🌐 GEO cho Facebook
- **Answer-First**: Câu đầu tiên trả lời thẳng vào vấn đề
- **Citation Signals**: Kèm 1-2 số liệu cụ thể (%, con số)
- **Entity Clarity**: Nhắc tên brand + giải pháp rõ ràng
- **Extractability**: Mỗi đoạn tự chứa, AI có thể trích dẫn riêng
- **Content Depth**: Phân tích có chiều sâu, không viết hời hợt`,

    linkedin: `
## 🌐 GEO cho LinkedIn
- **Answer-First**: Mở đầu bằng insight/số liệu gây chú ý
- **Citation Signals**: Ít nhất 2-3 data points, trích dẫn nghiên cứu
- **Content Depth**: Phân tích đa góc, framework rõ ràng
- **Entity Clarity**: Định nghĩa thuật ngữ chuyên ngành
- **Structured Data**: Dùng bullets cho tips/steps`,

    instagram: `
## 🌐 GEO cho Instagram
- **Answer-First**: Câu đầu = insight mạnh
- **Entity Clarity**: Nhắc rõ brand/sản phẩm
- **Extractability**: Mỗi dòng tự chứa, có thể trích riêng
- **Freshness**: Đề cập trend hiện tại`,

    tiktok: `
## 🌐 GEO cho TikTok
- **Answer-First**: Hook 3s = trả lời trực tiếp
- **Entity Clarity**: Nhắc rõ brand ngay đầu
- **Extractability**: Mỗi điểm ngắn gọn, tự chứa
- **Citation Signals**: 1 số liệu gây shock`,

    twitter: `
## 🌐 GEO cho Twitter/X
- **Answer-First**: Tweet đầu = câu trả lời trọn vẹn
- **Citation Signals**: Kèm 1 data point
- **Entity Clarity**: Nhắc brand/concept rõ ràng
- **Extractability**: Mỗi tweet tự chứa`,

    youtube: `
## 🌐 GEO cho YouTube
- **Answer-First**: Description mở đầu bằng tóm tắt nội dung
- **Citation Signals**: Kèm 2-3 số liệu trong description
- **Structured Data**: Timestamps, sections rõ ràng
- **Heading Hierarchy**: Tiêu đề + subheadings trong description
- **Freshness**: Đề cập năm/trend hiện tại`,

    email: `
## 🌐 GEO cho Email
- **Answer-First**: Subject line + câu đầu body = giá trị chính
- **Citation Signals**: Kèm 1-2 số liệu tăng uy tín
- **Entity Clarity**: Nhắc rõ brand + offer
- **Structured Data**: Bullets cho benefits/features
- **Extractability**: Mỗi section tự chứa`,

    zalo_oa: `
## 🌐 GEO cho Zalo OA
- **Answer-First**: Đi thẳng vào vấn đề
- **Entity Clarity**: Nhắc rõ thương hiệu
- **Extractability**: Đoạn ngắn, tự chứa`,

    telegram: `
## 🌐 GEO cho Telegram
- **Answer-First**: Mở đầu bằng thông tin giá trị
- **Citation Signals**: Kèm số liệu/nguồn
- **Structured Data**: Bullets rõ ràng
- **Content Depth**: Phân tích có chiều sâu`,

    threads: `
## 🌐 GEO cho Threads
- **Answer-First**: Quan điểm rõ ràng ngay đầu
- **Entity Clarity**: Nhắc rõ chủ thể
- **Extractability**: Mỗi đoạn tự chứa`,

    google_maps: `
## 🌐 GEO cho Google Maps
- **Entity Clarity**: Nhắc rõ tên doanh nghiệp, địa chỉ, dịch vụ
- **Answer-First**: Trả lời thẳng: doanh nghiệp này cung cấp gì
- **Freshness**: Đề cập thông tin cập nhật`,
  };

  return channelGEO[channel] || channelGEO.facebook || '';
}

// ============================================================================
// COMPACT GEO (for prompts with token budget constraints)
// ============================================================================

export function getCompactGEOGuidelines(): string {
  return `
## 🌐 CHUẨN GEO (Generative Engine Optimization)
Viết để AI search có thể trích dẫn:
1. **Answer-First**: Mở đầu bằng câu trả lời trực tiếp
2. **Citations**: Kèm số liệu, thống kê, nguồn cụ thể
3. **Depth**: Phân tích đa góc, có ví dụ
4. **Entity Clarity**: Định nghĩa rõ brand/khái niệm
5. **Structured**: Lists, tables, FAQ format
6. **Extractable**: Đoạn ngắn tự chứa, AI trích riêng được
7. **Headings**: H1→H2→H3 logic, chứa keyword
8. **Fresh**: Đề cập năm/trend hiện tại`;
}
