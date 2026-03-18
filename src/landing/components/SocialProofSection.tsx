import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Star, TrendingUp, Users, Award, Shield } from "lucide-react";

export function SocialProofSection() {
  const { t } = useTranslation();

  const metrics = [
    {
      icon: Users,
      value: "500+",
      label: t("socialProof.metrics.users"),
      description: t("socialProof.metrics.usersDesc"),
    },
    {
      icon: TrendingUp,
      value: "50K+",
      label: t("socialProof.metrics.content"),
      description: t("socialProof.metrics.contentDesc"),
    },
    {
      icon: Award,
      value: "4.9/5",
      label: t("socialProof.stats.rating"),
      description: t("socialProof.metrics.reviewsDesc"),
    },
    {
      icon: Shield,
      value: "99.9%",
      label: t("socialProof.metrics.uptime"),
      description: t("socialProof.metrics.uptimeDesc"),
    },
  ];

  const featuredReviews = t("testimonials.items", { returnObjects: true }) as Array<{
    quote: string;
    name: string;
    role: string;
    company: string;
  }>;

  const displayReviews = Array.isArray(featuredReviews) ? featuredReviews.slice(0, 3) : [];

  return (
    <section id="social-proof" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="text-center p-6 rounded-xl bg-card border border-border/40"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-muted mb-3">
                <metric.icon className="w-5 h-5 text-foreground/70" />
              </div>
              <div className="text-3xl lg:text-4xl font-extrabold text-foreground">
                {metric.value}
              </div>
              <div className="text-sm font-semibold text-foreground mt-1">{metric.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{metric.description}</div>
            </motion.div>
          ))}
        </div>

        {/* Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {displayReviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="p-6 rounded-xl bg-card border border-border/40"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-foreground text-base font-medium leading-relaxed mb-4">
                "{review.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-xs font-medium text-white">
                  {review.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{review.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {review.role} @ {review.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
