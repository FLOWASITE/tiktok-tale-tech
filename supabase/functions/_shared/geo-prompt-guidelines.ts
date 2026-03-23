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
- ✅ "Tỷ lệ chuyển đổi trung bình ngành là 3.2%, theo báo cáo HubSpot 2025."
- ❌ "Bạn có bao giờ tự hỏi tỷ lệ chuyển đổi là bao nhiêu?"
- ✅ "Content marketing tạo ra gấp 3 lần leads so với quảng cáo truyền thống (Content Marketing Institute, 2025)."
- ❌ "Trong thế giới marketing hiện đại, có rất nhiều cách để tiếp cận khách hàng..."

### 2. CITATION SIGNALS (15%) — Tín hiệu trích dẫn
- **BẮT BUỘC** có ít nhất 5 citations cụ thể trong mỗi bài viết
- LUÔN kèm số liệu cụ thể: %, con số, năm
- Dùng cụm từ trích dẫn: "theo nghiên cứu", "dữ liệu cho thấy", "báo cáo từ [nguồn]"
- Bao gồm thống kê, khảo sát, case study có số liệu
- ✅ "Theo báo cáo Statista 2025, 78% doanh nghiệp SME tại Việt Nam đã áp dụng digital marketing"
- ✅ "Nghiên cứu của McKinsey (2024) chỉ ra rằng AI tăng năng suất 40% trong content creation"
- ❌ "Nhiều nghiên cứu cho thấy..." (không có nguồn cụ thể)
- ❌ "Theo chuyên gia..." (không nêu tên)

### 3. CONTENT DEPTH (15%) — Chiều sâu nội dung
- Phân tích đa góc: nguyên nhân, hệ quả, giải pháp, so sánh
- Không viết hời hợt — mỗi điểm phải có giải thích + ví dụ
- Đưa ra framework/methodology rõ ràng
- Bao gồm cả pros & cons, không chỉ một chiều
- ✅ Đưa ra framework 3 bước: (1) Phân tích → (2) Triển khai → (3) Đo lường, mỗi bước có ví dụ thực tế
- ❌ Chỉ liệt kê "5 tips" mà không giải thích tại sao hoặc cách áp dụng

### 4. ENTITY CLARITY (13%) — Rõ ràng thực thể
- Định nghĩa rõ brand, sản phẩm, khái niệm chuyên ngành khi nhắc lần đầu
- Dùng tên đầy đủ trước khi viết tắt: "Generative Engine Optimization (GEO)"
- Liên kết entities với nhau: "[Brand] cung cấp [Sản phẩm] giúp [Đối tượng] giải quyết [Vấn đề]"
- ✅ "SEO (Search Engine Optimization) là quá trình tối ưu hóa website để xếp hạng cao trên công cụ tìm kiếm"
- ❌ "SEO rất quan trọng" (giả sử người đọc đã biết)

### 5. STRUCTURED DATA (12%) — Dữ liệu có cấu trúc
- Dùng danh sách có đánh số hoặc bullet points cho các bước/tips
- Tạo bảng so sánh khi có 2+ lựa chọn
- Format FAQ (Hỏi-Đáp) cho phần giải đáp
- Dùng definition lists cho thuật ngữ chuyên ngành
- ✅ Bảng so sánh SEO vs GEO với các cột: Tiêu chí | SEO | GEO
- ✅ Section "Câu hỏi thường gặp" với format Q: ... A: ...
- ❌ Viết toàn bộ bằng paragraph dài không có cấu trúc

### 6. EXTRACTABILITY (12%) — Khả năng trích xuất
- Viết đoạn ngắn 2-4 câu, mỗi đoạn TỰ CHỨA (self-contained)
- Mỗi đoạn có thể được AI trích dẫn độc lập mà vẫn có nghĩa
- Tránh đại từ mơ hồ ("nó", "điều này") — dùng danh từ cụ thể
- Câu đầu đoạn = summary sentence
- ✅ "Content marketing B2B hiệu quả nhất khi tập trung vào case studies. Theo CMI, 73% marketer B2B cho rằng case studies là format tạo leads tốt nhất."
- ❌ "Nó rất hiệu quả. Điều này đã được chứng minh qua nhiều nghiên cứu." (đại từ mơ hồ, thiếu context)

### 7. HEADING HIERARCHY (10%) — Cấu trúc heading
- Cấu trúc rõ: H1 → H2 → H3 logic, không nhảy cấp
- Heading chứa keyword tự nhiên
- Heading là câu hỏi hoặc statement rõ ràng (không mơ hồ)
- Heading giúp AI scan nhanh cấu trúc bài
- ✅ "## Lợi ích của GEO cho doanh nghiệp SME năm 2025"
- ❌ "## Lợi ích" (quá chung chung)

### 8. FRESHNESS (8%) — Tính thời sự
- Đề cập năm hiện tại, xu hướng mới nhất
- Dùng "năm 2025/2026", "xu hướng mới nhất", "cập nhật gần đây"
- Tránh thông tin cũ không còn chính xác
- Nếu có dữ liệu mới → ưu tiên dữ liệu mới

⚠️ QUAN TRỌNG: 
- Các nguyên tắc GEO phải được áp dụng TỰ NHIÊN, không máy móc. Nội dung vẫn phải mượt mà, dễ đọc cho người thật.
- **BẮT BUỘC** có ≥5 citation signals với số liệu cụ thể và nguồn rõ ràng.
- **BẮT BUỘC** mỗi section mở đầu bằng answer-first (câu trả lời/insight trực tiếp).
- **BẮT BUỘC** có ít nhất 1 bảng so sánh hoặc danh sách có cấu trúc.`;
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
- **Answer-First**: Câu đầu tiên trả lời thẳng vào vấn đề — KHÔNG dùng câu hỏi tu từ mở đầu
- **Citation Signals**: Kèm 2-3 số liệu cụ thể (%, con số, nguồn)
- **Entity Clarity**: Nhắc tên brand + giải pháp rõ ràng ngay trong 2 dòng đầu
- **Extractability**: Mỗi đoạn tự chứa, AI có thể trích dẫn riêng
- **Content Depth**: Phân tích có chiều sâu, không viết hời hợt — mỗi điểm có giải thích + ví dụ
- **Structured Data**: Dùng bullet points cho tips/steps, đánh số cho quy trình`,

    linkedin: `
## 🌐 GEO cho LinkedIn
- **Answer-First**: Mở đầu bằng insight/số liệu gây chú ý — "X% doanh nghiệp đã..."
- **Citation Signals**: Ít nhất 3 data points cụ thể, trích dẫn nghiên cứu/báo cáo có tên
- **Content Depth**: Phân tích đa góc, framework rõ ràng, cả pros & cons
- **Entity Clarity**: Định nghĩa thuật ngữ chuyên ngành khi nhắc lần đầu
- **Structured Data**: Dùng bullets cho tips/steps, numbered lists cho framework
- **Freshness**: Đề cập xu hướng 2025/2026`,

    instagram: `
## 🌐 GEO cho Instagram
- **Answer-First**: Câu đầu = insight mạnh, kết luận trước chi tiết sau
- **Entity Clarity**: Nhắc rõ brand/sản phẩm, không dùng đại từ mơ hồ
- **Extractability**: Mỗi dòng tự chứa, có thể trích riêng mà vẫn có nghĩa
- **Citation Signals**: Kèm 1-2 số liệu cụ thể tăng uy tín
- **Freshness**: Đề cập trend hiện tại 2025`,

    tiktok: `
## 🌐 GEO cho TikTok
- **Answer-First**: Hook 3s = trả lời trực tiếp, kết luận ngay
- **Entity Clarity**: Nhắc rõ brand ngay đầu script
- **Extractability**: Mỗi điểm ngắn gọn, tự chứa
- **Citation Signals**: 1-2 số liệu gây ấn tượng (shock value)`,

    twitter: `
## 🌐 GEO cho Twitter/X
- **Answer-First**: Tweet đầu = câu trả lời trọn vẹn, đủ nghĩa khi đứng riêng
- **Citation Signals**: Kèm 1 data point cụ thể (%, số liệu)
- **Entity Clarity**: Nhắc brand/concept rõ ràng
- **Extractability**: Mỗi tweet tự chứa, AI trích riêng được`,

    youtube: `
## 🌐 GEO cho YouTube
- **Answer-First**: Description mở đầu bằng tóm tắt nội dung chính
- **Citation Signals**: Kèm 2-3 số liệu cụ thể trong description
- **Structured Data**: Timestamps, sections rõ ràng, chapters
- **Heading Hierarchy**: Tiêu đề + subheadings trong description
- **Freshness**: Đề cập năm/trend hiện tại 2025`,

    email: `
## 🌐 GEO cho Email
- **Answer-First**: Subject line + câu đầu body = giá trị chính ngay lập tức
- **Citation Signals**: Kèm 1-2 số liệu cụ thể tăng uy tín
- **Entity Clarity**: Nhắc rõ brand + offer, không dùng đại từ mơ hồ
- **Structured Data**: Bullets cho benefits/features
- **Extractability**: Mỗi section tự chứa`,

    zalo_oa: `
## 🌐 GEO cho Zalo OA
- **Answer-First**: Đi thẳng vào vấn đề, giá trị ngay dòng đầu
- **Entity Clarity**: Nhắc rõ thương hiệu + sản phẩm cụ thể
- **Extractability**: Đoạn ngắn, tự chứa
- **Citation Signals**: Kèm 1 số liệu tăng tin tưởng`,

    telegram: `
## 🌐 GEO cho Telegram
- **Answer-First**: Mở đầu bằng thông tin giá trị, kết luận trước
- **Citation Signals**: Kèm số liệu/nguồn cụ thể
- **Structured Data**: Bullets rõ ràng, numbered lists
- **Content Depth**: Phân tích có chiều sâu, framework rõ`,

    threads: `
## 🌐 GEO cho Threads
- **Answer-First**: Quan điểm rõ ràng ngay đầu, không vòng vo
- **Entity Clarity**: Nhắc rõ chủ thể, không dùng đại từ
- **Extractability**: Mỗi đoạn tự chứa
- **Citation Signals**: Kèm 1 data point`,

    google_maps: `
## 🌐 GEO cho Google Maps
- **Entity Clarity**: Nhắc rõ tên doanh nghiệp, địa chỉ, dịch vụ cụ thể
- **Answer-First**: Trả lời thẳng: doanh nghiệp này cung cấp gì, cho ai
- **Freshness**: Đề cập thông tin cập nhật (giờ mở cửa, dịch vụ mới)
- **Citation Signals**: Kèm số liệu (năm hoạt động, số khách hàng)`,
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
1. **Answer-First**: Mở đầu mỗi section bằng câu trả lời trực tiếp (KHÔNG câu hỏi tu từ)
2. **Citations**: BẮT BUỘC ≥5 số liệu cụ thể: %, con số, năm, nguồn rõ ràng
3. **Depth**: Phân tích đa góc, có framework + ví dụ cụ thể
4. **Entity Clarity**: Định nghĩa rõ brand/khái niệm khi nhắc lần đầu
5. **Structured**: BẮT BUỘC có lists, bảng so sánh, hoặc FAQ format
6. **Extractable**: Đoạn ngắn 2-4 câu, tự chứa, không đại từ mơ hồ
7. **Headings**: H1→H2→H3 logic, chứa keyword tự nhiên
8. **Fresh**: Đề cập năm 2025/2026, xu hướng hiện tại`;
}
