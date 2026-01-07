import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { X, Check, ArrowDown, Clock, Brain, Repeat, TrendingDown, Sparkles, Zap } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
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

export function PainPointsSection() {
  const { t } = useTranslation();

  const painPoints = [
    {
      icon: Clock,
      pain: t("painPoints.problems.time.title"),
      painDesc: t("painPoints.problems.time.description"),
      solution: t("painPoints.solution.title"),
      improvement: "80%",
    },
    {
      icon: Brain,
      pain: t("painPoints.problems.ideas.title"),
      painDesc: t("painPoints.problems.ideas.description"),
      solution: t("painPoints.solution.title"),
      improvement: "∞",
    },
    {
      icon: Repeat,
      pain: t("painPoints.problems.management.title"),
      painDesc: t("painPoints.problems.management.description"),
      solution: t("painPoints.solution.description"),
      improvement: "1-click",
    },
    {
      icon: TrendingDown,
      pain: t("painPoints.problems.consistency.title"),
      painDesc: t("painPoints.problems.consistency.description"),
      solution: t("painPoints.solution.title"),
      improvement: "100%",
    },
  ];

  return (
    <section className="py-28 lg:py-36 relative overflow-hidden">
      {/* Background - Simplified */}
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
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Zap className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-semibold text-primary">{t("painPoints.badge")}</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6">
            {t("painPoints.title")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("painPoints.subtitle")}
          </p>
        </motion.div>

        {/* Pain Points Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {painPoints.map((item, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group"
            >
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.3 }}
                className="relative h-full rounded-3xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden"
              >
                <div className="relative p-8 lg:p-10">
                  {/* Pain Point */}
                  <div className="flex items-start gap-5 mb-6">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: -10 }}
                      className="shrink-0 w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center"
                    >
                      <item.icon className="w-7 h-7 text-muted-foreground" />
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <X className="w-5 h-5 text-muted-foreground" />
                        </motion.div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {t("painPoints.badge")}
                        </span>
                      </div>
                      <p className="text-foreground font-semibold text-lg">{item.painDesc}</p>
                    </div>
                  </div>

                  {/* Arrow with animation */}
                  <div className="flex justify-center my-5">
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowDown className="w-6 h-6 text-muted-foreground/40" />
                    </motion.div>
                  </div>

                  {/* Solution */}
                  <div className="flex items-start gap-5">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      className="shrink-0 w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"
                    >
                      <Sparkles className="w-7 h-7 text-primary" />
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Check className="w-5 h-5 text-primary" />
                        </motion.div>
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">
                          {t("painPoints.solution.badge")}
                        </span>
                      </div>
                      <p className="text-foreground font-semibold text-lg">{item.solution}</p>
                    </div>
                  </div>

                  {/* Improvement Badge */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.05 }}
                    className="absolute top-6 right-6"
                  >
                    <span className="px-4 py-2 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                      {item.improvement}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
