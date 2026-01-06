import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Zap, Users, FileText, TrendingUp, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const stats = [
  { icon: Users, value: 10000, suffix: "+", label: "Marketer tin dùng" },
  { icon: FileText, value: 500000, suffix: "+", label: "Nội dung đã tạo" },
  { icon: TrendingUp, value: 95, suffix: "%", label: "Khách hài lòng" },
];

const trustLogos = [
  "VinGroup", "FPT", "Shopee", "Tiki", "Sendo", "MoMo"
];

const urgencyBenefits = [
  "Không cần thẻ tín dụng",
  "Dùng thử miễn phí 14 ngày",
  "Hủy bất cứ lúc nào",
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(0) + "K";
    return num.toString();
  };

  return (
    <span>
      {formatNumber(count)}
      {suffix}
    </span>
  );
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-20">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
        
        {/* Animated Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-secondary/20 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl"
        />

        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          {/* Social Proof Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/80 to-secondary/80 border-2 border-background flex items-center justify-center text-[10px] text-white font-bold">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            <span className="text-sm font-medium text-primary">
              10,000+ Marketer đang dùng
            </span>
          </motion.div>

          {/* Problem-Agitate Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4"
          >
            <span className="text-lg sm:text-xl text-muted-foreground">
              Mệt mỏi với việc tạo content thủ công?
            </span>
          </motion.div>

          {/* Solution Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            <span className="text-foreground">Tạo 1 Tuần Content</span>
            <br />
            <span className="text-gradient">Chỉ Trong 1 Giờ</span>
          </motion.h1>

          {/* Value Proposition */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6"
          >
            Flowa là nền tảng AI giúp bạn <span className="text-foreground font-semibold">tạo, lên lịch và xuất bản</span> nội dung 
            đa kênh tự động. Tiết kiệm <span className="text-primary font-semibold">80% thời gian</span> với 
            chất lượng tốt hơn.
          </motion.p>

          {/* Quick Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-4 mb-10"
          >
            {urgencyBenefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{benefit}</span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto gradient-primary text-white shadow-lg hover:shadow-xl transition-all group px-8 h-14 text-base relative overflow-hidden"
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
              className="w-full sm:w-auto h-14 text-base group"
              onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Play className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
              Xem cách hoạt động
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto mb-12"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                className="text-center p-4 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30"
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust Logos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-12"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
              Được tin dùng bởi các thương hiệu hàng đầu Việt Nam
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10">
              {trustLogos.map((logo) => (
                <div key={logo} className="text-lg font-semibold text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  {logo}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Floating Product Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl bg-card">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-background/50 text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  app.flowa.vn
                </div>
              </div>
            </div>
            
            {/* Dashboard Preview */}
            <div className="aspect-[16/9] bg-gradient-to-br from-muted/30 to-muted/10 p-4 sm:p-8">
              <div className="h-full rounded-xl border border-border/30 bg-background/50 backdrop-blur-sm p-4 sm:p-6">
                {/* Mock Dashboard Content */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  {[
                    { label: "Bài viết hôm nay", value: "12" },
                    { label: "Đã lên lịch", value: "24" },
                    { label: "Tương tác", value: "1.2K" },
                    { label: "Hiệu suất", value: "+45%" },
                  ].map((item, i) => (
                    <div key={i} className="p-3 sm:p-4 rounded-lg bg-muted/30 border border-border/20">
                      <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                      <div className="text-lg sm:text-xl font-bold text-foreground">{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 h-32 sm:h-40 rounded-lg bg-muted/20 border border-border/20 p-4">
                    <div className="text-xs text-muted-foreground mb-2">Content Calendar</div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 14 }).map((_, i) => (
                        <div key={i} className={`h-4 rounded ${i % 3 === 0 ? 'bg-primary/30' : 'bg-muted/50'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="h-32 sm:h-40 rounded-lg bg-muted/20 border border-border/20 p-4">
                    <div className="text-xs text-muted-foreground mb-2">AI Generation</div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-3 rounded bg-muted/50" style={{ width: `${100 - i * 20}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Glow Effect */}
          <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-3xl blur-2xl opacity-50" />
          
          {/* Floating Badge */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-4 top-1/4 hidden lg:block"
          >
            <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              AI đang tạo content...
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
