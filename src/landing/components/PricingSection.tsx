import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { getAuthUrl } from "@/hooks/useDomainRouting";

const plans = [
  {
    name: "Starter",
    price: "0đ",
    priceSub: "miễn phí mãi mãi",
    popular: false,
    features: [
      "30 bài / tháng",
      "3 kênh",
      "Brand Voice cơ bản",
      "Quality Scoring",
      "1 thương hiệu",
    ],
    cta: "Bắt đầu ngay",
    ctaLink: getAuthUrl("register"),
  },
  {
    name: "Pro",
    price: "Liên hệ",
    priceSub: "dùng thử 14 ngày",
    popular: true,
    features: [
      "Không giới hạn bài",
      "12 kênh",
      "Campaign Autopilot",
      "Industry Memory + Compliance",
      "Auto-publish lên social media",
      "Smart Auto-Approve",
      "Cross-session Learning",
      "5 thương hiệu",
    ],
    cta: "Dùng thử 14 ngày →",
    ctaLink: getAuthUrl("register"),
  },
  {
    name: "Enterprise",
    price: "Tuỳ chỉnh",
    priceSub: "cho team lớn & agency",
    popular: false,
    features: [
      "Mọi thứ trong Pro",
      "Không giới hạn thương hiệu",
      "Team governance & phân quyền",
      "Custom compliance rules",
      "API access",
      "Dedicated support & onboarding",
      "SLA cam kết",
    ],
    cta: "Liên hệ tư vấn →",
    ctaLink: "mailto:info@flowa.one",
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Đơn giản,{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">không ẩn phí</span>
          </h2>
          <p className="text-muted-foreground">Bắt đầu miễn phí. Upgrade khi bạn sẵn sàng scale.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className={`relative rounded-xl p-6 ${
                plan.popular
                  ? "border-2 border-indigo-500/60 bg-indigo-500/[0.05] scale-[1.02] shadow-lg shadow-indigo-500/10"
                  : "border border-border bg-muted/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white">
                    Phổ biến nhất
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.priceSub}</p>
              </div>

              <div className="text-3xl font-extrabold text-foreground mb-5">{plan.price}</div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.ctaLink}
                className={`block w-full text-center py-2.5 rounded-full text-sm font-semibold transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:shadow-lg hover:shadow-indigo-500/25"
                    : "border border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
