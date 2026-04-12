import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, Search, Target, PenTool, RefreshCw, CheckCircle, Rocket, Zap, Lock, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { getAuthUrl } from "@/hooks/useDomainRouting";
import { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const pipelineSteps = [
  { icon: Search, labelKey: "research", tooltipKey: "hero.pipeline.tip.research", defaultTip: "Nghiên cứu thị trường & đối thủ" },
  { icon: Target, labelKey: "strategy", tooltipKey: "hero.pipeline.tip.strategy", defaultTip: "Lên chiến lược content" },
  { icon: PenTool, labelKey: "create", tooltipKey: "hero.pipeline.tip.create", defaultTip: "Tạo nội dung đa kênh" },
  { icon: RefreshCw, labelKey: "review", tooltipKey: "hero.pipeline.tip.review", defaultTip: "Rà soát & tối ưu" },
  { icon: CheckCircle, labelKey: "approve", tooltipKey: "hero.pipeline.tip.approve", defaultTip: "Duyệt nội dung" },
  { icon: Rocket, labelKey: "publish", tooltipKey: "hero.pipeline.tip.publish", defaultTip: "Xuất bản tự động" },
];

function usePipelineAnimation() {
  const [activeStep, setActiveStep] = useState(-1);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    if (activeStep >= pipelineSteps.length - 1) return;

    const timer = setTimeout(() => {
      setActiveStep((prev) => prev + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [activeStep, started]);

  const start = () => {
    if (!started) {
      setStarted(true);
      setActiveStep(0);
    }
  };

  return { activeStep, start, started };
}

export function HeroSection() {
  const { t } = useTranslation();
  const { activeStep, start, started } = usePipelineAnimation();
  const pipelineRef = useRef<HTMLDivElement>(null);

  // Start animation when pipeline enters viewport
  useEffect(() => {
    if (!pipelineRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) start(); },
      { threshold: 0.5 }
    );
    observer.observe(pipelineRef.current);
    return () => observer.disconnect();
  }, []);

  const microStats = [
    { icon: Zap, text: t("hero.benefits.setup", "Setup 5 phút") },
    { icon: Lock, text: t("hero.benefits.noCard", "Không cần thẻ tín dụng") },
    { icon: Globe, text: t("hero.benefits.multiLang", "Hỗ trợ VI · TH · EN") },
  ];

  const progressPercent = activeStep < 0 ? 0 : Math.min(((activeStep + 1) / pipelineSteps.length) * 100, 100);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 lg:pt-28 lg:pb-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {t("hero.tag", "AI Marketing Agent — Không phải AI Writing Tool")}
            </span>
          </motion.div>

          {/* Headline */}
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

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            {t("hero.descPlain")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
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
              onClick={() => document.querySelector("#workflow")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Eye className="mr-2 w-5 h-5" />
              {t("hero.cta.watchHow")}
            </Button>
          </motion.div>

          {/* Micro Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 mb-16"
          >
            {microStats.map((stat) => (
              <div
                key={stat.text}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <stat.icon className="w-4 h-4 text-primary" />
                <span>{stat.text}</span>
              </div>
            ))}
          </motion.div>

          {/* Pipeline Diagram */}
          <motion.div
            ref={pipelineRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="relative max-w-3xl mx-auto"
          >
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg">
              <TooltipProvider delayDuration={200}>
                <div className="flex items-center justify-center gap-2 sm:gap-0 flex-wrap">
                  {pipelineSteps.map((step, index) => {
                    const isActive = activeStep === index && index < pipelineSteps.length - 1;
                    const isCompleted = activeStep > index;
                    const isFinal = index === pipelineSteps.length - 1 && activeStep >= index;
                    const isPending = activeStep < index;

                    return (
                      <div key={step.labelKey} className="flex items-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-2 group cursor-default">
                              <motion.div
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ 
                                  opacity: 1, 
                                  scale: isActive ? 1.15 : 1,
                                }}
                                transition={{ 
                                  duration: 0.4, 
                                  delay: started ? 0 : 0.6 + index * 0.1,
                                }}
                                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 transition-all duration-500 group-hover:scale-110 ${
                                  isFinal
                                    ? "bg-primary/15 border-primary text-primary shadow-[0_0_16px_hsl(var(--primary)/0.3)]"
                                    : isActive
                                    ? "bg-primary/10 border-primary text-primary shadow-[0_0_12px_hsl(var(--primary)/0.25)]"
                                    : isCompleted
                                    ? "bg-primary/5 border-primary/40 text-primary/70"
                                    : "bg-muted border-border text-muted-foreground"
                                }`}
                              >
                                {/* Pulse ring for final step */}
                                {isFinal && (
                                  <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-primary"
                                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                  />
                                )}

                                {/* Completed checkmark overlay */}
                                <AnimatePresence>
                                  {isCompleted && !isFinal && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                                    >
                                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <step.icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${isActive ? "animate-pulse" : ""}`} />
                              </motion.div>
                              <span className={`text-xs font-medium transition-colors duration-300 ${
                                isActive || isFinal ? "text-primary" : isCompleted ? "text-primary/60" : "text-muted-foreground"
                              }`}>
                                {t(`hero.pipeline.${step.labelKey}`, step.labelKey)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {t(step.tooltipKey, step.defaultTip)}
                          </TooltipContent>
                        </Tooltip>

                        {/* Animated connector */}
                        {index < pipelineSteps.length - 1 && (
                          <div className="hidden sm:flex items-center mx-2 sm:mx-3 mb-6">
                            <svg width="32" height="8" viewBox="0 0 32 8" className="overflow-visible">
                              <line
                                x1="0" y1="4" x2="26" y2="4"
                                className={`transition-all duration-500 ${
                                  activeStep > index ? "stroke-primary" : "stroke-border"
                                }`}
                                strokeWidth="2"
                                strokeDasharray="4 3"
                                style={{
                                  animation: activeStep >= index ? "pipeline-flow 1.5s linear infinite" : "none",
                                }}
                              />
                              <polygon
                                points="24,1 30,4 24,7"
                                className={`transition-all duration-500 ${
                                  activeStep > index ? "fill-primary" : "fill-border"
                                }`}
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TooltipProvider>

              {/* Progress trail */}
              <div className="hidden sm:block mt-4 mx-8">
                <div className="h-[2px] bg-border/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
              
              {/* Pipeline note */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: activeStep >= pipelineSteps.length - 1 ? 1 : 0.5 }}
                transition={{ duration: 0.5, delay: activeStep >= pipelineSteps.length - 1 ? 0.3 : 0 }}
                className="text-center text-sm text-muted-foreground mt-5 pt-4 border-t border-border/50 flex items-center justify-center gap-2"
              >
                {activeStep >= pipelineSteps.length - 1 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                )}
                {t("hero.pipelineNote", "Toàn bộ pipeline chạy trong ~10 phút, không cần can thiệp")}
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Pipeline flow animation CSS */}
      <style>{`
        @keyframes pipeline-flow {
          from { stroke-dashoffset: 14; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </section>
  );
}
