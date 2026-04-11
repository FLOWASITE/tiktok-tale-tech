import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FAQSEOSchema } from "@/components/SEOHead";

const faqs = [
  {
    question: "Flowa khác gì ChatGPT / Jasper / Copy.ai?",
    answer: "Các tool trên là AI Writing Tool — bạn viết prompt, AI trả về 1 bài, bạn tự review, tự format, tự đăng. Flowa là AI Marketing Agent — bạn đặt mục tiêu, Agent tự chạy toàn bộ pipeline: nghiên cứu → tạo nội dung → chấm điểm → sửa → đăng bài. Bạn chỉ cần duyệt (hoặc bật auto-approve).",
  },
  {
    question: "Agent có thực sự hiểu brand voice của tôi không?",
    answer: "Có. Bạn upload brand guidelines hoặc paste 3-5 bài mẫu. Agent phân tích tone, style, từ vựng đặc trưng và áp dụng nhất quán trên mọi bài viết, mọi kênh. Cross-session memory nghĩa là Agent nhớ mãi — không cần nhắc lại.",
  },
  {
    question: "Flowa hỗ trợ những kênh nào?",
    answer: "12 kênh: Facebook, Instagram, TikTok, LinkedIn, X/Twitter, Zalo OA, Email Newsletter, YouTube (script), Telegram, Google Maps, Website/Landing Page, Blog. Mỗi kênh được tái cấu trúc nội dung riêng, không phải copy-paste.",
  },
  {
    question: "Ngành tôi có quy định quảng cáo nghiêm ngặt (y tế, tài chính...). Flowa xử lý thế nào?",
    answer: "Flowa có Industry Memory Packs cho 9+ nhóm ngành. Agent tự nhớ thuật ngữ chuẩn, từ cấm, quy tắc quảng cáo theo luật Việt Nam. Compliance được kiểm tra tự động TRƯỚC KHI output — giảm rủi ro vi phạm đến mức tối thiểu.",
  },
  {
    question: "Dữ liệu của tôi có an toàn không?",
    answer: "Mã hóa AES-256 + TLS. Cách ly dữ liệu tuyệt đối giữa các tổ chức (Row Level Security). Prompt Guard chống AI injection. Tuân thủ NĐ 13/2023 về bảo vệ dữ liệu cá nhân. Nội dung gửi đến AI providers được ẩn danh hóa.",
  },
  {
    question: "Tôi có thể bắt đầu miễn phí không?",
    answer: "Có. Gói Starter miễn phí mãi mãi với 30 bài/tháng, 3 kênh, Brand Voice cơ bản và Quality Scoring. Không cần thẻ tín dụng. Setup chỉ 5 phút.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 lg:py-32 bg-background">
      <FAQSEOSchema faqs={faqs} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Câu hỏi{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              thường gặp
            </span>
          </h2>
          <p className="text-muted-foreground">
            Những điều bạn cần biết trước khi bắt đầu
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  openIndex === index
                    ? "border-indigo-500/30 bg-muted/30"
                    : "border-border hover:border-indigo-500/20"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className={`font-semibold transition-colors ${
                    openIndex === index ? "text-indigo-400" : "text-foreground"
                  }`}>
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </div>

                <AnimatePresence initial={false}>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            Còn thắc mắc?{" "}
            <a href="mailto:support@flowa.vn" className="text-indigo-400 hover:underline font-medium">
              Liên hệ đội ngũ hỗ trợ
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
