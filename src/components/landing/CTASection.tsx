import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {/* Main Card */}
          <div className="relative p-8 lg:p-12 rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-secondary/20 to-transparent rounded-full blur-3xl" />

            <div className="relative z-10 text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Limited Time Offer</span>
              </motion.div>

              {/* Headline */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Sẵn sàng tăng tốc
                <br />
                <span className="text-gradient">Content Marketing?</span>
              </h2>
              
              {/* Subheadline */}
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Tham gia cùng <span className="text-foreground font-semibold">10,000+ marketer</span> đang 
                sử dụng Flowa để tạo nội dung chất lượng nhanh hơn bao giờ hết.
              </p>

              {/* Guarantees */}
              <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                {guarantees.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gradient-primary text-white shadow-lg hover:shadow-xl transition-all group px-10 h-14 text-lg relative overflow-hidden"
                  asChild
                >
                  <Link to="/auth?tab=register">
                    <span className="relative z-10 flex items-center">
                      Bắt đầu miễn phí ngay
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-14 text-lg"
                  onClick={() => document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Xem bảng giá
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10">
                {trustBadges.map((badge) => (
                  <div key={badge.text} className="flex items-center gap-2 text-muted-foreground">
                    <badge.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{badge.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div className="p-6 rounded-xl bg-card/50 border border-border/30 text-center">
              <div className="text-3xl font-bold text-primary mb-2">80%</div>
              <div className="text-sm text-muted-foreground">Thời gian tiết kiệm</div>
            </div>
            <div className="p-6 rounded-xl bg-card/50 border border-border/30 text-center">
              <div className="text-3xl font-bold text-secondary mb-2">3x</div>
              <div className="text-sm text-muted-foreground">Tăng năng suất</div>
            </div>
            <div className="p-6 rounded-xl bg-card/50 border border-border/30 text-center">
              <div className="text-3xl font-bold text-gradient mb-2">300%</div>
              <div className="text-sm text-muted-foreground">ROI trung bình</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
