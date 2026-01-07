import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Clock, CheckCircle2, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "./effects";

const trustBadges = [
  { icon: Shield, text: "Bảo mật SSL 256-bit" },
  { icon: Zap, text: "Setup chỉ 2 phút" },
  { icon: Clock, text: "Hỗ trợ 24/7" },
];

const guarantees = [
  "Dùng thử miễn phí 14 ngày",
  "Không cần thẻ tín dụng",
  "Hủy bất cứ lúc nào",
  "Hoàn tiền 30 ngày",
];

export function CTASection() {
  return (
    <section className="py-28 lg:py-36 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, 50, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -50, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] rounded-full bg-secondary/10 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Main Card */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
            className="relative p-10 lg:p-16 rounded-[40px] bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden"
          >
            {/* Decorative Elements */}
            <motion.div
              animate={{
                opacity: [0.3, 0.5, 0.3],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                opacity: [0.3, 0.5, 0.3],
                scale: [1.1, 1, 1.1],
              }}
              transition={{ duration: 6, repeat: Infinity, delay: 1 }}
              className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-secondary/20 to-transparent rounded-full blur-3xl"
            />

            {/* Floating stars decoration */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.3, 0.7, 0.3],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 5 + i,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
                className="absolute"
                style={{
                  top: `${20 + i * 15}%`,
                  left: `${10 + i * 20}%`,
                }}
              >
                <Star className="w-4 h-4 text-primary/20" />
              </motion.div>
            ))}

            <div className="relative z-10 text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 mb-8 backdrop-blur-sm"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                </motion.div>
                <span className="text-sm font-bold text-primary">Limited Time Offer</span>
              </motion.div>

              {/* Headline */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6"
              >
                Sẵn sàng tăng tốc
                <br />
                <span className="relative inline-block">
                  <span className="text-gradient">Content Marketing?</span>
                  <motion.span
                    className="absolute inset-0 blur-2xl bg-gradient-to-r from-primary/30 to-secondary/30 -z-10"
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </span>
              </motion.h2>
              
              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
              >
                Tham gia cùng <span className="text-foreground font-bold">10,000+ marketer</span> đang 
                sử dụng Flowa để tạo nội dung chất lượng nhanh hơn bao giờ hết.
              </motion.p>

              {/* Guarantees */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center justify-center gap-5 mb-10"
              >
                {guarantees.map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </motion.div>
                    <span className="text-muted-foreground font-medium">{item}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
              >
                <MagneticButton strength={0.2}>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto gradient-primary text-white shadow-xl hover:shadow-2xl transition-all group px-12 h-16 text-lg rounded-2xl relative overflow-hidden"
                    asChild
                  >
                    <Link to="/auth?tab=register">
                      <span className="relative z-10 flex items-center font-bold">
                        Bắt đầu miễn phí ngay
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                        animate={{ x: ["-200%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                      />
                    </Link>
                  </Button>
                </MagneticButton>
                <MagneticButton strength={0.2}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-16 text-lg rounded-2xl border-2 hover:bg-primary/5"
                    onClick={() => document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    Xem bảng giá
                  </Button>
                </MagneticButton>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center justify-center gap-8 lg:gap-12"
              >
                {trustBadges.map((badge, i) => (
                  <motion.div
                    key={badge.text}
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <badge.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{badge.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* Bottom Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-5"
          >
            {[
              { value: "80%", label: "Thời gian tiết kiệm", color: "from-pink-500 to-rose-500" },
              { value: "3x", label: "Tăng năng suất", color: "from-blue-500 to-cyan-500" },
              { value: "300%", label: "ROI trung bình", color: "from-green-500 to-emerald-500" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="p-8 rounded-2xl bg-card/70 backdrop-blur-sm border border-border/40 text-center shadow-lg hover:shadow-xl transition-all"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.1, type: "spring", stiffness: 300 }}
                  className={`text-4xl font-extrabold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
