import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Layers, Clapperboard, GalleryHorizontalEnd, Lightbulb, PenTool, CalendarClock, Users, Megaphone
} from "lucide-react";

interface FeatureSectionProps {
  featureKey: string;
  icon: React.ElementType;
  index: number;
}

function FeatureSection({ featureKey, icon: Icon, index }: FeatureSectionProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="py-16 lg:py-24 border-b border-border/30 last:border-b-0"
    >
      <div className="max-w-4xl mx-auto">
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Icon className="w-6 h-6 text-primary" />
        </div>

        {/* Title with accent keyword */}
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
          <span className="text-primary">
            {t(`painPoints.features.${featureKey}.keyword`)}
          </span>
          {" "}
          <span className="text-foreground">
            {t(`painPoints.features.${featureKey}.title`)}
          </span>
        </h3>

        {/* Description */}
        <p className="text-lg text-muted-foreground max-w-2xl">
          {t(`painPoints.features.${featureKey}.description`)}
        </p>
      </div>
    </motion.div>
  );
}

export function PainPointsSection() {
  const { t } = useTranslation();

  const features = [
    { key: "multiChannel", icon: Layers },
    { key: "videoScript", icon: Clapperboard },
    { key: "carousel", icon: GalleryHorizontalEnd },
    { key: "adCopy", icon: Megaphone },
    { key: "ideation", icon: Lightbulb },
    { key: "brandVoice", icon: PenTool },
    { key: "publishing", icon: CalendarClock },
    { key: "collaboration", icon: Users },
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
          className="text-center max-w-3xl mx-auto mb-8"
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

        {/* Feature Sections */}
        <div className="mt-12">
          {features.map((feature, index) => (
            <FeatureSection
              key={feature.key}
              featureKey={feature.key}
              icon={feature.icon}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
