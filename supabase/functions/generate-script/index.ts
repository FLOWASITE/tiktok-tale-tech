import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withCache, CACHE_TTL, CACHE_SCOPE } from "../_shared/cache-utils.ts";
import { 
  buildExtendedBrandPrompt,
  buildJourneyStageMessagingSection,
  type BrandContext as ExtendedBrandContext,
  type CustomerPersona,
  type JourneyStageMessagingData,
  type JourneyStage,
} from "../_shared/prompt-utils.ts";
import {
  runSelfCritiqueLoop,
  CRITIQUE_CONFIG,
  type CritiqueResult,
} from "../_shared/self-critique.ts";
import { saveMetrics, generateTraceId } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";
import { callAI as callAIProvider } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
// NEW: Prompt Registry Integration - Phase 4
import { createPromptManager } from "../_shared/prompt-integration.ts";
// Multi-country date context support
import { buildLocalizedDateContext } from "../_shared/country-language-map.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Build current date context section for system prompt
 * Uses shared localized date context + extra emphasis for script generation
 */
function buildDateContextSection(): string {
  const baseContext = buildLocalizedDateContext('vi');
  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const currentYear = vnTime.getUTCFullYear();
  
  return `${baseContext}
🚫 TUYỆT ĐỐI KHÔNG đề cập năm ${currentYear - 1}, ${currentYear - 2} hay bất kỳ năm cũ nào trong kịch bản.
📌 Mọi số liệu, xu hướng, sự kiện trong kịch bản PHẢI là năm ${currentYear}.
📌 Nếu cần nói "hiện nay", "gần đây", "mới nhất" → hiểu là năm ${currentYear}.
`;
}

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
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook authority - Khẳng định vị thế, tạo credibility ngay
2. PROMPT 2-3: Insight 1 - Chia sẻ kiến thức độc quyền đầu tiên với ví dụ
3. PROMPT 4-5: Insight 2 - Kiến thức thứ hai, deeper dive
4. PROMPT 6: Insight 3 (optional) hoặc bắt đầu tổng kết
5. PROMPT CUỐI: Value summary + CTA nhẹ

**HOOK STYLE MẪU:**
- "Điều này ít ai trong ngành dám nói thẳng..."
- "Sau 10 năm trong nghề, tôi nhận ra một sự thật..."
- "Có một bí mật mà các chuyên gia thường giữ cho riêng mình..."

**TONE & STYLE:**
- Authority voice: Nói như người đã làm, đã thấy
- Evidence-based: Có ví dụ thực tế, case cụ thể
- Generous: Chia sẻ thực sự có giá trị, không giữ lại
`,
  tutorial_howto: `
## THỂ LOẠI: HƯỚNG DẪN HOW-TO (Tutorial)
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook vấn đề - Nêu kết quả người xem sẽ đạt được
2. PROMPT 2: Setup/Chuẩn bị - Những gì cần có trước khi bắt đầu
3. PROMPT 3-4: Bước 1 - Chi tiết, có demo trong lời nói
4. PROMPT 5-6: Bước 2 - Tiếp nối logic
5. PROMPT 7: Bước 3 + Kết quả cuối cùng
6. PROMPT CUỐI: Tips bonus + CTA

**HOOK STYLE MẪU:**
- "Sau video này, bạn sẽ biết cách... chỉ trong 3 bước"
- "Đây là cách đơn giản nhất để..."
- "Hãy làm theo tôi, từng bước một..."

**TONE & STYLE:**
- Patient teacher: Kiên nhẫn, không skip bước
- Action-oriented: Mỗi câu là một hành động cụ thể
- Checkpoint: "Bạn làm được bước này chưa?" giữa các bước
`,
  analyze_explain: `
## THỂ LOẠI: PHÂN TÍCH - GIẢI THÍCH (Deep Dive)
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook câu hỏi lớn - Đặt vấn đề gây tò mò
2. PROMPT 2: Context - Tại sao câu hỏi này quan trọng
3. PROMPT 3-4: Layer 1 - Phân tích bề mặt
4. PROMPT 5-6: Layer 2 - Đào sâu hơn, reveal insight
5. PROMPT 7: Layer 3 - Kết nối các ý, big picture
6. PROMPT CUỐI: Takeaway + perspective mới

**HOOK STYLE MẪU:**
- "Tại sao điều này xảy ra? Câu trả lời sẽ khiến bạn ngạc nhiên..."
- "Hãy cùng phân tích điều mà 90% người bỏ qua..."
- "Đằng sau hiện tượng này là một logic ít ai nhận ra..."

**TONE & STYLE:**
- Analytical: Logic, có hệ thống, layer by layer
- Connector: Kết nối các điểm thành bức tranh lớn
- Aha-moments: Tạo những khoảnh khắc "à thì ra là vậy"
`,
  listicle: `
## THỂ LOẠI: DANH SÁCH TIPS (Listicle)
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook số lượng - "5 điều...", "Top 7..."
2. PROMPT 2: Tip #1 (quan trọng nhất hoặc gây sốc nhất)
3. PROMPT 3: Tip #2
4. PROMPT 4: Tip #3
5. PROMPT 5: Tip #4
6. PROMPT 6: Tip #5 (hoặc Bonus tip)
7. PROMPT CUỐI: Recap nhanh + CTA save video

**HOOK STYLE MẪU:**
- "5 điều bạn PHẢI biết về... (đặc biệt số 3)"
- "Top 7 sai lầm mà 90% người mắc phải..."
- "3 tips nhanh để... mà bạn có thể áp dụng NGAY HÔM NAY"

**TONE & STYLE:**
- Punchy: Ngắn gọn, súc tích, không dài dòng
- Numbered: Luôn nói số thứ tự rõ ràng
- Memorable: Mỗi tip là một soundbite độc lập
`,
  warning_mistake: `
## THỂ LOẠI: CẢNH BÁO - SAI LẦM (Warning)
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook shock - Nêu sai lầm gây hậu quả nghiêm trọng
2. PROMPT 2: Sai lầm #1 - Mô tả cụ thể + hậu quả
3. PROMPT 3: Tại sao người ta mắc sai lầm này
4. PROMPT 4: Sai lầm #2 (nếu có) hoặc deep dive sai lầm #1
5. PROMPT 5-6: Cách tránh/khắc phục
6. PROMPT CUỐI: Takeaway + CTA cảnh giác

**HOOK STYLE MẪU:**
- "ĐỪNG mắc sai lầm này! 90% người đang làm sai..."
- "Sai lầm này có thể khiến bạn mất tất cả..."
- "Nếu bạn đang làm điều này, DỪNG LẠI NGAY!"

**TONE & STYLE:**
- Urgent but helpful: Cảnh báo nhưng không doạ dẫm
- Solution-oriented: Luôn có giải pháp sau cảnh báo
- FOMO-inducing: Tạo cảm giác "may mà tôi biết sớm"
`,
  quick_qa: `
## THỂ LOẠI: HỎI - ĐÁP NHANH (Q&A)
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook - "Những câu hỏi tôi hay nhận được nhất..."
2. PROMPT 2: Q1 + Answer ngắn gọn
3. PROMPT 3: Q2 + Answer
4. PROMPT 4: Q3 + Answer
5. PROMPT 5: Q4 + Answer (câu hỏi hay nhất)
6. PROMPT CUỐI: "Còn câu hỏi nào? Comment bên dưới!"

**HOOK STYLE MẪU:**
- "Câu hỏi tôi nhận được nhiều nhất: ..."
- "Bạn hỏi, tôi trả lời. Câu đầu tiên..."
- "5 câu hỏi phổ biến nhất về..."

**TONE & STYLE:**
- Rapid-fire: Nhanh, không dài dòng
- Format rõ: "Câu hỏi: ... Trả lời: ..."
- Conversational: Như đang chat với bạn
`,
  myth_busting: `
## THỂ LOẠI: BÓC PHỐT QUAN NIỆM (Myth Busting)
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook - Nêu myth phổ biến mà ai cũng tin
2. PROMPT 2: Tại sao mọi người tin điều này
3. PROMPT 3-4: Evidence phản bác - Số liệu, logic, ví dụ
4. PROMPT 5: Sự thật đúng đắn
5. PROMPT 6: Tại sao sự thật này quan trọng
6. PROMPT CUỐI: Takeaway + CTA thay đổi mindset

**HOOK STYLE MẪU:**
- "Bạn nghĩ điều này đúng? SAI HOÀN TOÀN!"
- "90% người tin điều này, nhưng sự thật là..."
- "Myth lớn nhất trong ngành mà tôi phải bóc trần..."

**TONE & STYLE:**
- Myth vs Reality: So sánh rõ ràng
- Evidence-based: Có proof, không chỉ ý kiến
- Respectful: Không chê bai người tin myth
`,
  before_after: `
## THỂ LOẠI: TRƯỚC/SAU (Before & After)
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook kết quả - Tease transformation ấn tượng
2. PROMPT 2: BEFORE - Mô tả trạng thái ban đầu, vấn đề
3. PROMPT 3: Quyết định thay đổi - Turning point
4. PROMPT 4-5: DURING - Quá trình, những gì đã làm
5. PROMPT 6: AFTER - Kết quả cụ thể, có số liệu
6. PROMPT CUỐI: Lesson learned + CTA

**HOOK STYLE MẪU:**
- "Nhìn sự khác biệt này... từ X đến Y chỉ trong Z thời gian"
- "Đây là TRƯỚC. Và đây là SAU 30 ngày..."
- "Bạn sẽ không tin sự thay đổi này có thể xảy ra..."

**TONE & STYLE:**
- Authentic: Thật, không phóng đại
- Timeline specific: Có mốc thời gian cụ thể
- Proof-oriented: Show don't tell
`,
  story_pov: `
## THỂ LOẠI: KỂ CHUYỆN POV (Storytelling)
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook tension - Bắt đầu từ đỉnh điểm hoặc twist
2. PROMPT 2: Setup - Bối cảnh, nhân vật, tình huống
3. PROMPT 3-4: Build up - Căng thẳng tăng dần
4. PROMPT 5: Climax - Đỉnh điểm câu chuyện
5. PROMPT 6: Resolution - Giải quyết
6. PROMPT CUỐI: Lesson - Bài học rút ra

**HOOK STYLE MẪU:**
- "Câu chuyện này đã thay đổi cách tôi nhìn về..."
- "POV: Bạn vừa nhận được cuộc gọi từ..."
- "Điều xảy ra tiếp theo khiến tôi không bao giờ quên..."

**TONE & STYLE:**
- First person: Kể từ góc nhìn thứ nhất
- Emotional arc: Có lên xuống cảm xúc
- Vivid details: Chi tiết sống động, relatable
`,
  day_in_life: `
## THỂ LOẠI: MỘT NGÀY CỦA... (Day in Life)
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook morning - "Một ngày làm việc của tôi bắt đầu từ..."
2. PROMPT 2: Buổi sáng - Routine, chuẩn bị
3. PROMPT 3: Giữa buổi - Công việc chính
4. PROMPT 4: Buổi trưa - Break, transition
5. PROMPT 5: Buổi chiều - Highlight của ngày
6. PROMPT 6: Buổi tối - Wrap up
7. PROMPT CUỐI: Reflection + CTA

**HOOK STYLE MẪU:**
- "Một ngày làm việc thực sự của một... trông như thế nào?"
- "Theo tôi qua một ngày bận rộn nhất tuần..."
- "5 giờ sáng. Ngày của tôi bắt đầu..."

**TONE & STYLE:**
- Authentic: Real, không chỉ highlight
- Time-stamped: Có mốc thời gian
- Behind-the-scenes: Cho thấy cả mundane moments
`,
  behind_scenes: `
## THỂ LOẠI: HẬU TRƯỜNG BTS (Behind the Scenes)
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Tease - Tease kết quả final
2. PROMPT 2: Starting point - Bắt đầu từ đâu
3. PROMPT 3-4: Process - Quá trình thực sự
4. PROMPT 5: Challenges - Khó khăn gặp phải
5. PROMPT 6: Solution - Cách giải quyết
6. PROMPT CUỐI: Final result + Lesson

**HOOK STYLE MẪU:**
- "Đây là cách chúng tôi thực sự làm ra..."
- "Hậu trường không bao giờ được show..."
- "Phía sau sản phẩm này là 100 giờ làm việc..."

**TONE & STYLE:**
- Raw & honest: Không filter, show cả fail
- Process-focused: Tập trung vào journey
- Transparent: Cho thấy effort thực sự
`,
  reaction: `
## THỂ LOẠI: REACTION/COMMENTARY
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook - "Tôi vừa xem/đọc... và phải nói ngay"
2. PROMPT 2: Context - Giới thiệu ngắn về thứ đang react
3. PROMPT 3-4: Real-time reaction - Phản ứng từng phần
4. PROMPT 5: Analysis - Phân tích sâu hơn
5. PROMPT 6: Opinion - Quan điểm cá nhân
6. PROMPT CUỐI: Verdict + CTA hỏi ý kiến người xem

**HOOK STYLE MẪU:**
- "Tôi không thể tin điều tôi vừa thấy..."
- "Ý kiến thật của tôi về trend đang viral này..."
- "Phản ứng của chuyên gia khi xem..."

**TONE & STYLE:**
- Genuine: Phản ứng thật, không fake
- Opinionated: Có quan điểm rõ ràng
- Interactive: Hỏi ý kiến người xem
`,
  product_review: `
## THỂ LOẠI: REVIEW SẢN PHẨM
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook verdict - Tease kết luận (có nên mua?)
2. PROMPT 2: Intro - Sản phẩm gì, expectations
3. PROMPT 3: Unboxing/First impression
4. PROMPT 4: Testing - Trải nghiệm thực tế
5. PROMPT 5: Pros - Điểm mạnh
6. PROMPT 6: Cons - Điểm yếu (honest)
7. PROMPT CUỐI: Verdict + Ai nên/không nên mua

**HOOK STYLE MẪU:**
- "Có nên mua không? Review trung thực sau X ngày sử dụng..."
- "Tôi đã thử nghiệm... và đây là sự thật"
- "Sản phẩm viral này có thực sự tốt như lời đồn?"

**TONE & STYLE:**
- Honest: Objective, nói cả pros và cons
- Specific: Có chi tiết cụ thể, use case
- Helpful: Giúp người xem quyết định
`,
  case_study: `
## THỂ LOẠI: CASE STUDY
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook kết quả - Nêu achievement ấn tượng
2. PROMPT 2: Background - Context, starting point
3. PROMPT 3: Strategy - Chiến lược đã dùng
4. PROMPT 4: Execution - Cách thực hiện
5. PROMPT 5: Results - Kết quả cụ thể, có số liệu
6. PROMPT CUỐI: Takeaways - Bài học có thể áp dụng

**HOOK STYLE MẪU:**
- "Làm thế nào X đạt được Y trong Z thời gian..."
- "Phân tích chiến lược đằng sau thành công của..."
- "Case study: Từ 0 đến 1 triệu như thế nào?"

**TONE & STYLE:**
- Analytical: Có hệ thống, logic
- Data-driven: Số liệu cụ thể
- Replicable: Insights người khác có thể áp dụng
`,
  transformation: `
## THỂ LOẠI: BIẾN ĐỔI/KẾT QUẢ (Transformation)
**CẤU TRÚC BẮT BUỘC (theo thứ tự prompt):**
1. PROMPT 1: Hook end result - Show kết quả cuối ấn tượng
2. PROMPT 2: Starting point - Điểm xuất phát
3. PROMPT 3: Turning point - Quyết định thay đổi
4. PROMPT 4: Journey - Hành trình, milestones
5. PROMPT 5: Challenges - Khó khăn vượt qua
6. PROMPT 6: Final state - Kết quả cuối cùng
7. PROMPT CUỐI: Lessons + Encouragement

**HOOK STYLE MẪU:**
- "Từ X đến Y trong Z tháng - Đây là cách tôi làm..."
- "Hành trình biến đổi của tôi mà tôi chưa từng chia sẻ..."
- "Nếu tôi làm được, bạn cũng có thể..."

**TONE & STYLE:**
- Inspiring: Truyền cảm hứng, motivating
- Honest: Thật về struggle, không chỉ highlight
- Specific: Timeline và metrics cụ thể
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
**XƯNG HÔ & NGÔN NGỮ:**
- Xưng: "Tôi" với authority
- Gọi người xem: "Bạn" hoặc không gọi trực tiếp
- Câu mở đầu mẫu: "Với [X năm] kinh nghiệm trong lĩnh vực này, tôi có thể khẳng định..."

**GIỌNG ĐIỆU XUYÊN SUỐT:**
- Tự tin tuyệt đối, không "có lẽ", "có thể"
- Chính xác, dùng thuật ngữ chuyên môn
- Measured pace, không vội vàng

**CÂU NÓI ĐẶC TRƯNG:**
- "Dựa trên kinh nghiệm của tôi..."
- "Về mặt kỹ thuật, điều này có nghĩa..."
- "Điều quan trọng nhất mà bạn cần hiểu là..."
- "Tôi đã thấy hàng trăm trường hợp..."

**BODY LANGUAGE (cho VEO 3):**
- Tư thế: Đứng/ngồi thẳng, ổn định
- Chuyển động: Gật đầu nhẹ khi affirm, tay đưa ra khi emphasize point
- Ánh mắt: Nhìn thẳng camera, confident
`,
  the_bellwether: `
## VAI TRÒ: THE BELLWETHER (Người dẫn xu hướng)
**XƯNG HÔ & NGÔN NGỮ:**
- Xưng: "Tôi" hoặc tên riêng
- Gọi người xem: "Bạn", "Các bạn"
- Câu mở đầu mẫu: "Tôi vừa phát hiện một xu hướng mà trong 6 tháng tới sẽ thay đổi mọi thứ..."

**GIỌNG ĐIỆU XUYÊN SUỐT:**
- Tiên phong, ahead of the curve
- Exciting nhưng không hype
- Insider knowledge tone

**CÂU NÓI ĐẶC TRƯNG:**
- "Xu hướng mới nhất mà tôi đang theo dõi..."
- "Tôi đã thấy điều này coming từ lâu..."
- "Trong 6 tháng tới, bạn sẽ thấy..."
- "Những người đi đầu đang làm điều này..."

**BODY LANGUAGE (cho VEO 3):**
- Tư thế: Hơi nghiêng về phía trước, engaged
- Chuyển động: Tay gesture khi nói về tương lai
- Ánh mắt: Intense, như đang share secret
`,
  the_coach: `
## VAI TRÒ: THE COACH (Người hướng dẫn)
**XƯNG HÔ & NGÔN NGỮ:**
- Xưng: "Tôi" hoặc "mình"
- Gọi người xem: "Bạn" gần gũi
- Câu mở đầu mẫu: "Tôi hiểu cảm giác của bạn. Tôi cũng từng ở vị trí đó..."

**GIỌNG ĐIỆU XUYÊN SUỐT:**
- Kiên nhẫn, supportive
- Encouraging, không judgmental
- Step-by-step, không rush

**CÂU NÓI ĐẶC TRƯNG:**
- "Bạn hoàn toàn có thể làm được..."
- "Hãy bắt đầu từ bước đơn giản nhất..."
- "Đừng lo, ai cũng từng như vậy..."
- "Tôi sẽ hướng dẫn bạn từng bước..."

**BODY LANGUAGE (cho VEO 3):**
- Tư thế: Open, welcoming
- Chuyển động: Gật đầu encouragingly, tay mở
- Ánh mắt: Warm, supportive
`,
  // Creative
  the_performer: `
## VAI TRÒ: THE PERFORMER (Người trình diễn)
**XƯNG HÔ & NGÔN NGỮ:**
- Xưng: "Tôi" với energy
- Gọi người xem: "Các bạn", "Mọi người"
- Câu mở đầu mẫu: "Này! Bạn có sẵn sàng cho điều này không?"

**GIỌNG ĐIỆU XUYÊN SUỐT:**
- Năng lượng CAO, expressive
- Theatrical, có nhịp lên xuống
- Entertaining first

**CÂU NÓI ĐẶC TRƯNG:**
- "Và đây là điều TUYỆT VỜI NHẤT..."
- "Bạn sẽ không tin được..."
- "Khoan đã! Còn một điều nữa..."
- "Okay okay okay, nghe này..."

**BODY LANGUAGE (cho VEO 3):**
- Tư thế: Dynamic, không static
- Chuyển động: Animated, expressive gestures
- Ánh mắt: Wide, excited, engaging
`,
  the_storyteller: `
## VAI TRÒ: THE STORYTELLER (Người kể chuyện)
**XƯNG HÔ & NGÔN NGỮ:**
- Xưng: "Tôi" narrative voice
- Gọi người xem: Không gọi trực tiếp, kể như độc thoại
- Câu mở đầu mẫu: "Chuyện là thế này... Hôm đó, tôi đang..."

**GIỌNG ĐIỆU XUYÊN SUỐT:**
- Narrative, có emotional arc
- Kịch tính vừa đủ, không over
- Intimate, như kể chuyện cho bạn thân

**CÂU NÓI ĐẶC TRƯNG:**
- "Chuyện là thế này..."
- "Và bạn biết điều gì xảy ra tiếp không?"
- "Tôi không bao giờ quên khoảnh khắc đó..."
- "Đó là lúc tôi nhận ra..."

**BODY LANGUAGE (cho VEO 3):**
- Tư thế: Intimate, như đang confide
- Chuyển động: Subtle, emotional
- Ánh mắt: Thoughtful, sometimes looking away as if remembering
`,
  the_iconoclast: `
## VAI TRÒ: THE ICONOCLAST (Người phá khuôn)
**XƯNG HÔ & NGÔN NGỮ:**
- Xưng: "Tôi" với conviction
- Gọi người xem: "Bạn"
- Câu mở đầu mẫu: "Tôi biết điều tôi sắp nói sẽ gây tranh cãi, nhưng ai đó phải nói..."

**GIỌNG ĐIỆU XUYÊN SUỐT:**
- Thách thức status quo
- Táo bạo, contrarian
- Confident trong quan điểm

**CÂU NÓI ĐẶC TRƯNG:**
- "Mọi người đều sai khi nghĩ rằng..."
- "Tôi không đồng ý với đa số..."
- "Hãy nghĩ khác đi về vấn đề này..."
- "Đây là góc nhìn chưa ai nói..."

**BODY LANGUAGE (cho VEO 3):**
- Tư thế: Assertive, confident
- Chuyển động: Direct, emphatic gestures
- Ánh mắt: Challenging, direct
`,
  // Technical
  the_technophile: `
## VAI TRÒ: THE TECHNOPHILE (Tech Expert)
**XƯNG HÔ & NGÔN NGỮ:**
- Xưng: "Tôi" hoặc "mình"
- Gọi người xem: "Bạn", "Anh em"
- Câu mở đầu mẫu: "Công nghệ mới nhất vừa ra mắt và tôi phải chia sẻ ngay..."

**GIỌNG ĐIỆU XUYÊN SUỐT:**
- Tech-savvy, excited about innovation
- Data-driven, có specs
- Early adopter vibe

**CÂU NÓI ĐẶC TRƯNG:**
- "Công nghệ mới nhất cho phép..."
- "Data cho thấy..."
- "Specs của nó bao gồm..."
- "So với version trước, cải tiến..."

**BODY LANGUAGE (cho VEO 3):**
- Tư thế: Engaged, forward-leaning
- Chuyển động: Precise, demonstrative
- Ánh mắt: Focused, analytical
`,
  the_analyst: `
## VAI TRÒ: THE ANALYST (Người phân tích)
**XƯNG HÔ & NGÔN NGỮ:**
- Xưng: "Chúng ta" hoặc passive voice
- Gọi người xem: Không gọi trực tiếp
- Câu mở đầu mẫu: "Khi phân tích dữ liệu, có một pattern thú vị xuất hiện..."

**GIỌNG ĐIỆU XUYÊN SUỐT:**
- Objective, evidence-based
- Methodical, systematic
- Neutral, không bias

**CÂU NÓI ĐẶC TRƯNG:**
- "Số liệu cho thấy rằng..."
- "Khi phân tích kỹ hơn..."
- "Có 3 yếu tố cần xem xét..."
- "Dựa trên data, kết luận là..."

**BODY LANGUAGE (cho VEO 3):**
- Tư thế: Steady, composed
- Chuyển động: Measured, pointing to imaginary data
- Ánh mắt: Thoughtful, analytical
`,
  // Passionate
  the_enthusiast: `
## VAI TRÒ: THE ENTHUSIAST (Người đam mê)
**XƯNG HÔ & NGÔN NGỮ:**
- Xưng: "Tôi" với passion
- Gọi người xem: "Bạn", "Các bạn"
- Câu mở đầu mẫu: "Tôi CỰC KỲ hype về điều này và bạn cũng sẽ thế..."

**GIỌNG ĐIỆU XUYÊN SUỐT:**
- Passionate, genuine excitement
- Infectious enthusiasm
- Personal, từ trải nghiệm

**CÂU NÓI ĐẶC TRƯNG:**
- "Tôi thực sự YÊU điều này..."
- "Đây là điều TUYỆT VỜI NHẤT..."
- "Bạn PHẢI thử..."
- "Tôi không thể ngừng nghĩ về..."

**BODY LANGUAGE (cho VEO 3):**
- Tư thế: Animated, forward
- Chuyển động: Excited gestures, smiling
- Ánh mắt: Bright, enthusiastic
`,
  the_maker: `
## VAI TRÒ: THE MAKER (Nhà sáng tạo)
**XƯNG HÔ & NGÔN NGỮ:**
- Xưng: "Tôi" hands-on
- Gọi người xem: "Bạn"
- Câu mở đầu mẫu: "Tôi đã tự tay build thứ này và đây là những gì tôi học được..."

**GIỌNG ĐIỆU XUYÊN SUỐT:**
- Practical, DIY spirit
- Process-oriented
- Problem-solving mindset

**CÂU NÓI ĐẶC TRƯNG:**
- "Tôi đã tự tay làm..."
- "Cách tôi build điều này..."
- "Sau nhiều lần thử nghiệm..."
- "Trick tôi phát hiện ra là..."

**BODY LANGUAGE (cho VEO 3):**
- Tư thế: Working stance, practical
- Chuyển động: Demonstrative, showing process
- Ánh mắt: Focused on the work
`,
  // Neutral
  neutral_presenter: `
## VAI TRÒ: NEUTRAL PRESENTER (Người dẫn trung tính)
**XƯNG HÔ & NGÔN NGỮ:**
- Xưng: Không xưng hô cụ thể, dùng câu bị động
- Gọi người xem: "Chúng ta", không gọi trực tiếp
- Câu mở đầu mẫu: "Hôm nay, chúng ta sẽ tìm hiểu về..."

**GIỌNG ĐIỆU XUYÊN SUỐT:**
- Objective, factual
- Balanced, không thiên vị
- Professional distance

**CÂU NÓI ĐẶC TRƯNG:**
- "Điều này có nghĩa rằng..."
- "Dữ liệu cho thấy..."
- "Có thể thấy rằng..."
- "Một số quan điểm cho rằng..."

**BODY LANGUAGE (cho VEO 3):**
- Tư thế: Neutral, steady
- Chuyển động: Minimal, professional
- Ánh mắt: Direct but neutral
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

// ============================================
// SCRIPT PURPOSE - Multi-format output
// ============================================
const SCRIPT_PURPOSE_LABELS: Record<string, string> = {
  ai_video: 'Video AI',
  ai_video_veo3: 'Video AI', // legacy
  ai_video_minimax: 'Video AI', // legacy
  teleprompter: 'Quay người thật (Teleprompter)',
  voiceover: 'Voice-Over / TTS',
  production: 'Production Script',
};

function getOutputFormat(purpose: string, characterTypeName: string, duration: number, promptCount: string, voiceRegionLabel: string): string {
  switch(purpose) {
    case 'ai_video_veo3':
      return `PROMPT X [00:00-00:08]:

[VISUAL DIRECTION]
• Shot: Medium shot (35mm)
• Camera: Static with subtle breathing movement
• Lighting: Soft natural daylight from window
• Background: Professional studio background, slightly blurred

[CHARACTER ACTION]
(Theo body language của ${characterTypeName} - mô tả chi tiết tư thế, chuyển động tay, gật đầu, ánh mắt)

[DIALOGUE - Verbatim for Minimax]
"..." (Xưng hô và giọng điệu theo ${characterTypeName}, có câu nói đặc trưng nếu phù hợp)

[TONE & DELIVERY]
${voiceRegionLabel}, theo đặc trưng ${characterTypeName}, nhấn mạnh từ khóa: [từ cần nhấn mạnh], pause: [vị trí nghỉ]

[AUDIO NOTES - For VEO 3]
• Ambience: [âm thanh môi trường phù hợp bối cảnh]
• SFX: None (hoặc hiệu ứng cụ thể nếu cần)
• Music mood: [subtle/building/emotional tùy theo nội dung]`;

    case 'ai_video_minimax':
      return `CLIP X:

[SCENE]
Medium shot, professional studio. Person speaking ${characterTypeName === 'the_virtuoso' ? 'authoritatively' : 'confidently'}. Soft lighting.
[Camera motion: Pan left/Zoom in slowly/Static - chọn phù hợp]

[VOICE]
"..." (Lời thoại theo ${characterTypeName})

[DURATION]
~${Math.round(duration / parseInt(promptCount.split('-')[0]))} giây`;

    case 'teleprompter':
      return `--- ĐOẠN X ---

[CUE: Mô tả hành động/biểu cảm trước khi nói - theo ${characterTypeName}]

"Lời thoại ở đây..." (Xưng hô theo ${characterTypeName})

[NHẤN MẠNH: từ khóa quan trọng cần nhấn]
[PAUSE: vị trí nghỉ nếu cần]

---`;

    case 'voiceover':
      return `ĐOẠN X:

"Lời thoại ở đây..." (Giọng điệu theo ${characterTypeName})

HƯỚNG DẪN GIỌNG:
- Tone: [Tự tin/Ấm áp/Nghiêm túc - theo ${characterTypeName}]
- Tempo: [Vừa phải/Nhanh/Chậm]
- Nhấn mạnh: [từ khóa cần nhấn]
- Pause: [vị trí nghỉ]
- Cảm xúc: [Mô tả cảm xúc trong giọng]`;

    case 'production':
      return `SCENE X / SHOT X [00:00-00:08]:

CAMERA:
- Shot: Medium (35mm)
- Movement: Static → Slight push in
- Framing: Subject center, rule of thirds

LIGHTING:
- Key: Soft box camera left
- Fill: Bounce board right
- Background: Separation light

AUDIO:
- Boom position: Above, slightly left
- Ambience: Record 30s room tone

ACTION:
(Mô tả hành động của ${characterTypeName} - tư thế, chuyển động, biểu cảm)

DIALOGUE:
"..." (Theo ${characterTypeName})

NOTES FOR EDITOR:
- Cut point: [vị trí cắt phù hợp]
- B-roll suggestion: [gợi ý B-roll nếu cần]`;

    default:
      return ''; // Default VEO 3
  }
}

// Voice Region Config
const VOICE_REGION_CONFIG: Record<string, { label: string; dialect_notes: string }> = {
  northern: {
    label: 'Giọng miền Bắc',
    dialect_notes: 'Phân biệt rõ phụ âm đầu (r/d, tr/ch, s/x), dấu thanh chuẩn, ngữ điệu điềm đạm'
  },
  central: {
    label: 'Giọng miền Trung',
    dialect_notes: 'Ngữ điệu đặc trưng mềm mại, phát âm mềm hơn, dấu sắc và nặng đặc thù'
  },
  southern: {
    label: 'Giọng miền Nam',
    dialect_notes: 'Không phân biệt r/g, tr/ch, s/x, dấu hỏi/ngã ít phân biệt, ngữ điệu trầm bổng'
  }
};

// Dialogue Style Config
const DIALOGUE_STYLE_CONFIG: Record<string, { label: string; prompt_instruction: string }> = {
  monologue: {
    label: 'Độc thoại',
    prompt_instruction: 'Nói liên tục như đang thuyết trình, không xen kẽ câu hỏi, giữ flow mạch lạc'
  },
  conversational: {
    label: 'Trò chuyện',
    prompt_instruction: 'Xen kẽ câu hỏi tu từ như "bạn thấy sao?", "đúng không?", "bạn có từng gặp trường hợp này chưa?" để tăng engagement'
  },
  internal: {
    label: 'Suy tư nội tâm',
    prompt_instruction: 'Giọng điệu như đang tự vấn, suy tư, có pause sâu, câu ngắn, như đang chia sẻ suy nghĩ cá nhân sâu sắc'
  },
  narrative: {
    label: 'Kể chuyện',
    prompt_instruction: 'Kể chuyện với timeline rõ ràng, có nhân vật, bối cảnh, biến cố, dùng ngôn ngữ vivid và descriptive'
  }
};

function buildSystemPrompt(
  topic: string,
  duration: number,
  videoType: string,
  characterType: string,
  brandVoice?: BrandVoice,
  mergedRules?: MergedRules,
  hook?: HookDetails,
  angle?: string,
  scriptPurpose?: string,
  voiceRegion?: string,
  dialogueStyle?: string
): string {
  const promptCount = getPromptCount(duration);
  const videoTypeName = VIDEO_TYPE_LABELS[videoType] || "Chuyên gia chia sẻ";
  const characterTypeName = CHARACTER_TYPE_LABELS[characterType] || "Chuyên gia";
  const purposeName = SCRIPT_PURPOSE_LABELS[scriptPurpose || 'ai_video_veo3'] || "Video AI (VEO 3)";
  const effectivePurpose = scriptPurpose || 'ai_video_veo3';
  
  // Voice Region - default to northern if not specified
  const effectiveVoiceRegion = voiceRegion || 'northern';
  const voiceRegionInfo = VOICE_REGION_CONFIG[effectiveVoiceRegion] || VOICE_REGION_CONFIG['northern'];
  
  // Dialogue Style - default to monologue if not specified
  const effectiveDialogueStyle = dialogueStyle || 'monologue';
  const dialogueStyleInfo = DIALOGUE_STYLE_CONFIG[effectiveDialogueStyle] || DIALOGUE_STYLE_CONFIG['monologue'];

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

  // Build Self-Correction Checklist
  const selfCorrectionChecklist = `
# ✅ SELF-CORRECTION CHECKLIST (AI PHẢI TỰ KIỂM TRA TRƯỚC KHI XUẤT)

⚠️ TRƯỚC KHI XUẤT KỊCH BẢN, AI PHẢI TỰ KIỂM TRA TẤT CẢ CÁC MỤC SAU:

□ **HOOK ĐÚNG THỂ LOẠI?**
  - Nếu là "expert_share" → Hook PHẢI có authority claim (kinh nghiệm, năm trong nghề, "tôi đã...")
  - Nếu là "listicle" → Hook PHẢI có số lượng ("5 điều...", "Top 7...", "3 bí mật...")
  - Nếu là "warning_mistake" → Hook PHẢI có cảnh báo urgent ("ĐỪNG...", "SAI LẦM...", "DỪNG LẠI...")
  - Nếu là "tutorial_howto" → Hook PHẢI nêu kết quả sẽ đạt được
  - Nếu là "myth_busting" → Hook PHẢI nêu myth phổ biến rồi phản bác

□ **CẤU TRÚC ĐÚNG THỂ LOẠI "${videoTypeName}"?**
  - Số lượng prompt có đúng ${promptCount}?
  - Mỗi prompt có map với yêu cầu cấu trúc không? (PROMPT 1 = Hook, PROMPT 2-3 = theo cấu trúc thể loại)
  - Không dùng cấu trúc của thể loại khác?

□ **CÂU NÓI ĐẶC TRƯNG "${characterTypeName}" XUẤT HIỆN ĐỦ?**
  - Có ít nhất 3-4 câu nói đặc trưng của nhân vật?
  - Phân bố tự nhiên, không gượng ép?
  - Xuyên suốt kịch bản, không chỉ ở đầu?

□ **XƯNG HÔ NHẤT QUÁN?**
  - Kiểm tra xưng hô trong TẤT CẢ các prompt
  - KHÔNG thay đổi giữa "tôi/mình/bạn" 
  - Phù hợp với CHARACTER INSTRUCTIONS

□ **BODY LANGUAGE PHÙ HỢP?**
  - Mỗi prompt có action phù hợp với nhân vật ${characterTypeName}?
  - Theo đúng BODY LANGUAGE trong CHARACTER INSTRUCTIONS?
  - Không có chuyển động đột ngột?

□ **BRAND VOICE TUÂN THỦ?**
  - Không dùng từ cấm?
  - Tone phù hợp với định vị thương hiệu?
  - Compliance rules được tuân thủ?

⛔ NẾU BẤT KỲ MỤC NÀO KHÔNG ĐẠT, AI PHẢI SỬA LẠI TRƯỚC KHI XUẤT!
`;

  // Build Negative Examples
  const negativeExamples = `
# ⛔ NEGATIVE EXAMPLES - NHỮNG GÌ AI KHÔNG ĐƯỢC LÀM

## SAI: Mix cấu trúc thể loại
- ❌ Chọn "expert_share" nhưng dùng hook "5 bí mật..." → Đây là hook của listicle, KHÔNG PHẢI expert_share
- ❌ Chọn "tutorial_howto" nhưng không có các bước rõ ràng (Bước 1, Bước 2...)
- ❌ Chọn "myth_busting" nhưng không có phần myth vs reality
- ❌ Chọn "warning_mistake" nhưng hook không có urgency/cảnh báo
- ❌ Chọn "listicle" nhưng không đánh số thứ tự các tips

## SAI: Không giữ nhất quán character
- ❌ PROMPT 1 xưng "tôi", PROMPT 3 xưng "mình" → PHẢI nhất quán
- ❌ Bắt đầu với giọng tự tin (the_virtuoso) nhưng kết thúc với giọng friendly (the_coach)
- ❌ Câu nói đặc trưng chỉ xuất hiện ở PROMPT 1 rồi biến mất
- ❌ Body language không phù hợp với character type

## SAI: Hook không đúng
- ❌ expert_share nhưng không có authority claim (không mention kinh nghiệm, năm trong nghề)
- ❌ listicle nhưng hook không có số lượng cụ thể
- ❌ warning_mistake nhưng hook không tạo urgency

## ĐÚNG: Ví dụ đúng
- ✅ expert_share: "Với 10 năm kinh nghiệm trong ngành thuế, tôi có thể khẳng định..."
- ✅ listicle: "5 sai lầm nghiêm trọng nhất về thuế mà 90% hộ kinh doanh mắc phải..."
- ✅ warning_mistake: "ĐỪNG mắc sai lầm này! Có thể khiến bạn bị phạt hàng chục triệu..."
`;

  // Build Priority Order section
  const priorityOrder = `
# ⚡ THỨ TỰ ƯU TIÊN (KHÔNG ĐƯỢC ĐẢO NGƯỢC)

1. **VIDEO TYPE "${videoTypeName}"** → Quyết định CẤU TRÚC kịch bản - AI KHÔNG được dùng cấu trúc của thể loại khác
2. **CHARACTER TYPE "${characterTypeName}"** → Quyết định XƯNG HÔ & GIỌNG ĐIỆU - Phải nhất quán 100% xuyên suốt
3. **Brand Voice** → Điều chỉnh TONE - Không được override Video Type hoặc Character Type
4. **Topic** → Là NỘI DUNG - Được adapt theo cấu trúc và giọng điệu đã chọn

⚠️ NGUYÊN TẮC: Nếu có mâu thuẫn, ưu tiên theo thứ tự trên. Video Type LUÔN thắng về cấu trúc, Character Type LUÔN thắng về xưng hô.
`;

  // Inject current date context
  const dateContextSection = buildDateContextSection();

  return `Bạn là một hệ thống AI chuyên tạo KỊCH BẢN & PROMPT VIDEO cho video ngắn TikTok (1–3 phút), phục vụ quy trình sản xuất: VEO 3 (HÌNH ẢNH) → Minimax (GIỌNG NÓI) → CapCut (DỰNG).

${dateContextSection}

${priorityOrder}

# ⚡ QUAN TRỌNG NHẤT: VIDEO TYPE & CHARACTER TYPE

## 🎬 THỂ LOẠI VIDEO: ${videoTypeName}
${videoTypeInstructions}

**⚠️ BẮT BUỘC CHO THỂ LOẠI NÀY:**
- Cấu trúc kịch bản PHẢI tuân theo CẤU TRÚC BẮT BUỘC của thể loại "${videoTypeName}" ở trên
- Hook style PHẢI theo HOOK STYLE MẪU của thể loại này - KHÔNG ĐƯỢC dùng hook style của thể loại khác
- Tone & Style PHẢI phù hợp với đặc trưng thể loại
- KHÔNG được dùng cấu trúc hoặc hook của thể loại khác

## 🎭 NHÂN VẬT: ${characterTypeName}
${characterTypeInstructions}

**⚠️ BẮT BUỘC CHO NHÂN VẬT NÀY:**
- Mọi lời thoại PHẢI dùng xưng hô và ngôn ngữ của nhân vật "${characterTypeName}"
- Giọng điệu PHẢI nhất quán theo mô tả nhân vật - KHÔNG thay đổi giữa các prompt
- Câu nói đặc trưng PHẢI xuất hiện TỰ NHIÊN trong kịch bản (ít nhất 3-4 lần, phân bố đều)
- Body language trong MỖI prompt PHẢI phù hợp với character type

${negativeExamples}

${brandVoiceSection}

${angleSection}

${hookSection}

# THÔNG TIN ĐẦU VÀO
- Chủ đề: ${topic}
- Thời lượng: ${duration} giây
- Thể loại: ${videoTypeName} ⬅️ CẤU TRÚC KỊCH BẢN THEO THỂ LOẠI NÀY
- Nhân vật: ${characterTypeName} ⬅️ XƯNG HÔ VÀ GIỌNG ĐIỆU THEO NHÂN VẬT NÀY
- Số lượng prompt cần tạo: ${promptCount} prompt
${angle ? `- Góc tiếp cận: ${TOPIC_ANGLE_LABELS[angle] || angle}` : ''}
${hook?.opening_line ? '- Hook: Đã có sẵn (sử dụng nguyên văn cho PROMPT 1)' : `- Hook: AI tự tạo THEO HOOK STYLE MẪU của thể loại "${videoTypeName}" - KHÔNG ĐƯỢC dùng hook style của thể loại khác`}

# NGUYÊN TẮC TẠO KỊCH BẢN

## 1. CẤU TRÚC (Theo thể loại ${videoTypeName})
- PHẢI tuân theo CẤU TRÚC BẮT BUỘC trong VIDEO TYPE INSTRUCTIONS
- Tổng thời lượng: ${duration} giây
- Mỗi PROMPT ≈ 8 giây
- Số prompt: ${promptCount}
- Mỗi prompt = 1 ý hoàn chỉnh

## 2. NHÂN VẬT (Theo ${characterTypeName})
- Xưng hô: THEO CHARACTER INSTRUCTIONS - NHẤT QUÁN 100%
- Giọng điệu: THEO CHARACTER INSTRUCTIONS - KHÔNG thay đổi
- Câu nói đặc trưng: SỬ DỤNG TỰ NHIÊN - ít nhất 3-4 lần
- Body language: THEO CHARACTER INSTRUCTIONS - mỗi prompt phải có

## 3. QUY ƯỚC GIỌNG NÓI
- Giọng: ${voiceRegionInfo.label}
- Đặc điểm: ${voiceRegionInfo.dialect_notes}
- Phong cách hội thoại: ${dialogueStyleInfo.label} - ${dialogueStyleInfo.prompt_instruction}
- Phong cách: Theo nhân vật ${characterTypeName}
- Ngữ điệu: Nhấn mạnh từ khóa, nhịp nghỉ tự nhiên

## 4. QUY ƯỚC VISUAL (VEO 3 COMPATIBLE)
- Shot mặc định: Medium shot (35mm)
- Camera: Static with subtle breathing movement
- Lighting: Soft natural lighting
- Background: Phù hợp với thể loại ${videoTypeName}

# ĐỊNH DẠNG CHUẨN MỖI PROMPT (${purposeName})

${getOutputFormat(effectivePurpose, characterTypeName, duration, promptCount, voiceRegionInfo.label)}

# NGUYÊN TẮC TIMESTAMP
- Tính timestamp dựa trên thời lượng ${duration} giây chia đều cho ${promptCount} prompt
- Mỗi prompt ≈ ${Math.round(duration / (parseInt(promptCount.split('-')[0])) )} giây

[CHARACTER ACTION]
(Theo body language của ${characterTypeName} - mô tả chi tiết tư thế, chuyển động tay, gật đầu, ánh mắt)

[DIALOGUE - Verbatim for Minimax]
"..." (Xưng hô và giọng điệu theo ${characterTypeName}, có câu nói đặc trưng nếu phù hợp)

[TONE & DELIVERY]
${voiceRegionInfo.label}, theo đặc trưng ${characterTypeName}, nhấn mạnh từ khóa: [từ cần nhấn mạnh], pause: [vị trí nghỉ]

[AUDIO NOTES - For VEO 3]
• Ambience: [âm thanh môi trường phù hợp bối cảnh]
• SFX: None (hoặc hiệu ứng cụ thể nếu cần)
• Music mood: [subtle/building/emotional tùy theo nội dung]

# NGUYÊN TẮC TIMESTAMP
- Tính timestamp dựa trên thời lượng ${duration} giây chia đều cho ${promptCount} prompt
- Mỗi prompt ≈ ${Math.round(duration / (parseInt(promptCount.split('-')[0])) )} giây
- Format: [MM:SS-MM:SS]

# NGUYÊN TẮC NỐI MẠCH
- Prompt sau kế thừa từ prompt trước
- Không chào hỏi lại, không reset
- Nghe như MỘT NGƯỜI NÓI LIÊN TỤC

${selfCorrectionChecklist}

# YÊU CẦU ĐẦU RA
– Chỉ xuất danh sách PROMPT theo định dạng VEO 3 ở trên
– Mỗi PROMPT PHẢI có đầy đủ: timestamp, VISUAL DIRECTION, CHARACTER ACTION, DIALOGUE, TONE & DELIVERY, AUDIO NOTES
– PHẢI theo cấu trúc của thể loại "${videoTypeName}" (đã kiểm tra qua Self-Correction Checklist)
– PHẢI theo xưng hô và giọng điệu của "${characterTypeName}" (đã kiểm tra qua Self-Correction Checklist)
– Không giải thích, không bình luận`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let { topic, duration, video_type, character_type, script_purpose, voice_region, dialogue_style, brandTemplateId, brandVoiceVariantId, hook, angle, organization_id: requestOrgId, targetJourneyStage, targetPersonaId, targetProductId, campaignId } = await req.json();

    if (!topic || !topic.trim()) {
      return new Response(
        JSON.stringify({ error: "Vui lòng nhập chủ đề video" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Note: AI calls now use the multi-provider system (ai-provider.ts)
    // which handles API key management internally

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Generating script for topic:", topic);
    console.log("Duration:", duration, "Video type:", video_type, "Character:", character_type);
    console.log("Script purpose:", script_purpose || 'ai_video_veo3');
    console.log("Hook provided:", hook ? "Yes" : "No", hook?.framework || "");
    console.log("Angle:", angle || "None");
    
    // Load Brand Voice and Industry Memory from template if provided
    let brandVoice: BrandVoice | undefined;
    let industryMemory: IndustryMemory | null = null;
    let mergedRules: MergedRules | undefined;
    
    if (brandTemplateId) {
      // Fetch brand template, personas, and product-persona mappings in parallel
      const [templateResult, personasResult, mappingsResult] = await Promise.all([
        supabase
          .from("brand_templates")
          .select("brand_positioning, tone_of_voice, formality_level, language_style, preferred_words, forbidden_words, allow_emoji, compliance_rules, industry_template_id")
          .eq("id", brandTemplateId)
          .single(),
        supabase
          .from("customer_personas")
          .select(`
            id, name, occupation, age_range, pain_points, desires, is_primary,
            device_usage, tech_savviness, buying_motivation, communication_style,
            typical_funnel_stage, journey_map, priority_score
          `)
          .eq("brand_template_id", brandTemplateId)
          .order("is_primary", { ascending: false })
          .limit(3),
        supabase
          .from("product_persona_mappings")
          .select(`
            product_id, persona_id, relevance_score, is_primary_product,
            custom_pitch, key_benefits, objection_handlers, preferred_content_angles, avoid_topics,
            product:brand_products(id, name, category, unique_selling_points),
            persona:customer_personas(id, name, occupation)
          `)
          .eq("brand_template_id", brandTemplateId)
          .order("relevance_score", { ascending: false })
          .limit(10)
      ]);

      if (templateResult.data) {
        const template = templateResult.data;
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

      // Build persona context for script generation
      let personaContext = '';
      if (personasResult.data?.length) {
        const primary = personasResult.data.find((p: any) => p.is_primary) || personasResult.data[0];
        personaContext = `

## TARGET PERSONA CONTEXT
### Primary Persona: ${primary.name}
- Occupation: ${primary.occupation || 'N/A'}
- Age Range: ${primary.age_range || 'N/A'}

### Device & Tech Preferences
- Device Usage: ${primary.device_usage || 'mobile-first'} → ${primary.device_usage === 'mobile-first' ? 'Keep visuals simple, text large' : 'Can include more details'}
- Tech Savviness: ${primary.tech_savviness || 'medium'} → ${primary.tech_savviness === 'low' ? 'Use simple explanations, avoid jargon' : 'Can use technical terms'}

### Buying Psychology
- Motivations: ${(primary.buying_motivation || []).join(', ') || 'N/A'}
- Pain Points: ${(primary.pain_points || []).slice(0, 3).join(', ') || 'N/A'}
- Desires: ${(primary.desires || []).slice(0, 3).join(', ') || 'N/A'}

### Communication Preferences
- Style: ${primary.communication_style || 'balanced'}
- Journey Stage: ${primary.typical_funnel_stage || 'awareness'}
${primary.journey_map?.length ? `- Journey Map: ${primary.journey_map.map((j: any) => j.stage + ' → ' + j.content_type).join(', ')}` : ''}

→ Script PHẢI phù hợp với device usage, tech level và pain points của persona này`;
        console.log("Persona context loaded for script:", primary.name);
      }

      // Build Product-Persona mapping context for script
      let productMappingContext = '';
      if (mappingsResult.data?.length) {
        const primaryPersona = personasResult.data?.find((p: any) => p.is_primary) || personasResult.data?.[0];
        const relevantMappings = primaryPersona 
          ? mappingsResult.data.filter((m: any) => m.persona?.id === primaryPersona.id)
          : mappingsResult.data.slice(0, 5);

        if (relevantMappings.length > 0) {
          productMappingContext = `

## PRODUCT RECOMMENDATIONS FOR SCRIPT
Khi viết kịch bản cho persona này, có thể NHẮC ĐẾN các sản phẩm sau một cách TỰ NHIÊN:

${relevantMappings.map((m: any) => 
  `### ${m.product?.name}${m.is_primary_product ? ' ⭐ (Primary)' : ''} (Fit: ${m.relevance_score}%)
${m.custom_pitch ? `- Pitch gợi ý: "${m.custom_pitch}"` : ''}
${m.key_benefits?.length ? `- Benefits: ${m.key_benefits.join(', ')}` : ''}
${m.objection_handlers?.length ? `- Xử lý objections: ${m.objection_handlers.join('; ')}` : ''}
${m.preferred_content_angles?.length ? `- Góc content: ${m.preferred_content_angles.join(', ')}` : ''}
${m.avoid_topics?.length ? `- ⚠️ TRÁNH: ${m.avoid_topics.join(', ')}` : ''}`
).join('\n\n')}

→ Sử dụng pitch và benefits đã chuẩn bị, KHÔNG tự nghĩ ra claims mới`;
          console.log("Product-persona mappings loaded for script:", relevantMappings.length);

          // Fetch Journey Stage Messaging if targetJourneyStage is provided
          if (targetJourneyStage || targetPersonaId || targetProductId) {
            // Get mapping IDs for the target persona/product
            const targetMappingIds = relevantMappings
              .filter((m: any) => {
                if (targetPersonaId && targetProductId) {
                  return m.persona?.id === targetPersonaId && m.product?.id === targetProductId;
                }
                if (targetPersonaId) return m.persona?.id === targetPersonaId;
                if (targetProductId) return m.product?.id === targetProductId;
                return true;
              })
              .map((m: any) => m.id)
              .filter(Boolean);

            if (targetMappingIds.length > 0) {
              const { data: journeyData } = await supabase
                .from('journey_stage_messaging')
                .select('*')
                .in('mapping_id', targetMappingIds);

              if (journeyData?.length) {
                const journeyMessagingContext = buildJourneyStageMessagingSection(
                  journeyData as JourneyStageMessagingData[],
                  targetJourneyStage as JourneyStage
                );
                if (journeyMessagingContext) {
                  productMappingContext += journeyMessagingContext;
                  console.log("Journey stage messaging loaded for script:", journeyData.length, "entries, target stage:", targetJourneyStage || "all");
                }
              }
            }
          }
        }
      }

      // Inject both persona and product mapping context into topic
      if (personaContext || productMappingContext) {
        topic = `${topic}${personaContext}${productMappingContext}`;
      }
    }

    const systemPrompt = buildSystemPrompt(topic, duration, video_type, character_type, brandVoice, mergedRules, hook, angle, script_purpose, voice_region, dialogue_style);

    // Get AI config from Admin Panel for model override
    const aiConfig = await getAIConfig('generate-script', requestOrgId || undefined);
    console.log('[generate-script] Using AI config:', { model: aiConfig.model, temperature: aiConfig.temperature });

    // Define AI generation function using multi-provider system
    const generateAIContent = async (): Promise<string> => {
      console.log("Calling AI for script via multi-provider system...");
      
      const result = await callAIProvider({
        functionName: 'generate-script',
        organizationId: requestOrgId || undefined,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Hãy tạo kịch bản video TikTok về chủ đề: "${topic}"` },
        ],
        modelOverride: aiConfig.model || undefined,
        temperatureOverride: aiConfig.temperature,
        maxTokensOverride: aiConfig.max_tokens,
      });

      if (!result.success) {
        console.error("AI Provider error:", result.error);

        if (result.error?.includes('Rate limit') || result.error?.includes('429')) {
          throw { status: 429, message: "Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau." };
        }
        if (result.error?.includes('Payment') || result.error?.includes('402')) {
          throw { status: 402, message: "Cần nạp thêm credits để tiếp tục sử dụng." };
        }

        throw new Error("Không thể tạo kịch bản. Vui lòng thử lại.");
      }

      console.log('[generate-script] AI response from provider:', result.provider, 'model:', result.model);
      const content = result.data?.choices?.[0]?.message?.content;

      if (!content) {
        console.error("No content in AI response:", result.data);
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

    // ============================================
    // SELF-CRITIQUE LOOP - Evaluate and refine script
    // ============================================
    let critiqueResult: CritiqueResult | null = null;
    let wasRefined = false;
    let refinementCount = 0;

    // Only run critique if not from cache
    if (!fromCache) {
      try {
        const critiqueLoop = await runSelfCritiqueLoop({
          content,
          contentType: 'script',
          brandVoice,
          mergedRules,
          additionalContext: `Video type: ${video_type}, Character: ${character_type}, Duration: ${duration}`,
          apiKey: Deno.env.get("LOVABLE_API_KEY") || '',
          organizationId: requestOrgId || undefined,
        });

        content = critiqueLoop.finalContent;
        critiqueResult = critiqueLoop.critiqueResult;
        wasRefined = critiqueLoop.wasRefined;
        refinementCount = critiqueLoop.refinementCount;

        console.log(`Self-Critique complete: score=${critiqueResult.overall_score}, refined=${wasRefined}`);
      } catch (critiqueError) {
        console.error("Self-critique failed, using original content:", critiqueError);
        // Continue with original content if critique fails
      }
    }

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
        script_purpose: script_purpose || 'ai_video_veo3',
        voice_region: voice_region || 'northern',
        dialogue_style: dialogue_style || 'monologue',
        content,
        user_id: userId,
        organization_id: organizationId,
        status: initialStatus,
        brand_template_id: brandTemplateId || null,
        brand_voice_variant_id: brandVoiceVariantId || null,
        industry_template_id: industryMemory?.id || null,
        industry_template_version: industryMemory?.version || null,
        campaign_id: campaignId || null,
        // Self-critique metadata
        critique_score: critiqueResult?.overall_score || null,
        critique_details: critiqueResult || null,
        was_refined: wasRefined,
        refinement_count: refinementCount,
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

    console.log("Script saved with ID:", savedScript.id, "fromCache:", fromCache, "critiqueScore:", critiqueResult?.overall_score || 'N/A');

    // ============ SAVE AI METRICS WITH COST ============
    if (!fromCache) {
      try {
        const model = 'google/gemini-2.5-flash';
        const inputTokensEstimated = 2000; // System prompt + context
        const outputTokensEstimated = Math.round(content.length / 4); // Approx 4 chars per token
        const estimatedCostUsd = estimateCost(model, inputTokensEstimated, outputTokensEstimated);
        
        await saveMetrics(supabase, {
          traceId: generateTraceId(),
          functionName: 'generate-script',
          organizationId: organizationId || undefined,
          userId: userId || undefined,
          brandTemplateId: brandTemplateId || undefined,
          totalDurationMs: 0,
          inputTokensEstimated,
          outputTokensEstimated,
          modelsUsed: { default: model },
          estimatedCostUsd,
          hadError: false,
          cacheHit: false,
          contextSources: [],
        });
        console.log(`[generate-script] Metrics saved: cost=$${estimatedCostUsd.toFixed(6)}`);
      } catch (metricsErr) {
        console.warn(`[generate-script] Failed to save metrics:`, metricsErr);
      }
    }

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
