import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, CreditCard, ArrowRight, Zap, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { UpgradePlanDialog } from "@/components/UpgradePlanDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const PLANS = [
  {
    key: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    popular: false,
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

export default function Pricing() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { currentOrganization } = useOrganizationContext();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const currentPlan = subscription?.plan_type || "free";
  const isLoggedIn = !!user;
  const formatPrice = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

  const handleSelectPlan = async (plan: typeof PLANS[0]) => {
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

    setLoadingPlan(plan.key);
    try {
      const { data, error } = await supabase.functions.invoke("create-vnpay-payment", {
        body: {
          organization_id: currentOrganization.id,
          plan_type: planType,
          billing_cycle: isYearly ? "yearly" : "monthly",
          return_url: `${window.location.origin}/payment/result`,
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
      <section className="pt-12 pb-8 lg:pt-20 lg:pb-12">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="outline" className="mb-4 px-3 py-1 text-sm">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Bảng giá minh bạch
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Chọn gói phù hợp với{" "}
              <span className="text-primary">nhu cầu của bạn</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Bắt đầu miễn phí, nâng cấp khi cần. Thanh toán qua VNPay, không cần thẻ tín dụng.
            </p>

            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>
                Hàng tháng
              </span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span className={`text-sm font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
                Hàng năm
                <Badge variant="secondary" className="ml-2 text-xs text-primary">Tiết kiệm 17%</Badge>
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan, index) => {
              const price = isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
              const isCurrent = isCurrentPlan(plan);
              const isLoading = loadingPlan === plan.key;

              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`relative rounded-2xl p-6 flex flex-col ${
                    plan.popular
                      ? "bg-card border-2 border-primary shadow-lg shadow-primary/10"
                      : "bg-card border border-border"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs">
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

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-foreground">{PLAN_NAMES[plan.key]}</h3>
                  </div>

                  <div className="mb-5">
                    {price > 0 ? (
                      <>
                        <span className="text-3xl font-extrabold text-foreground">{formatPrice(price)}</span>
                        <span className="text-sm text-muted-foreground ml-1">₫/tháng</span>
                        {isYearly && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatPrice(plan.yearlyPrice)}₫/năm
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-3xl font-extrabold text-foreground">0₫</span>
                    )}
                  </div>

                  {/* Key features */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span>{plan.limits.brands} thương hiệu</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span>{plan.limits.multichannel} bài đa kênh/tháng</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span>{plan.limits.images} ảnh AI/tháng</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span>{plan.limits.scripts} kịch bản video</span>
                    </li>
                    {plan.limits.publishing && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span>Đăng bài tự động</span>
                      </li>
                    )}
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span>Hỗ trợ {plan.limits.support}</span>
                    </li>
                  </ul>

                  <Button
                    className="w-full"
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
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-bold text-foreground mb-3">
              So sánh chi tiết <span className="text-primary">các gói</span>
            </h2>
            <p className="text-muted-foreground">Tìm gói phù hợp nhất với quy mô của bạn</p>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-3 text-sm font-medium text-muted-foreground w-[200px]">
                    Tính năng
                  </th>
                  {PLANS.map((plan) => (
                    <th key={plan.key} className="text-center py-4 px-3">
                      <span className={`text-sm font-bold ${plan.popular ? "text-primary" : "text-foreground"}`}>
                        {PLAN_NAMES[plan.key]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-border/50">
                    <td className="py-3.5 px-3 text-sm text-foreground">
                      <div className="flex items-center gap-1.5">
                        {row.label}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>{row.tooltip}</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                    {PLANS.map((plan) => {
                      const value = plan.limits[row.key as keyof typeof plan.limits];
                      return (
                        <td key={plan.key} className="text-center py-3.5 px-3">
                          {typeof value === "boolean" ? (
                            value ? (
                              <Check className="w-5 h-5 text-primary mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm font-medium text-foreground">{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground text-center mb-10">
            Câu hỏi <span className="text-primary">thường gặp</span>
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <button
                  className="w-full text-left px-5 py-4 flex items-center justify-between"
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                >
                  <span className="font-medium text-foreground pr-4">{item.q}</span>
                  <span className="text-muted-foreground shrink-0">
                    {expandedFaq === i ? "−" : "+"}
                  </span>
                </button>
                {expandedFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Sẵn sàng tăng tốc content marketing?
          </h2>
          <p className="text-muted-foreground mb-6">
            Bắt đầu miễn phí ngay hôm nay, nâng cấp bất cứ lúc nào.
          </p>
          <Button size="lg" className="px-8" asChild={!isLoggedIn} onClick={isLoggedIn ? () => window.scrollTo({ top: 0, behavior: "smooth" }) : undefined}>
            {isLoggedIn ? (
              <>Xem bảng giá<ArrowRight className="ml-2 h-4 w-4" /></>
            ) : (
              <a href="/auth?mode=register">
                Bắt đầu miễn phí<ArrowRight className="ml-2 h-4 w-4" />
              </a>
            )}
          </Button>
        </div>
      </section>

      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
