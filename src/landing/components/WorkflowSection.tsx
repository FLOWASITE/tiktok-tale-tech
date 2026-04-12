import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Layers, Clapperboard, GalleryHorizontalEnd, Megaphone, Check } from "lucide-react";
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

const step1Images = [workflowBrandImg];
const step2Images = [workflowTopicImg, workflowTopic2Img];
const step4Images = [workflowAiContentImg];
const step5Images = [workflowPublishImg];

// Animated step number with scroll-aware states
function StepNumber({ num, isActive, isCompleted }: { num: number; isActive: boolean; isCompleted: boolean }) {
  return (
    <div className="relative flex flex-col items-center shrink-0">
      <motion.div
        className="relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center z-10"
        animate={{
          scale: isActive ? 1.1 : 1,
          backgroundColor: isActive || isCompleted ? "hsl(var(--primary))" : "hsl(var(--muted))",
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Pulse ring for active */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary"
            animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {/* Shadow glow for active */}
        {isActive && (
          <div className="absolute inset-0 rounded-full shadow-lg shadow-primary/30" />
        )}
        
        {isCompleted ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Check className="w-6 h-6 text-primary-foreground" strokeWidth={3} />
          </motion.div>
        ) : (
          <span className={`text-xl md:text-2xl font-bold ${isActive || isCompleted ? "text-primary-foreground" : "text-muted-foreground"}`}>
            {num}
          </span>
        )}
      </motion.div>
    </div>
  );
}

interface StepCardProps {
  step: { num: number; key: string; hasFeature?: boolean; hasContentTypes?: boolean };
  index: number;
  images?: string[];
  altPrefix?: string;
  isActive: boolean;
  isCompleted: boolean;
}

function StepCard({ step, index, images, altPrefix, isActive, isCompleted }: StepCardProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
      className="flex gap-5 md:gap-6 items-start"
    >
      <StepNumber num={step.num} isActive={isActive} isCompleted={isCompleted} />
      <div className="flex-1">
        {/* Premium card wrapper */}
        <motion.div
          className="relative bg-card rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}
          whileHover={{ y: -4, boxShadow: "0 4px 12px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.06)" }}
          transition={{ duration: 0.3 }}
        >
          {/* Top accent line */}
          <div className="h-0.5 bg-primary w-full" />
          
          <div className="p-5 md:p-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t(`workflow.steps.${step.key}.title`)}
            </h3>
            <p className="text-muted-foreground mb-2">
              {t(`workflow.steps.${step.key}.description`)}
            </p>
            {step.hasFeature && (
              <span className="inline-block text-sm text-primary font-medium">
                → {t(`workflow.steps.${step.key}.feature`)}
              </span>
            )}

            {/* Content Types for Step 3 */}
            {step.hasContentTypes && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {contentTypes.map((type) => (
                  <motion.div
                    key={type.key}
                    className="flex flex-col items-center gap-1 px-3 py-4 rounded-xl border border-border/30 bg-background/60 backdrop-blur-sm text-center"
                    whileHover={{ y: -3, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div whileHover={{ rotate: 5, scale: 1.1 }} transition={{ duration: 0.2 }}>
                      <type.icon className="w-5 h-5 text-primary mb-1" />
                    </motion.div>
                    <span className="text-sm font-medium text-foreground">
                      {t(`workflow.steps.step3.types.${type.key}.name`)}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {t(`workflow.steps.step3.types.${type.key}.highlight`)}
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight">
                      {t(`workflow.steps.step3.types.${type.key}.subtitle`)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Image carousel */}
            {images && images.length > 0 && (
              <ImageCarousel images={images} altPrefix={altPrefix || ""} />
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

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
    return () => {
      emblaApi.off("select", onSelect);
      clearInterval(autoplay);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => {
    emblaApi?.scrollTo(index);
  }, [emblaApi]);

  return (
    <motion.div
      className="mt-4"
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {images.map((img, idx) => (
            <div key={idx} className="flex-[0_0_100%] min-w-0">
              <motion.div
                className="relative aspect-video overflow-hidden rounded-2xl shadow-lg border border-border/20"
                whileHover={{ boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={img}
                  alt={`${altPrefix} ${idx + 1}`}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
              </motion.div>
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollTo(idx)}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: idx === selectedIndex ? "24px" : "8px",
                backgroundColor: idx === selectedIndex ? "hsl(var(--primary))" : "hsl(var(--border))",
              }}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function WorkflowSection() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Track which step is active based on scroll
  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      const idx = Math.floor(v * 6);
      setActiveIndex(Math.min(idx, 5));
    });
  }, [scrollYProgress]);

  const steps = [
    { num: 1, key: "step1", hasFeature: true },
    { num: 2, key: "step2", hasFeature: true },
    { num: 3, key: "step3", hasContentTypes: true },
    { num: 4, key: "step4" },
    { num: 5, key: "step5", hasFeature: true },
    { num: 6, key: "step6", hasFeature: true },
  ];

  const stepImages: Record<number, { images: string[]; alt: string } | undefined> = {
    1: { images: step1Images, alt: "Brand Setup Screenshot" },
    2: { images: step2Images, alt: "Topic Suggestion Screenshot" },
    4: { images: step4Images, alt: "AI Content Generation Screenshot" },
    6: { images: step5Images, alt: "Publishing Screenshot" },
  };

  return (
    <section id="workflow" className="py-24 bg-background relative overflow-hidden">
      {/* Subtle dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Ambient radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.03),transparent_70%)]" />

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
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

        {/* Steps with animated timeline */}
        <div ref={containerRef} className="relative">
          {/* Animated timeline line (left side, aligned with step numbers) */}
          <div className="absolute left-[1.75rem] md:left-[2rem] top-0 bottom-0 w-0.5 bg-border/30 hidden md:block">
            <motion.div
              className="w-full bg-primary origin-top"
              style={{ scaleY, height: "100%" }}
            />
          </div>

          <div className="space-y-8">
            {steps.map((step, index) => {
              const imgData = stepImages[step.num];
              return (
                <StepCard
                  key={step.key}
                  step={step}
                  index={index}
                  images={imgData?.images}
                  altPrefix={imgData?.alt}
                  isActive={index === activeIndex}
                  isCompleted={index < activeIndex}
                />
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <Button asChild size="lg" className="px-8">
            <Link to="/register">{t("workflow.cta")}</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
