import { motion } from "framer-motion";
import { ArrowRight, Eye, Search, Target, PenTool, RefreshCw, CheckCircle, Rocket, Zap, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { getAuthUrl } from "@/hooks/useDomainRouting";

const pipelineSteps = [
  { icon: Search, labelKey: "research" },
  { icon: Target, labelKey: "strategy" },
  { icon: PenTool, labelKey: "create" },
  { icon: RefreshCw, labelKey: "review" },
  { icon: CheckCircle, labelKey: "approve" },
  { icon: Rocket, labelKey: "publish" },
];

export function HeroSection() {
  const { t } = useTranslation();

  const microStats = [
    { icon: Zap, text: t("hero.benefits.setup", "Setup 5 phút") },
    { icon: Lock, text: t("hero.benefits.noCard", "Không cần thẻ tín dụng") },
    { icon: Globe, text: t("hero.benefits.multiLang", "Hỗ trợ VI · TH · EN") },
  ];

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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="relative max-w-3xl mx-auto"
          >
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg">
              <div className="flex items-center justify-center gap-2 sm:gap-0 flex-wrap">
                {pipelineSteps.map((step, index) => (
                  <motion.div
                    key={step.labelKey}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                    className="flex items-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center border transition-all ${
                        index === pipelineSteps.length - 1 
                          ? "bg-primary/10 border-primary/30 text-primary" 
                          : "bg-muted border-border text-foreground/70"
                      }`}>
                        <step.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {t(`hero.pipeline.${step.labelKey}`, step.labelKey)}
                      </span>
                    </div>
                    {index < pipelineSteps.length - 1 && (
                      <div className="hidden sm:flex items-center mx-2 sm:mx-3 mb-6">
                        <div className="w-6 sm:w-8 h-px bg-border" />
                        <div className="w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-border" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              
              {/* Pipeline note */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="text-center text-sm text-muted-foreground mt-5 pt-4 border-t border-border/50"
              >
                {t("hero.pipelineNote", "Toàn bộ pipeline chạy trong ~10 phút, không cần can thiệp")}
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
