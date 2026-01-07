import { motion } from "framer-motion";
import { Check, Zap, Sparkles, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getAuthUrl } from "@/hooks/useDomainRouting";

function AnimatedPrice({ value, duration = 0.5 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;
    
    const animate = () => {
      const now = Date.now();
      if (now >= endTime) {
        setDisplayValue(endValue);
        return;
      }
      
      const progress = (now - startTime) / (duration * 1000);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress);
      setDisplayValue(currentValue);
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <>{new Intl.NumberFormat("vi-VN").format(displayValue)}</>;
}

export function PricingSection() {
  const { t } = useTranslation();
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      key: "starter",
      icon: Zap,
      monthlyPrice: 0,
      yearlyPrice: 0,
      popular: false,
    },
    {
      key: "professional",
      icon: Sparkles,
      monthlyPrice: 990000,
      yearlyPrice: 9900000,
      popular: true,
    },
    {
      key: "enterprise",
      icon: Building2,
      monthlyPrice: null,
      yearlyPrice: null,
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary mb-4">
            {t("pricing.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            {t("pricing.title")}
            <br />
            <span className="text-primary">{t("pricing.titleHighlight")}</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t("pricing.subtitle")}
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium transition-colors ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>
              {t("pricing.monthly")}
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={`text-sm font-medium transition-colors ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
              {t("pricing.yearly")}
              <span className="ml-2 text-xs text-primary font-semibold">
                {t("pricing.discount")}
              </span>
            </span>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-xl p-6 ${
                plan.popular
                  ? "bg-card border-2 border-primary shadow-lg"
                  : "bg-card border border-border hover:border-primary/50"
              } transition-all duration-300`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                    {t("pricing.popularBadge")}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${
                  plan.popular ? "bg-primary/10" : "bg-muted"
                }`}>
                  <plan.icon className={`w-6 h-6 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{t(`pricing.plans.${plan.key}.name`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`pricing.plans.${plan.key}.description`)}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-6 h-16 flex flex-col justify-center">
                {plan.monthlyPrice !== null ? (
                  <>
                    <div className="text-3xl font-bold text-foreground">
                      <AnimatedPrice 
                        value={isYearly ? Math.round(plan.yearlyPrice! / 12) : plan.monthlyPrice} 
                      />
                      <span className="text-base font-normal text-muted-foreground">₫</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("pricing.perMonth")} {isYearly && t("pricing.yearlyBilling")}
                    </div>
                  </>
                ) : (
                  <div className="text-3xl font-bold text-foreground">{t("pricing.contact")}</div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {(t(`pricing.plans.${plan.key}.features`, { returnObjects: true }) as string[]).map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className={`rounded-full p-0.5 mt-0.5 ${plan.popular ? "bg-primary/20" : "bg-muted"}`}>
                      <Check className={`w-4 h-4 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className={`w-full ${
                  plan.popular
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "hover:bg-primary/10 hover:text-primary"
                }`}
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <a href={plan.monthlyPrice !== null ? getAuthUrl('register') : "#"}>
                  {t(`pricing.plans.${plan.key}.cta`)}
                </a>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* FAQ Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            {t("pricing.faqLink")}{" "}
            <a href="#faq" className="text-primary hover:underline font-medium">
              {t("pricing.seeFaq")}
            </a>{" "}
            {t("pricing.or")}{" "}
            <a href="mailto:support@flowa.vn" className="text-primary hover:underline font-medium">
              {t("pricing.contactSupport")}
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
