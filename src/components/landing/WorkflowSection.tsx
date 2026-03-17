import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Layers, Clapperboard, GalleryHorizontalEnd, Megaphone } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import workflowBrandImg from "@/assets/workflow/workflow-brand.png";
import workflowTopicImg from "@/assets/workflow-topic.png";
import workflowTopic2Img from "@/assets/workflow-topic-2.png";
import workflowAiContentImg from "@/assets/workflow/workflow-ai-content.png";
import workflowPublishImg from "@/assets/workflow/workflow-publish.png";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

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

// Step number component with timeline
function StepNumber({ num, isLast }: { num: number; isLast: boolean }) {
  return (
    <div className="relative flex flex-col items-center shrink-0">
      {/* Prominent number in gradient circle */}
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25 ring-4 ring-primary/10 z-10 transition-transform hover:scale-110">
        <span className="text-xl md:text-2xl font-bold text-white">{num}</span>
      </div>
      
      {/* Timeline line connecting to next step */}
      {!isLast && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-[calc(100%+2rem)] bg-gradient-to-b from-primary/50 via-primary/30 to-primary/10" />
      )}
    </div>
  );
}

interface StepWithCarouselProps {
  step: { num: number; key: string; hasFeature?: boolean };
  images: string[];
  altPrefix: string;
  isLast: boolean;
}

function StepWithCarousel({ step, images, altPrefix, isLast }: StepWithCarouselProps) {
  const { t } = useTranslation();
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
    
    // Auto-play every 5 seconds
    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    
    return () => {
      emblaApi.off("select", onSelect);
      clearInterval(autoplay);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => {
    emblaApi?.scrollTo(index);
  }, [emblaApi]);

  return (
    <div className="space-y-6">
      {/* Step text content with timeline */}
      <div className="flex gap-5 md:gap-6 items-start">
        <StepNumber num={step.num} isLast={isLast} />
        <div className="flex-1 pt-2">
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
        </div>
      </div>
      
      {/* Carousel below step */}
      <div className="ml-[4.5rem] md:ml-[5rem]">
        <div className="overflow-hidden rounded-xl" ref={emblaRef}>
          <div className="flex">
            {images.map((img, idx) => (
              <div key={idx} className="flex-[0_0_100%] min-w-0">
                <div className="relative aspect-video overflow-hidden rounded-xl shadow-lg border border-border/20 hover:shadow-xl transition-shadow duration-300">
                  <img
                    src={img}
                    alt={`${altPrefix} ${idx + 1}`}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-3">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollTo(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === selectedIndex ? "bg-primary" : "bg-border"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
export function WorkflowSection() {
  const { t } = useTranslation();

  const steps = [
    { num: 1, key: "step1", hasFeature: true },
    { num: 2, key: "step2", hasFeature: true },
    { num: 3, key: "step3", hasContentTypes: true },
    { num: 4, key: "step4" },
    { num: 5, key: "step5", hasFeature: true },
    { num: 6, key: "step6", hasFeature: true },
  ];

  return (
    <section id="workflow" className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
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

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-0"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.key}
              variants={itemVariants}
              className={`py-8 ${
                index !== steps.length - 1 ? "border-b border-border/30" : ""
              }`}
            >
              {/* Step 1 & 2: with image carousel */}
              {step.num === 1 ? (
                <StepWithCarousel step={step} images={step1Images} altPrefix="Brand Setup Screenshot" isLast={index === steps.length - 1} />
              ) : step.num === 2 ? (
                <StepWithCarousel step={step} images={step2Images} altPrefix="Topic Suggestion Screenshot" isLast={index === steps.length - 1} />
              ) : step.num === 4 ? (
                <StepWithCarousel step={step} images={step4Images} altPrefix="AI Content Generation Screenshot" isLast={index === steps.length - 1} />
              ) : step.num === 5 ? (
                <StepWithCarousel step={step} images={step5Images} altPrefix="Publishing Screenshot" isLast={index === steps.length - 1} />
              ) : (
                /* Other steps: original layout with timeline */
                <div className="flex gap-5 md:gap-6 items-start">
                  <StepNumber num={step.num} isLast={index === steps.length - 1} />
                  <div className="flex-1 pt-2">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {t(`workflow.steps.${step.key}.title`)}
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      {t(`workflow.steps.${step.key}.description`)}
                    </p>

                    {/* Feature highlight for steps 2, 5 */}
                    {step.hasFeature && (
                      <span className="inline-block text-sm text-primary font-medium">
                        → {t(`workflow.steps.${step.key}.feature`)}
                      </span>
                    )}

                    {/* Content Types for Step 3 */}
                    {step.hasContentTypes && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        {contentTypes.map((type) => (
                          <div
                            key={type.key}
                            className="flex flex-col items-center gap-1 px-3 py-4 rounded-lg border border-border/50 bg-muted/30 text-center"
                          >
                            <type.icon className="w-5 h-5 text-primary mb-1" />
                            <span className="text-sm font-medium text-foreground">
                              {t(`workflow.steps.step3.types.${type.key}.name`)}
                            </span>
                            <span className="text-xs font-medium text-primary">
                              {t(`workflow.steps.step3.types.${type.key}.highlight`)}
                            </span>
                            <span className="text-xs text-muted-foreground leading-tight">
                              {t(`workflow.steps.step3.types.${type.key}.subtitle`)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

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
