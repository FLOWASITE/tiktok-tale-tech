import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCache, CACHE_TTL, CACHE_SCOPE } from "../_shared/cache-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// VIDEO TYPES - Labels and Instructions
// ============================================
const VIDEO_TYPE_LABELS: Record<string, string> = {
  // Educational
  expert_share: "Chuyên gia chia sẻ",
  tutorial_howto: "Hướng dẫn How-to",
  analyze_explain: "Phân tích giải thích",
  listicle: "Danh sách Tips",
  // Engagement
  warning_mistake: "Cảnh báo sai lầm",
  quick_qa: "Hỏi đáp nhanh",
  myth_busting: "Bóc phốt quan niệm",
  before_after: "So sánh Trước/Sau",
  // Entertainment
  story_pov: "Kể chuyện POV",
  day_in_life: "Một ngày của...",
  behind_scenes: "Hậu trường BTS",
  reaction: "Reaction/Commentary",
  // Commercial
  product_review: "Review sản phẩm",
  case_study: "Case Study",
  transformation: "Biến đổi/Kết quả",
};

const VIDEO_TYPE_INSTRUCTIONS: Record<string, string> = {
  // Educational
  expert_share: `
## THỂ LOẠI: CHUYÊN GIA CHIA SẺ (Expert Share)
- Cấu trúc: Hook authority → Chia sẻ 2-3 insights độc quyền → Tổng kết giá trị
- Tone: Tự tin, có authority, truyền tải giá trị
- Hook style: "Điều này ít ai biết...", "Sau 10 năm trong nghề, tôi nhận ra..."
- Mục tiêu: Người xem cảm thấy học được điều mới từ chuyên gia
- Đặc trưng: Đưa ra quan điểm rõ ràng, có ví dụ thực tế
`,
  tutorial_howto: `
## THỂ LOẠI: HƯỚNG DẪN HOW-TO (Tutorial)
- Cấu trúc: Hook vấn đề → Các bước rõ ràng (Step 1, 2, 3...) → Demo/kết quả
- Tone: Kiên nhẫn, rõ ràng, từng bước một
- Hook style: "Cách để...", "Làm thế nào để...", "Hướng dẫn đơn giản..."
- Mục tiêu: Người xem có thể làm theo ngay sau khi xem
- Đặc trưng: Numbered steps, repeat key points, check-in "Bạn làm được chưa?"
`,
  analyze_explain: `
## THỂ LOẠI: PHÂN TÍCH - GIẢI THÍCH (Deep Dive)
- Cấu trúc: Hook câu hỏi → Breakdown từng phần → Kết nối các ý → Tổng kết
- Tone: Logic, có hệ thống, deep dive
- Hook style: "Tại sao...?", "Điều gì đằng sau...?", "Hãy cùng phân tích..."
- Mục tiêu: Người xem hiểu SÂU một vấn đề, không chỉ bề mặt
- Đặc trưng: Dùng so sánh, metaphor để giải thích, có data nếu có
`,
  listicle: `
## THỂ LOẠI: DANH SÁCH TIPS (Listicle)
- Cấu trúc: Hook số lượng → List từng tip với number → Bonus tip/CTA
- Tone: Nhanh, năng lượng, dễ tiêu hóa
- Hook style: "5 điều bạn cần biết...", "Top 7...", "3 mẹo nhanh..."
- Mục tiêu: Mỗi tip là một giá trị độc lập, dễ nhớ
- Đặc trưng: Transition rõ ràng giữa các tips, có thể save để xem lại
`,
  // Engagement
  warning_mistake: `
## THỂ LOẠI: CẢNH BÁO - SAI LẦM (Warning)
- Cấu trúc: Hook shock → Nêu sai lầm cụ thể → Hậu quả → Cách tránh/khắc phục
- Tone: Cảnh báo nhưng không doạ dẫm, có giải pháp
- Hook style: "Đừng mắc sai lầm này!", "90% người làm sai...", "Sai lầm này có thể..."
- Mục tiêu: Người xem nhận ra và tránh được sai lầm
- Đặc trưng: Tạo FOMO, dùng số liệu về tỉ lệ mắc sai lầm
`,
  quick_qa: `
## THỂ LOẠI: HỎI - ĐÁP NHANH (Q&A)
- Cấu trúc: (Câu hỏi → Trả lời ngắn gọn) × nhiều lần
- Tone: Nhanh, năng lượng, không dài dòng
- Hook style: "Câu hỏi thường gặp nhất:", "Bạn hỏi, tôi trả lời..."
- Mục tiêu: Trả lời nhiều câu hỏi phổ biến trong thời gian ngắn
- Đặc trưng: Format "Q: ... A: ...", transition nhanh giữa các câu
`,
  myth_busting: `
## THỂ LOẠI: BÓC PHỐT QUAN NIỆM (Myth Busting)
- Cấu trúc: Hook myth → Nêu quan niệm sai → Bằng chứng phản bác → Sự thật
- Tone: Tự tin, có data, không chê bai người tin myth
- Hook style: "Bạn nghĩ điều này đúng? Sai rồi!", "Ai bảo bạn điều này?"
- Mục tiêu: Người xem thay đổi quan niệm sai thành đúng
- Đặc trưng: So sánh myth vs reality, dùng evidence
`,
  before_after: `
## THỂ LOẠI: TRƯỚC/SAU (Before & After)
- Cấu trúc: Hook kết quả → Show "trước" → Quá trình → Show "sau" → Takeaway
- Tone: Chân thực, inspiring, có proof
- Hook style: "Nhìn sự khác biệt này...", "Đây là sự thay đổi sau..."
- Mục tiêu: Người xem thấy transformation rõ ràng
- Đặc trưng: Visual contrast, timeline cụ thể, honest about effort
`,
  // Entertainment
  story_pov: `
## THỂ LOẠI: KỂ CHUYỆN POV (Storytelling)
- Cấu trúc: Hook tension → Build up → Climax → Resolution → Lesson
- Tone: Cảm xúc, kịch tính vừa đủ, authentic
- Hook style: "POV: Bạn là...", "Câu chuyện này đã thay đổi tôi..."
- Mục tiêu: Người xem cảm thấy kết nối, entertained, và học được gì đó
- Đặc trưng: First person narrative, emotional arc, relatable details
`,
  day_in_life: `
## THỂ LOẠI: MỘT NGÀY CỦA... (Day in Life)
- Cấu trúc: Morning hook → Timeline trong ngày → Key moments → Wrap up
- Tone: Casual, authentic, behind-the-scenes feel
- Hook style: "Một ngày làm việc của tôi", "Theo tôi qua một ngày..."
- Mục tiêu: Người xem thấy được real life, tạo connection
- Đặc trưng: Time stamps, mundane + interesting moments, personality shine
`,
  behind_scenes: `
## THỂ LOẠI: HẬU TRƯỜNG BTS (Behind the Scenes)
- Cấu trúc: Tease kết quả → Process reveal → Challenges → Final result
- Tone: Raw, honest, process-focused
- Hook style: "Đây là cách chúng tôi làm...", "Hậu trường của..."
- Mục tiêu: Người xem thấy effort và process, builds trust
- Đặc trưng: Show mistakes, real reactions, the "ugly" middle
`,
  reaction: `
## THỂ LOẠI: REACTION/COMMENTARY
- Cấu trúc: Intro context → Real-time reaction → Analysis → Opinion
- Tone: Genuine, opinionated, entertaining
- Hook style: "Phản ứng của tôi về...", "Ý kiến thật về trend này..."
- Mục tiêu: Entertainment + perspective mới về topic
- Đặc trưng: Authentic reactions, hot takes, personality-driven
`,
  // Commercial
  product_review: `
## THỂ LOẠI: REVIEW SẢN PHẨM
- Cấu trúc: Intro + expectations → Testing → Pros → Cons → Verdict
- Tone: Khách quan, honest, helpful
- Hook style: "Có nên mua không?", "Review trung thực...", "Sau X ngày dùng thử..."
- Mục tiêu: Người xem quyết định được có nên mua/dùng không
- Đặc trưng: So sánh với alternatives, specific use cases, price consideration
`,
  case_study: `
## THỂ LOẠI: CASE STUDY
- Cấu trúc: Hook kết quả → Context/Background → Strategy → Execution → Results → Takeaways
- Tone: Analytical, data-driven, educational
- Hook style: "Làm thế nào X đạt được Y...", "Phân tích chiến lược..."
- Mục tiêu: Người xem học được framework/strategy có thể apply
- Đặc trưng: Numbers, before/after, replicable insights
`,
  transformation: `
## THỂ LOẠI: BIẾN ĐỔI/KẾT QUẢ (Transformation)
- Cấu trúc: Hook end result → Starting point → Journey → Milestones → Final state
- Tone: Inspiring, motivating, honest about struggle
- Hook style: "Từ X đến Y trong Z thời gian", "Hành trình biến đổi của tôi..."
- Mục tiêu: Người xem inspired và believe transformation possible
- Đặc trưng: Timeline, specific metrics, emotional moments, lessons learned
`,
};

// ============================================
// CHARACTER TYPES - Labels and Instructions
// ============================================
const CHARACTER_TYPE_LABELS: Record<string, string> = {
  // Professional
  the_virtuoso: "Chuyên gia kỹ thuật",
  the_bellwether: "Người dẫn xu hướng",
  the_coach: "Người hướng dẫn",
  // Creative
  the_performer: "Người trình diễn",
  the_storyteller: "Người kể chuyện",
  the_iconoclast: "Người phá khuôn",
  // Technical
  the_technophile: "Tech Expert",
  the_analyst: "Người phân tích",
  // Passionate
  the_enthusiast: "Người đam mê",
  the_maker: "Nhà sáng tạo",
  // Neutral
  neutral_presenter: "Người dẫn trung tính",
};

const CHARACTER_TYPE_INSTRUCTIONS: Record<string, string> = {
  // Professional
  the_virtuoso: `
## VAI TRÒ: THE VIRTUOSO (Chuyên gia kỹ thuật)
- Xưng hô: "Tôi" với authority
- Personality: Master in field, technical depth, respected authority
- Giọng điệu: Tự tin tuyệt đối, chính xác, chi tiết kỹ thuật
- Cách nói: "Dựa trên kinh nghiệm...", "Về mặt kỹ thuật...", "Điều quan trọng nhất là..."
- Đặc trưng: Deep expertise, precise terminology, backed by experience
- Body language: Calm, steady, authoritative gestures when emphasizing
`,
  the_bellwether: `
## VAI TRÒ: THE BELLWETHER (Người dẫn xu hướng)
- Xưng hô: "Tôi" hoặc tên riêng
- Personality: Trend-setter, early adopter, industry insider
- Giọng điệu: Tiên phong, có tầm nhìn, ahead of the curve
- Cách nói: "Xu hướng mới nhất...", "Tôi đã thấy điều này coming...", "Trong 6 tháng tới..."
- Đặc trưng: Predictive insights, first-mover knowledge, exclusive info
- Body language: Confident, slightly forward-leaning, engaging eye contact
`,
  the_coach: `
## VAI TRÒ: THE COACH (Người hướng dẫn)
- Xưng hô: "Tôi" hoặc "mình" gần gũi
- Personality: Supportive mentor, patient teacher, encouraging
- Giọng điệu: Kiên nhẫn, động viên, step-by-step
- Cách nói: "Bạn có thể làm được...", "Hãy bắt đầu từ...", "Đừng lo, ai cũng từng như vậy..."
- Đặc trưng: Empathy, clear instructions, celebrates small wins
- Body language: Open, nodding, encouraging hand gestures
`,
  // Creative
  the_performer: `
## VAI TRÒ: THE PERFORMER (Người trình diễn)
- Xưng hô: "Tôi" với energy
- Personality: Entertaining, charismatic, high energy
- Giọng điệu: Năng lượng cao, cuốn hút, theatrical
- Cách nói: Expressive, varied pace, dramatic pauses
- Đặc trưng: Entertainment value, memorable delivery, personality-forward
- Body language: Animated, expressive face, big gestures
`,
  the_storyteller: `
## VAI TRÒ: THE STORYTELLER (Người kể chuyện)
- Xưng hô: "Tôi" narrative voice
- Personality: Captivating narrator, emotional connector
- Giọng điệu: Cảm xúc, kịch tính vừa đủ, narrative flow
- Cách nói: "Chuyện là thế này...", "Và rồi điều không ngờ xảy ra...", "Bạn biết không..."
- Đặc trưng: Story arc, emotional hooks, vivid details
- Body language: Intimate, drawing audience in, theatrical pauses
`,
  the_iconoclast: `
## VAI TRÒ: THE ICONOCLAST (Người phá khuôn)
- Xưng hô: "Tôi" với conviction
- Personality: Disruptor, challenger, unique perspective
- Giọng điệu: Thách thức, táo bạo, độc đáo
- Cách nói: "Mọi người đều sai khi...", "Tôi không đồng ý với...", "Hãy nghĩ khác đi..."
- Đặc trưng: Contrarian views, fresh perspectives, challenges status quo
- Body language: Assertive, direct eye contact, punctuating gestures
`,
  // Technical
  the_technophile: `
## VAI TRÒ: THE TECHNOPHILE (Tech Expert)
- Xưng hô: "Tôi" với technical authority
- Personality: Tech-savvy, data-driven, cutting-edge
- Giọng điệu: Chính xác, có data, cập nhật công nghệ
- Cách nói: "Công nghệ mới nhất...", "Data cho thấy...", "Về mặt kỹ thuật..."
- Đặc trưng: Tech terminology, specifications, comparisons
- Body language: Precise, methodical, demonstrative
`,
  the_analyst: `
## VAI TRÒ: THE ANALYST (Người phân tích)
- Xưng hô: "Chúng ta" hoặc passive voice
- Personality: Data-driven, objective, methodical
- Giọng điệu: Khách quan, có logic, evidence-based
- Cách nói: "Số liệu cho thấy...", "Phân tích này chỉ ra...", "Dựa trên data..."
- Đặc trưng: Charts mindset, percentages, comparisons
- Body language: Measured, pointing to imaginary data, steady
`,
  // Passionate
  the_enthusiast: `
## VAI TRÒ: THE ENTHUSIAST (Người đam mê)
- Xưng hô: "Tôi" với passion
- Personality: Passionate, genuine, infectious enthusiasm
- Giọng điệu: Nhiệt huyết, chân thành, lan tỏa
- Cách nói: "Tôi thực sự yêu...", "Điều tuyệt vời nhất là...", "Bạn PHẢI thử..."
- Đặc trưng: Genuine excitement, personal experience, contagious energy
- Body language: Animated, smiling, forward-leaning with excitement
`,
  the_maker: `
## VAI TRÒ: THE MAKER (Nhà sáng tạo)
- Xưng hô: "Tôi" hands-on
- Personality: Creator, DIY expert, practical
- Giọng điệu: Thực hành, hands-on, problem-solving
- Cách nói: "Tôi đã tự làm...", "Cách tôi build...", "Thử nghiệm cho thấy..."
- Đặc trưng: Process focus, show don't tell, practical tips
- Body language: Demonstrative, working with hands, showing process
`,
  // Neutral
  neutral_presenter: `
## VAI TRÒ: NEUTRAL PRESENTER (Người dẫn trung tính)
- Xưng hô: Không xưng hô cụ thể, dùng câu bị động hoặc "chúng ta"
- Personality: Objective, balanced, professional
- Giọng điệu: Khách quan, thông tin, không cảm xúc cá nhân
- Cách nói: "Điều này có nghĩa...", "Dữ liệu cho thấy...", "Có thể thấy rằng..."
- Đặc trưng: Facts-first, balanced perspectives, no personal opinion
- Body language: Neutral, steady, professional distance
`,
};

// Topic Angle labels and instructions
const TOPIC_ANGLE_LABELS: Record<string, string> = {
  beginner: "Beginner - Giải thích từ cơ bản",
  expert: "Expert - Deep dive nâng cao",
  quick_tips: "Quick Tips - Dễ áp dụng ngay",
  myth_busting: "Myth-bust - Bóc sai lầm phổ biến",
  data_driven: "Data-driven - Có số liệu minh chứng",
};

const TOPIC_ANGLE_INSTRUCTIONS: Record<string, string> = {
  beginner: `
## GÓC TIẾP CẬN: BEGINNER (Dành cho người mới)
- Giải thích MỌI khái niệm từ cơ bản nhất
- Tránh thuật ngữ chuyên môn, nếu dùng thì PHẢI giải thích ngay
- Dùng ví dụ đời thường, so sánh dễ hiểu
- Nhịp chậm, rõ ràng, từng bước một
- Tóm tắt lại ý chính cuối mỗi phần
- Câu hỏi gợi mở kiểu "Bạn đã từng gặp trường hợp này chưa?"`,
  
  expert: `
## GÓC TIẾP CẬN: EXPERT (Chuyên sâu nâng cao)
- Đi thẳng vào vấn đề, không giải thích cơ bản
- Sử dụng thuật ngữ chuyên ngành một cách tự nhiên
- Phân tích sâu, đề cập đến edge cases và nuances
- Đưa ra insights và observations từ kinh nghiệm
- Thách thức các quan điểm phổ biến
- Nhắm đến người đã có nền tảng kiến thức`,
  
  quick_tips: `
## GÓC TIẾP CẬN: QUICK TIPS (Mẹo nhanh, áp dụng ngay)
- Mỗi tip PHẢI áp dụng được NGAY LẬP TỨC
- Không giải thích dài dòng "tại sao" - tập trung vào "làm như thế nào"
- Cấu trúc: Vấn đề → Giải pháp → Kết quả mong đợi
- Sử dụng bullet points ngầm trong lời nói
- Năng lượng nhanh, rõ ràng, không lan man
- Kết thúc mỗi tip bằng một hành động cụ thể`,
  
  myth_busting: `
## GÓC TIẾP CẬN: MYTH-BUSTING (Bóc sai lầm phổ biến)
- Bắt đầu bằng việc NÊU RÕ quan niệm sai phổ biến
- Giải thích TẠI SAO mọi người tin vào điều đó
- Đưa ra bằng chứng/lý lẽ phản bác
- Nêu SỰ THẬT đúng đắn thay thế
- Tone: Tự tin nhưng không chê bai người tin quan niệm sai
- Kết thúc bằng "Đừng mắc sai lầm này"`,
  
  data_driven: `
## GÓC TIẾP CẬN: DATA-DRIVEN (Có số liệu minh chứng)
- MỖI luận điểm PHẢI có số liệu/thống kê kèm theo
- Trích dẫn nguồn (có thể gợi ý: "theo nghiên cứu...", "số liệu cho thấy...")
- So sánh các con số để tạo impact (trước/sau, có/không có)
- Sử dụng phần trăm, số tuyệt đối, và so sánh
- Tone: Khách quan, dựa trên bằng chứng
- Kết luận dựa trên dữ liệu, không phải cảm tính`,
};

// Brand Voice label mappings
const brandPositioningLabels: Record<string, string> = {
  business: "Doanh nghiệp",
  expert: "Chuyên gia",
  agency: "Agency",
  consultant: "Tư vấn",
};

const toneOfVoiceLabels: Record<string, string> = {
  expert: "Chuyên gia",
  calm: "Điềm tĩnh",
  confident: "Tự tin",
  friendly: "Thân thiện",
  analytical: "Phân tích",
  serious: "Nghiêm túc",
  inspirational: "Truyền cảm hứng",
};

const formalityLevelLabels: Record<string, string> = {
  very_formal: "Rất trang trọng",
  professional: "Chuyên nghiệp",
  neutral: "Trung lập",
  casual: "Gần gũi",
};

const languageStyleLabels: Record<string, string> = {
  clear_direct: "Rõ ràng, trực tiếp",
  structured: "Có cấu trúc",
  no_exaggeration: "Không khoa trương",
  no_over_emotion: "Không cảm tính quá mức",
};

interface BrandVoice {
  brand_positioning: string | null;
  tone_of_voice: string[] | null;
  formality_level: string | null;
  language_style: string[] | null;
  preferred_words: string[] | null;
  forbidden_words: string[] | null;
  allow_emoji: boolean;
  compliance_rules: string[] | null;
}

interface IndustryMemory {
  id: string;
  code: string;
  name: string;
  version: string;
  target_audience: 'B2B' | 'B2C' | 'both';
  compliance_rules: string[];
  claim_restrictions: string[];
  forbidden_terms: string[];
  brand_voice: {
    tone_of_voice?: string[];
    formality_level?: string;
    language_style?: string[];
    allow_emoji?: boolean;
  };
  channel_settings: Record<string, unknown>;
  preferred_words: string[];
  forbidden_words: string[];
}

interface MergedRules {
  forbidden_terms: string[];
  compliance_rules: string[];
  claim_restrictions: string[];
  forbidden_words: string[];
  preferred_words: string[];
  tone_of_voice: string[];
  formality_level: string;
  language_style: string[];
  allow_emoji: boolean;
}

// Fetch Industry Memory from database
async function fetchIndustryMemory(
  supabase: any, 
  industryTemplateId: string, 
  languageCode: string = 'vi'
): Promise<IndustryMemory | null> {
  try {
    const { data, error } = await supabase
      .from('industry_templates')
      .select(`
        id,
        code,
        version,
        status,
        target_audience,
        brand_voice,
        channel_settings,
        compliance_rules,
        claim_restrictions,
        forbidden_terms,
        industry_template_translations!inner (
          name,
          preferred_words,
          forbidden_words
        )
      `)
      .eq('id', industryTemplateId)
      .eq('status', 'stable')
      .eq('industry_template_translations.language_code', languageCode)
      .single();

    if (error || !data) {
      console.warn(`Industry Memory ${industryTemplateId} not found or not stable - skipping rules`);
      return null;
    }

    const rawData = data as any;
    const translation = rawData.industry_template_translations?.[0];

    return {
      id: rawData.id,
      code: rawData.code,
      name: translation?.name || rawData.code,
      version: rawData.version || '1.0',
      target_audience: rawData.target_audience,
      compliance_rules: rawData.compliance_rules || [],
      claim_restrictions: rawData.claim_restrictions || [],
      forbidden_terms: translation?.forbidden_terms || [],
      brand_voice: rawData.brand_voice || {},
      channel_settings: rawData.channel_settings || {},
      preferred_words: translation?.preferred_words || [],
      forbidden_words: translation?.forbidden_words || [],
    };
  } catch (err) {
    console.error('Error fetching Industry Memory:', err);
    return null;
  }
}

function buildMergedRules(
  industryMemory: IndustryMemory | null,
  brandVoice: BrandVoice
): MergedRules {
  if (!industryMemory) {
    return {
      forbidden_terms: [],
      compliance_rules: brandVoice.compliance_rules || [],
      claim_restrictions: [],
      forbidden_words: brandVoice.forbidden_words || [],
      preferred_words: brandVoice.preferred_words || [],
      tone_of_voice: brandVoice.tone_of_voice || [],
      formality_level: brandVoice.formality_level || 'professional',
      language_style: brandVoice.language_style || [],
      allow_emoji: brandVoice.allow_emoji ?? true,
    };
  }

  return {
    forbidden_terms: industryMemory.forbidden_terms,
    compliance_rules: industryMemory.compliance_rules,
    claim_restrictions: industryMemory.claim_restrictions,
    forbidden_words: [
      ...industryMemory.forbidden_words,
      ...(brandVoice.forbidden_words || []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    preferred_words: [
      ...industryMemory.preferred_words,
      ...(brandVoice.preferred_words || []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    tone_of_voice: brandVoice.tone_of_voice?.length 
      ? brandVoice.tone_of_voice 
      : industryMemory.brand_voice.tone_of_voice || [],
    formality_level: brandVoice.formality_level 
      || industryMemory.brand_voice.formality_level 
      || 'professional',
    language_style: brandVoice.language_style?.length 
      ? brandVoice.language_style 
      : industryMemory.brand_voice.language_style || [],
    allow_emoji: brandVoice.allow_emoji ?? industryMemory.brand_voice.allow_emoji ?? true,
  };
}

const getBrandVoicePrompt = (voice: BrandVoice, mergedRules?: MergedRules): string => {
  const parts: string[] = [];
  
  if (mergedRules && mergedRules.forbidden_terms.length > 0) {
    parts.push(`## 🔒 INDUSTRY MEMORY (LUẬT CAO NHẤT - KHÔNG ĐƯỢC VI PHẠM)`);
    parts.push(`Industry Memory là LUẬT KHÓA CỨNG. Mọi nội dung PHẢI tuân theo.`);
    
    if (mergedRules.forbidden_terms.length > 0) {
      parts.push(`\n### ⛔ TỪ CẤM TUYỆT ĐỐI (Industry-level)`);
      parts.push(`Các từ sau KHÔNG BAO GIỜ được dùng:`);
      parts.push(mergedRules.forbidden_terms.join(", "));
    }
    
    if (mergedRules.compliance_rules.length > 0) {
      parts.push(`\n### 📜 QUY TẮC TUÂN THỦ NGÀNH`);
      mergedRules.compliance_rules.forEach((rule, i) => {
        parts.push(`${i + 1}. ${rule}`);
      });
    }
    
    if (mergedRules.claim_restrictions.length > 0) {
      parts.push(`\n### ⚠️ HẠN CHẾ TUYÊN BỐ`);
      mergedRules.claim_restrictions.forEach((claim) => {
        parts.push(`- KHÔNG ĐƯỢC: ${claim}`);
      });
    }
    
    parts.push(`\n### NGUYÊN TẮC INDUSTRY MEMORY`);
    parts.push(`1. Industry Memory OVERRIDE mọi yêu cầu khác nếu mâu thuẫn`);
    parts.push(`2. Không được "sáng tạo" từ nằm trong danh sách cấm`);
    parts.push(`3. Brand Voice có thể thay đổi tone, nhưng KHÔNG được vi phạm compliance`);
  }
  
  parts.push(`\n## BRAND VOICE PROFILE (LUẬT CAO NHẤT)`);
  parts.push(`Brand Voice là LUẬT CAO NHẤT. Mọi lời thoại trong kịch bản PHẢI tuân theo Brand Voice.`);
  
  if (voice.brand_positioning) {
    const label = brandPositioningLabels[voice.brand_positioning] || voice.brand_positioning;
    parts.push(`\n### Định vị thương hiệu: ${label}`);
  }
  
  const tones = mergedRules?.tone_of_voice || voice.tone_of_voice || [];
  if (tones.length > 0) {
    const toneLabels = tones.map(t => toneOfVoiceLabels[t] || t).join(", ");
    parts.push(`\n### Tone of Voice cho lời thoại: ${toneLabels}`);
  }
  
  const formality = mergedRules?.formality_level || voice.formality_level;
  if (formality) {
    const label = formalityLevelLabels[formality] || formality;
    parts.push(`\n### Mức trang trọng: ${label}`);
  }
  
  const styles = mergedRules?.language_style || voice.language_style || [];
  if (styles.length > 0) {
    const styleLabels = styles.map(s => languageStyleLabels[s] || s).join(", ");
    parts.push(`\n### Phong cách ngôn ngữ: ${styleLabels}`);
  }
  
  parts.push(`\n### NGUYÊN TẮC BRAND VOICE CHO SCRIPT`);
  parts.push(`1. Lời thoại trong mỗi prompt PHẢI đúng Tone of Voice`);
  parts.push(`2. Giữ nhất quán xuyên suốt kịch bản - KHÔNG thay đổi giọng giữa các prompt`);
  parts.push(`3. Ngữ điệu phải phù hợp với định vị thương hiệu`);
  
  const preferredWords = mergedRules?.preferred_words || voice.preferred_words || [];
  if (preferredWords.length > 0) {
    parts.push(`\n### TỪ NÊN DÙNG trong lời thoại`);
    parts.push(preferredWords.join(", "));
  }
  
  const forbiddenWords = mergedRules?.forbidden_words || voice.forbidden_words || [];
  if (forbiddenWords.length > 0) {
    parts.push(`\n### TỪ CẤM (TUYỆT ĐỐI KHÔNG DÙNG trong lời thoại)`);
    parts.push(forbiddenWords.join(", "));
  }
  
  if (voice.compliance_rules && voice.compliance_rules.length > 0) {
    parts.push(`\n### QUY TẮC TUÂN THỦ`);
    voice.compliance_rules.forEach(rule => {
      parts.push(`- ${rule}`);
    });
  }
  
  return parts.join("\n");
};

function getPromptCount(duration: number): string {
  switch (duration) {
    case 60:
      return "7-8";
    case 90:
      return "10-11";
    case 120:
      return "14-15";
    case 180:
      return "21-23";
    default:
      return "7-8";
  }
}

interface HookDetails {
  opening_line: string;
  visual_direction?: string;
  text_overlay?: string;
  framework?: string;
  psychology_reason?: string;
}

function buildSystemPrompt(
  topic: string,
  duration: number,
  videoType: string,
  characterType: string,
  brandVoice?: BrandVoice,
  mergedRules?: MergedRules,
  hook?: HookDetails,
  angle?: string
): string {
  const promptCount = getPromptCount(duration);
  const videoTypeName = VIDEO_TYPE_LABELS[videoType] || "Chuyên gia chia sẻ";
  const characterTypeName = CHARACTER_TYPE_LABELS[characterType] || "Chuyên gia";

  // Build Brand Voice section if available
  const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice, mergedRules) : "";

  // Build Angle section if provided
  let angleSection = "";
  if (angle && TOPIC_ANGLE_INSTRUCTIONS[angle]) {
    const angleLabel = TOPIC_ANGLE_LABELS[angle] || angle;
    angleSection = `
${TOPIC_ANGLE_INSTRUCTIONS[angle]}

### NGUYÊN TẮC GÓC TIẾP CẬN
- Góc tiếp cận "${angleLabel}" PHẢI được áp dụng XUYÊN SUỐT kịch bản
- Mọi lời thoại, cách giải thích, ví dụ PHẢI phù hợp với góc này
- KHÔNG thay đổi góc tiếp cận giữa các prompt
`;
  }

  // Build Hook section if available
  let hookSection = "";
  if (hook?.opening_line) {
    hookSection = `
## HOOK ĐÃ CHỌN (BẮT BUỘC SỬ DỤNG)
User đã chọn sẵn hook mở đầu. PHẢI sử dụng CHÍNH XÁC hook này cho PROMPT 1.

### Câu mở đầu (dùng nguyên văn):
"${hook.opening_line}"

${hook.visual_direction ? `### Hướng dẫn visual: ${hook.visual_direction}` : ''}
${hook.text_overlay ? `### Text overlay gợi ý: ${hook.text_overlay}` : ''}
${hook.framework ? `### Framework: ${hook.framework}` : ''}
${hook.psychology_reason ? `### Lý do tâm lý: ${hook.psychology_reason}` : ''}

NGUYÊN TẮC:
- PROMPT 1 PHẢI bắt đầu bằng hook này
- Các prompt sau tiếp nối tự nhiên từ hook
- Giữ nguyên tone và energy của hook xuyên suốt
`;
  }

  // Build Video Type Instructions section
  const videoTypeInstructions = VIDEO_TYPE_INSTRUCTIONS[videoType] || "";
  
  // Build Character Type Instructions section
  const characterTypeInstructions = CHARACTER_TYPE_INSTRUCTIONS[characterType] || "";

  return `Bạn là một hệ thống AI chuyên tạo KỊCH BẢN & PROMPT VIDEO cho video ngắn TikTok (1–3 phút), phục vụ quy trình sản xuất: VEO 3 (HÌNH ẢNH) → Minimax (GIỌNG NÓI) → CapCut (DỰNG).

${brandVoiceSection}

${angleSection}

${hookSection}

${videoTypeInstructions}

${characterTypeInstructions}

THÔNG TIN ĐẦU VÀO:
- Chủ đề: ${topic}
- Thời lượng: ${duration} giây
- Thể loại: ${videoTypeName}
- Nhân vật: ${characterTypeName}
- Số lượng prompt cần tạo: ${promptCount} prompt
${angle ? `- Góc tiếp cận: ${TOPIC_ANGLE_LABELS[angle] || angle}` : ''}
${hook?.opening_line ? '- Hook: Đã có sẵn (sử dụng cho PROMPT 1)' : '- Hook: AI tự tạo theo thể loại video'}

NGUYÊN TẮC VAI TRÒ NHÂN VẬT:
- Nhân vật được chọn ảnh hưởng đến: cách xưng hô, giọng điệu, phong cách diễn đạt, personality
- PHẢI tuân theo CHARACTER INSTRUCTIONS ở trên
- TUYỆT ĐỐI KHÔNG mô tả ngoại hình, trang phục, bối cảnh
- TUYỆT ĐỐI KHÔNG thay đổi tư thế lớn giữa các prompt

CẤU TRÚC VIDEO (theo thể loại ${videoTypeName}):
- Tổng thời lượng: ${duration} giây
- Mỗi PROMPT ≈ 8 giây
- Mỗi prompt chỉ chứa 01 ý hoàn chỉnh
- Cấu trúc PHẢI tuân theo VIDEO TYPE INSTRUCTIONS ở trên
- Tất cả prompt khi ghép lại phải tạo thành MỘT NHÂN VẬT NÓI LIÊN TỤC – KHÔNG RỜI RẠC

QUY ƯỚC GIỌNG NÓI (CỐ ĐỊNH):
- Giọng: miền Bắc
- Phong cách: Chuyên nghiệp, điềm tĩnh, tự tin, không quảng cáo
- Ngữ điệu: Nhấn mạnh từ khóa chuyên môn, có nhịp nghỉ tự nhiên, không nói quá nhanh

QUY ƯỚC CHUYỂN ĐỘNG NHÂN VẬT (VEO 3):
- Tư thế: Đứng hoặc ngồi ổn định, nhìn thẳng camera
- Chuyển động: Nhẹ, chậm, có kiểm soát, gật đầu nhẹ khi nhấn ý, đưa tay nhấn từ khóa
- Body language PHẢI phù hợp với CHARACTER TYPE đã chọn
- TUYỆT ĐỐI KHÔNG: Quay đầu đột ngột, thay đổi tư thế lớn, cử chỉ mạnh hoặc liên tục

ĐỊNH DẠNG CHUẨN CỦA MỖI PROMPT:

PROMPT X:

[1] Chuyển động nhân vật:
(Mô tả ngắn, liên tục, kế thừa chuyển động prompt trước, phù hợp với character type)

[2] Lời thoại (đọc nguyên văn):
"…"

[3] Giọng điệu:
Giọng miền Bắc, phù hợp với vai trò nhân vật đã chọn (${characterTypeName}), điềm tĩnh, rõ ràng, nhấn mạnh từ khóa chính

NGUYÊN TẮC NỐI MẠCH:
- Prompt sau kế thừa tư thế, trạng thái, nhịp nói của prompt trước
- Lời thoại: Không chào hỏi lại, không reset nội dung, không gộp nhiều ý
- Nghe như: MỘT NGƯỜI ĐANG NÓI LIÊN TỤC

YÊU CẦU ĐẦU RA:
– Chỉ xuất danh sách PROMPT
– Đúng định dạng
– Không giải thích
– Không bình luận
– Không thêm nội dung ngoài prompt`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, duration, video_type, character_type, brandTemplateId, hook, angle, organization_id: requestOrgId } = await req.json();

    if (!topic || !topic.trim()) {
      return new Response(
        JSON.stringify({ error: "Vui lòng nhập chủ đề video" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "API key chưa được cấu hình" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Generating script for topic:", topic);
    console.log("Duration:", duration, "Video type:", video_type, "Character:", character_type);
    console.log("Hook provided:", hook ? "Yes" : "No", hook?.framework || "");
    console.log("Angle:", angle || "None");
    
    // Load Brand Voice and Industry Memory from template if provided
    let brandVoice: BrandVoice | undefined;
    let industryMemory: IndustryMemory | null = null;
    let mergedRules: MergedRules | undefined;
    
    if (brandTemplateId) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select("brand_positioning, tone_of_voice, formality_level, language_style, preferred_words, forbidden_words, allow_emoji, compliance_rules, industry_template_id")
        .eq("id", brandTemplateId)
        .single();

      if (template) {
        brandVoice = {
          brand_positioning: template.brand_positioning,
          tone_of_voice: template.tone_of_voice,
          formality_level: template.formality_level,
          language_style: template.language_style,
          preferred_words: template.preferred_words,
          forbidden_words: template.forbidden_words,
          allow_emoji: template.allow_emoji ?? true,
          compliance_rules: template.compliance_rules,
        };
        console.log("Brand Voice loaded for script:", brandVoice.brand_positioning, brandVoice.tone_of_voice);
        
        // Load Industry Memory if brand has industry_template_id
        if (template.industry_template_id) {
          industryMemory = await fetchIndustryMemory(supabase, template.industry_template_id);
          if (industryMemory) {
            mergedRules = buildMergedRules(industryMemory, brandVoice);
            console.log("Industry Memory loaded:", industryMemory.name, "version:", industryMemory.version);
          }
        }
      }
    }

    const systemPrompt = buildSystemPrompt(topic, duration, video_type, character_type, brandVoice, mergedRules, hook, angle);

    // Define AI generation function
    const generateAIContent = async (): Promise<string> => {
      console.log("Calling Lovable AI for script (no cache hit)...");
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Hãy tạo kịch bản video TikTok về chủ đề: "${topic}"` },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway error:", response.status, errorText);

        if (response.status === 429) {
          throw { status: 429, message: "Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau." };
        }
        if (response.status === 402) {
          throw { status: 402, message: "Cần nạp thêm credits để tiếp tục sử dụng." };
        }

        throw new Error("Không thể tạo kịch bản. Vui lòng thử lại.");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error("No content in AI response:", data);
        throw new Error("AI không trả về nội dung");
      }

      return content;
    };

    // Use cache wrapper
    const functionName = 'generate-script';
    const scope = CACHE_SCOPE[functionName] || 'org';
    const ttlDays = CACHE_TTL[functionName] || 7;

    // Build cache input
    const cacheInput = {
      topic,
      duration,
      video_type,
      character_type,
      angle: angle || null,
      brandVoice: brandVoice ? {
        positioning: brandVoice.brand_positioning,
        tone: brandVoice.tone_of_voice,
        formality: brandVoice.formality_level,
      } : null,
    };

    let content: string;
    let fromCache = false;

    try {
      const cacheResult = await withCache({
        functionName,
        scope,
        organizationId: requestOrgId || undefined,
        brandTemplateId,
        input: cacheInput,
        versions: {
          industryMemory: industryMemory?.version,
          brandVoice: brandVoice?.formality_level || undefined,
        },
        ttlDays,
        generateFn: generateAIContent,
      });

      content = cacheResult.data;
      fromCache = cacheResult.fromCache;
      console.log(`Script generation: ${fromCache ? 'CACHE HIT' : 'AI GENERATED'}`);
    } catch (err: any) {
      if (err.status === 429) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (err.status === 402) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw err;
    }

    console.log("Script generated successfully, saving to database...");

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    let organizationId: string | null = requestOrgId || null;
    
    if (authHeader) {
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseAuth.auth.getUser();
      userId = user?.id || null;
      
      if (userId && !organizationId) {
        // Fallback: get first org where user is a member
        const { data: orgMember } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        
        organizationId = orgMember?.organization_id || null;
      }
      console.log("Using organization_id:", organizationId, "(from request:", !!requestOrgId, ")");
    }

    // Generate title from topic
    const title = topic.length > 50 ? topic.substring(0, 50) + "..." : topic;

    // Check organization's skip_approval setting
    let initialStatus = 'draft';
    if (organizationId) {
      const { data: orgSettings } = await supabase
        .from('organizations')
        .select('skip_approval')
        .eq('id', organizationId)
        .single();
      
      if (orgSettings?.skip_approval) {
        initialStatus = 'approved';
        console.log('Skip approval enabled, setting status to approved');
      }
    }

    const { data: savedScript, error: dbError } = await supabase
      .from("scripts")
      .insert({
        title,
        topic,
        duration,
        video_type,
        character_type,
        content,
        user_id: userId,
        organization_id: organizationId,
        status: initialStatus,
        industry_template_id: industryMemory?.id || null,
        industry_template_version: industryMemory?.version || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Không thể lưu kịch bản vào database" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Script saved with ID:", savedScript.id, "fromCache:", fromCache);

    return new Response(JSON.stringify({ ...savedScript, fromCache }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-script function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
