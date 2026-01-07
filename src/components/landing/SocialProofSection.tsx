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
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: TrendingUp,
      value: "500K+",
      label: t("features.stats.contentTypes"),
      description: t("socialProof.stats.contentIncrease"),
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Award,
      value: "4.9/5",
      label: t("socialProof.stats.rating"),
      description: "2,000+ reviews",
      color: "from-yellow-500 to-orange-500",
    },
    {
      icon: Shield,
      value: "99.9%",
      label: "Uptime",
      description: "Enterprise-grade reliability",
      color: "from-green-500 to-emerald-500",
    },
  ];

  const featuredReviews = t("testimonials.items", { returnObjects: true }) as Array<{
    quote: string;
    name: string;
    role: string;
    company: string;
  }>;

  const displayReviews = Array.isArray(featuredReviews) ? featuredReviews.slice(0, 3) : [];

  const awards = [
    "Top 10 MarTech Startups 2024",
    "Best AI Content Tool - Vietnam",
    "Product Hunt #1",
    "G2 High Performer",
  ];

  return (
    <section id="testimonials" className="py-28 lg:py-36 relative overflow-hidden bg-muted/20">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-primary/10 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-1/4 right-0 w-[600px] h-[600px] rounded-full bg-secondary/10 blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Metrics Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8 mb-20"
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="text-center p-8 rounded-3xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-2xl transition-all"
            >
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${metric.color} mb-5 shadow-lg`}
              >
                <metric.icon className="w-7 h-7 text-white" />
              </motion.div>
              <motion.div
                initial={{ scale: 0.5 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 300 }}
                className="text-4xl lg:text-5xl font-extrabold text-foreground mb-2"
              >
                {metric.value}
              </motion.div>
              <div className="text-sm font-semibold text-foreground mb-1">
                {metric.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {metric.description}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Featured Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20"
        >
          {displayReviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="relative group"
            >
              <div className="relative h-full p-8 lg:p-10 rounded-3xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all shadow-lg hover:shadow-2xl">
                {/* Quote icon */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="absolute top-6 right-6"
                >
                  <Quote className="w-10 h-10 text-primary/10" />
                </motion.div>
                
                {/* Stars */}
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0, rotate: -180 }}
                      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + index * 0.1 + i * 0.05, type: "spring", stiffness: 500 }}
                    >
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </motion.div>
                  ))}
                </div>

                {/* Content */}
                <p className="text-foreground text-lg leading-relaxed mb-8">
                  "{review.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-base font-bold text-white shadow-lg ring-4 ring-primary/20"
                  >
                    {review.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </motion.div>
                  <div>
                    <div className="font-bold text-foreground">
                      {review.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {review.role} @ {review.company}
                    </div>
                  </div>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Awards & Recognition */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6 font-medium">
            Awards & Recognition
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6">
            {awards.map((award, i) => (
              <motion.div
                key={award}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.1 }}
                whileHover={{ scale: 1.05, y: -3 }}
                className="px-5 py-3 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all shadow-md hover:shadow-lg"
              >
                <Award className="w-4 h-4 inline-block mr-2 text-primary" />
                {award}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
