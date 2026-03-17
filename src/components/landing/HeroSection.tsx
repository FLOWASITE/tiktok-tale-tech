import { motion } from "framer-motion";
import { ArrowRight, Play, Users, FileText, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuthUrl } from "@/hooks/useDomainRouting";

const industryBadges = [
  "E-commerce", "F&B", "Bất động sản", "Y tế", "Giáo dục", "Tài chính"
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
  const { t } = useTranslation();

  const stats = [
    { icon: Users, value: 500, suffix: "+", label: t("hero.stats.marketers") },
    { icon: FileText, value: 50000, suffix: "+", label: t("hero.stats.content") },
    { icon: TrendingUp, value: 98, suffix: "%", label: t("hero.stats.satisfaction") },
  ];

  const urgencyBenefits = [
    t("hero.benefits.noCard"),
    t("hero.benefits.freeTrial"),
    t("hero.benefits.cancelAnytime"),
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 lg:pt-28 lg:pb-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Problem Statement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <span className="text-base sm:text-lg text-muted-foreground">
              {t("hero.problem")}
            </span>
          </motion.div>

          {/* Solution Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            <span className="text-foreground">{t("hero.titleLine1")}</span>
            <br />
            <span className="text-primary">{t("hero.titleLine2")}</span>
          </motion.h1>

          {/* Value Proposition */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed"
          >
            {t("hero.descPlain")}
          </motion.p>

          {/* Quick Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-5 mb-10"
          >
            {urgencyBenefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>{benefit}</span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-14 text-base font-medium"
              asChild
            >
              <a href={getAuthUrl('register')}>
                {t("hero.cta.startFree")}
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-14 text-base font-medium border-border"
              onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Play className="mr-2 w-5 h-5" />
              {t("hero.cta.watchHow")}
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto mb-16"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-4"
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Trust Logos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-5">
              {t("hero.trustBadge")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
              {trustLogos.map((logo) => (
                <span
                  key={logo}
                  className="text-base font-semibold text-muted-foreground/50"
                >
                  {logo}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Product Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="relative max-w-5xl mx-auto mt-16"
        >
          <div className="rounded-2xl overflow-hidden border border-border shadow-xl bg-card">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-background text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  app.flowa.vn
                </div>
              </div>
            </div>
            
            {/* Dashboard Preview */}
            <div className="aspect-[16/9] bg-muted/20 p-4 sm:p-8">
              <div className="h-full rounded-xl border border-border bg-background p-4 sm:p-6">
                {/* Mock Dashboard Content */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  {[
                    { label: t("hero.dashboard.postsToday"), value: "12", color: "bg-primary/10" },
                    { label: t("hero.dashboard.scheduled"), value: "24", color: "bg-blue-500/10" },
                    { label: t("hero.dashboard.engagement"), value: "1.2K", color: "bg-green-500/10" },
                    { label: t("hero.dashboard.performance"), value: "+45%", color: "bg-orange-500/10" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`p-3 sm:p-4 rounded-lg ${item.color} border border-border/50`}
                    >
                      <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                      <div className="text-lg sm:text-xl font-bold text-foreground">{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 h-28 sm:h-36 rounded-lg bg-muted/30 border border-border/50 p-4">
                    <div className="text-xs text-muted-foreground mb-2">{t("hero.dashboard.calendar")}</div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 14 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-4 rounded ${i % 3 === 0 ? 'bg-primary/40' : 'bg-muted/60'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="h-28 sm:h-36 rounded-lg bg-muted/30 border border-border/50 p-4">
                    <div className="text-xs text-muted-foreground mb-2">{t("hero.dashboard.aiGeneration")}</div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-3 rounded bg-primary/30"
                          style={{ width: `${100 - i * 20}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
