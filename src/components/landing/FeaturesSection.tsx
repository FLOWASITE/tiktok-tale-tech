import { motion } from "framer-motion";
import { 
  Sparkles, 
  Share2, 
  Palette, 
  Target, 
  FileEdit, 
  Calendar,
  Zap,
  Globe,
  BarChart3
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Content Generation",
    description: "Tạo nội dung chất lượng cao cho mọi kênh chỉ trong vài giây với công nghệ AI tiên tiến.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Share2,
    title: "Multi-channel Publishing",
    description: "Xuất bản đồng thời lên Facebook, Instagram, TikTok, LinkedIn và nhiều nền tảng khác.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Palette,
    title: "Brand Voice Management",
    description: "Duy trì giọng điệu thương hiệu nhất quán trên mọi nội dung với AI học từ brand guide.",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: Target,
    title: "Campaign Management",
    description: "Quản lý toàn bộ chiến dịch marketing từ A-Z với timeline, milestone và KPI tracking.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: FileEdit,
    title: "Ad Copy Creation",
    description: "Tạo ad copy tối ưu cho Facebook Ads, Google Ads với A/B testing tự động.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Calendar,
    title: "Content Calendar",
    description: "Lên lịch nội dung thông minh với gợi ý thời điểm đăng tối ưu cho từng kênh.",
    color: "from-indigo-500 to-blue-500",
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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-muted/30" />
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
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Tính năng</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Mọi thứ bạn cần cho
            <br />
            <span className="text-gradient">Content Marketing</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Flowa cung cấp bộ công cụ toàn diện giúp bạn tạo, quản lý và 
            tối ưu nội dung marketing hiệu quả hơn.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative"
            >
              <div className="relative h-full p-6 lg:p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} mb-5`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Glow */}
                <div className={`absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 blur-xl`} />
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
          className="mt-16 lg:mt-24 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
        >
          {[
            { icon: Globe, value: "50+", label: "Ngành nghề hỗ trợ" },
            { icon: FileEdit, value: "10+", label: "Loại nội dung" },
            { icon: Share2, value: "8+", label: "Kênh social" },
            { icon: BarChart3, value: "Real-time", label: "Analytics" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-xl bg-card/50 border border-border/30">
              <stat.icon className="w-6 h-6 text-primary mx-auto mb-3" />
              <div className="text-2xl lg:text-3xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
