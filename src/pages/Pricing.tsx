import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, CreditCard, ArrowRight, Zap, HelpCircle, ArrowLeft, Sparkles, ChevronDown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { UpgradePlanDialog } from "@/components/UpgradePlanDialog";
import { PaymentConfirmDialog } from "@/components/PaymentConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const PLANS = [
  {
    key: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    popular: false,
    description: "Dùng thử các tính năng cơ bản",
    limits: {
      brands: "1",
      multichannel: "2",
      images: "2",
      scripts: "2",
      carousels: "0",
      aiChat: "Không giới hạn",
      support: "Cộng đồng",
      publishing: false,
      analytics: false,
      teamMembers: "1",
    },
  },
  {
    key: "starter",
    monthlyPrice: 299000,
    yearlyPrice: 2990000,
    popular: false,
    description: "Cho cá nhân & freelancer",
    limits: {
      brands: "3",
      multichannel: "20",
      images: "20",
      scripts: "10",
      carousels: "3",
      aiChat: "Không giới hạn",
      support: "Email",
      publishing: true,
      analytics: false,
      teamMembers: "3",
    },
  },
  {
    key: "professional",
    monthlyPrice: 549000,
    yearlyPrice: 5490000,
    popular: true,
    planType: "pro",
    description: "Cho team marketing chuyên nghiệp",
    limits: {
      brands: "10",
      multichannel: "60",
      images: "60",
      scripts: "30",
      carousels: "10",
      aiChat: "Không giới hạn",
      support: "Priority",
      publishing: true,
      analytics: true,
      teamMembers: "10",
    },
  },
  {
    key: "enterprise",
    monthlyPrice: 1499000,
    yearlyPrice: 14990000,
    popular: false,
    description: "Cho doanh nghiệp & agency",
    limits: {
      brands: "30",
      multichannel: "200",
      images: "200",
      scripts: "100",
      carousels: "35",
      aiChat: "Không giới hạn",
      support: "Dedicated",
      publishing: true,
      analytics: true,
      teamMembers: "Không giới hạn",
    },
  },
];

const COMPARISON_ROWS = [
  { label: "Thương hiệu", key: "brands", tooltip: "Số brand template tối đa" },
  { label: "Bài đa kênh / tháng", key: "multichannel", tooltip: "Số bài social đa kênh có thể tạo mỗi tháng" },
  { label: "Ảnh AI / tháng", key: "images", tooltip: "Số ảnh AI có thể generate mỗi tháng" },
  { label: "Kịch bản video / tháng", key: "scripts", tooltip: "Số kịch bản video AI có thể tạo" },
  { label: "Carousel / tháng", key: "carousels", tooltip: "Số carousel có thể tạo" },
  { label: "AI Chat", key: "aiChat", tooltip: "Chatbot AI hỗ trợ content" },
  { label: "Thành viên team", key: "teamMembers", tooltip: "Số người dùng trong workspace" },
  { label: "Đăng bài tự động", key: "publishing", tooltip: "Xuất bản trực tiếp lên social media" },
  { label: "Analytics & Insights", key: "analytics", tooltip: "Phân tích hiệu suất content" },
  { label: "Hỗ trợ", key: "support", tooltip: "Mức độ hỗ trợ kỹ thuật" },
];

const PLAN_NAMES: Record<string, string> = {
  free: "Miễn phí",
  starter: "Starter",
  professional: "Pro",
  enterprise: "Enterprise",
};

const FAQ_ITEMS = [
  {
    q: "Tôi có thể nâng cấp hoặc hạ cấp gói bất kỳ lúc nào không?",
    a: "Có, bạn có thể nâng cấp ngay lập tức. Khi nâng cấp, gói mới sẽ có hiệu lực ngay và bạn được tính phí theo tỷ lệ thời gian còn lại.",
  },
  {
    q: "Hết quota trong tháng thì sao?",
    a: "Bạn sẽ không thể tạo thêm content loại đó cho đến chu kỳ mới. Bạn có thể nâng cấp gói bất cứ lúc nào để có thêm quota.",
  },
  {
    q: "Thanh toán bằng phương thức nào?",
    a: "Chúng tôi hỗ trợ thanh toán qua VNPay (ATM nội địa, QR code, ví điện tử). Thanh toán quốc tế sẽ sớm được hỗ trợ.",
  },
  {
    q: "Có chính sách hoàn tiền không?",
    a: "Chúng tôi cung cấp hoàn tiền trong 7 ngày đầu nếu bạn chưa sử dụng quá 20% quota của gói.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const { currentOrganization } = useOrganizationContext();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<{ planType: string; price: number; appliedVoucher: import("@/components/PaymentConfirmDialog").VoucherInfo | null } | null>(null);

  const currentPlan = subscription?.plan_type || "free";
  const isLoggedIn = !!user;
  const formatPrice = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

  const handleSelectPlan = (plan: typeof PLANS[0]) => {
    if (!isLoggedIn) {
      window.location.href = "/auth?mode=register";
      return;
    }

    const planType = plan.planType || plan.key;
    if (planType === "free" || planType === currentPlan) return;

    if (!currentOrganization?.id) {
      toast.error("Vui lòng chọn workspace trước");
      return;
    }

    const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    setConfirmPlan({ planType, price, appliedVoucher: null });
  };

  const handleConfirmPayment = async (bankCode?: string) => {
    if (!confirmPlan || !currentOrganization?.id) return;

    setLoadingPlan(confirmPlan.planType);
    try {
      const { data, error } = await supabase.functions.invoke("create-vnpay-payment", {
        body: {
          organization_id: currentOrganization.id,
          plan_type: confirmPlan.planType,
          billing_cycle: isYearly ? "yearly" : "monthly",
          return_url: `${window.location.origin}/payment/result`,
          voucher_code: confirmPlan.appliedVoucher?.code || undefined,
          bank_code: bankCode || undefined,
        },
      });
      if (error) throw error;
      if (data?.payment_url) {
        window.location.href = data.payment_url;
      }
    } catch (err: any) {
      toast.error("Không thể tạo thanh toán: " + (err.message || "Lỗi"));
    } finally {
      setLoadingPlan(null);
    }
  };

  const getCtaText = (plan: typeof PLANS[0]) => {
    const planType = plan.planType || plan.key;
    if (!isLoggedIn) return plan.key === "free" ? "Bắt đầu miễn phí" : "Đăng ký ngay";
    if (planType === currentPlan) return "Gói hiện tại";
    if (plan.key === "free") return "Gói miễn phí";
    return "Nâng cấp ngay";
  };

  const isCurrentPlan = (plan: typeof PLANS[0]) => {
    const planType = plan.planType || plan.key;
    return isLoggedIn && planType === currentPlan;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="pt-10 pb-6 sm:pt-12 sm:pb-8 lg:pt-20 lg:pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {isLoggedIn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2 text-muted-foreground hover:text-foreground -ml-2 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
          )}

          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Badge variant="outline" className="mb-4 px-3 py-1 text-sm gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Bảng giá minh bạch
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 leading-tight">
                Chọn gói phù hợp với{" "}
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  nhu cầu của bạn
                </span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
                Bắt đầu miễn phí, nâng cấp khi cần. Thanh toán qua VNPay, không cần thẻ tín dụng.
              </p>

              {/* Billing toggle */}
              <motion.div
                className="inline-flex items-center gap-3 rounded-full border border-border bg-card/80 backdrop-blur-sm px-5 py-2.5 shadow-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <span className={`text-sm font-medium transition-colors ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>
                  Hàng tháng
                </span>
                <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                <span className={`text-sm font-medium transition-colors ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
                  Hàng năm
                </span>
                <AnimatePresence>
                  {isYearly && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8, x: -8 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge variant="secondary" className="text-xs text-primary font-semibold">
                        -17%
                      </Badge>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-12 sm:pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {PLANS.map((plan, index) => {
              const price = isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
              const isCurrent = isCurrentPlan(plan);
              const isLoading = loadingPlan === plan.key;
              const yearlySavings = plan.monthlyPrice * 12 - plan.yearlyPrice;

              return (
                <motion.div
                  key={plan.key}
                  custom={index}
                  variants={cardVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={`relative rounded-2xl p-5 sm:p-6 flex flex-col transition-shadow duration-300 ${
                    plan.popular
                      ? "bg-card border-2 border-primary shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/15"
                      : "bg-card border border-border hover:shadow-md hover:border-border/80"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        Phổ biến nhất
                      </Badge>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                        Đang dùng
                      </Badge>
                    </div>
                  )}

                  <div className="mb-1">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">{PLAN_NAMES[plan.key]}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                  </div>

                  <div className="mb-5 mt-3">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={isYearly ? "yearly" : "monthly"}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {price > 0 ? (
                          <>
                            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
                              {formatPrice(price)}
                            </span>
                            <span className="text-sm text-muted-foreground ml-1">₫/tháng</span>
                            {isYearly && (
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {formatPrice(plan.yearlyPrice)}₫/năm
                                </p>
                                {yearlySavings > 0 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-primary">
                                    Tiết kiệm {formatPrice(yearlySavings)}₫
                                  </Badge>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-2xl sm:text-3xl font-extrabold text-foreground">0₫</span>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <Separator className="mb-4" />

                  {/* Key features */}
                  <ul className="space-y-2 sm:space-y-2.5 mb-6 flex-1 text-sm">
                    {[
                      { text: `${plan.limits.brands} thương hiệu`, always: true },
                      { text: `${plan.limits.multichannel} bài đa kênh/tháng`, always: true },
                      { text: `${plan.limits.images} ảnh AI/tháng`, always: true },
                      { text: `${plan.limits.scripts} kịch bản video`, always: true },
                      { text: `${plan.limits.carousels} carousel/tháng`, always: Number(plan.limits.carousels) > 0 },
                      { text: "Đăng bài tự động", always: plan.limits.publishing },
                      { text: "Analytics & Insights", always: plan.limits.analytics },
                      { text: `Hỗ trợ ${plan.limits.support}`, always: true },
                    ]
                      .filter((f) => f.always)
                      .map((f) => (
                        <li key={f.text} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-primary" />
                          </div>
                          <span className="text-muted-foreground">{f.text}</span>
                        </li>
                      ))}
                  </ul>

                  <Button
                    className={`w-full ${plan.popular ? "shadow-sm" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                    disabled={isCurrent || isLoading}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : plan.popular ? (
                      <CreditCard className="h-4 w-4 mr-2" />
                    ) : null}
                    {getCtaText(plan)}
                    {!isCurrent && !isLoading && price > 0 && (
                      <ArrowRight className="h-4 w-4 ml-2" />
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-12 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8 sm:mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 sm:mb-3">
              So sánh chi tiết <span className="text-primary">các gói</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Tìm gói phù hợp nhất với quy mô của bạn</p>
          </motion.div>

          {/* Mobile comparison cards */}
          <div className="block lg:hidden space-y-4">
            {PLANS.filter(p => p.key !== "free").map((plan) => (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`rounded-xl border p-4 bg-card ${plan.popular ? "border-primary" : "border-border"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-bold ${plan.popular ? "text-primary" : "text-foreground"}`}>
                    {PLAN_NAMES[plan.key]}
                  </h3>
                  {plan.popular && <Badge className="text-xs bg-primary text-primary-foreground">Phổ biến</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {COMPARISON_ROWS.map((row) => {
                    const value = plan.limits[row.key as keyof typeof plan.limits];
                    return (
                      <div key={row.key} className="flex items-center justify-between text-sm py-1.5">
                        <span className="text-muted-foreground text-xs">{row.label}</span>
                        <span className="font-medium text-foreground text-xs">
                          {typeof value === "boolean" ? (
                            value ? <Check className="w-4 h-4 text-primary" /> : <X className="w-4 h-4 text-muted-foreground/40" />
                          ) : (
                            value
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop comparison table */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden lg:block overflow-x-auto rounded-xl border border-border bg-card"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-4 px-5 text-sm font-medium text-muted-foreground w-[220px]">
                    Tính năng
                  </th>
                  {PLANS.map((plan) => (
                    <th key={plan.key} className="text-center py-4 px-4">
                      <span className={`text-sm font-bold ${plan.popular ? "text-primary" : "text-foreground"}`}>
                        {PLAN_NAMES[plan.key]}
                      </span>
                      {plan.popular && (
                        <div className="mt-1">
                          <Badge className="text-[10px] bg-primary/10 text-primary border-0 px-1.5 py-0">
                            Phổ biến
                          </Badge>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, rowIndex) => (
                  <motion.tr
                    key={row.key}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: rowIndex * 0.03 }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3.5 px-5 text-sm text-foreground">
                      <div className="flex items-center gap-1.5">
                        {row.label}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
                          </TooltipTrigger>
                          <TooltipContent side="right">{row.tooltip}</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                    {PLANS.map((plan) => {
                      const value = plan.limits[row.key as keyof typeof plan.limits];
                      return (
                        <td key={plan.key} className={`text-center py-3.5 px-4 ${plan.popular ? "bg-primary/[0.02]" : ""}`}>
                          {typeof value === "boolean" ? (
                            value ? (
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                <Check className="w-3 h-3 text-primary" />
                              </div>
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm font-medium text-foreground">{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8 sm:mb-10"
          >
            Câu hỏi <span className="text-primary">thường gặp</span>
          </motion.h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <button
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                >
                  <span className="font-medium text-foreground text-sm sm:text-base">{item.q}</span>
                  <motion.span
                    animate={{ rotate: expandedFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {expandedFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm text-muted-foreground">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
              Sẵn sàng tăng tốc content marketing?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              Bắt đầu miễn phí ngay hôm nay, nâng cấp bất cứ lúc nào.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="px-8 w-full sm:w-auto" asChild={!isLoggedIn} onClick={isLoggedIn ? () => window.scrollTo({ top: 0, behavior: "smooth" }) : undefined}>
                {isLoggedIn ? (
                  <>Xem bảng giá<ArrowRight className="ml-2 h-4 w-4" /></>
                ) : (
                  <a href="/auth?mode=register">
                    Bắt đầu miễn phí<ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                )}
              </Button>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>Thanh toán bảo mật qua VNPay</span>
            </div>
          </motion.div>
        </div>
      </section>

      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />

      {confirmPlan && (
        <PaymentConfirmDialog
          open={!!confirmPlan}
          onOpenChange={(open) => { if (!open) setConfirmPlan(null); }}
          workspaceName={currentOrganization?.name || "Workspace"}
          currentPlan={currentPlan}
          targetPlan={confirmPlan.planType}
          billingCycle={isYearly ? "yearly" : "monthly"}
          basePrice={confirmPlan.price}
          voucher={confirmPlan.appliedVoucher}
          finalPrice={confirmPlan.price}
          isLoading={!!loadingPlan}
          onConfirm={handleConfirmPayment}
          applicablePlan={confirmPlan.planType}
          onVoucherChange={(newVoucher, newPrice) => {
            setConfirmPlan(prev => prev ? { ...prev, appliedVoucher: newVoucher, price: prev.price } : null);
          }}
          planFeatures={(() => {
            const plan = PLANS.find(p => (p as any).planType === confirmPlan.planType || p.key === confirmPlan.planType);
            if (!plan) return undefined;
            return [
              { label: "Thương hiệu", value: plan.limits.brands },
              { label: "Bài đa kênh/tháng", value: plan.limits.multichannel },
              { label: "Ảnh AI/tháng", value: plan.limits.images },
              { label: "Scripts/tháng", value: plan.limits.scripts },
              { label: "Carousels/tháng", value: plan.limits.carousels },
            ];
          })()}
          yearlyDiscount={isYearly ? (() => {
            const plan = PLANS.find(p => (p as any).planType === confirmPlan.planType || p.key === confirmPlan.planType);
            if (!plan) return undefined;
            return Math.max(0, plan.monthlyPrice * 12 - plan.yearlyPrice);
          })() : undefined}
        />
      )}
    </div>
  );
}
