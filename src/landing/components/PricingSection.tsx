import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getAuthUrl } from "@/hooks/useDomainRouting";

export function PricingSection() {
  const { t } = useTranslation();
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      key: "free",
      monthlyPrice: 0,
      yearlyPrice: 0,
      popular: false,
    },
    {
      key: "starter",
      monthlyPrice: 299000,
      yearlyPrice: 2990000,
      popular: false,
    },
    {
      key: "professional",
      monthlyPrice: 549000,
      yearlyPrice: 5490000,
      popular: true,
    },
    {
      key: "enterprise",
      monthlyPrice: 1499000,
      yearlyPrice: 14990000,
      popular: false,
    },
  ];

  const formatPrice = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

  return (
    <section id="pricing" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {t("pricing.title")}{" "}
            <span className="text-primary">{t("pricing.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground mb-6">{t("pricing.subtitle")}</p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {t("pricing.monthly")}
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm ${isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {t("pricing.yearly")}
              <span className="ml-1.5 text-xs text-primary font-semibold">{t("pricing.discount")}</span>
            </span>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`relative rounded-xl p-6 ${
                plan.popular
                  ? "bg-card border-2 border-primary"
                  : "bg-card border border-border/50"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                    {t("pricing.popularBadge")}
                  </span>
                </div>
              )}

              {/* Plan Name */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-foreground">{t(`pricing.plans.${plan.key}.name`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`pricing.plans.${plan.key}.description`)}</p>
              </div>

              {/* Price */}
              <div className="mb-5">
                {plan.monthlyPrice > 0 ? (
                  <>
                    <span className="text-3xl font-extrabold text-foreground">
                      {formatPrice(isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">₫/{t("pricing.perMonth")}</span>
                  </>
                ) : (
                  <span className="text-3xl font-extrabold text-foreground">0₫</span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {(t(`pricing.plans.${plan.key}.features`, { returnObjects: true }) as string[]).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <a href={getAuthUrl('register')}>
                  {t(`pricing.plans.${plan.key}.cta`)}
                </a>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* FAQ Link */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          {t("pricing.faqLink")}{" "}
          <a href="#faq" className="text-primary hover:underline">{t("pricing.seeFaq")}</a>
        </motion.p>
      </div>
    </section>
  );
}
