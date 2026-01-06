import { motion } from "framer-motion";
import { Sparkles, FileText, Calendar, Rocket, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    icon: Sparkles,
    title: "Kết nối Brand",
    description: "Nhập thông tin thương hiệu, giọng điệu và target audience. AI học và hiểu brand của bạn trong 2 phút.",
    details: ["Brand guidelines", "Tone of voice", "Target personas"],
    color: "from-pink-500 to-rose-500",
  },
  {
    number: "02",
    icon: FileText,
    title: "Tạo Content AI",
    description: "Chọn loại nội dung, nhập chủ đề. AI tạo ra bài viết chất lượng cao phù hợp với brand voice.",
    details: ["Multi-format output", "SEO optimized", "Brand consistent"],
    color: "from-blue-500 to-cyan-500",
  },
  {
    number: "03",
    icon: Calendar,
    title: "Lên lịch thông minh",
    description: "AI đề xuất thời điểm đăng tối ưu cho từng kênh. Kéo thả vào calendar để lên lịch.",
    details: ["Best time to post", "Cross-platform sync", "Smart scheduling"],
    color: "from-purple-500 to-violet-500",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Xuất bản & Phân tích",
    description: "Tự động xuất bản lên tất cả kênh. Theo dõi hiệu suất real-time với dashboard analytics.",
    details: ["Auto-publish", "Real-time analytics", "Performance insights"],
    color: "from-orange-500 to-amber-500",
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
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16 lg:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Cách hoạt động</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Từ ý tưởng đến xuất bản
            <br />
            <span className="text-gradient">chỉ trong 4 bước</span>
          </h2>
          <p className="text-lg text-muted-foreground">
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
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent hidden lg:block" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className="relative group"
              >
                {/* Arrow between steps (mobile/tablet) */}
                {index < steps.length - 1 && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 lg:hidden">
                    <ArrowRight className="w-5 h-5 text-muted-foreground/30 rotate-90" />
                  </div>
                )}

                <div className="relative h-full p-6 lg:p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group-hover:-translate-y-1">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-6 px-3 py-1 rounded-full bg-background border border-border text-sm font-bold text-muted-foreground">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} mb-5 mt-2`}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Details */}
                  <ul className="space-y-2">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>

                  {/* Hover Glow */}
                  <div className={`absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 blur-xl`} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-16"
        >
          <Button
            size="lg"
            className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all group px-8 h-14 text-base"
            asChild
          >
            <Link to="/auth?tab=register">
              Thử ngay miễn phí
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Setup chỉ mất 2 phút • Không cần thẻ tín dụng
          </p>
        </motion.div>
      </div>
    </section>
  );
}
