import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const trustBadges = [
  { icon: Shield, text: "Bảo mật SSL" },
  { icon: Zap, text: "Setup 2 phút" },
  { icon: Clock, text: "Hỗ trợ 24/7" },
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
          className="max-w-4xl mx-auto text-center"
        >
          {/* Main CTA */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Sẵn sàng tăng tốc
            <br />
            <span className="text-gradient">Content Marketing?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Tham gia cùng hàng nghìn doanh nghiệp đang sử dụng Flowa để tạo 
            nội dung chất lượng nhanh hơn bao giờ hết.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              size="lg"
              className="w-full sm:w-auto gradient-primary text-white shadow-lg hover:shadow-xl transition-all group px-8 h-14 text-base"
              asChild
            >
              <Link to="/auth?tab=register">
                Bắt đầu miễn phí ngay
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-14 text-base"
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

          {/* Decorative Cards */}
          <div className="relative mt-16 lg:mt-24">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="p-6 rounded-xl bg-card border border-border/50 text-left"
              >
                <div className="text-3xl font-bold text-primary mb-2">80%</div>
                <div className="text-sm text-muted-foreground">Thời gian tiết kiệm</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-6 rounded-xl bg-card border border-border/50 text-left"
              >
                <div className="text-3xl font-bold text-secondary mb-2">3x</div>
                <div className="text-sm text-muted-foreground">Tăng năng suất</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="p-6 rounded-xl bg-card border border-border/50 text-left"
              >
                <div className="text-3xl font-bold text-gradient mb-2">∞</div>
                <div className="text-sm text-muted-foreground">Ý tưởng sáng tạo</div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
