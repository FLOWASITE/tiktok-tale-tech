import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Target, Users, Zap, Heart } from "lucide-react";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";

const values = [
  {
    icon: Target,
    titleKey: "about.values.mission.title",
    descKey: "about.values.mission.desc",
  },
  {
    icon: Users,
    titleKey: "about.values.team.title",
    descKey: "about.values.team.desc",
  },
  {
    icon: Zap,
    titleKey: "about.values.innovation.title",
    descKey: "about.values.innovation.desc",
  },
  {
    icon: Heart,
    titleKey: "about.values.customer.title",
    descKey: "about.values.customer.desc",
  },
];

const stats = [
  { value: "10,000+", labelKey: "about.stats.users" },
  { value: "50+", labelKey: "about.stats.industries" },
  { value: "1M+", labelKey: "about.stats.content" },
  { value: "99%", labelKey: "about.stats.satisfaction" },
];

export default function About() {
  const { t } = useTranslation();

  return (
    <PublicPageLayout>
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {t("about.title")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("about.subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.labelKey}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm text-center"
              >
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t(stat.labelKey)}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="pb-16 lg:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                {t("about.story.title")}
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{t("about.story.p1")}</p>
                <p>{t("about.story.p2")}</p>
                <p>{t("about.story.p3")}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-8 md:p-12"
            >
              <blockquote className="text-lg md:text-xl font-medium italic">
                "{t("about.quote.text")}"
              </blockquote>
              <div className="mt-4">
                <p className="font-semibold">{t("about.quote.author")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("about.quote.role")}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="pb-16 lg:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              {t("about.values.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("about.values.subtitle")}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={value.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{t(value.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">
                  {t(value.descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
