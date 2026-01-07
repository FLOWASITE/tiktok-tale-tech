import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Layers, Clapperboard, GalleryHorizontalEnd, Lightbulb, PenTool, CalendarClock,
  X, Check, ArrowRight
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi
} from "@/components/ui/carousel";

interface SimplePainPointCardProps {
  cardKey: string;
  icon: React.ElementType;
}

function SimplePainPointCard({ cardKey, icon: Icon }: SimplePainPointCardProps) {
  const { t } = useTranslation();

  return (
    <div className="h-full rounded-xl bg-card border border-border p-6 transition-all duration-300 hover:shadow-md hover:border-primary/30">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
        <Icon className="w-6 h-6 text-primary" />
      </div>

      {/* Problem */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <X className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("painPoints.problemLabel")}
          </span>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          {t(`painPoints.cards.${cardKey}.problemTitle`)}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t(`painPoints.cards.${cardKey}.problemSubtitle`)}
        </p>
      </div>

      {/* Solution */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Check className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary uppercase tracking-wider">
            {t("painPoints.solutionLabel")}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground">
          {t(`painPoints.cards.${cardKey}.solutionName`)}
        </p>
      </div>

      {/* Before/After */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 text-center p-3 rounded-lg bg-background border border-border">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase">
              {t(`painPoints.cards.${cardKey}.beforeLabel`)}
            </p>
            <p className="text-sm font-bold text-muted-foreground">
              {t(`painPoints.cards.${cardKey}.beforeValue`)}
            </p>
          </div>
          
          <ArrowRight className="w-4 h-4 text-primary shrink-0" />
          
          <div className="flex-1 text-center p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[10px] text-primary mb-1 uppercase">
              {t(`painPoints.cards.${cardKey}.afterLabel`)}
            </p>
            <p className="text-sm font-bold text-primary">
              {t(`painPoints.cards.${cardKey}.afterValue`)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PainPointsSection() {
  const { t } = useTranslation();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const painPoints = [
    { key: "multiChannel", icon: Layers },
    { key: "videoScript", icon: Clapperboard },
    { key: "carousel", icon: GalleryHorizontalEnd },
    { key: "ideation", icon: Lightbulb },
    { key: "brandVoice", icon: PenTool },
    { key: "publishing", icon: CalendarClock },
  ];

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollTo = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary mb-4">
            {t("painPoints.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            {t("painPoints.title")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("painPoints.subtitle")}
          </p>
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative"
        >
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {painPoints.map((point) => (
                <CarouselItem 
                  key={point.key} 
                  className="pl-4 basis-full md:basis-1/2 lg:basis-1/3"
                >
                  <SimplePainPointCard
                    cardKey={point.key}
                    icon={point.icon}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            
            {/* Navigation Arrows */}
            <CarouselPrevious className="hidden md:flex -left-12 border-border hover:bg-primary hover:text-primary-foreground hover:border-primary" />
            <CarouselNext className="hidden md:flex -right-12 border-border hover:bg-primary hover:text-primary-foreground hover:border-primary" />
          </Carousel>

          {/* Dots Pagination */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  current === index 
                    ? "bg-primary w-6" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
