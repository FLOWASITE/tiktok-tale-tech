import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useState } from "react";
import { Shield, Scale, Zap, Building2, Heart, Leaf, Home, Utensils, Sparkles, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

// Static showcase data for landing page
const industryShowcase = [
  {
    key: "healthcare",
    icon: Heart,
    forbiddenCount: 25,
    complianceCount: 18,
    claimCount: 12,
    examples: ["Cam kết chữa khỏi 100%", "Không tác dụng phụ", "Thay thế thuốc Tây"]
  },
  {
    key: "finance",
    icon: Building2,
    forbiddenCount: 32,
    complianceCount: 24,
    claimCount: 15,
    examples: ["Lãi suất thấp nhất", "Đảm bảo lợi nhuận", "Không rủi ro"]
  },
  {
    key: "realestate",
    icon: Home,
    forbiddenCount: 18,
    complianceCount: 14,
    claimCount: 10,
    examples: ["Sinh lời chắc chắn", "Pháp lý hoàn chỉnh", "Giá rẻ nhất khu vực"]
  },
  {
    key: "beauty",
    icon: Sparkles,
    forbiddenCount: 28,
    complianceCount: 16,
    claimCount: 14,
    examples: ["Trắng da vĩnh viễn", "Giảm cân không cần tập", "Trẻ hóa 10 tuổi"]
  },
  {
    key: "food",
    icon: Utensils,
    forbiddenCount: 20,
    complianceCount: 12,
    claimCount: 8,
    examples: ["Chữa bệnh", "Thay thế thuốc", "Organic 100%"]
  },
  {
    key: "education",
    icon: GraduationCap,
    forbiddenCount: 15,
    complianceCount: 10,
    claimCount: 6,
    examples: ["Đỗ 100%", "Việc làm đảm bảo", "Top 1 Việt Nam"]
  }
];

const valueProps = [
  {
    icon: Shield,
    key: "noViolation"
  },
  {
    icon: Scale,
    key: "compliance"
  },
  {
    icon: Zap,
    key: "autoUpdate"
  }
];

export function IndustryMemorySection() {
  const { t } = useTranslation();
  const [activeIndustry, setActiveIndustry] = useState(0);

  const currentIndustry = industryShowcase[activeIndustry];

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      <div className="container mx-auto px-4 md:px-6 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          {/* Exclusive badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t("industryMemory.badge")}
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {t("industryMemory.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("industryMemory.subtitle")}
          </p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-6 md:gap-12 mb-12 md:mb-16"
        >
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary">42+</div>
            <div className="text-sm text-muted-foreground">{t("industryMemory.stats.packs")}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary">8</div>
            <div className="text-sm text-muted-foreground">{t("industryMemory.stats.categories")}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary">3</div>
            <div className="text-sm text-muted-foreground">{t("industryMemory.stats.countries")}</div>
          </div>
        </motion.div>

        {/* Interactive demo area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 mb-12 md:mb-16"
        >
          <div className="grid md:grid-cols-[240px_1fr] gap-6 md:gap-8">
            {/* Industry tabs */}
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {industryShowcase.map((industry, index) => {
                const Icon = industry.icon;
                return (
                  <button
                    key={industry.key}
                    onClick={() => setActiveIndustry(index)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all shrink-0",
                      activeIndustry === index
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted/50 hover:bg-muted text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium whitespace-nowrap">
                      {t(`industryMemory.industries.${industry.key}`)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Preview card */}
            <div className="bg-muted/30 rounded-xl p-6 md:p-8">
              <div className="grid sm:grid-cols-3 gap-6 mb-8">
                {/* Forbidden terms */}
                <div className="text-center p-4 bg-destructive/10 rounded-xl">
                  <div className="text-3xl font-bold text-destructive mb-1">
                    {currentIndustry.forbiddenCount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("industryMemory.preview.forbiddenTerms")}
                  </div>
                </div>

                {/* Compliance rules */}
                <div className="text-center p-4 bg-primary/10 rounded-xl">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {currentIndustry.complianceCount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("industryMemory.preview.complianceRules")}
                  </div>
                </div>

                {/* Claim restrictions */}
                <div className="text-center p-4 bg-amber-500/10 rounded-xl">
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                    {currentIndustry.claimCount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("industryMemory.preview.claimRestrictions")}
                  </div>
                </div>
              </div>

              {/* Example forbidden terms */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  {t("industryMemory.preview.exampleForbidden")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentIndustry.examples.map((example, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-sm"
                    >
                      <span className="text-xs">⛔</span>
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Value proposition grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid md:grid-cols-3 gap-6 md:gap-8"
        >
          {valueProps.map((prop, index) => {
            const Icon = prop.icon;
            return (
              <div
                key={prop.key}
                className="text-center p-6 rounded-xl border border-border/50 bg-card hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t(`industryMemory.features.${prop.key}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`industryMemory.features.${prop.key}.description`)}
                </p>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
