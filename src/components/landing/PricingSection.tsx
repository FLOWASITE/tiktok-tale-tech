import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Building2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const plans = [
  {
    name: "Starter",
    icon: Zap,
    description: "Dành cho cá nhân và freelancer",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "100 nội dung AI/tháng",
      "3 brand templates",
      "5 kênh social",
      "Xuất PDF/Image",
      "Email support",
    ],
    cta: "Bắt đầu miễn phí",
    popular: false,
  },
  {
    name: "Professional",
    icon: Sparkles,
    description: "Dành cho team marketing nhỏ",
    monthlyPrice: 990000,
    yearlyPrice: 9900000,
    features: [
      "Unlimited nội dung AI",
      "10 brand templates",
      "Tất cả kênh social",
      "Campaign management",
      "Ad copy creation",
      "Content calendar",
      "Priority support",
      "API access",
    ],
    cta: "Dùng thử 14 ngày",
    popular: true,
  },
  {
    name: "Enterprise",
    icon: Building2,
    description: "Dành cho doanh nghiệp lớn",
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      "Mọi tính năng Professional",
      "Unlimited brand templates",
      "Custom AI training",
      "Dedicated account manager",
      "SSO & Advanced security",
      "Custom integrations",
      "SLA guarantee",
      "On-premise option",
    ],
    cta: "Liên hệ tư vấn",
    popular: false,
  },
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("vi-VN").format(price);
};

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

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
            <span className="text-sm font-medium text-primary">Bảng giá</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Chọn gói phù hợp với
            <br />
            <span className="text-gradient">nhu cầu của bạn</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Bắt đầu miễn phí, nâng cấp khi cần. Không cần thẻ tín dụng.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium transition-colors ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>
              Hàng tháng
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={`text-sm font-medium transition-colors ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
              Hàng năm
              <span className="ml-2 text-xs text-primary font-semibold">-17%</span>
            </span>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-2xl p-6 lg:p-8 ${
                plan.popular
                  ? "bg-card border-2 border-primary shadow-xl"
                  : "bg-card border border-border/50"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                    Phổ biến nhất
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                  plan.popular ? "bg-primary/10" : "bg-muted"
                }`}>
                  <plan.icon className={`w-6 h-6 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                {plan.monthlyPrice !== null ? (
                  <>
                    <div className="text-4xl font-bold">
                      {formatPrice(isYearly ? Math.round(plan.yearlyPrice! / 12) : plan.monthlyPrice)}
                      <span className="text-lg font-normal text-muted-foreground">₫</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      /tháng {isYearly && "(thanh toán năm)"}
                    </div>
                  </>
                ) : (
                  <div className="text-4xl font-bold">Liên hệ</div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className={`w-full ${
                  plan.popular
                    ? "gradient-primary text-white shadow-lg hover:shadow-xl"
                    : ""
                }`}
                variant={plan.popular ? "default" : "outline"}
                size="lg"
                asChild
              >
                <Link to={plan.monthlyPrice !== null ? "/auth?tab=register" : "#"}>
                  {plan.cta}
                </Link>
              </Button>
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
            Có câu hỏi?{" "}
            <a href="#" className="text-primary hover:underline font-medium">
              Xem FAQ
            </a>{" "}
            hoặc{" "}
            <a href="#" className="text-primary hover:underline font-medium">
              liên hệ hỗ trợ
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
