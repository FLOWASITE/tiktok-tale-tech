import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Layers, Clapperboard, GalleryHorizontalEnd, Lightbulb, PenTool, CalendarClock,
  X, Check, ArrowRight, Zap, ChevronDown, Sparkles, Star, Rocket,
  Gem, HeartCrack, TrendingUp
} from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GradientMesh } from "./effects/GradientMesh";
import { ParticleField } from "./effects/ParticleField";

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
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

// Color coding for feature tags with shimmer effect
const featureTagColors: Record<string, { bg: string; icon: string }> = {
  // AI Features - Blue
  "Self-Critique AI": { bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: "🤖" },
  "Context-Aware AI": { bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: "🤖" },
  "Performance Learning": { bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: "🤖" },
  
  // Integration Features - Green
  "Brand Voice Sync": { bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: "🔗" },
  "Channel Overrides": { bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: "🔗" },
  "Brand Integration": { bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: "🔗" },
  "Multi-AI Support": { bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: "🔗" },
  
  // Compliance Features - Amber
  "Industry Compliance": { bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: "🛡️" },
  "Industry Memory": { bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: "🛡️" },
  "Conflict Detection": { bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: "🛡️" },
  
  // Productivity Features - Purple
  "Timing Calculator": { bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", icon: "⚡" },
  "Bulk Actions": { bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", icon: "⚡" },
  "Caption Ready": { bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", icon: "⚡" },
  "Seasonal Suggestions": { bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", icon: "⚡" },
  
  // Creative Features - Pink
  "Hook Library 50+": { bg: "bg-primary/10 text-primary border-primary/20", icon: "✨" },
  "Visual Cues": { bg: "bg-primary/10 text-primary border-primary/20", icon: "✨" },
  "Voice Variants": { bg: "bg-primary/10 text-primary border-primary/20", icon: "✨" },
  "Campaign Overlay": { bg: "bg-primary/10 text-primary border-primary/20", icon: "✨" },
};

const getFeatureTagData = (feature: string) => {
  return featureTagColors[feature] || { bg: "bg-primary/10 text-primary border-primary/20", icon: "✨" };
};

interface PainPointCardProps {
  cardKey: string;
  icon: React.ElementType;
  isExpanded: boolean;
  onToggle: () => void;
  isPopular?: boolean;
  index: number;
}

function PainPointCard({ cardKey, icon: Icon, isExpanded, onToggle, isPopular, index }: PainPointCardProps) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  
  // 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-100, 100], [5, -5]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-5, 5]), { stiffness: 300, damping: 30 });
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  
  // Merge reality checks and consequences into one array
  const realityChecks = t(`painPoints.cards.${cardKey}.realityChecks`, { returnObjects: true }) as string[];
  const consequences = t(`painPoints.cards.${cardKey}.consequences`, { returnObjects: true }) as string[];
  const combinedPainPoints = [...(Array.isArray(realityChecks) ? realityChecks : []), ...(Array.isArray(consequences) ? consequences : [])];
  
  const solutionSteps = t(`painPoints.cards.${cardKey}.solutionSteps`, { returnObjects: true }) as string[];
  const exclusiveFeatures = t(`painPoints.cards.${cardKey}.exclusiveFeatures`, { returnObjects: true }) as string[];

  return (
    <motion.div
      variants={itemVariants}
      className="group perspective-1000"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ y: -12, scale: 1.02 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative h-full rounded-3xl overflow-hidden transition-all duration-500",
          "bg-white/[0.03] dark:bg-white/[0.02] backdrop-blur-xl",
          "border shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
          isPopular 
            ? "border-primary/40 ring-2 ring-primary/20 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]" 
            : "border-white/10 dark:border-white/5 hover:border-primary/30"
        )}
      >
        {/* Glassmorphism gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-primary/5 pointer-events-none" />
        
        {/* Animated glow on hover */}
        <motion.div 
          className="absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--secondary) / 0.1))",
            filter: "blur(20px)",
          }}
        />

        {/* Popular Badge - Enhanced */}
        {isPopular && (
          <div className="absolute top-0 right-0 z-10">
            <div className="relative overflow-hidden bg-gradient-to-r from-primary to-pink-500 text-primary-foreground px-4 py-2 text-xs font-bold rounded-bl-2xl flex items-center gap-2 shadow-lg">
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
              <Star className="w-3.5 h-3.5 fill-current relative z-10" />
              <span className="relative z-10">{t("painPoints.mostPopular")}</span>
            </div>
          </div>
        )}

        <div className="relative p-6 lg:p-8">
          {/* Category Badge & Icon */}
          <div className="flex items-center justify-between mb-6">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-muted/40 backdrop-blur-sm text-muted-foreground border border-white/10"
            >
              {t(`painPoints.cards.${cardKey}.category`)}
            </motion.span>
            
            {/* Enhanced Icon with glow ring */}
            <motion.div
              whileHover={{ scale: 1.15, rotate: 10 }}
              className="relative"
            >
              {/* Glow ring */}
              <motion.div
                className={cn(
                  "absolute -inset-1 rounded-2xl opacity-60",
                  isPopular ? "bg-gradient-to-br from-primary/50 to-pink-500/50" : "bg-primary/30"
                )}
                animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ filter: "blur(8px)" }}
              />
              <div className={cn(
                "relative w-12 h-12 rounded-2xl flex items-center justify-center",
                "bg-gradient-to-br border shadow-lg",
                isPopular 
                  ? "from-primary/20 to-pink-500/10 border-primary/40" 
                  : "from-muted/60 to-muted/30 border-white/10"
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isPopular ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )} />
              </div>
            </motion.div>
          </div>

          {/* Problem Section - Enhanced */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center">
                <X className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t("painPoints.problemLabel")}
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1.5 leading-tight">
              {t(`painPoints.cards.${cardKey}.problemTitle`)}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(`painPoints.cards.${cardKey}.problemSubtitle`)}
            </p>
          </div>

          {/* Combined Pain Points - Collapsible with enhanced styling */}
          <div className="mb-6">
            <button
              onClick={onToggle}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full group/btn"
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center"
              >
                <ChevronDown className="w-3 h-3" />
              </motion.div>
              <span className="group-hover/btn:text-primary transition-colors flex items-center gap-1.5">
                <HeartCrack className="w-3.5 h-3.5 text-muted-foreground" />
                {t("painPoints.realityLabel")}
              </span>
            </button>
            
            <motion.div
              initial={false}
              animate={{ 
                height: isExpanded ? "auto" : 0,
                opacity: isExpanded ? 1 : 0 
              }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 pl-4 border-l-2 border-muted/30 space-y-2">
                {combinedPainPoints.map((point, idx) => (
                  <motion.p 
                    key={idx} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="text-xs text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-muted-foreground/50 shrink-0">→</span>
                    <span>{point}</span>
                  </motion.p>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Premium Divider */}
          <div className="relative h-px mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"
              animate={{ scaleX: [0, 1, 0], originX: 0.5 }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>

          {/* Solution Section - Enhanced */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-primary" />
              </motion.div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                {t("painPoints.solutionLabel")}
              </span>
            </div>
            
            {/* Solution Name with gradient */}
            <h4 className="text-base font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="bg-gradient-to-r from-primary via-pink-500 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_3s_linear_infinite]">
                {t(`painPoints.cards.${cardKey}.solutionName`)}
              </span>
            </h4>
            
            {/* Solution Steps - Timeline Style */}
            <div className="relative space-y-3 mb-4">
              {/* Vertical line */}
              <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
              
              {Array.isArray(solutionSteps) && solutionSteps.map((step, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3 text-xs text-foreground/80 group/step"
                >
                  <motion.span 
                    whileHover={{ scale: 1.2 }}
                    className="relative z-10 w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm shadow-primary/30"
                  >
                    {idx + 1}
                  </motion.span>
                  <span className="group-hover/step:text-primary transition-colors">{step}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Exclusive Features - Enhanced with shimmer */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <Gem className="w-3.5 h-3.5 text-primary" />
              {t("painPoints.exclusiveFeaturesLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(exclusiveFeatures) && exclusiveFeatures.map((feature, idx) => {
                const tagData = getFeatureTagData(feature);
                return (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "relative overflow-hidden px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all",
                      tagData.bg
                    )}
                  >
                    {/* Shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
                    />
                    <span className="relative z-10 flex items-center gap-1">
                      <span className="text-[8px]">{tagData.icon}</span>
                      {feature}
                    </span>
                  </motion.span>
                );
              })}
            </div>
          </div>

          {/* Enhanced Before/After Comparison */}
          <div className="relative bg-gradient-to-br from-muted/40 to-muted/20 rounded-2xl p-5 border border-white/5 overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.15) 1px, transparent 0)",
              backgroundSize: "16px 16px"
            }} />
            
            <p className="relative text-xs font-semibold text-muted-foreground mb-4 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              {t("painPoints.resultLabel")}
            </p>
            
            <div className="relative flex items-center gap-3">
              {/* Before Box */}
              <div className="flex-1 text-center p-4 rounded-xl bg-muted/50 backdrop-blur-sm border border-white/5">
                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">{t(`painPoints.cards.${cardKey}.beforeLabel`)}</p>
                <p className="text-sm font-bold text-muted-foreground">{t(`painPoints.cards.${cardKey}.beforeValue`)}</p>
              </div>
              
              {/* Animated Arrow */}
              <motion.div
                animate={{ x: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <ArrowRight className="w-4 h-4 text-primary" />
              </motion.div>
              
              {/* After Box - Premium with glow */}
              <div className="relative flex-1 text-center p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 overflow-hidden group/after">
                {/* Pulsing glow */}
                <motion.div
                  className="absolute inset-0 bg-primary/10"
                  animate={{ opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute top-2 right-2"
                  animate={{ rotate: [0, 180, 360], scale: [1, 1.2, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <Sparkles className="w-3 h-3 text-primary/60" />
                </motion.div>
                <p className="relative text-[10px] text-primary mb-1.5 uppercase tracking-wide font-medium">{t(`painPoints.cards.${cardKey}.afterLabel`)}</p>
                <p className="relative text-lg font-extrabold text-primary">{t(`painPoints.cards.${cardKey}.afterValue`)}</p>
              </div>
            </div>
            
            {/* Saving Highlight */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="relative mt-4 pt-3 border-t border-white/5"
            >
              <motion.p 
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-center text-xs font-bold text-primary flex items-center justify-center gap-2"
              >
                <motion.span
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Rocket className="w-4 h-4" />
                </motion.span>
                {t(`painPoints.cards.${cardKey}.savingHighlight`)}
              </motion.p>
            </motion.div>
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
    { key: "multiChannel", icon: Layers, isPopular: true },
    { key: "videoScript", icon: Clapperboard },
    { key: "carousel", icon: GalleryHorizontalEnd },
    { key: "ideation", icon: Lightbulb },
    { key: "brandVoice", icon: PenTool },
    { key: "publishing", icon: CalendarClock },
  ];

  const toggleCard = (key: string) => {
    setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
        <GradientMesh />
        <ParticleField count={30} />
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px"
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          {/* Floating decorative elements */}
          <div className="absolute left-1/4 top-20 -z-10">
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl"
            />
          </div>
          <div className="absolute right-1/4 top-32 -z-10">
            <motion.div
              animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-transparent blur-2xl"
            />
          </div>
          
          {/* Badge with glow */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
            <div className="relative flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="w-4 h-4 text-primary" />
              </motion.div>
              <span className="text-sm font-semibold text-primary">{t("painPoints.badge")}</span>
            </div>
          </motion.div>
          
          {/* Title with gradient */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("painPoints.title")}
            </span>
          </h2>
          
          {/* Subtitle */}
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t("painPoints.subtitle")}
          </p>
          
          {/* Animated underline */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="h-1 w-24 mx-auto mt-8 rounded-full bg-gradient-to-r from-primary/50 via-primary to-primary/50"
          />
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-20"
        >
          {cards.map((card, index) => (
            <PainPointCard
              key={card.key}
              cardKey={card.key}
              icon={card.icon}
              isExpanded={expandedCards[card.key] || false}
              onToggle={() => toggleCard(card.key)}
              isPopular={card.isPopular}
              index={index}
            />
          ))}
        </motion.div>

        {/* CTA Section - Premium Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <div className="relative overflow-hidden rounded-3xl">
            {/* Animated gradient border */}
            <motion.div
              className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-primary via-pink-500 to-primary opacity-50"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{ backgroundSize: "200% 200%" }}
            />
            
            <div className="relative bg-card/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-10 text-center">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-pink-500/5 rounded-3xl" />
              
              <div className="relative z-10">
                <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-6">
                  {t("painPoints.cta.question")}
                </h3>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button size="lg" className="gap-2 font-semibold px-8 bg-gradient-to-r from-primary to-pink-500 hover:opacity-90 shadow-lg shadow-primary/25">
                      <Rocket className="w-4 h-4" />
                      {t("painPoints.cta.primary")}
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button size="lg" variant="outline" className="gap-2 font-semibold px-8 border-white/20 hover:bg-white/5">
                      {t("painPoints.cta.secondary")}
                    </Button>
                  </motion.div>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {t("painPoints.cta.benefit1")}
                  </motion.span>
                  <motion.span 
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {t("painPoints.cta.benefit2")}
                  </motion.span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
