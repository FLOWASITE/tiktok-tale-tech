import { motion } from "framer-motion";
import { Sparkles, FileText, Calendar, Rocket, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "./effects";

const steps = [
  {
    number: "01",
    icon: Sparkles,
    title: "Kết nối Brand",
    description: "Nhập thông tin thương hiệu, giọng điệu và target audience. AI học và hiểu brand của bạn trong 2 phút.",
    details: ["Brand guidelines", "Tone of voice", "Target personas"],
    color: "from-pink-500 to-rose-500",
    glowColor: "shadow-pink-500/20",
  },
  {
    number: "02",
    icon: FileText,
    title: "Tạo Content AI",
    description: "Chọn loại nội dung, nhập chủ đề. AI tạo ra bài viết chất lượng cao phù hợp với brand voice.",
    details: ["Multi-format output", "SEO optimized", "Brand consistent"],
    color: "from-blue-500 to-cyan-500",
    glowColor: "shadow-blue-500/20",
  },
  {
    number: "03",
    icon: Calendar,
    title: "Lên lịch thông minh",
    description: "AI đề xuất thời điểm đăng tối ưu cho từng kênh. Kéo thả vào calendar để lên lịch.",
    details: ["Best time to post", "Cross-platform sync", "Smart scheduling"],
    color: "from-purple-500 to-violet-500",
    glowColor: "shadow-purple-500/20",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Xuất bản & Phân tích",
    description: "Tự động xuất bản lên tất cả kênh. Theo dõi hiệu suất real-time với dashboard analytics.",
    details: ["Auto-publish", "Real-time analytics", "Performance insights"],
    color: "from-orange-500 to-amber-500",
    glowColor: "shadow-orange-500/20",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" },
  },
};

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-28 lg:py-36 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/15 to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        {/* Floating orbs */}
        <motion.div
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, 30, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-10 w-80 h-80 rounded-full bg-secondary/5 blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20 lg:mb-24"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 mb-8 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-semibold text-primary">Cách hoạt động</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6">
            Từ ý tưởng đến xuất bản
            <br />
            <span className="text-gradient">chỉ trong 4 bước</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Quy trình đơn giản, kết quả chuyên nghiệp. Không cần kỹ năng kỹ thuật.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative"
        >
          {/* Connection Line - Desktop */}
          <div className="absolute top-32 left-0 right-0 hidden lg:block">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="h-1 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-orange-500/30 rounded-full"
              style={{ originX: 0 }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className="relative group"
              >
                {/* Arrow between steps (mobile/tablet) */}
                {index < steps.length - 1 && (
                  <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 lg:hidden"
                  >
                    <ArrowRight className="w-5 h-5 text-muted-foreground/30 rotate-90" />
                  </motion.div>
                )}

                <motion.div
                  whileHover={{ y: -10, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  className={`relative h-full p-8 lg:p-8 rounded-3xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-2xl hover:${step.glowColor}`}
                >
                  {/* Step Number - Floating */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 500 }}
                    className="absolute -top-5 left-8"
                  >
                    <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${step.color} text-white text-sm font-bold shadow-lg`}>
                      {step.number}
                    </div>
                  </motion.div>

                  {/* Icon */}
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} mb-6 mt-3 shadow-xl`}
                  >
                    <step.icon className="w-8 h-8 text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                    {step.description}
                  </p>

                  {/* Details */}
                  <ul className="space-y-2.5">
                    {step.details.map((detail, i) => (
                      <motion.li
                        key={detail}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + index * 0.1 + i * 0.05 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        {detail}
                      </motion.li>
                    ))}
                  </ul>

                  {/* Hover Glow */}
                  <div className={`absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-2xl`} />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-20"
        >
          <MagneticButton strength={0.15}>
            <Button
              size="lg"
              className="gradient-primary text-white shadow-xl hover:shadow-2xl transition-all group px-10 h-16 text-lg rounded-2xl relative overflow-hidden"
              asChild
            >
              <Link to="/auth?tab=register">
                <span className="relative z-10 flex items-center font-semibold">
                  Thử ngay miễn phí
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                />
              </Link>
            </Button>
          </MagneticButton>
          <p className="mt-5 text-sm text-muted-foreground">
            Setup chỉ mất 2 phút • Không cần thẻ tín dụng
          </p>
        </motion.div>
      </div>
    </section>
  );
}
