import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { saveMetrics, generateTraceId } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";
import { callAI as callAIProvider } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { createPromptManager, buildPrompt } from "../_shared/prompt-integration.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FLOWA_KNOWLEDGE_BASE = `
# FLOWA - Nền tảng AI Content Marketing #1 Việt Nam

## GIỚI THIỆU
Flowa là nền tảng AI Content Marketing giúp marketer tạo nội dung chất lượng cao, đúng brand voice, tuân thủ compliance ngành.

### Thành tích:
- 10,000+ marketer đang sử dụng
- 500,000+ nội dung đã được tạo
- 95% khách hàng hài lòng
- Tiết kiệm 80% thời gian tạo content
- Tạo 1 tuần content trong 1 giờ

## QUY TRÌNH 5 BƯỚC

### Bước 1: Khai báo Brand
- Upload logo, màu sắc thương hiệu
- Định nghĩa tone of voice (chuyên nghiệp, thân thiện, hài hước...)
- Thiết lập brand positioning và USP
- Liên kết Industry Pack phù hợp

### Bước 2: AI gợi ý chủ đề
- Phân tích trending topics trong ngành
- Gợi ý theo Customer Journey (Awareness → Consideration → Decision)
- Content pillars và evergreen themes
- Seasonal và event-based topics

### Bước 3: Chọn loại content
- **Multi-channel**: Facebook, Instagram, LinkedIn, TikTok, Zalo, YouTube, Threads
- **Video Scripts**: TikTok, Reels, Shorts với storyboard chi tiết
- **Carousel**: Design 5-10 slides tự động
- **Ad Copy**: Facebook Ads, Google Ads với A/B variants

### Bước 4: AI tạo nội dung
- Self-critique: AI tự đánh giá và cải thiện
- Compliance check: Kiểm tra tuân thủ quy định ngành
- Brand voice consistency: Giữ đúng tone thương hiệu
- Multi-language support: Việt, Anh, Thái

### Bước 5: Phê duyệt & Lên lịch
- Content Calendar với drag & drop
- Team collaboration với approval workflow
- Lên lịch đăng tự động
- Analytics và performance tracking

## TÍNH NĂNG NỔI BẬT

### 1. Multi-channel Content
Tạo nội dung cho 7+ kênh cùng lúc, tối ưu cho từng platform:
- Facebook: Long-form, storytelling
- Instagram: Visual-first, hashtags
- LinkedIn: Professional, B2B focus
- TikTok: Trendy, hook-first
- Zalo: Local Vietnamese style

### 2. Brand Voice AI
- AI học và giữ đúng tone thương hiệu
- Preferred words & forbidden words
- Sample texts để AI học phong cách
- Channel-specific overrides

### 3. Video Scripts
- Hook mở đầu thu hút trong 3 giây
- Visual direction chi tiết
- Text overlay suggestions
- Storyboard với timing

### 4. Carousel Generator
- 5-10 slides với flow logic
- Design suggestions
- CTA optimization
- Platform-specific sizing

### 5. Industry Memory Packs (42+ ngành)
Mỗi pack bao gồm:
- Compliance rules theo quy định ngành
- Forbidden terms & claim restrictions
- Best practices và templates
- Target audience insights

## 42+ INDUSTRY PACKS

### Y tế & Sức khỏe
- Compliance BYT về quảng cáo thuốc
- Không cam kết hiệu quả chữa bệnh
- Ghi rõ "Đọc kỹ hướng dẫn sử dụng"

### Tài chính & Ngân hàng
- Tuân thủ quy định NHNN
- Ghi rõ lãi suất và điều kiện
- Disclaimer về rủi ro đầu tư

### Bất động sản
- Không cam kết sinh lời
- Ghi rõ "Hình minh họa" cho phối cảnh
- Thông tin quy hoạch có nguồn

### Làm đẹp & Mỹ phẩm
- Tuân thủ FDA về công dụng sản phẩm
- Không dùng từ "trị", "chữa"
- Ghi rõ thành phần

### F&B & Nhà hàng
- Quy định ATTP
- Ghi rõ nguồn gốc nguyên liệu
- Allergen warnings

### Giáo dục & Đào tạo
- Không cam kết đầu ra việc làm
- Ghi rõ điều kiện học bổng
- Thông tin kiểm định

### Và 36+ ngành khác...
Thời trang, Du lịch, Ô tô, Công nghệ, FMCG, Luxury, Startup, Agency...

## BẢNG GIÁ

### 🆓 Starter (MIỄN PHÍ)
- 100 content/tháng
- 3 brand templates
- 5 kênh cơ bản
- 1 Industry Pack
- Community support
**Phù hợp**: Freelancer, cá nhân mới bắt đầu

### 💼 Professional (990,000đ/tháng)
- Unlimited content
- 10 brand templates
- Tất cả kênh
- 5 Industry Packs
- Video Scripts & Carousel
- Priority support
- Team collaboration (3 members)
**Phù hợp**: SME, Marketing team nhỏ

### 🏢 Enterprise (Liên hệ)
- Mọi tính năng Professional
- Unlimited brands & packs
- Custom AI training
- API access
- SSO integration
- Dedicated account manager
- SLA 99.9%
- On-premise option
**Phù hợp**: Agency, Enterprise, Tập đoàn

## CÂU HỎI THƯỜNG GẶP

### Flowa có phù hợp với ngành của tôi không?
Có! Với 42+ Industry Packs, Flowa cover hầu hết các ngành từ Y tế, Tài chính, BĐS đến F&B, Giáo dục, Thời trang. Mỗi pack được xây dựng bởi chuyên gia ngành với compliance rules cập nhật.

### Tôi có thể dùng thử miễn phí không?
Hoàn toàn có! Gói Starter miễn phí vĩnh viễn với 100 content/tháng, đủ để bạn trải nghiệm sức mạnh của Flowa.

### AI có giữ đúng tone thương hiệu không?
Chắc chắn! Flowa học từ brand guidelines, sample texts, preferred words của bạn. AI sẽ viết đúng phong cách thương hiệu qua mọi nội dung.

### Có hỗ trợ tiếng Việt không?
Flowa được xây dựng tại Việt Nam, tối ưu cho tiếng Việt với tone và ngữ cảnh phù hợp. Hỗ trợ cả Anh và Thái.

### Làm sao để bắt đầu?
Chỉ cần đăng ký tài khoản miễn phí, khai báo brand template đầu tiên, và bắt đầu tạo content ngay!

### Có training hoặc hướng dẫn không?
Có! Flowa có onboarding tour, help center, video tutorials, và đội ngũ support sẵn sàng hỗ trợ.

### Dữ liệu có được bảo mật không?
Tuyệt đối! Flowa sử dụng mã hóa end-to-end, tuân thủ GDPR, và không chia sẻ dữ liệu với bên thứ 3.

### Có thể hủy subscription không?
Có thể hủy bất kỳ lúc nào. Không ràng buộc hợp đồng dài hạn.

## ĐÁNH GIÁ TỪ KHÁCH HÀNG

"Flowa giúp team tôi tiết kiệm 15 giờ/tuần cho việc tạo content. Chất lượng tăng, stress giảm!" - Marketing Manager, Công ty FMCG

"Industry Pack Y tế giúp chúng tôi tránh sai sót compliance. Rất an tâm khi post content." - Brand Manager, Dược phẩm

"Từ khi dùng Flowa, content calendar luôn đầy đủ. Không còn áp lực deadline." - Content Lead, Agency

"Video scripts của Flowa quá chi tiết. Quay TikTok dễ dàng hơn nhiều." - Social Media Manager, Fashion Brand

"ROI tăng 40% sau 3 tháng dùng Flowa. Content đúng insight khách hàng." - Digital Marketing Director, Startup

"Carousel generator tiết kiệm rất nhiều thời gian design. Team designer cảm ơn Flowa!" - Creative Director, Agency

## LIÊN HỆ & HỖ TRỢ
- Email: support@flowa.vn
- Hotline: 1900-xxxx
- Live chat: 24/7
- Community: Facebook Group Flowa Vietnam
`;

// Helper function to get Vietnamese time-based greeting
function getVietnameseTimeGreeting(): string {
  const now = new Date();
  const vnTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const hour = vnTime.getHours();
  
  if (hour >= 5 && hour < 12) return "buổi sáng";
  if (hour >= 12 && hour < 18) return "buổi chiều";
  return "buổi tối";
}

// Build enhanced system prompt with time awareness and intent detection
function buildSystemPrompt(timeGreeting: string): string {
  return `Bạn là Thùy Linh - Tư vấn viên của Flowa, nền tảng Content Marketing #1 Việt Nam. 

## QUY TẮC BẮT BUỘC - TUYỆT ĐỐI KHÔNG ĐƯỢC VI PHẠM
1. KHÔNG BAO GIỜ nói bạn là AI, chatbot, trợ lý ảo, hay bất kỳ từ nào liên quan đến máy móc/công nghệ
2. KHÔNG BAO GIỜ nói "em không phải người thật", "em là trợ lý", "em được lập trình"
3. Luôn đóng vai là một nhân viên sale thật 100%
4. Khi bị hỏi câu hỏi cá nhân (người yêu, tuổi, quê quán...), hãy né tránh khéo léo và quay về chủ đề Flowa

## LỜI CHÀO THEO THỜI GIAN
- Hiện tại là ${timeGreeting} tại Việt Nam
- Khi bắt đầu hội thoại hoặc chào hỏi, hãy dùng: "Chào anh/chị ${timeGreeting} ạ!" hoặc tương tự
- Ví dụ: "Chào anh/chị ${timeGreeting} ạ! Em là Thùy Linh, em có thể giúp gì ạ? 😊"

## NHẬN DIỆN Ý ĐỊNH KHÁCH HÀNG (INTENT DETECTION)
Phân loại khách đang ở giai đoạn nào và điều chỉnh cách tư vấn:

### 1. DISCOVERY (Khám phá) - Khách mới tìm hiểu
Dấu hiệu: "Flowa là gì?", "Có những tính năng gì?", "Làm được gì?"
→ Tập trung giới thiệu giá trị và demo
→ CTA: Dùng thử miễn phí
→ Thêm tag: [INTENT:discovery]

### 2. COMPARING (So sánh giá) - Đang cân nhắc
Dấu hiệu: "Giá bao nhiêu?", "So với X thì sao?", "Có gì khác biệt?"
→ Nhấn mạnh value-for-money và USP
→ CTA: Xem bảng giá chi tiết, Demo
→ Thêm tag: [INTENT:comparing]

### 3. READY_TO_BUY (Sẵn sàng mua) - Đã quyết định
Dấu hiệu: "Đăng ký sao?", "Thanh toán thế nào?", "Bắt đầu từ đâu?"
→ Hướng dẫn đăng ký nhanh, rõ ràng
→ CTA: Đăng ký ngay
→ Thêm tag: [INTENT:ready_to_buy]

### 4. SUPPORT (Hỗ trợ) - Cần giải đáp
Dấu hiệu: "Bị lỗi", "Không hiểu", "Cần hỗ trợ"
→ Giải đáp chi tiết, kiên nhẫn
→ CTA: Liên hệ support nếu cần
→ Thêm tag: [INTENT:support]

## XỬ LÝ PHẢN ĐỐI (OBJECTION HANDLING)
Khi gặp các phản đối, xử lý như sau:

### "Đắt quá" / "Giá cao"
→ Tag: [OBJECTION:expensive]
→ Xử lý:
- "Em hiểu ạ! Nhưng anh/chị thử tính xem: 1 content writer lương ~10-15 triệu/tháng, còn Flowa chỉ ~1 triệu mà tạo unlimited content 😊"
- "Với gói Starter miễn phí, anh/chị có thể dùng thử không mất gì. Thấy hiệu quả mới upgrade ạ!"
- Nhấn mạnh ROI: tiết kiệm 80% thời gian, 15 giờ/tuần

### "Để tôi suy nghĩ" / "Tôi sẽ cân nhắc"
→ Tag: [OBJECTION:will_consider]
→ Xử lý:
- "Dạ tất nhiên rồi ạ! Em gợi ý anh/chị đăng ký gói miễn phí để trải nghiệm trước, không cần quyết định ngay 😊"
- Cung cấp thêm social proof, case studies
- Đề xuất follow-up: "Anh/chị có câu hỏi gì thêm em giải đáp luôn ạ!"

### "Tôi đang dùng tool khác rồi"
→ Tag: [OBJECTION:competitor]
→ Xử lý:
- "Dạ hay quá! Anh/chị đang dùng tool nào ạ? Để em so sánh xem Flowa có gì khác biệt nhé 😊"
- Nhấn mạnh Industry Pack - điểm khác biệt lớn nhất
- "Nhiều khách hàng chuyển từ [tool khác] sang Flowa vì tính năng compliance và brand voice AI ạ"

### "Chưa cần" / "Không phải lúc này"
→ Tag: [OBJECTION:not_now]
→ Xử lý:
- "Dạ không sao ạ! Khi nào anh/chị cần, Flowa vẫn ở đây 😊"
- "Em gửi link trang chủ để anh/chị tham khảo khi cần nhé!"
- Không ép buộc, giữ thiện cảm

## CÁCH XỬ LÝ CÂU HỎI CÁ NHÂN
Khi khách hỏi về đời tư (có người yêu chưa, bao nhiêu tuổi, ở đâu...):
- Cười trừ, né tránh nhẹ nhàng: "Dạ anh/chị ơi, em đang trong giờ làm việc nên tập trung tư vấn cho anh/chị trước ạ 😊"
- Hoặc: "Hí hí, anh/chị hỏi khó em quá! Để em tập trung tư vấn Flowa cho anh/chị nhé ạ"
- Sau đó quay về chủ đề chính

## THÔNG TIN VỀ FOUNDER
Khi khách nhắc đến "anh Duy", "Duy", "anh Phương Duy", "Phương Duy":
- Đây là Founder/Nhà sáng lập của Flowa
- Trả lời: "Dạ anh Phương Duy là Founder của Flowa ạ! Anh ấy là người sáng lập và phát triển nền tảng Flowa từ những ngày đầu tiên đó anh/chị ạ 😊"

## TÍNH CÁCH & PHONG CÁCH
- Xưng "em", gọi khách hàng là "anh/chị" - mềm mỏng, lịch sự kiểu nhân viên sale Việt Nam
- Thân thiện, nhiệt tình, chu đáo như một cô gái trẻ năng động
- Luôn lắng nghe và thấu hiểu nhu cầu khách hàng
- Tư vấn nhẹ nhàng, không ép buộc hay aggressive selling
- Sử dụng emoji phù hợp để tạo cảm giác gần gũi (nhưng không quá nhiều)
- Kết thúc câu bằng "ạ" để thể hiện sự lịch sự

## NHIỆM VỤ
1. Giới thiệu và tư vấn về Flowa
2. Giải đáp mọi thắc mắc về tính năng, giá cả, ngành nghề
3. Hướng dẫn đăng ký và sử dụng
4. Đề xuất gói phù hợp với nhu cầu khách hàng
5. Luôn hướng đến CTA: Đăng ký dùng thử miễn phí

## KIẾN THỨC
${FLOWA_KNOWLEDGE_BASE}

## QUY TẮC TRẢ LỜI
1. Trả lời ngắn gọn, đúng trọng tâm (2-4 đoạn)
2. Sử dụng bullet points và emoji để dễ đọc
3. Luôn kết thúc bằng câu hỏi mở hoặc CTA
4. Nếu không chắc chắn, hướng dẫn liên hệ support

## FORMAT ĐẶC BIỆT
- Khi muốn hiển thị nút CTA, dùng: [CTA:ACTION|Text hiển thị]
  - ACTION có thể là: REGISTER, PRICING, DEMO, CONTACT
- Khi muốn gợi ý câu hỏi tiếp theo, dùng: [SUGGEST:Câu hỏi gợi ý]
- Khi phát hiện intent, thêm: [INTENT:loại_intent] (discovery, comparing, ready_to_buy, support)
- Khi gặp objection, thêm: [OBJECTION:loại_objection] (expensive, will_consider, competitor, not_now)
- Để đánh giá sentiment tin nhắn user: [SENTIMENT:positive/neutral/negative]
- Để phân loại topic: [TOPIC:pricing/features/industry/integration/support/other]

## VÍ DỤ RESPONSE
"Chào anh/chị ${timeGreeting} ạ! 👋

Dạ, Flowa hoàn toàn phù hợp với ngành BĐS của anh/chị luôn ạ! 🏠

✅ **Industry Pack BĐS** bao gồm:
- Compliance rules về quảng cáo dự án
- Templates cho từng loại content
- Best practices từ top agencies

Anh/chị có muốn em giới thiệu chi tiết hơn không ạ?

[INTENT:discovery]
[TOPIC:industry]
[SENTIMENT:positive]
[CTA:REGISTER|Đăng ký dùng thử miễn phí]
[SUGGEST:Giá gói Professional là bao nhiêu?]
[SUGGEST:Có template sẵn cho BĐS không?]"

Hãy trả lời bằng tiếng Việt, thân thiện và mềm mỏng như một nhân viên sale chuyên nghiệp!`;
}

// Parse response metadata (intent, objection, sentiment, topic)
function parseResponseMetadata(content: string): {
  intent?: string;
  objection?: string;
  sentiment?: string;
  topic?: string;
} {
  const metadata: {
    intent?: string;
    objection?: string;
    sentiment?: string;
    topic?: string;
  } = {};
  
  const intentMatch = content.match(/\[INTENT:(\w+)\]/);
  if (intentMatch) metadata.intent = intentMatch[1];
  
  const objectionMatch = content.match(/\[OBJECTION:(\w+)\]/);
  if (objectionMatch) metadata.objection = objectionMatch[1];
  
  const sentimentMatch = content.match(/\[SENTIMENT:(\w+)\]/);
  if (sentimentMatch) metadata.sentiment = sentimentMatch[1];
  
  const topicMatch = content.match(/\[TOPIC:(\w+)\]/);
  if (topicMatch) metadata.topic = topicMatch[1];
  
  return metadata;
}

// Detect high-interest signals for lead capture
function detectLeadSignals(messages: Array<{ role: string; content: string }>): {
  interestLevel: string;
  interestedFeatures: string[];
  shouldCaptureLead: boolean;
} {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
  const allText = userMessages.join(' ');
  
  let interestLevel = 'low';
  const interestedFeatures: string[] = [];
  let shouldCaptureLead = false;
  
  // High interest signals
  const highInterestPatterns = [
    /đăng ký|đăng kí|mua|thanh toán|bắt đầu|trial|dùng thử/,
    /giá bao nhiêu|báo giá|gói nào|chi phí/,
    /liên hệ|tư vấn|demo|gặp/,
    /công ty tôi|team tôi|doanh nghiệp/,
  ];
  
  const mediumInterestPatterns = [
    /ngành.*của tôi|phù hợp|có hỗ trợ/,
    /tính năng|làm được gì|so với/,
    /carousel|video|script|content/,
  ];
  
  // Feature detection
  if (/carousel/i.test(allText)) interestedFeatures.push('carousel');
  if (/video|script|tiktok|reels/i.test(allText)) interestedFeatures.push('video_scripts');
  if (/multi.*channel|đa kênh|nhiều kênh/i.test(allText)) interestedFeatures.push('multichannel');
  if (/industry|ngành|compliance/i.test(allText)) interestedFeatures.push('industry_packs');
  if (/team|nhóm|cộng tác/i.test(allText)) interestedFeatures.push('team_collaboration');
  if (/api|integration|tích hợp/i.test(allText)) interestedFeatures.push('api_integration');
  
  // Determine interest level
  const highMatches = highInterestPatterns.filter(p => p.test(allText)).length;
  const mediumMatches = mediumInterestPatterns.filter(p => p.test(allText)).length;
  
  if (highMatches >= 2 || (highMatches >= 1 && mediumMatches >= 2)) {
    interestLevel = 'very_high';
    shouldCaptureLead = true;
  } else if (highMatches >= 1 || mediumMatches >= 2) {
    interestLevel = 'high';
    shouldCaptureLead = userMessages.length >= 3;
  } else if (mediumMatches >= 1) {
    interestLevel = 'medium';
  }
  
  return { interestLevel, interestedFeatures, shouldCaptureLead };
}

// Generate conversation summary for lead
function generateConversationSummary(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .slice(-5); // Last 5 messages
  
  return userMessages.join(' | ').slice(0, 500);
}

Deno.serve(withPerf({ functionName: 'sales-chatbot' }, async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId, visitorId, action, leadData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Initialize Supabase client
    let supabase = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }

    // Handle special actions
    if (action === 'save_lead' && supabase) {
      console.log("[sales-chatbot] Saving lead:", leadData);
      try {
        const { error } = await supabase.from('sales_chat_leads').upsert({
          session_id: sessionId,
          visitor_id: visitorId,
          name: leadData?.name,
          email: leadData?.email,
          phone: leadData?.phone,
          interest_level: leadData?.interestLevel || 'medium',
          interested_features: leadData?.interestedFeatures || [],
          conversation_summary: leadData?.conversationSummary,
          source_url: leadData?.sourceUrl,
          handoff_requested: leadData?.handoffRequested || false,
          handoff_platform: leadData?.handoffPlatform,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id' });
        
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.error("[sales-chatbot] Failed to save lead:", err);
        return new Response(
          JSON.stringify({ error: "Failed to save lead" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === 'request_handoff' && supabase) {
      console.log("[sales-chatbot] Handoff requested:", leadData?.platform);
      try {
        await supabase.from('sales_chat_leads').upsert({
          session_id: sessionId,
          visitor_id: visitorId,
          handoff_requested: true,
          handoff_platform: leadData?.platform,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id' });
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.error("[sales-chatbot] Failed to log handoff:", err);
      }
    }
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("[sales-chatbot] Processing request with", messages.length, "messages", "session:", sessionId);

    // Detect lead signals
    const leadSignals = detectLeadSignals(messages);
    console.log("[sales-chatbot] Lead signals:", leadSignals);

    // Get time-aware greeting
    const timeGreeting = getVietnameseTimeGreeting();
    
    // Initialize PromptManager and fetch system prompt from registry
    let systemPrompt = buildSystemPrompt(timeGreeting); // Fallback to hardcoded
    if (supabase) {
      try {
        const pm = createPromptManager(supabase, 'sales-chatbot');
        systemPrompt = await pm.get('system', {
          timeGreeting,
          knowledgeBase: FLOWA_KNOWLEDGE_BASE,
        });
        console.log('[sales-chatbot] Using prompt from registry');
      } catch (pmErr) {
        console.warn('[sales-chatbot] PromptManager fallback to hardcoded:', pmErr);
      }
    }

    // Get AI config from Admin Panel (no organizationId for public chatbot)
    const aiConfig = await getAIConfig('sales-chatbot');
    const adminModel = aiConfig?.model || undefined;

    // Use multi-provider system
    const aiResult = await callAIProvider({
      functionName: 'sales-chatbot',
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      modelOverride: adminModel,
      maxTokensOverride: aiConfig?.max_tokens || 1024,
      temperatureOverride: aiConfig?.temperature || 0.7,
      stream: true,
    });

    if (!aiResult.success) {
      console.error("[sales-chatbot] AI error:", aiResult.error);
      
      if (aiResult.error?.includes('429') || aiResult.error?.includes('rate')) {
        return new Response(
          JSON.stringify({ error: "Hệ thống đang bận, vui lòng thử lại sau ít phút." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResult.error?.includes('402')) {
        return new Response(
          JSON.stringify({ error: "Đã hết quota, vui lòng liên hệ support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Có lỗi xảy ra, vui lòng thử lại." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For streaming, aiResult.data contains the response body stream
    const streamBody = aiResult.data;

    // Track analytics in background (non-blocking)
    if (supabase && sessionId) {
      const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
      
      // Log user message to analytics
      if (lastUserMessage) {
        try {
          await supabase.from('sales_chat_messages_log').insert({
            session_id: sessionId,
            role: 'user',
            content: lastUserMessage.content,
          });
          console.log("[sales-chatbot] User message logged");
        } catch (err) {
          console.error("[sales-chatbot] Failed to log user message:", err);
        }
      }
      
      // Update or create session analytics with lead info
      try {
        await supabase.from('sales_chat_analytics').upsert({
          session_id: sessionId,
          visitor_id: visitorId,
          message_count: messages.length,
          user_message_count: messages.filter((m: { role: string }) => m.role === 'user').length,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'session_id',
        });
        console.log("[sales-chatbot] Session analytics updated");
      } catch (err) {
        console.error("[sales-chatbot] Failed to update analytics:", err);
      }

      // Auto-save lead if high interest detected
      if (leadSignals.shouldCaptureLead) {
        try {
          await supabase.from('sales_chat_leads').upsert({
            session_id: sessionId,
            visitor_id: visitorId,
            interest_level: leadSignals.interestLevel,
            interested_features: leadSignals.interestedFeatures,
            conversation_summary: generateConversationSummary(messages),
            source_url: 'landing',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'session_id' });
          console.log("[sales-chatbot] Lead auto-saved");
        } catch (err) {
          console.error("[sales-chatbot] Failed to auto-save lead:", err);
        }
      }
    }

    // Save AI metrics with cost
    try {
      if (supabase) {
        const model = 'google/gemini-2.5-flash';
        const inputTokensEstimated = 4000; // Large knowledge base prompt
        const outputTokensEstimated = 400;
        const estimatedCostUsd = estimateCost(model, inputTokensEstimated, outputTokensEstimated);
        
        await saveMetrics(supabase, {
          traceId: generateTraceId(),
          functionName: 'sales-chatbot',
          totalDurationMs: 0,
          inputTokensEstimated,
          outputTokensEstimated,
          modelsUsed: { default: model },
          estimatedCostUsd,
          hadError: false,
          contextSources: ['flowa_knowledge_base'],
        });
      }
    } catch (metricsErr) {
      console.warn('[sales-chatbot] Failed to save metrics:', metricsErr);
    }

    // Return streaming response with lead signals in header
    return new Response(streamBody, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "X-Lead-Interest": leadSignals.interestLevel,
        "X-Should-Capture": String(leadSignals.shouldCaptureLead),
      },
    });

  } catch (error) {
    console.error("[sales-chatbot] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
