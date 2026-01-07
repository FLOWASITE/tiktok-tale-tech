import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Plus, Minus } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "Flowa có phù hợp với ngành của tôi không?",
    answer: "Flowa hỗ trợ 50+ ngành nghề khác nhau từ E-commerce, F&B, Bất động sản, Giáo dục, đến Fintech và nhiều hơn nữa. AI của chúng tôi đã được train với dữ liệu đặc thù từng ngành để tạo ra nội dung chuyên nghiệp và phù hợp.",
  },
  {
    question: "AI có thể giữ đúng giọng điệu thương hiệu của tôi không?",
    answer: "Hoàn toàn có thể! Bạn chỉ cần nhập brand guidelines, tone of voice và một vài sample text. AI sẽ học và duy trì giọng điệu nhất quán trên mọi nội dung. Bạn cũng có thể điều chỉnh và tinh chỉnh bất cứ lúc nào.",
  },
  {
    question: "Tôi có thể xuất bản trực tiếp lên các kênh social không?",
    answer: "Có, Flowa tích hợp với Facebook, Instagram, TikTok, LinkedIn, Zalo, và nhiều kênh khác. Bạn có thể lên lịch và xuất bản tự động, hoặc review trước khi đăng. Tất cả đều được quản lý từ một dashboard duy nhất.",
  },
  {
    question: "Nội dung AI tạo ra có bị trùng lặp không?",
    answer: "Không! Mỗi nội dung được AI tạo ra đều là duy nhất và được tùy chỉnh theo brand, context và mục tiêu của bạn. Chúng tôi cũng có công cụ kiểm tra plagiarism để đảm bảo tính độc đáo.",
  },
  {
    question: "Có giới hạn số lượng content tôi có thể tạo không?",
    answer: "Gói Starter miễn phí cho phép tạo 100 nội dung/tháng. Gói Professional cung cấp unlimited content generation, đủ cho mọi nhu cầu của team marketing chuyên nghiệp.",
  },
  {
    question: "Tôi có cần kỹ năng kỹ thuật để sử dụng Flowa không?",
    answer: "Hoàn toàn không! Flowa được thiết kế cho marketer, không phải developer. Giao diện trực quan, kéo thả dễ dàng. Setup chỉ mất 2 phút và bạn có thể bắt đầu tạo content ngay lập tức.",
  },
  {
    question: "Dữ liệu của tôi có an toàn không?",
    answer: "Bảo mật là ưu tiên hàng đầu. Chúng tôi sử dụng mã hóa SSL, tuân thủ GDPR, và không bao giờ chia sẻ dữ liệu của bạn với bên thứ ba. Dữ liệu được lưu trữ trên servers bảo mật tại Singapore.",
  },
  {
    question: "Có hỗ trợ tiếng Việt không?",
    answer: "Flowa được tối ưu đặc biệt cho tiếng Việt với AI hiểu văn hóa, ngữ cảnh và cách diễn đạt của người Việt. Giao diện và support đều 100% tiếng Việt.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">FAQ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Câu hỏi
            <br />
            <span className="text-gradient">thường gặp</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Những thắc mắc phổ biến nhất về Flowa. Không tìm thấy câu trả lời? 
            Liên hệ đội ngũ hỗ trợ 24/7 của chúng tôi.
          </p>
        </motion.div>

        {/* FAQ List */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <motion.button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className={`w-full text-left p-5 rounded-xl bg-card border transition-all duration-300 group ${
                  openIndex === index 
                    ? "border-primary/40 shadow-lg shadow-primary/5" 
                    : "border-border/50 hover:border-primary/30 hover:shadow-md"
                }`}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className={`font-semibold transition-colors pr-4 ${
                    openIndex === index ? "text-primary" : "text-foreground group-hover:text-primary"
                  }`}>
                    {faq.question}
                  </h3>
                  <motion.div 
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      openIndex === index ? "bg-primary/10" : "bg-muted group-hover:bg-primary/5"
                    }`}
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    {openIndex === index ? (
                      <Minus className="w-4 h-4 text-primary" />
                    ) : (
                      <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    )}
                  </motion.div>
                </div>
                
                <AnimatePresence initial={false}>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pt-4 text-muted-foreground leading-relaxed border-t border-border/30 mt-4">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            Vẫn còn thắc mắc?{" "}
            <a href="mailto:support@flowa.vn" className="text-primary hover:underline font-medium">
              Liên hệ đội ngũ hỗ trợ
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
