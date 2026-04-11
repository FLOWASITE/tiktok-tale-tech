import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FAQSEOSchema } from "@/components/SEOHead";

const faqs = [
  {
    question: "Flowa khác gì Jasper, Copy.ai, ChatGPT?",
    answer: "Jasper/Copy.ai là AI writing tools — bạn viết prompt, AI viết 1 bài, bạn tự review. Flowa là AI Agent — bạn đặt mục tiêu, Agent tự chạy cả pipeline: nghiên cứu → tạo nội dung đa kênh → tự chấm điểm → tự sửa → đăng bài. Bạn không review từng bài — Agent review trước bạn.",
  },
  {
    question: "Chất lượng content AI có đủ tốt để đăng thẳng không?",
    answer: "Mỗi bài được Agent tự chấm 8 tiêu chí (100 điểm). Đạt chuẩn + compliance OK → có thể auto-approve. Chưa đạt → Agent tự sửa 1 lần. Vẫn chưa đạt → gửi cho bạn kèm ghi chú cụ thể. Bạn kiểm soát ngưỡng auto-approve.",
  },
  {
    question: "Agent có hiểu ngành của tôi không?",
    answer: "Flowa có Industry Memory — tự học thuật ngữ, quy tắc, từ cấm của từng ngành. Hỗ trợ 9+ nhóm ngành: Y tế, Tài chính, Giáo dục, BĐS, F&B, Làm đẹp, Công nghệ, Pháp lý, Bán lẻ.",
  },
  {
    question: "Hỗ trợ những kênh nào?",
    answer: "12 kênh: Facebook, Instagram, TikTok, LinkedIn, X/Twitter, Zalo OA, Email, Website/Blog, YouTube, Telegram, Google Maps. Mỗi kênh nhận nội dung được tối ưu riêng — không phải copy-paste.",
  },
  {
    question: "Dữ liệu thương hiệu của tôi có an toàn không?",
    answer: "Mã hóa AES-256, cách ly hoàn toàn (RLS), nội dung gửi AI providers được ẩn danh hóa. Tuân thủ NĐ 13/2023. Chúng tôi không bán dữ liệu.",
  },
  {
    question: "Setup mất bao lâu?",
    answer: "5 phút. Tạo tài khoản → nhập brand info (hoặc paste URL website, Agent tự crawl) → bắt đầu tạo content.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 lg:py-24 bg-[#09090b]">
      <FAQSEOSchema faqs={faqs} />
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Câu hỏi thường gặp
          </h2>
        </motion.div>

        <div className="space-y-3">
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
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  openIndex === index
                    ? "border-indigo-500/30 bg-indigo-500/[0.05]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className={`font-semibold transition-colors ${
                    openIndex === index ? "text-indigo-300" : "text-white"
                  }`}>
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200 ${
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
                      <p className="pt-3 text-gray-400 leading-relaxed text-sm">
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
          className="text-center mt-10"
        >
          <p className="text-gray-500 text-sm">
            Có câu hỏi khác?{" "}
            <a href="mailto:info@flowa.one" className="text-indigo-400 hover:underline">
              Liên hệ chúng tôi
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
