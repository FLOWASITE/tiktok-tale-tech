import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Zap, Users, FileText, TrendingUp, CheckCircle2, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { GradientMesh, FloatingShapes, MagneticButton } from "./effects";

const trustLogos = [
  "VinGroup", "FPT", "Shopee", "Tiki", "Sendo", "MoMo"
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

function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {children}
    </motion.div>
  );
}

export function HeroSection() {
  const { t } = useTranslation();

  const stats = [
    { icon: Users, value: 10000, suffix: "+", label: t("hero.stats.marketers") },
    { icon: FileText, value: 500000, suffix: "+", label: t("hero.stats.content") },
    { icon: TrendingUp, value: 95, suffix: "%", label: t("hero.stats.satisfaction") },
  ];

  const urgencyBenefits = [
    t("hero.benefits.noCard"),
    t("hero.benefits.freeTrial"),
    t("hero.benefits.cancelAnytime"),
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-20">
      {/* Animated Background */}
      <GradientMesh />
      <FloatingShapes />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Social Proof Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 mb-8 backdrop-blur-sm"
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: -10 }}
                  animate={{ scale: 1, x: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.3 }}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-background flex items-center justify-center text-[10px] text-white font-bold shadow-lg"
                >
                  {String.fromCharCode(64 + i)}
                </motion.div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 500 }}
                >
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                </motion.div>
              ))}
            </div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
            >
              {t("hero.badge")}
            </motion.span>
          </motion.div>

          {/* Problem-Agitate Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-5"
          >
            <span className="text-lg sm:text-xl text-muted-foreground font-medium">
              {t("hero.problem")}
            </span>
          </motion.div>

          {/* Solution Headline with Glow Effect */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 relative"
          >
            <span className="text-foreground">{t("hero.titleLine1")}</span>
            <br />
            <span className="relative inline-block">
              <span className="text-gradient">{t("hero.titleLine2")}</span>
              {/* Glow effect behind text */}
              <motion.span
                className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary/30 via-secondary/20 to-primary/30 -z-10"
                animate={{
                  opacity: [0.4, 0.7, 0.4],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </span>
          </motion.h1>

          {/* Value Proposition */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 leading-relaxed"
          >
            {t("hero.descPlain")}
          </motion.p>

          {/* Quick Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-5 mb-10"
          >
            {urgencyBenefits.map((benefit, i) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{benefit}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTAs with Magnetic Effect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <MagneticButton strength={0.2}>
              <Button
                size="lg"
                className="w-full sm:w-auto gradient-primary text-white shadow-xl hover:shadow-2xl transition-all group px-10 h-16 text-lg relative overflow-hidden rounded-2xl"
                asChild
              >
                <Link to="/auth?tab=register">
                  <span className="relative z-10 flex items-center font-semibold">
                    {t("hero.cta.startFree")}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    animate={{ x: ["-200%", "200%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                  />
                </Link>
              </Button>
            </MagneticButton>
            
            <MagneticButton strength={0.2}>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-16 text-lg group rounded-2xl border-2 hover:bg-primary/5"
                onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                {t("hero.cta.watchHow")}
              </Button>
            </MagneticButton>
          </motion.div>

          {/* Stats with Glass Effect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto mb-14"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="text-center p-5 rounded-2xl bg-card/50 backdrop-blur-md border border-border/40 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="flex items-center justify-center gap-1 mb-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </motion.div>
                </div>
                <div className="text-2xl sm:text-4xl font-bold text-foreground">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust Logos with Marquee Effect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mb-16"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-5 font-medium">
              {t("hero.trustBadge")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
              {trustLogos.map((logo, i) => (
                <motion.div
                  key={logo}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="text-lg font-bold text-muted-foreground/40 hover:text-muted-foreground transition-all cursor-default"
                >
                  {logo}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Floating Product Preview with 3D Tilt */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
          className="relative max-w-5xl mx-auto"
        >
          <TiltCard>
            <div className="relative rounded-3xl overflow-hidden border border-border/30 shadow-2xl bg-card/80 backdrop-blur-sm">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-5 py-4 bg-muted/60 border-b border-border/30">
                <div className="flex gap-2">
                  <motion.div 
                    className="w-3 h-3 rounded-full bg-red-500"
                    whileHover={{ scale: 1.2 }}
                  />
                  <motion.div 
                    className="w-3 h-3 rounded-full bg-yellow-500"
                    whileHover={{ scale: 1.2 }}
                  />
                  <motion.div 
                    className="w-3 h-3 rounded-full bg-green-500"
                    whileHover={{ scale: 1.2 }}
                  />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-5 py-1.5 rounded-lg bg-background/70 text-xs text-muted-foreground flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    app.flowa.vn
                  </div>
                </div>
              </div>
              
              {/* Dashboard Preview */}
              <div className="aspect-[16/9] bg-gradient-to-br from-muted/20 to-muted/5 p-5 sm:p-10">
                <div className="h-full rounded-2xl border border-border/20 bg-background/70 backdrop-blur-sm p-5 sm:p-8">
                  {/* Mock Dashboard Content */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 mb-8">
                    {[
                      { label: t("hero.dashboard.postsToday"), value: "12", color: "from-primary/20 to-primary/5" },
                      { label: t("hero.dashboard.scheduled"), value: "24", color: "from-secondary/20 to-secondary/5" },
                      { label: t("hero.dashboard.engagement"), value: "1.2K", color: "from-green-500/20 to-green-500/5" },
                      { label: t("hero.dashboard.performance"), value: "+45%", color: "from-orange-500/20 to-orange-500/5" },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 + i * 0.1 }}
                        className={`p-4 sm:p-5 rounded-xl bg-gradient-to-br ${item.color} border border-border/10`}
                      >
                        <div className="text-xs text-muted-foreground mb-1.5">{item.label}</div>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">{item.value}</div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="sm:col-span-2 h-36 sm:h-44 rounded-xl bg-muted/15 border border-border/10 p-5">
                      <div className="text-xs text-muted-foreground mb-3 font-medium">{t("hero.dashboard.calendar")}</div>
                      <div className="grid grid-cols-7 gap-1.5">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: 1.2 + i * 0.03 }}
                            className={`h-5 rounded ${i % 3 === 0 ? 'bg-primary/40' : 'bg-muted/40'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="h-36 sm:h-44 rounded-xl bg-muted/15 border border-border/10 p-5">
                      <div className="text-xs text-muted-foreground mb-3 font-medium">{t("hero.dashboard.aiGeneration")}</div>
                      <div className="space-y-2.5">
                        {[1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            initial={{ width: 0 }}
                            animate={{ width: `${100 - i * 20}%` }}
                            transition={{ delay: 1.3 + i * 0.1, duration: 0.5 }}
                            className="h-3.5 rounded bg-gradient-to-r from-primary/50 to-secondary/50"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Glow Effect */}
            <motion.div
              className="absolute -inset-4 -z-10 rounded-[40px] bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 blur-3xl"
              animate={{
                opacity: [0.3, 0.5, 0.3],
                scale: [0.95, 1, 0.95],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </TiltCard>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex justify-center mt-16"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}
          >
            <span className="text-xs text-muted-foreground font-medium">Scroll</span>
            <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-primary"
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
