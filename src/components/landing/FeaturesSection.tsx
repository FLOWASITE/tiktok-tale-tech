import { motion } from "framer-motion";
import { 
  Sparkles, 
  Share2, 
  Palette, 
  Target, 
  FileEdit, 
  Calendar,
  Zap,
  Globe,
  BarChart3,
  ArrowRight
} from "lucide-react";
import { useTranslation } from "react-i18next";

const featureIcons = {
  aiContent: Sparkles,
  multiChannel: Share2,
  brandVoice: Palette,
  campaign: Target,
  adCopy: FileEdit,
  calendar: Calendar,
};

const featureColors = {
  aiContent: { color: "from-pink-500 to-rose-500", glowColor: "group-hover:shadow-pink-500/25" },
  multiChannel: { color: "from-blue-500 to-cyan-500", glowColor: "group-hover:shadow-blue-500/25" },
  brandVoice: { color: "from-purple-500 to-violet-500", glowColor: "group-hover:shadow-purple-500/25" },
  campaign: { color: "from-orange-500 to-amber-500", glowColor: "group-hover:shadow-orange-500/25" },
  adCopy: { color: "from-green-500 to-emerald-500", glowColor: "group-hover:shadow-green-500/25" },
  calendar: { color: "from-indigo-500 to-blue-500", glowColor: "group-hover:shadow-indigo-500/25" },
};

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
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export function FeaturesSection() {
  const { t } = useTranslation();

  const featureKeys = ["aiContent", "multiChannel", "brandVoice", "campaign", "adCopy", "calendar"] as const;

  const features = featureKeys.map((key) => ({
    key,
    icon: featureIcons[key],
    title: t(`features.items.${key}.title`),
    description: t(`features.items.${key}.description`),
    ...featureColors[key],
  }));

  const stats = [
    { icon: Globe, value: "50+", label: t("features.stats.industries"), color: "from-blue-500 to-cyan-500" },
    { icon: FileEdit, value: "10+", label: t("features.stats.contentTypes"), color: "from-purple-500 to-violet-500" },
    { icon: Share2, value: "8+", label: t("features.stats.channels"), color: "from-pink-500 to-rose-500" },
    { icon: BarChart3, value: "Real-time", label: t("features.stats.analytics"), color: "from-green-500 to-emerald-500" },
  ];

  return (
    <section id="features" className="py-28 lg:py-36 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-muted/40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        {/* Floating gradient blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-secondary/5 blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20 lg:mb-24"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 mb-8 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-semibold text-primary">{t("features.badge")}</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6">
            {t("features.title")}
            <br />
            <span className="text-gradient">{t("features.titleHighlight")}</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("features.subtitle")}
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.key}
              variants={itemVariants}
              className="group relative"
            >
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className={`relative h-full p-8 lg:p-10 rounded-3xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-2xl ${feature.glowColor}`}
              >
                {/* Gradient border on hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
                
                {/* Icon with pulse animation */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 shadow-lg`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </motion.div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Learn more link */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {t("features.learnMore")} <ArrowRight className="w-4 h-4" />
                </motion.div>

                {/* Animated corner decoration */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute top-4 right-4 w-8 h-8"
                >
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${feature.color} opacity-20`} />
                </motion.div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 lg:mt-28 grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="text-center p-8 rounded-2xl bg-card/70 backdrop-blur-sm border border-border/40 shadow-lg hover:shadow-xl transition-all"
            >
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} mx-auto mb-4 shadow-lg`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </motion.div>
              <div className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
