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

# ⚡ QUAN TRỌNG NHẤT: VIDEO TYPE & CHARACTER TYPE

## 🎬 THỂ LOẠI VIDEO: ${videoTypeName}
${videoTypeInstructions}

**⚠️ BẮT BUỘC:**
- Cấu trúc kịch bản PHẢI tuân theo CẤU TRÚC BẮT BUỘC của thể loại "${videoTypeName}" ở trên
- Hook style PHẢI theo mẫu của thể loại này
- Tone & Style PHẢI phù hợp với đặc trưng thể loại
- KHÔNG được dùng cấu trúc của thể loại khác

## 🎭 NHÂN VẬT: ${characterTypeName}
${characterTypeInstructions}

**⚠️ BẮT BUỘC:**
- Mọi lời thoại PHẢI dùng xưng hô và ngôn ngữ của nhân vật "${characterTypeName}"
- Giọng điệu PHẢI nhất quán theo mô tả nhân vật
- Câu nói đặc trưng PHẢI xuất hiện tự nhiên trong kịch bản
- Body language trong mỗi prompt PHẢI phù hợp với character type

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
${hook?.opening_line ? '- Hook: Đã có sẵn (sử dụng nguyên văn cho PROMPT 1)' : '- Hook: AI tự tạo THEO HOOK STYLE MẪU của thể loại video'}

# NGUYÊN TẮC TẠO KỊCH BẢN

## 1. CẤU TRÚC (Theo thể loại ${videoTypeName})
- PHẢI tuân theo CẤU TRÚC BẮT BUỘC trong VIDEO TYPE INSTRUCTIONS
- Tổng thời lượng: ${duration} giây
- Mỗi PROMPT ≈ 8 giây
- Số prompt: ${promptCount}
- Mỗi prompt = 1 ý hoàn chỉnh

## 2. NHÂN VẬT (Theo ${characterTypeName})
- Xưng hô: THEO CHARACTER INSTRUCTIONS
- Giọng điệu: THEO CHARACTER INSTRUCTIONS
- Câu nói đặc trưng: SỬ DỤNG TỰ NHIÊN
- Body language: THEO CHARACTER INSTRUCTIONS

## 3. QUY ƯỚC GIỌNG NÓI
- Giọng: miền Bắc
- Phong cách: Theo nhân vật ${characterTypeName}
- Ngữ điệu: Nhấn mạnh từ khóa, nhịp nghỉ tự nhiên

## 4. QUY ƯỚC CHUYỂN ĐỘNG (VEO 3)
- Tư thế: Đứng/ngồi ổn định, nhìn camera
- Chuyển động: Theo BODY LANGUAGE của nhân vật ${characterTypeName}
- TUYỆT ĐỐI KHÔNG: Quay đầu đột ngột, thay đổi tư thế lớn

# ĐỊNH DẠNG CHUẨN MỖI PROMPT

PROMPT X:

[1] Chuyển động nhân vật:
(Theo body language của ${characterTypeName}, kế thừa từ prompt trước)

[2] Lời thoại (đọc nguyên văn):
"…" (Xưng hô và giọng điệu theo ${characterTypeName})

[3] Giọng điệu:
Giọng miền Bắc, theo đặc trưng ${characterTypeName}

# NGUYÊN TẮC NỐI MẠCH
- Prompt sau kế thừa từ prompt trước
- Không chào hỏi lại, không reset
- Nghe như MỘT NGƯỜI NÓI LIÊN TỤC

# YÊU CẦU ĐẦU RA
– Chỉ xuất danh sách PROMPT
– Đúng định dạng
– PHẢI theo cấu trúc của thể loại "${videoTypeName}"
– PHẢI theo xưng hô và giọng điệu của "${characterTypeName}"
– Không giải thích, không bình luận`;
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
