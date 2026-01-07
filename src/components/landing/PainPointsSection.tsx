import { motion } from "framer-motion";
import { X, Check, ArrowRight, Clock, Brain, Repeat, TrendingDown, Sparkles, Zap, ArrowDown } from "lucide-react";

const painPoints = [
  {
    icon: Clock,
    pain: "Mất 4-6 giờ/ngày tạo content thủ công",
    solution: "AI tạo content trong vài phút",
    improvement: "Tiết kiệm 80% thời gian",
    beforeColor: "from-red-500/20 to-red-500/5",
    afterColor: "from-green-500/20 to-green-500/5",
  },
  {
    icon: Brain,
    pain: "Cạn kiệt ý tưởng sáng tạo",
    solution: "AI gợi ý ý tưởng không giới hạn",
    improvement: "Luôn có ý tưởng mới",
    beforeColor: "from-orange-500/20 to-orange-500/5",
    afterColor: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: Repeat,
    pain: "Copy-paste giữa các kênh social",
    solution: "Tự động format cho từng kênh",
    improvement: "Xuất bản 1 click",
    beforeColor: "from-yellow-500/20 to-yellow-500/5",
    afterColor: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: TrendingDown,
    pain: "Không nhất quán brand voice",
    solution: "AI học và duy trì giọng điệu",
    improvement: "100% brand consistent",
    beforeColor: "from-pink-500/20 to-pink-500/5",
    afterColor: "from-cyan-500/20 to-cyan-500/5",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export function PainPointsSection() {
  return (
    <section className="py-28 lg:py-36 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-muted/30" />
        
        {/* Animated gradient split */}
        <motion.div
          animate={{ x: ["-10%", "10%", "-10%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-red-500/3 to-transparent"
        />
        <motion.div
          animate={{ x: ["10%", "-10%", "10%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-green-500/3 to-transparent"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-red-500/10 to-green-500/10 border border-primary/20 mb-8 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Zap className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-semibold text-primary">Vấn đề & Giải pháp</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6">
            Bạn có đang gặp những
            <br />
            <span className="text-gradient">vấn đề này không?</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
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
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {painPoints.map((item, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group"
            >
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.3 }}
                className="relative h-full rounded-3xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-2xl overflow-hidden"
              >
                {/* Before/After Split Background */}
                <div className="absolute inset-0 flex">
                  <div className={`w-1/2 bg-gradient-to-br ${item.beforeColor}`} />
                  <div className={`w-1/2 bg-gradient-to-bl ${item.afterColor}`} />
                </div>

                <div className="relative p-8 lg:p-10">
                  {/* Pain Point */}
                  <div className="flex items-start gap-5 mb-6">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: -10 }}
                      className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/10 border border-red-500/20 flex items-center justify-center shadow-lg"
                    >
                      <item.icon className="w-7 h-7 text-red-500" />
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <X className="w-5 h-5 text-red-500" />
                        </motion.div>
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Vấn đề</span>
                      </div>
                      <p className="text-foreground font-semibold text-lg">{item.pain}</p>
                    </div>
                  </div>

                  {/* Arrow with animation */}
                  <div className="flex justify-center my-5">
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowDown className="w-6 h-6 text-muted-foreground/40" />
                    </motion.div>
                  </div>

                  {/* Solution */}
                  <div className="flex items-start gap-5">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/20 flex items-center justify-center shadow-lg"
                    >
                      <Sparkles className="w-7 h-7 text-green-500" />
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Check className="w-5 h-5 text-green-500" />
                        </motion.div>
                        <span className="text-xs font-bold text-green-500 uppercase tracking-wider">Giải pháp Flowa</span>
                      </div>
                      <p className="text-foreground font-semibold text-lg">{item.solution}</p>
                    </div>
                  </div>

                  {/* Improvement Badge */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.05 }}
                    className="absolute top-6 right-6"
                  >
                    <span className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border border-primary/30 shadow-lg">
                      {item.improvement}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 text-center"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="inline-flex flex-wrap items-center justify-center gap-4 lg:gap-6 px-8 py-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg"
          >
            <span className="text-muted-foreground font-medium">Kết quả thực tế:</span>
            {[
              { value: "80%", label: "tiết kiệm thời gian" },
              { value: "3x", label: "năng suất" },
              { value: "300%", label: "ROI" },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-2">
                {i > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />}
                <span className="font-bold text-foreground">{stat.value}</span>
                <span className="text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
