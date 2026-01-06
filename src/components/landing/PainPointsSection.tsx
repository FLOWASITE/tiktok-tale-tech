import { motion } from "framer-motion";
import { X, Check, ArrowRight, Clock, Brain, Repeat, TrendingDown, Sparkles, Zap } from "lucide-react";

const painPoints = [
  {
    icon: Clock,
    pain: "Mất 4-6 giờ/ngày tạo content thủ công",
    solution: "AI tạo content trong vài phút",
    improvement: "Tiết kiệm 80% thời gian",
  },
  {
    icon: Brain,
    pain: "Cạn kiệt ý tưởng sáng tạo",
    solution: "AI gợi ý ý tưởng không giới hạn",
    improvement: "Luôn có ý tưởng mới",
  },
  {
    icon: Repeat,
    pain: "Copy-paste giữa các kênh social",
    solution: "Tự động format cho từng kênh",
    improvement: "Xuất bản 1 click",
  },
  {
    icon: TrendingDown,
    pain: "Không nhất quán brand voice",
    solution: "AI học và duy trì giọng điệu",
    improvement: "100% brand consistent",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 },
  },
};

export function PainPointsSection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-muted/30" />
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
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Vấn đề & Giải pháp</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Bạn có đang gặp những
            <br />
            <span className="text-gradient">vấn đề này không?</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Đây là những vấn đề phổ biến nhất mà 90% marketer gặp phải. 
            Flowa giúp bạn giải quyết tất cả.
          </p>
        </motion.div>

        {/* Pain Points Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {painPoints.map((item, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative"
            >
              <div className="relative h-full p-6 lg:p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg overflow-hidden">
                {/* Pain Point */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <X className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-medium text-red-500 uppercase tracking-wider">Vấn đề</span>
                    </div>
                    <p className="text-foreground font-medium">{item.pain}</p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center my-4">
                  <ArrowRight className="w-5 h-5 text-muted-foreground/30 rotate-90" />
                </div>

                {/* Solution */}
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium text-green-500 uppercase tracking-wider">Giải pháp Flowa</span>
                    </div>
                    <p className="text-foreground font-medium">{item.solution}</p>
                  </div>
                </div>

                {/* Improvement Badge */}
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {item.improvement}
                  </span>
                </div>

                {/* Hover Glow */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-green-500/0 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border/50">
            <span className="text-muted-foreground">Kết quả thực tế:</span>
            <span className="font-semibold text-foreground">80% tiết kiệm thời gian</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="font-semibold text-foreground">3x năng suất</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="font-semibold text-foreground">300% ROI</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
