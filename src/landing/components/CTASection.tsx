import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthUrl } from "@/hooks/useDomainRouting";

export function CTASection() {
  const { t } = useTranslation();

  const guarantees = [
    t("cta.benefits.freeTrial"),
    t("cta.benefits.noCard"),
    t("cta.benefits.cancelAnytime"),
  ];

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("cta.title")}{" "}
            <span className="text-primary">{t("cta.titleHighlight")}</span>
          </h2>
          
          {/* Subheadline */}
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            {t("cta.subtitle")}
          </p>

          {/* Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            {guarantees.map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            className="px-8 h-12"
            asChild
          >
            <a href={getAuthUrl('register')}>
              {t("cta.startFree")}
              <ArrowRight className="ml-2 w-4 h-4" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
