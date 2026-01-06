import { motion } from "framer-motion";
import { Star, Quote, TrendingUp, Users, Award, Shield } from "lucide-react";

const metrics = [
  {
    icon: Users,
    value: "10,000+",
    label: "Marketer sử dụng",
    description: "Từ startup đến enterprise",
  },
  {
    icon: TrendingUp,
    value: "500K+",
    label: "Content đã tạo",
    description: "Mỗi tháng tăng 40%",
  },
  {
    icon: Award,
    value: "4.9/5",
    label: "Đánh giá trung bình",
    description: "Từ 2,000+ reviews",
  },
  {
    icon: Shield,
    value: "99.9%",
    label: "Uptime cam kết",
    description: "Enterprise-grade reliability",
  },
];

const featuredReviews = [
  {
    content: "Flowa giúp team tôi tạo được lượng content gấp 5 lần với cùng nguồn lực. ROI tăng 300% sau 3 tháng.",
    author: "Nguyễn Văn A",
    role: "Head of Marketing",
    company: "TechCorp Vietnam",
    avatar: "NVA",
    rating: 5,
  },
  {
    content: "Brand voice consistency là game-changer. Mỗi client đều có giọng điệu riêng biệt, AI học cực nhanh.",
    author: "Trần Thị B",
    role: "Creative Director",
    company: "Digital Agency Pro",
    avatar: "TTB",
    rating: 5,
  },
  {
    content: "Từ 6 giờ/ngày xuống còn 1 giờ cho content. Giờ team có thời gian focus vào strategy thay vì execution.",
    author: "Lê Minh C",
    role: "Marketing Manager",
    company: "E-commerce Giant",
    avatar: "LMC",
    rating: 5,
  },
];

const awards = [
  "Top 10 MarTech Startups 2024",
  "Best AI Content Tool - Vietnam",
  "Product Hunt #1",
  "G2 High Performer",
];

export function SocialProofSection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden bg-muted/20">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Metrics Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 mb-16"
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center p-6 rounded-2xl bg-card border border-border/50"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                <metric.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-foreground mb-1">
                {metric.value}
              </div>
              <div className="text-sm font-medium text-foreground mb-1">
                {metric.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {metric.description}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Featured Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16"
        >
          {featuredReviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="relative p-6 lg:p-8 rounded-2xl bg-card border border-border/50"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10" />
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{review.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-white">
                  {review.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">
                    {review.author}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {review.role} @ {review.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Awards & Recognition */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
            Giải thưởng & Công nhận
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8">
            {awards.map((award) => (
              <div
                key={award}
                className="px-4 py-2 rounded-full bg-card border border-border/50 text-sm text-muted-foreground"
              >
                <Award className="w-4 h-4 inline-block mr-2 text-primary" />
                {award}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
