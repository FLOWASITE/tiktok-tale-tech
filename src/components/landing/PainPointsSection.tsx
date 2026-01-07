import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Share2, Video, LayoutGrid, Brain, Palette, Calendar,
  X, Check, ArrowRight, Zap, ChevronDown, Sparkles, Star, Rocket
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

// Color coding for feature tags
const featureTagColors: Record<string, string> = {
  // AI Features - Blue
  "Self-Critique AI": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Context-Aware AI": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Performance Learning": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  
  // Integration Features - Green
  "Brand Voice Sync": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Channel Overrides": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Brand Integration": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Multi-AI Support": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  
  // Compliance Features - Yellow/Amber
  "Industry Compliance": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Industry Memory": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Conflict Detection": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  
  // Productivity Features - Purple
  "Timing Calculator": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Bulk Actions": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Caption Ready": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Seasonal Suggestions": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  
  // Creative Features - Pink (default)
  "Hook Library 50+": "bg-primary/10 text-primary border-primary/20",
  "Visual Cues": "bg-primary/10 text-primary border-primary/20",
  "Voice Variants": "bg-primary/10 text-primary border-primary/20",
  "Campaign Overlay": "bg-primary/10 text-primary border-primary/20",
};

const getFeatureTagColor = (feature: string): string => {
  return featureTagColors[feature] || "bg-primary/10 text-primary border-primary/20";
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
  
  // Merge reality checks and consequences into one array
  const realityChecks = t(`painPoints.cards.${cardKey}.realityChecks`, { returnObjects: true }) as string[];
  const consequences = t(`painPoints.cards.${cardKey}.consequences`, { returnObjects: true }) as string[];
  const combinedPainPoints = [...(Array.isArray(realityChecks) ? realityChecks : []), ...(Array.isArray(consequences) ? consequences : [])];
  
  const solutionSteps = t(`painPoints.cards.${cardKey}.solutionSteps`, { returnObjects: true }) as string[];
  const exclusiveFeatures = t(`painPoints.cards.${cardKey}.exclusiveFeatures`, { returnObjects: true }) as string[];

  return (
    <motion.div
      variants={itemVariants}
      className="group"
    >
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative h-full rounded-2xl bg-card/80 backdrop-blur-sm border transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden",
          isPopular 
            ? "border-primary/50 hover:border-primary ring-2 ring-primary/20" 
            : "border-border/50 hover:border-primary/30"
        )}
      >
        {/* Popular Badge */}
        {isPopular && (
          <div className="absolute top-0 right-0 z-10">
            <div className="bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold rounded-bl-xl flex items-center gap-1.5">
              <Star className="w-3 h-3 fill-current" />
              {t("painPoints.mostPopular")}
            </div>
          </div>
        )}

        <div className="p-6 lg:p-8">
          {/* Category Badge */}
          <div className="flex items-center justify-between mb-6">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-muted/60 text-muted-foreground border border-border/50">
              {t(`painPoints.cards.${cardKey}.category`)}
            </span>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={cn(
                "w-10 h-10 rounded-xl border flex items-center justify-center transition-colors",
                isPopular 
                  ? "bg-primary/10 border-primary/30" 
                  : "bg-muted/60 border-border"
              )}
            >
              <Icon className={cn("w-5 h-5", isPopular ? "text-primary" : "text-muted-foreground")} />
            </motion.div>
          </div>

          {/* Problem Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <X className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
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

          {/* Combined Pain Points (Reality Check + Consequences) - Collapsible */}
          <div className="mb-6">
            <button
              onClick={onToggle}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
              <span>💔 {t("painPoints.realityLabel")}</span>
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
              <div className="mt-3 pl-4 border-l-2 border-muted/40 space-y-1.5">
                {combinedPainPoints.map((point, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-muted-foreground/60 shrink-0">→</span>
                    <span>{point}</span>
                  </p>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

          {/* Solution Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Check className="w-4 h-4 text-primary" />
              </motion.div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                {t("painPoints.solutionLabel")}
              </span>
            </div>
            <h4 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t(`painPoints.cards.${cardKey}.solutionName`)}
            </h4>
            
            {/* Solution Steps */}
            <div className="space-y-2 mb-4">
              {Array.isArray(solutionSteps) && solutionSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-foreground/80">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exclusive Features with Color Coding */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground mb-2">💎 {t("painPoints.exclusiveFeaturesLabel")}</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.isArray(exclusiveFeatures) && exclusiveFeatures.map((feature, idx) => (
                <motion.span
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-medium border transition-all",
                    getFeatureTagColor(feature)
                  )}
                >
                  {feature}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Enhanced Before/After Comparison */}
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">📊 {t("painPoints.resultLabel")}</p>
            <div className="flex items-center gap-3">
              {/* Before Box */}
              <div className="flex-1 text-center p-3 rounded-lg bg-muted/60 border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1">{t(`painPoints.cards.${cardKey}.beforeLabel`)}</p>
                <p className="text-sm font-bold text-muted-foreground">{t(`painPoints.cards.${cardKey}.beforeValue`)}</p>
              </div>
              
              {/* Animated Arrow */}
              <motion.div
                animate={{ x: [0, 6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="shrink-0"
              >
                <ArrowRight className="w-5 h-5 text-primary" />
              </motion.div>
              
              {/* After Box - Enhanced with gradient */}
              <div className="flex-1 text-center p-3 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 relative overflow-hidden">
                <div className="absolute top-1 right-1">
                  <Sparkles className="w-3 h-3 text-primary/50" />
                </div>
                <p className="text-[10px] text-primary mb-1">{t(`painPoints.cards.${cardKey}.afterLabel`)}</p>
                <p className="text-base font-extrabold text-primary">{t(`painPoints.cards.${cardKey}.afterValue`)}</p>
              </div>
            </div>
            
            {/* Saving Highlight */}
            <motion.p 
              initial={{ opacity: 0.8 }}
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-center text-xs font-bold text-primary mt-3 flex items-center justify-center gap-1"
            >
              <Rocket className="w-3 h-3" />
              {t(`painPoints.cards.${cardKey}.savingHighlight`)}
            </motion.p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function PainPointsSection() {
  const { t } = useTranslation();
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const cards = [
    { key: "multiChannel", icon: Share2, isPopular: true },
    { key: "videoScript", icon: Video },
    { key: "carousel", icon: LayoutGrid },
    { key: "ideation", icon: Brain },
    { key: "brandVoice", icon: Palette },
    { key: "publishing", icon: Calendar },
  ];

  const toggleCard = (key: string) => {
    setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-muted/30" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Zap className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-semibold text-primary">{t("painPoints.badge")}</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4">
            {t("painPoints.title")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("painPoints.subtitle")}
          </p>
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {cards.map((card) => (
            <PainPointCard
              key={card.key}
              cardKey={card.key}
              icon={card.icon}
              isExpanded={expandedCards[card.key] || false}
              onToggle={() => toggleCard(card.key)}
              isPopular={card.isPopular}
            />
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 text-center shadow-lg">
            <h3 className="text-xl font-bold text-foreground mb-4">
              {t("painPoints.cta.question")}
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <Button size="lg" className="gap-2 font-semibold">
                <Rocket className="w-4 h-4" />
                {t("painPoints.cta.primary")}
              </Button>
              <Button size="lg" variant="outline" className="gap-2 font-semibold">
                {t("painPoints.cta.secondary")}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-primary" />
                {t("painPoints.cta.benefit1")}
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-primary" />
                {t("painPoints.cta.benefit2")}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
