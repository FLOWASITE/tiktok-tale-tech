import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Zap, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getAuthUrl } from "@/hooks/useDomainRouting";

// Animated number component
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
      const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress);
      setDisplayValue(currentValue);
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <>{new Intl.NumberFormat("vi-VN").format(displayValue)}</>;
}

export function PricingSection() {
  const { t, i18n } = useTranslation();
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
    <section id="pricing" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-muted/30" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t("pricing.badge")}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            {t("pricing.title")}
            <br />
            <span className="text-gradient">{t("pricing.titleHighlight")}</span>
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
              <motion.span 
                className="ml-2 text-xs text-primary font-semibold"
                animate={{ scale: isYearly ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                {t("pricing.discount")}
              </motion.span>
            </span>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto perspective-1000">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={plan.popular ? { 
                z: 30,
                scale: 1.02,
                transition: { duration: 0.3 }
              } : {
                y: -8,
                transition: { duration: 0.3 }
              }}
              className={`relative rounded-2xl p-6 lg:p-8 ${
                plan.popular
                  ? "bg-card border-2 border-primary shadow-2xl lg:scale-105 z-10"
                  : "bg-card border border-border/50 hover:border-primary/30"
              }`}
              style={plan.popular ? {
                transform: "perspective(1000px)",
                transformStyle: "preserve-3d"
              } : undefined}
            >
              {/* Spotlight Glow for Popular */}
              {plan.popular && (
                <>
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-secondary/20 blur-xl -z-10" />
                  <motion.div 
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent opacity-0"
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </>
              )}
              
              {/* Popular Badge */}
              <AnimatePresence>
                {plan.popular && (
                  <motion.div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg">
                      {t("pricing.popularBadge")}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <div className="text-center mb-6">
                <motion.div 
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                    plan.popular ? "bg-primary/10" : "bg-muted"
                  }`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <plan.icon className={`w-6 h-6 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                </motion.div>
                <h3 className="text-xl font-bold mb-2">{t(`pricing.plans.${plan.key}.name`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`pricing.plans.${plan.key}.description`)}</p>
              </div>

              {/* Price with Animation */}
              <div className="text-center mb-6 h-20 flex flex-col justify-center">
                {plan.monthlyPrice !== null ? (
                  <>
                    <div className="text-4xl font-bold">
                      <AnimatedPrice 
                        value={isYearly ? Math.round(plan.yearlyPrice! / 12) : plan.monthlyPrice} 
                      />
                      <span className="text-lg font-normal text-muted-foreground">₫</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("pricing.perMonth")} {isYearly && t("pricing.yearlyBilling")}
                    </div>
                  </>
                ) : (
                  <div className="text-4xl font-bold">{t("pricing.contact")}</div>
                )}
              </div>

              {/* Features with Stagger */}
              <ul className="space-y-3 mb-8">
                {(t(`pricing.plans.${plan.key}.features`, { returnObjects: true }) as string[]).map((feature, featureIndex) => (
                  <motion.li 
                    key={feature} 
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 + featureIndex * 0.05 }}
                  >
                    <div className={`rounded-full p-0.5 ${plan.popular ? "bg-primary/20" : "bg-muted"}`}>
                      <Check className={`w-4 h-4 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              {/* CTA */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl hover:opacity-90"
                      : "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  asChild
                >
                  <a href={plan.monthlyPrice !== null ? getAuthUrl('register') : "#"}>
                    {t(`pricing.plans.${plan.key}.cta`)}
                  </a>
                </Button>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
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
