import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Layers, Clapperboard, GalleryHorizontalEnd, Megaphone, Check,
  Search, Target, PenTool, ShieldCheck, Send, Zap, Bot,
  MessageSquare, Image as ImageIcon, CalendarCheck
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState, useRef } from "react";
import workflowBrandImg from "@/assets/workflow/workflow-brand.png";
import workflowTopicImg from "@/assets/workflow-topic.png";
import workflowTopic2Img from "@/assets/workflow-topic-2.png";
import workflowAiContentImg from "@/assets/workflow/workflow-ai-content.png";
import workflowPublishImg from "@/assets/workflow/workflow-publish.png";

const contentTypes = [
  { key: "multiChannel", icon: Layers },
  { key: "videoScript", icon: Clapperboard },
  { key: "carousel", icon: GalleryHorizontalEnd },
  { key: "adCopy", icon: Megaphone },
];

// Icons for each flow's steps
const quickFlowIcons = [MessageSquare, Layers, PenTool, ImageIcon, CalendarCheck];
const agentFlowIcons = [Search, Target, PenTool, ShieldCheck, Send];

type FlowMode = "quick" | "agent";

// ─── Step Number ───
function StepNumber({ num, isActive, isCompleted }: { num: number; isActive: boolean; isCompleted: boolean }) {
  return (
    <div className="relative flex flex-col items-center shrink-0">
      <motion.div
        className="relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center z-10"
        animate={{
          scale: isActive ? 1.1 : 1,
          backgroundColor: isActive || isCompleted ? "hsl(var(--primary))" : "hsl(var(--muted))",
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary"
            animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {isActive && <div className="absolute inset-0 rounded-full shadow-lg shadow-primary/30" />}
        {isCompleted ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Check className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
          </motion.div>
        ) : (
          <span className={`text-lg md:text-xl font-bold ${isActive || isCompleted ? "text-primary-foreground" : "text-muted-foreground"}`}>
            {num}
          </span>
        )}
      </motion.div>
    </div>
  );
}

// ─── Image Carousel ───
function ImageCarousel({ images, altPrefix }: { images: string[]; altPrefix: string }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    const autoplay = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => { emblaApi.off("select", onSelect); clearInterval(autoplay); };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  return (
    <motion.div className="mt-4" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {images.map((img, idx) => (
            <div key={idx} className="flex-[0_0_100%] min-w-0">
              <motion.div className="relative aspect-video overflow-hidden rounded-2xl shadow-lg border border-border/20" whileHover={{ boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }} transition={{ duration: 0.3 }}>
                <img src={img} alt={`${altPrefix} ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover object-top" />
              </motion.div>
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {images.map((_, idx) => (
            <button key={idx} onClick={() => scrollTo(idx)} className="h-2 rounded-full transition-all duration-300"
              style={{ width: idx === selectedIndex ? "24px" : "8px", backgroundColor: idx === selectedIndex ? "hsl(var(--primary))" : "hsl(var(--border))" }}
              aria-label={`Go to slide ${idx + 1}`} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Step Card ───
interface FlowStepCardProps {
  stepNum: number;
  stepKey: string;
  flowPrefix: string;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  images?: string[];
  altPrefix?: string;
  hasContentTypes?: boolean;
  hasFeature?: boolean;
  icon: React.ElementType;
}

function FlowStepCard({ stepNum, stepKey, flowPrefix, index, isActive, isCompleted, images, altPrefix, hasContentTypes, hasFeature, icon: Icon }: FlowStepCardProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      className="flex gap-4 md:gap-5 items-start"
    >
      <StepNumber num={stepNum} isActive={isActive} isCompleted={isCompleted} />
      <div className="flex-1">
        <motion.div
          className="relative bg-card rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}
          whileHover={{ y: -4, boxShadow: "0 4px 12px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.06)" }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-0.5 bg-primary w-full" />
          <div className="p-5 md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-5 h-5 text-primary shrink-0" />
              <h3 className="text-lg font-semibold text-foreground">
                {t(`workflow.${flowPrefix}.steps.${stepKey}.title`)}
              </h3>
            </div>
            <p className="text-muted-foreground text-sm mb-2">
              {t(`workflow.${flowPrefix}.steps.${stepKey}.description`)}
            </p>
            {hasFeature && (
              <span className="inline-block text-sm text-primary font-medium">
                → {t(`workflow.${flowPrefix}.steps.${stepKey}.feature`)}
              </span>
            )}

            {/* Content type cards for quick flow step2 */}
            {hasContentTypes && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {contentTypes.map((type) => (
                  <motion.div key={type.key}
                    className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border border-border/30 bg-background/60 backdrop-blur-sm text-center"
                    whileHover={{ y: -3, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div whileHover={{ rotate: 5, scale: 1.1 }} transition={{ duration: 0.2 }}>
                      <type.icon className="w-5 h-5 text-primary mb-1" />
                    </motion.div>
                    <span className="text-sm font-medium text-foreground">{t(`workflow.quickFlow.steps.step2.types.${type.key}.name`)}</span>
                    <span className="text-xs font-medium text-primary">{t(`workflow.quickFlow.steps.step2.types.${type.key}.highlight`)}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{t(`workflow.quickFlow.steps.step2.types.${type.key}.subtitle`)}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {images && images.length > 0 && <ImageCarousel images={images} altPrefix={altPrefix || ""} />}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Branch Timeline ───
function BranchTimeline({ flowPrefix, steps, icons, stepImages, activeIndex }: {
  flowPrefix: string;
  steps: { key: string; hasFeature?: boolean; hasContentTypes?: boolean }[];
  icons: React.ElementType[];
  stepImages: Record<number, { images: string[]; alt: string } | undefined>;
  activeIndex: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start center", "end center"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={containerRef} className="relative">
      {/* Timeline line */}
      <div className="absolute left-[1.5rem] md:left-[1.75rem] top-0 bottom-0 w-0.5 bg-border/30 hidden md:block">
        <motion.div className="w-full bg-primary origin-top" style={{ scaleY, height: "100%" }} />
      </div>

      <div className="space-y-6">
        {steps.map((step, index) => {
          const imgData = stepImages[index];
          return (
            <FlowStepCard
              key={step.key}
              stepNum={index + 1}
              stepKey={step.key}
              flowPrefix={flowPrefix}
              index={index}
              isActive={index === activeIndex}
              isCompleted={index < activeIndex}
              images={imgData?.images}
              altPrefix={imgData?.alt}
              hasContentTypes={step.hasContentTypes}
              hasFeature={step.hasFeature}
              icon={icons[index]}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Section ───
export function WorkflowSection() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<FlowMode>("quick");
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start center", "end center"] });
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      // Brand setup takes ~15% of scroll, remaining 85% for 5 steps
      if (v < 0.15) { setActiveIndex(-1); return; }
      const idx = Math.floor((v - 0.15) / 0.17);
      setActiveIndex(Math.min(idx, 4));
    });
  }, [scrollYProgress]);

  const quickSteps = [
    { key: "step1", hasFeature: true },
    { key: "step2", hasContentTypes: true },
    { key: "step3" },
    { key: "step4", hasFeature: true },
    { key: "step5", hasFeature: true },
  ];

  const agentSteps = [
    { key: "step1" },
    { key: "step2" },
    { key: "step3" },
    { key: "step4" },
    { key: "step5", hasFeature: true },
  ];

  const quickStepImages: Record<number, { images: string[]; alt: string } | undefined> = {
    0: { images: [workflowTopicImg, workflowTopic2Img], alt: "Topic" },
    2: { images: [workflowAiContentImg], alt: "AI Content" },
    4: { images: [workflowPublishImg], alt: "Publish" },
  };

  const agentStepImages: Record<number, { images: string[]; alt: string } | undefined> = {};

  return (
    <section id="workflow" className="py-24 bg-background relative overflow-hidden" ref={sectionRef}>
      {/* Dot grid bg */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.03),transparent_70%)]" />

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 text-sm font-medium text-primary border border-primary/20 rounded-full mb-6">
            {t("workflow.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("workflow.title")}{" "}
            <span className="text-primary">{t("workflow.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("workflow.subtitle")}
          </p>
        </motion.div>

        {/* ─── Brand Setup Card (shared start) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex gap-4 md:gap-5 items-start">
            <div className="relative flex flex-col items-center shrink-0">
              <motion.div
                className="relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center z-10 bg-primary"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="absolute inset-0 rounded-full shadow-lg shadow-primary/30" />
                <span className="text-xl md:text-2xl font-bold text-primary-foreground">0</span>
              </motion.div>
            </div>
            <div className="flex-1">
              <motion.div
                className="relative bg-card rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.04)" }}
                whileHover={{ y: -4, boxShadow: "0 4px 12px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.06)" }}
                transition={{ duration: 0.3 }}
              >
                <div className="h-1 bg-gradient-to-r from-primary to-primary/60 w-full" />
                <div className="p-5 md:p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{t("workflow.brandSetup.title")}</h3>
                  <p className="text-muted-foreground mb-2">{t("workflow.brandSetup.description")}</p>
                  <span className="inline-block text-sm text-primary font-medium">→ {t("workflow.brandSetup.feature")}</span>
                  <ImageCarousel images={[workflowBrandImg]} altPrefix="Brand Setup" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ─── Y-Fork SVG Connector ─── */}
        <motion.div
          className="flex justify-center my-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <svg width="160" height="56" viewBox="0 0 160 56" fill="none">
            <defs>
              <linearGradient id="forkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              </linearGradient>
              <filter id="forkGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Nhánh trái — bezier curve */}
            <motion.path
              d="M80 0 C80 24, 44 32, 44 52"
              stroke="url(#forkGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            {/* Nhánh phải — bezier curve */}
            <motion.path
              d="M80 0 C80 24, 116 32, 116 52"
              stroke="url(#forkGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
            />
            {/* Dot endpoints with glow */}
            <motion.circle
              cx="44" cy="52" r="4"
              fill="hsl(var(--primary))"
              filter="url(#forkGlow)"
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.7 }}
            />
            <motion.circle
              cx="116" cy="52" r="4"
              fill="hsl(var(--primary))"
              filter="url(#forkGlow)"
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.85 }}
            />
          </svg>
        </motion.div>

        {/* ─── Toggle Switch ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex rounded-2xl border border-border/50 bg-card p-1.5 gap-1.5 shadow-sm">
            {([
              { key: "quick" as FlowMode, Icon: Zap, label: t("workflow.toggleQuick"), sub: t("workflow.toggleQuickSub") },
              { key: "agent" as FlowMode, Icon: Bot, label: t("workflow.toggleAgent"), sub: t("workflow.toggleAgentSub") },
            ]).map(({ key, Icon, label, sub }) => {
              const isActive = mode === key;
              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`relative flex items-center gap-3 px-5 py-3 rounded-xl text-left transition-all duration-300 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-all duration-300 ${
                    isActive
                      ? "bg-primary-foreground/20 shadow-inner"
                      : "bg-muted"
                  }`}>
                    <Icon className={`w-4.5 h-4.5 transition-all duration-300 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-tight">{label}</span>
                    <span className={`text-xs leading-tight mt-0.5 transition-colors duration-300 ${isActive ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>{sub}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ─── Branch Label ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 mb-6"
          >
            {mode === "quick" ? <Zap className="w-5 h-5 text-primary" /> : <Bot className="w-5 h-5 text-primary" />}
            <span className="text-lg font-semibold text-foreground">
              {t(`workflow.${mode === "quick" ? "quickFlow" : "agentFlow"}.label`)}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* ─── Flow Steps ─── */}
        <AnimatePresence mode="wait">
          {mode === "quick" ? (
            <motion.div
              key="quick"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.35 }}
            >
              <BranchTimeline
                flowPrefix="quickFlow"
                steps={quickSteps}
                icons={quickFlowIcons}
                stepImages={quickStepImages}
                activeIndex={activeIndex}
              />
            </motion.div>
          ) : (
            <motion.div
              key="agent"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
            >
              <BranchTimeline
                flowPrefix="agentFlow"
                steps={agentSteps}
                icons={agentFlowIcons}
                stepImages={agentStepImages}
                activeIndex={activeIndex}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} className="text-center mt-12">
          <Button asChild size="lg" className="px-8">
            <Link to="/register">{t("workflow.cta")}</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
