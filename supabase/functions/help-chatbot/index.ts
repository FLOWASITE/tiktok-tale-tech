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

// Helper function to search help articles
async function searchHelpArticles(query: string, currentRoute?: string): Promise<{ title: string; content: string }[]> {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log("[help-chatbot] Missing Supabase config for article search");
      return [];
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Call the help-article-search edge function
    const { data, error } = await supabase.functions.invoke('help-article-search', {
      body: { 
        query, 
        currentRoute,
        limit: 3 
      }
    });

    if (error) {
      console.error("[help-chatbot] Article search error:", error);
      return [];
    }

    return data?.articles || [];
  } catch (err) {
    console.error("[help-chatbot] Failed to search articles:", err);
    return [];
  }
}

// Comprehensive Knowledge Base for system guidance
const KNOWLEDGE_BASE = `
## TÍNH NĂNG CHÍNH

### 1. Brand Template (Bộ quy chuẩn thương hiệu)
- **Đường dẫn**: /brands, /brands/new
- **Thành phần**:
  - **Identity**: Tên thương hiệu, positioning, industry, logo, màu sắc
  - **Brand DNA**: Mission (sứ mệnh), Vision (tầm nhìn), UVP (giá trị độc đáo), Tagline
  - **Tone of Voice**: Phong cách giao tiếp, formality level (formal/casual), từ ngữ ưu tiên/cấm
  - **Content Pillars**: Các chủ đề nội dung chính của thương hiệu
  - **Customer Personas**: Chân dung khách hàng với demographics, pain points, desires
  - **Products**: Sản phẩm với USP, benefits, best channels
  - **Product-Persona Mapping**: Liên kết sản phẩm với persona phù hợp (relevance score, custom pitch)
  - **Journey Stage Messaging**: Nội dung theo giai đoạn funnel (Awareness → Consideration → Decision → Loyalty)
  - **Brand Voice Variants**: Nhiều biến thể giọng văn cho cùng brand
  - **Footer Info**: Thông tin chân trang (hotline, địa chỉ, disclaimer)
- **Bước tạo**: Vào Brands → "Tạo Brand mới" → Quick Start (paste URL để AI phân tích) hoặc điền thủ công 6 bước
- **Brand Completeness**: Hệ thống tính điểm hoàn thiện 0-100%, cần ít nhất 25% để AI hoạt động

### 2. AI Kho Ý Tưởng (Topics Hub)
- **Đường dẫn**: /topics
- **Tính năng cơ bản**:
  - AI Chatbot để brainstorm ý tưởng
  - Phân tích trends ngành
  - Tạo content ideas theo brand guidelines
- **Tính năng nâng cao**:
  - **RAG**: AI tìm kiếm ngữ nghĩa trong lịch sử hội thoại
  - **Web Search**: Tích hợp tìm kiếm trending, tin tức ngành real-time
  - **Session Learning**: AI học từ phản hồi và chỉnh sửa của bạn
  - **Context Bank**: Favorites, top performers, upcoming events
  - **Discovery Feed**: Trend alerts, seasonal events, gợi ý theo lịch
  - **Performance Dashboard**: Theo dõi hiệu suất topic
  - **Topic Bank**: Lưu và quản lý ý tưởng (draft/suggested/used/rejected)
  - **Industry Memory**: Kiến thức ngành tự động inject vào AI

### 3. Tạo Nội dung Đa kênh (Multi-Channel)
- **Đường dẫn**: /multichannel, /multichannel/new
- **Kênh hỗ trợ**: Facebook, Instagram, LinkedIn, TikTok, Twitter, Threads, YouTube, Website, Email, Zalo
- **Tính năng**:
  - Chọn persona và journey stage để AI tạo nội dung phù hợp
  - **Streaming generation**: Xem nội dung tạo real-time
  - **Image generation**: Tạo hình AI với overlay logo
  - **Marketing Frameworks**: AIDA, PAS, BAB, 4Ps, FAB, v.v.
  - **Content Purpose**: Educate, Entertain, Inspire, Promote, Engage
- **Bước tạo**: Chọn Brand → Chọn kênh → Nhập chủ đề → (tùy chọn) persona, journey stage → Generate → Edit → Schedule/Publish

### 4. Scripts (Kịch bản Video)
- **Đường dẫn**: /scripts
- **Tính năng**:
  - Tạo kịch bản cho TikTok, Reels, Shorts, YouTube
  - Chọn duration (15s, 30s, 60s, 90s+)
  - **Storyboard**: Visual prompts cho từng scene
  - **Hook Templates**: Thư viện câu mở đầu thu hút
  - **Script Analysis**: Phân tích điểm mạnh/yếu
  - Tích hợp persona và journey stage

### 5. Carousel Design
- **Đường dẫn**: /carousel
- **Tính năng**:
  - Thiết kế carousel cho Instagram, LinkedIn
  - AI generate nội dung slides từ topic
  - Apply brand colors và fonts tự động
  - Export nhiều format (PNG, PDF)
  - Chọn số slides (3-10)

### 6. Content Calendar
- **Đường dẫn**: /calendar
- **Tính năng**:
  - Xem lịch theo ngày/tuần/tháng
  - **Drag & drop** thay đổi lịch đăng
  - Bulk scheduling từ Topics
  - Publishing status: scheduled/published/failed
  - Filter theo kênh và trạng thái

### 7. Organization Settings
- **Đường dẫn**: /organization
- **Tính năng**: 
  - Mời thành viên vào team
  - Phân quyền: Admin/Creator/Viewer
  - Quản lý billing và subscription

### 8. Account Settings
- **Đường dẫn**: /account
- **Tính năng**: Đổi mật khẩu, cập nhật profile, preferences

---

## ADMIN FEATURES (chỉ dành cho Admin)

### AI Management Center (/admin → AI Management tab)
- **Dashboard**: Tổng quan chi phí, usage, trends
- **Providers**: Cấu hình API keys (OpenAI, Anthropic, Gemini, OpenRouter)
- **Functions**: Model và parameters cho từng chức năng AI
- **Channels**: Cấu hình AI model riêng cho từng kênh social (priority system)
- **Metrics**: Analytics chi tiết về AI calls
- **Cache**: Quản lý AI response cache

### Industry Templates (/admin/industries)
- Quản lý industry templates với compliance rules
- Multi-language support (translations)
- Industry glossary và personas mẫu
- Forbidden/preferred words theo ngành

### Countries & Categories
- Quản lý danh sách quốc gia active
- Phân loại industry categories

---

## WORKFLOWS THƯỜNG GẶP

### Workflow 1: Tạo brand mới hoàn chỉnh
1. /brands/new → Quick Start với website URL (AI phân tích tự động)
2. Hoặc điền thủ công: Identity → Personas → Products → Voice → Channels → Hoàn tất
3. Thiết lập Product-Persona Mapping (quan trọng!)
4. Thêm Journey Stage Messaging cho từng mapping
5. Tạo Brand Voice Variants nếu cần đa dạng

### Workflow 2: Từ ý tưởng đến nội dung
1. /topics → Chat với AI để brainstorm
2. Lưu topic vào Bank hoặc "Tạo nội dung" trực tiếp
3. /multichannel/new → Chọn kênh, persona, journey stage
4. AI tạo content với context đầy đủ
5. Edit nếu cần → /calendar → Lên lịch đăng

### Workflow 3: Tối ưu AI theo ngành
1. Brand Template → Chọn Industry Template phù hợp
2. Industry Memory được inject vào AI prompts tự động
3. Compliance rules và preferred words tự động áp dụng
4. Có thể tùy chỉnh thêm forbidden words riêng

### Workflow 4: Tạo video script nhanh
1. /scripts → "Tạo kịch bản mới"
2. Chọn brand, platform, duration
3. Nhập topic/hook → AI generate storyboard
4. Review và edit từng scene
5. Export hoặc copy script

---

## THUẬT NGỮ

### Cơ bản
- **Brand Template**: Bộ quy chuẩn thương hiệu
- **Content Pillars**: Chủ đề nội dung chính
- **Tone of Voice**: Phong cách giao tiếp
- **Personas**: Chân dung khách hàng mục tiêu
- **Multi-Channel**: Tạo nội dung cho nhiều kênh

### Nâng cao
- **RAG**: Retrieval Augmented Generation - AI tìm kiếm ngữ nghĩa trong lịch sử
- **Journey Stage**: Giai đoạn hành trình khách hàng (Awareness → Consideration → Decision → Loyalty)
- **Product-Persona Mapping**: Liên kết sản phẩm với đối tượng khách hàng phù hợp
- **Brand Voice Variant**: Biến thể giọng văn cho các ngữ cảnh khác nhau
- **Industry Memory**: Kiến thức ngành được inject vào AI (compliance, preferred words)
- **Streaming Generation**: Tạo nội dung real-time, xem từng phần khi AI viết
- **Storyboard**: Kịch bản video với visual prompts cho từng scene
- **Hook**: Câu mở đầu thu hút cho video ngắn
- **Content Purpose**: Mục đích nội dung (educate, entertain, inspire, promote)
- **Marketing Framework**: Công thức viết content (AIDA, PAS, BAB, v.v.)

---

## FAQ

### Tổng quan
- **Hệ thống này làm gì?** → Quản lý content marketing với AI hỗ trợ: từ branding, ý tưởng, đến tạo nội dung đa kênh
- **Bắt đầu từ đâu?** → Tạo Brand Template trước, sau đó dùng AI Kho Ý Tưởng để brainstorm

### Brand Template
- **Tại sao cần Brand Template?** → Đây là "bộ não" cho AI, giúp tạo nội dung đúng tone và target audience
- **Brand Completeness thấp thì sao?** → AI sẽ không hoạt động nếu dưới 25%, cần điền thêm thông tin
- **Muốn AI viết đúng giọng hơn?** → Thêm Sample Texts (ví dụ bài viết mẫu) vào Brand Template

### AI Chatbot
- **AI không đúng tone?** → Kiểm tra Brand Template, đặc biệt là Tone of Voice và Sample Texts
- **AI không biết tin tức mới?** → Dùng lệnh "search" hoặc hỏi về trending để AI tìm kiếm web
- **Muốn AI nhớ preferences?** → AI tự động học từ phản hồi, hoặc vào User Preferences để thiết lập

### Multi-Channel
- **Muốn tạo nhiều kênh cùng lúc?** → Chọn nhiều kênh trong Multi-Channel Content
- **Nội dung không phù hợp kênh?** → Chọn đúng Journey Stage và Persona
- **Muốn thêm ảnh AI?** → Bật Image Generation khi tạo nội dung

### Tổ chức
- **Mời thành viên?** → Vào Organization Settings → Mời thành viên
- **Phân quyền thế nào?** → Admin (full), Creator (tạo/edit), Viewer (chỉ xem)
`;

const SYSTEM_PROMPT = `Bạn là Trợ lý Hướng dẫn của hệ thống quản lý content marketing.

NHIỆM VỤ:
- Trả lời câu hỏi về cách sử dụng hệ thống
- Hướng dẫn từng bước các tính năng
- Giải thích thuật ngữ
- Đề xuất tính năng phù hợp với nhu cầu người dùng

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}

COACHMARK TOUR IDs (dùng để hướng dẫn trực quan):
- dashboard: Tour tổng quan Dashboard
- brand-creation: Tour tạo Brand (6 bước)
- brand-personas: Tour thiết lập Personas
- brand-products: Tour thêm Products
- brand-journey: Tour Journey Stage Messaging
- content-creation: Tour tạo nội dung đa kênh
- ai-chatbot: Tour sử dụng AI Chatbot
- topic-bank: Tour quản lý Topic Bank
- calendar: Tour lịch nội dung
- scripts: Tour kịch bản video
- carousel: Tour carousel design
- admin-ai: Tour AI Management (admin only)

QUY TẮC:
1. Trả lời ngắn gọn, dễ hiểu bằng tiếng Việt
2. Sử dụng bullet points hoặc số thứ tự cho hướng dẫn nhiều bước
3. Nếu có route phù hợp, đề xuất: "[ACTION:NAVIGATE:/path|Text hiển thị]"
4. Nếu cần xem hướng dẫn trực quan, đề xuất: "[ACTION:COACHMARK:tourId|Xem hướng dẫn]"
5. Luôn thân thiện và hữu ích
6. Nếu không biết câu trả lời, hãy nói thật và đề xuất liên hệ support
7. QUAN TRỌNG: Cuối mỗi response, đề xuất 2-3 câu hỏi liên quan để user có thể hỏi tiếp, dùng format:
   [SUGGEST:câu hỏi gợi ý 1]
   [SUGGEST:câu hỏi gợi ý 2]

VÍ DỤ RESPONSE:
"Để tạo brand mới, bạn làm theo các bước sau:
1. Vào trang **Brands** từ menu
2. Click nút **Tạo Brand mới**
3. Điền thông tin cơ bản

[ACTION:NAVIGATE:/brands/new|Đi tạo Brand ngay]
[ACTION:COACHMARK:brand-creation|Xem hướng dẫn trực quan]

[SUGGEST:Làm sao để tối ưu brand template?]
[SUGGEST:Có thể tạo bao nhiêu brand?]"`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, currentRoute, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for PromptManager
    let supabase = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }

    // Get the latest user message for article search
    const latestUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content || '';
    
    // Search for relevant help articles
    const relevantArticles = await searchHelpArticles(latestUserMessage, currentRoute);
    console.log(`[help-chatbot] Found ${relevantArticles.length} relevant articles`);

    // Initialize PromptManager and fetch system prompt from registry
    let baseSystemPrompt = SYSTEM_PROMPT; // Fallback to hardcoded
    if (supabase) {
      try {
        const pm = createPromptManager(supabase, 'help-chatbot');
        baseSystemPrompt = await pm.get('system', {
          knowledgeBase: KNOWLEDGE_BASE,
        });
        console.log('[help-chatbot] Using prompt from registry');
      } catch (pmErr) {
        console.warn('[help-chatbot] PromptManager fallback to hardcoded:', pmErr);
      }
    }

    // Build context-aware system prompt
    let contextPrompt = baseSystemPrompt;
    
    // Add dynamic help articles if found
    if (relevantArticles.length > 0) {
      contextPrompt += `\n\n## BÀI VIẾT HƯỚNG DẪN LIÊN QUAN:\n`;
      relevantArticles.forEach((article, i) => {
        contextPrompt += `### ${i + 1}. ${article.title}\n${article.content}\n\n`;
      });
      contextPrompt += `**Ưu tiên** sử dụng thông tin từ các bài viết trên nếu phù hợp với câu hỏi của user.\n`;
    }
    
    // Add route context
    if (currentRoute) {
      contextPrompt += `\n\nNGỮ CẢNH TRANG: User đang ở trang ${currentRoute}.`;
      
      // Route-specific guidance
      if (currentRoute.includes('/brands')) {
        contextPrompt += ' Ưu tiên hướng dẫn về Brand Template, Personas, Products, Voice settings.';
      } else if (currentRoute.includes('/multichannel')) {
        contextPrompt += ' Ưu tiên hướng dẫn về tạo nội dung, chọn kênh, personas, journey stages.';
      } else if (currentRoute.includes('/topics')) {
        contextPrompt += ' Ưu tiên hướng dẫn về AI Chatbot, brainstorm, Topic Bank, web search.';
      } else if (currentRoute.includes('/scripts')) {
        contextPrompt += ' Ưu tiên hướng dẫn về tạo kịch bản video, hooks, storyboard.';
      } else if (currentRoute.includes('/carousel')) {
        contextPrompt += ' Ưu tiên hướng dẫn về thiết kế carousel, slides, export.';
      } else if (currentRoute.includes('/calendar')) {
        contextPrompt += ' Ưu tiên hướng dẫn về scheduling, drag & drop, publishing.';
      } else if (currentRoute.includes('/admin')) {
        contextPrompt += ' User là Admin. Có thể hỏi về AI Management, Industry Templates, system settings.';
      }
    }
    
    // Add rich context if available
    if (context) {
      if (context.userRole === 'admin') {
        contextPrompt += '\n\nUSER ROLE: Admin - có quyền truy cập AI Management, Industry Templates.';
      }
      if (context.hasBrandSelected && context.brandInfo) {
        contextPrompt += `\n\nBRAND ĐANG CHỌN: "${context.brandInfo.name}"${context.brandInfo.industry ? ` (ngành: ${context.brandInfo.industry})` : ''}. Có thể đề cập đến brand này khi hướng dẫn.`;
      }
      if (context.recentPages && context.recentPages.length > 0) {
        contextPrompt += `\n\nTRANG VỪA XEM: ${context.recentPages.join(' → ')}`;
      }
    }

    console.log(`[help-chatbot] Processing request from route: ${currentRoute}, context:`, context ? JSON.stringify(context) : 'none');

    // Get AI config from Admin Panel (no organizationId for public chatbot)
    const aiConfig = await getAIConfig('help-chatbot');
    const adminModel = aiConfig?.model || undefined;

    // Use multi-provider system
    const aiResult = await callAIProvider({
      functionName: 'help-chatbot',
      messages: [
        { role: "system", content: contextPrompt },
        ...messages,
      ],
      modelOverride: adminModel,
      maxTokensOverride: aiConfig?.max_tokens || 1024,
      temperatureOverride: aiConfig?.temperature,
      stream: true,
    });

    if (!aiResult.success) {
      console.error(`[help-chatbot] AI error:`, aiResult.error);
      
      if (aiResult.error?.includes('429') || aiResult.error?.includes('rate')) {
        return new Response(JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResult.error?.includes('402')) {
        return new Response(JSON.stringify({ error: "Cần nạp thêm credits để sử dụng." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Lỗi kết nối AI, vui lòng thử lại." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For streaming, aiResult.data contains the response body stream
    const streamBody = aiResult.data;

    // Save AI metrics with cost
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const model = 'google/gemini-2.5-flash';
        const inputTokensEstimated = 3000; // Large knowledge base prompt
        const outputTokensEstimated = 300;
        const estimatedCostUsd = estimateCost(model, inputTokensEstimated, outputTokensEstimated);
        
        await saveMetrics(adminClient, {
          traceId: generateTraceId(),
          functionName: 'help-chatbot',
          totalDurationMs: 0,
          inputTokensEstimated,
          outputTokensEstimated,
          modelsUsed: { default: model },
          estimatedCostUsd,
          hadError: false,
          contextSources: relevantArticles.length > 0 ? ['help_articles'] : [],
        });
      }
    } catch (metricsErr) {
      console.warn('[help-chatbot] Failed to save metrics:', metricsErr);
    }

    return new Response(streamBody, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[help-chatbot] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
