import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Layers, Clapperboard, GalleryHorizontalEnd, Lightbulb, PenTool, CalendarClock,
  X, Check, ChevronDown, Sparkles
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

interface PainPointCardProps {
  cardKey: string;
  icon: React.ElementType;
  isExpanded: boolean;
  onToggle: () => void;
  isPopular?: boolean;
}

function PainPointCard({ cardKey, icon: Icon, isExpanded, onToggle, isPopular }: PainPointCardProps) {
  const { t } = useTranslation();
  
  const realityChecks = t(`painPoints.cards.${cardKey}.realityChecks`, { returnObjects: true }) as string[];
  const consequences = t(`painPoints.cards.${cardKey}.consequences`, { returnObjects: true }) as string[];
  const combinedPainPoints = [...(Array.isArray(realityChecks) ? realityChecks : []), ...(Array.isArray(consequences) ? consequences : [])];
  
  const solutionSteps = t(`painPoints.cards.${cardKey}.solutionSteps`, { returnObjects: true }) as string[];
  const exclusiveFeatures = t(`painPoints.cards.${cardKey}.exclusiveFeatures`, { returnObjects: true }) as string[];

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "relative h-full rounded-xl overflow-hidden bg-card border transition-all duration-300 hover:shadow-lg",
        isPopular ? "border-primary shadow-md" : "border-border hover:border-primary/50"
      )}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
            {t("painPoints.mostPopular")}
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Category Badge & Icon */}
        <div className="flex items-center justify-between mb-5">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {t(`painPoints.cards.${cardKey}.category`)}
          </span>
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isPopular ? "bg-primary/10" : "bg-muted"
          )}>
            <Icon className={cn(
              "w-5 h-5",
              isPopular ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
        </div>

        {/* Problem Section */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <X className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("painPoints.problemLabel")}
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">
            {t(`painPoints.cards.${cardKey}.problemTitle`)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(`painPoints.cards.${cardKey}.problemSubtitle`)}
          </p>
        </div>

        {/* Pain Points - Collapsible */}
        <div className="mb-5">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-5 h-5 rounded-full bg-muted flex items-center justify-center"
            >
              <ChevronDown className="w-3 h-3" />
            </motion.div>
            <span>{t("painPoints.realityLabel")}</span>
          </button>
          
          <motion.div
            initial={false}
            animate={{ 
              height: isExpanded ? "auto" : 0,
              opacity: isExpanded ? 1 : 0 
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pl-4 border-l-2 border-muted space-y-1.5">
              {combinedPainPoints.map((point, idx) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  → {point}
                </p>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-5" />

        {/* Solution Section */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              {t("painPoints.solutionLabel")}
            </span>
          </div>
          
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            {t(`painPoints.cards.${cardKey}.solutionName`)}
          </h4>
          
          {/* Solution Steps */}
          <div className="space-y-2 mb-4">
            {Array.isArray(solutionSteps) && solutionSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-foreground/80">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Exclusive Features */}
        <div className="mb-5">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("painPoints.exclusiveFeaturesLabel")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.isArray(exclusiveFeatures) && exclusiveFeatures.map((feature, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Before/After */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            {t("painPoints.resultLabel")}
          </p>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center p-3 rounded-lg bg-background border border-border">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase">{t(`painPoints.cards.${cardKey}.beforeLabel`)}</p>
              <p className="text-sm font-bold text-muted-foreground">{t(`painPoints.cards.${cardKey}.beforeValue`)}</p>
            </div>
            
            <div className="text-primary">→</div>
            
            <div className="flex-1 text-center p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-[10px] text-primary mb-1 uppercase">{t(`painPoints.cards.${cardKey}.afterLabel`)}</p>
              <p className="text-sm font-bold text-primary">{t(`painPoints.cards.${cardKey}.afterValue`)}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PainPointsSection() {
  const { t } = useTranslation();
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (cardKey: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }));
  };

  const painPoints = [
    { key: "multiChannel", icon: Layers, popular: true },
    { key: "videoScript", icon: Clapperboard },
    { key: "carousel", icon: GalleryHorizontalEnd },
    { key: "ideation", icon: Lightbulb },
    { key: "brandVoice", icon: PenTool },
    { key: "publishing", icon: CalendarClock },
  ];

  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
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

        {/* Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {painPoints.map((point) => (
            <PainPointCard
              key={point.key}
              cardKey={point.key}
              icon={point.icon}
              isExpanded={expandedCards[point.key] || false}
              onToggle={() => toggleCard(point.key)}
              isPopular={point.popular}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
