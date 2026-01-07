import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
};

export function HowItWorksSection() {
  const { t } = useTranslation();

  const steps = [
    { number: 1, key: "step1" },
    { number: 2, key: "step2" },
    { number: 3, key: "step3" },
    { number: 4, key: "step4" },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-background">
      <div className="container max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-medium text-muted-foreground border border-border rounded-full px-4 py-1.5 mb-6">
            {t("howItWorks.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("howItWorks.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-0"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.key}
              variants={itemVariants}
              className={`flex gap-6 md:gap-8 items-start py-8 ${
                index !== steps.length - 1 ? "border-b border-border/40" : ""
              }`}
            >
              <span className="text-4xl md:text-5xl font-light text-primary shrink-0 w-12">
                {step.number}
              </span>
              <div className="pt-1">
                <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
                  {t(`howItWorks.steps.${step.key}.title`)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(`howItWorks.steps.${step.key}.description`)}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-16"
        >
          <Button size="lg" className="group" asChild>
            <Link to="/auth?tab=register">
              {t("howItWorks.cta")}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("hero.benefits.noCard")} • {t("hero.benefits.freeTrial")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
