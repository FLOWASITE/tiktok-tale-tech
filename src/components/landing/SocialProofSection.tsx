import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Star, Quote, TrendingUp, Users, Award, Shield } from "lucide-react";

export function SocialProofSection() {
  const { t } = useTranslation();

  const metrics = [
    {
      icon: Users,
      value: "10,000+",
      label: t("socialProof.title"),
      description: t("socialProof.subtitle"),
      color: "bg-gradient-to-br from-pink-500 to-rose-500",
    },
    {
      icon: TrendingUp,
      value: "500K+",
      label: t("features.stats.contentTypes"),
      description: t("socialProof.stats.contentIncrease"),
      color: "bg-gradient-to-br from-blue-500 to-cyan-500",
    },
    {
      icon: Award,
      value: "4.9/5",
      label: t("socialProof.stats.rating"),
      description: "2,000+ reviews",
      color: "bg-gradient-to-br from-yellow-500 to-orange-500",
    },
    {
      icon: Shield,
      value: "99.9%",
      label: "Uptime",
      description: "Enterprise-grade reliability",
      color: "bg-gradient-to-br from-green-500 to-emerald-500",
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
    <section id="testimonials" className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Metrics Row - Clean Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-16"
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="text-center p-6 lg:p-8 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-shadow duration-300"
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${metric.color} mb-4`}
              >
                <metric.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-foreground mb-1">
                {metric.value}
              </div>
              <div className="text-sm font-medium text-foreground mb-1">
                {metric.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {metric.description}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Featured Reviews - Clean Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6"
        >
          {displayReviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              className="p-6 lg:p-8 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-shadow duration-300"
            >
              {/* Stars & Quote Icon Row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-primary/20" />
              </div>

              {/* Quote */}
              <p className="text-foreground leading-relaxed mb-6">
                "{review.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center text-sm font-semibold text-white">
                  {review.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">
                    {review.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {review.role} @ {review.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
