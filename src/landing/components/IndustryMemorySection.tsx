import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Shield, Scale, Zap, Building2, Heart, Home, Utensils, Sparkles, GraduationCap, 
  Ban, CheckCircle2, AlertTriangle, ArrowRight, Calculator, Code, Gamepad2, 
  Truck, PawPrint, Plane, Shirt, Users, ShoppingCart, Baby, ChevronRight,
  Briefcase, Factory, Wheat, Landmark, Radio, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Detailed industry data for 7 industries (main showcase)
const industryShowcase = [
  {
    key: "healthcare",
    icon: Heart,
    forbiddenTerms: [
      "Cam kết chữa khỏi 100%",
      "Không tác dụng phụ",
      "Thay thế thuốc Tây",
      "Thần dược",
      "Đặc trị dứt điểm"
    ],
    complianceRules: [
      { severity: "critical", text: "Phải có giấy phép quảng cáo y tế từ Bộ Y tế", legalRef: "Nghị định 181/2013/NĐ-CP" },
      { severity: "critical", text: "Không được dùng hình ảnh bác sĩ, nhân viên y tế", legalRef: "Luật Quảng cáo 2012" },
      { severity: "high", text: "Phải ghi rõ thành phần, liều lượng sử dụng", legalRef: "Thông tư 09/2015/TT-BYT" },
      { severity: "medium", text: "Ghi rõ 'Đọc kỹ hướng dẫn trước khi sử dụng'", legalRef: "Luật Quảng cáo 2012" }
    ],
    claimRestrictions: [
      { forbidden: "Chữa khỏi 100%", suggested: "Hỗ trợ điều trị theo phác đồ bác sĩ" },
      { forbidden: "Không tác dụng phụ", suggested: "An toàn khi sử dụng đúng liều" },
      { forbidden: "Thay thế thuốc Tây", suggested: "Kết hợp với phác đồ điều trị" }
    ]
  },
  {
    key: "finance",
    icon: Building2,
    forbiddenTerms: [
      "Lãi suất thấp nhất thị trường",
      "Đảm bảo lợi nhuận 100%",
      "Không rủi ro",
      "Sinh lời chắc chắn",
      "Lãi kép 50%/tháng"
    ],
    complianceRules: [
      { severity: "critical", text: "Phải ghi cảnh báo rủi ro đầu tư rõ ràng", legalRef: "Luật Chứng khoán 2019" },
      { severity: "critical", text: "Không cam kết lợi nhuận cụ thể", legalRef: "Nghị định 156/2020/NĐ-CP" },
      { severity: "high", text: "Phải ghi rõ điều kiện vay, lãi suất tham khảo", legalRef: "Luật Tín dụng 2010" },
      { severity: "medium", text: "Ghi nguồn số liệu khi trích dẫn thống kê", legalRef: "Luật Quảng cáo 2012" }
    ],
    claimRestrictions: [
      { forbidden: "Lãi suất thấp nhất", suggested: "Lãi suất cạnh tranh từ X%/năm" },
      { forbidden: "Đảm bảo lợi nhuận", suggested: "Lợi nhuận kỳ vọng dựa trên lịch sử" },
      { forbidden: "Không rủi ro", suggested: "Rủi ro được quản lý chặt chẽ" }
    ]
  },
  {
    key: "realestate",
    icon: Home,
    forbiddenTerms: [
      "Pháp lý hoàn chỉnh 100%",
      "Sinh lời chắc chắn",
      "Giá rẻ nhất khu vực",
      "Tăng giá 200%",
      "Chỉ còn 3 căn cuối"
    ],
    complianceRules: [
      { severity: "critical", text: "Phải có giấy phép mở bán từ Sở Xây dựng", legalRef: "Luật Kinh doanh BĐS 2023" },
      { severity: "critical", text: "Thông tin quy hoạch phải chính xác, có nguồn", legalRef: "Nghị định 02/2022/NĐ-CP" },
      { severity: "high", text: "Tiến độ xây dựng phải cập nhật thực tế", legalRef: "Luật Nhà ở 2023" },
      { severity: "medium", text: "Hình ảnh phối cảnh phải ghi rõ 'Hình minh họa'", legalRef: "Luật Quảng cáo 2012" }
    ],
    claimRestrictions: [
      { forbidden: "Sinh lời chắc chắn 30%", suggested: "Tiềm năng tăng giá dựa trên quy hoạch" },
      { forbidden: "Pháp lý hoàn chỉnh", suggested: "Pháp lý rõ ràng, đang hoàn thiện" },
      { forbidden: "Giá rẻ nhất", suggested: "Giá cạnh tranh so với khu vực" }
    ]
  },
  {
    key: "beauty",
    icon: Sparkles,
    forbiddenTerms: [
      "Trắng da vĩnh viễn",
      "Giảm cân không cần tập",
      "Trẻ hóa 10 tuổi",
      "100% tự nhiên",
      "FDA Mỹ chứng nhận"
    ],
    complianceRules: [
      { severity: "critical", text: "Không tuyên bố mỹ phẩm có tác dụng điều trị", legalRef: "Nghị định 93/2016/NĐ-CP" },
      { severity: "critical", text: "Hình ảnh Before/After phải là thật, có xác nhận", legalRef: "Luật Quảng cáo 2012" },
      { severity: "high", text: "Influencer phải ghi rõ 'Nội dung tài trợ'", legalRef: "Nghị định 70/2021/NĐ-CP" },
      { severity: "medium", text: "Ghi rõ thành phần chính của sản phẩm", legalRef: "Nghị định 93/2016/NĐ-CP" }
    ],
    claimRestrictions: [
      { forbidden: "Trắng da vĩnh viễn", suggested: "Hỗ trợ làm sáng da đều màu" },
      { forbidden: "Trẻ hóa 10 tuổi", suggested: "Giảm thiểu dấu hiệu lão hóa" },
      { forbidden: "100% tự nhiên", suggested: "Chiết xuất từ thiên nhiên" }
    ]
  },
  {
    key: "food",
    icon: Utensils,
    forbiddenTerms: [
      "Chữa bệnh",
      "Thay thế thuốc",
      "100% Organic",
      "Không chất bảo quản",
      "Detox cơ thể"
    ],
    complianceRules: [
      { severity: "critical", text: "Phải có giấy chứng nhận ATTP", legalRef: "Nghị định 15/2018/NĐ-CP" },
      { severity: "critical", text: "Không cam kết công dụng y tế với thực phẩm", legalRef: "Luật An toàn thực phẩm 2010" },
      { severity: "high", text: "Ghi rõ thành phần, hạn sử dụng", legalRef: "Nghị định 43/2017/NĐ-CP" },
      { severity: "medium", text: "Hình ảnh sản phẩm phải đúng thực tế", legalRef: "Luật Quảng cáo 2012" }
    ],
    claimRestrictions: [
      { forbidden: "Chữa bệnh tiểu đường", suggested: "Hỗ trợ kiểm soát đường huyết" },
      { forbidden: "100% Organic", suggested: "Nguyên liệu hữu cơ được chứng nhận" },
      { forbidden: "Detox cơ thể", suggested: "Hỗ trợ thanh lọc, bổ sung dưỡng chất" }
    ]
  },
  {
    key: "education",
    icon: GraduationCap,
    forbiddenTerms: [
      "Đỗ 100%",
      "Việc làm đảm bảo",
      "Top 1 Việt Nam",
      "Cam kết output",
      "Học 1 lần nhớ mãi"
    ],
    complianceRules: [
      { severity: "critical", text: "Phải có giấy phép đào tạo từ Sở GD&ĐT", legalRef: "Nghị định 46/2017/NĐ-CP" },
      { severity: "critical", text: "Không cam kết kết quả thi, điểm số cụ thể", legalRef: "Luật Giáo dục 2019" },
      { severity: "high", text: "Chứng chỉ phải được công nhận bởi cơ quan có thẩm quyền", legalRef: "Nghị định 99/2019/NĐ-CP" },
      { severity: "medium", text: "Học phí phải công khai, minh bạch", legalRef: "Nghị định 81/2021/NĐ-CP" }
    ],
    claimRestrictions: [
      { forbidden: "Cam kết đỗ 100%", suggested: "Tỷ lệ đỗ cao dựa trên thống kê thực tế" },
      { forbidden: "Việc làm đảm bảo", suggested: "Hỗ trợ kết nối việc làm sau tốt nghiệp" },
      { forbidden: "Top 1 Việt Nam", suggested: "Đơn vị uy tín hàng đầu trong lĩnh vực" }
    ]
  },
  {
    key: "accounting",
    icon: Calculator,
    forbiddenTerms: [
      "Cam kết hoàn thuế 100%",
      "Không bị thanh tra",
      "Tối ưu thuế tuyệt đối",
      "Hóa đơn hợp pháp hóa",
      "Giảm thuế tối đa"
    ],
    complianceRules: [
      { severity: "critical", text: "Phải có chứng chỉ hành nghề kế toán/kiểm toán", legalRef: "Luật Kế toán 2015" },
      { severity: "critical", text: "Không tư vấn trốn thuế, gian lận thuế", legalRef: "Luật Quản lý thuế 2019" },
      { severity: "high", text: "Tuân thủ chuẩn mực kế toán Việt Nam (VAS)", legalRef: "Thông tư 200/2014/TT-BTC" },
      { severity: "medium", text: "Bảo mật thông tin tài chính khách hàng", legalRef: "Luật Kế toán 2015" }
    ],
    claimRestrictions: [
      { forbidden: "Cam kết hoàn thuế 100%", suggested: "Hỗ trợ tối ưu thuế theo quy định" },
      { forbidden: "Không bị thanh tra", suggested: "Hồ sơ đúng quy định, sẵn sàng kiểm tra" },
      { forbidden: "Giảm thuế tối đa", suggested: "Tư vấn các ưu đãi thuế phù hợp" }
    ]
  }
];

const valueProps = [
  { icon: Shield, key: "noViolation" },
  { icon: Scale, key: "compliance" },
  { icon: Zap, key: "autoUpdate" }
];

// Additional industries not shown in main tabs
const moreIndustries = [
  { key: "insurance", icon: Shield, category: "finance" },
  { key: "banking", icon: Landmark, category: "finance" },
  { key: "crypto", icon: Briefcase, category: "finance" },
  { key: "it", icon: Code, category: "technology" },
  { key: "game", icon: Gamepad2, category: "technology" },
  { key: "telecom", icon: Radio, category: "technology" },
  { key: "logistics", icon: Truck, category: "manufacturing" },
  { key: "manufacturing", icon: Factory, category: "manufacturing" },
  { key: "agriculture", icon: Wheat, category: "manufacturing" },
  { key: "pet", icon: PawPrint, category: "lifestyle" },
  { key: "travel", icon: Plane, category: "lifestyle" },
  { key: "fashion", icon: Shirt, category: "lifestyle" },
  { key: "legal", icon: Scale, category: "services" },
  { key: "hr", icon: Users, category: "services" },
  { key: "consulting", icon: MessageSquare, category: "services" },
  { key: "ecommerce", icon: ShoppingCart, category: "commerce" },
  { key: "momBaby", icon: Baby, category: "lifestyle" }
];

// All categories with full industry lists
const allCategories = [
  { 
    key: "finance", 
    industries: ["healthcare", "finance", "accounting", "insurance", "banking", "crypto"]
  },
  { 
    key: "technology", 
    industries: ["it", "game", "telecom"]
  },
  { 
    key: "lifestyle", 
    industries: ["beauty", "pet", "travel", "fashion", "momBaby"]
  },
  { 
    key: "services", 
    industries: ["education", "legal", "hr", "consulting"]
  },
  { 
    key: "commerce", 
    industries: ["food", "ecommerce", "realestate"]
  },
  { 
    key: "manufacturing", 
    industries: ["logistics", "manufacturing", "agriculture"]
  }
];

// Icon map for all industries
const industryIconMap: Record<string, any> = {
  healthcare: Heart,
  finance: Building2,
  realestate: Home,
  beauty: Sparkles,
  food: Utensils,
  education: GraduationCap,
  accounting: Calculator,
  insurance: Shield,
  banking: Landmark,
  crypto: Briefcase,
  it: Code,
  game: Gamepad2,
  telecom: Radio,
  logistics: Truck,
  manufacturing: Factory,
  agriculture: Wheat,
  pet: PawPrint,
  travel: Plane,
  fashion: Shirt,
  legal: Scale,
  hr: Users,
  consulting: MessageSquare,
  ecommerce: ShoppingCart,
  momBaby: Baby
};

type PreviewTab = "forbidden" | "compliance" | "claims";

export function IndustryMemorySection() {
  const { t } = useTranslation();
  const [activeIndustry, setActiveIndustry] = useState(0);
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>("forbidden");
  const [showAllDialog, setShowAllDialog] = useState(false);

  const currentIndustry = industryShowcase[activeIndustry];

  const previewTabs = [
    { key: "forbidden" as const, icon: Ban, count: currentIndustry.forbiddenTerms.length },
    { key: "compliance" as const, icon: CheckCircle2, count: currentIndustry.complianceRules.length },
    { key: "claims" as const, icon: AlertTriangle, count: currentIndustry.claimRestrictions.length }
  ];

  return (
    <section id="industry-memory" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            {t("industryMemory.badge")}
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {t("industryMemory.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("industryMemory.subtitle")}
          </p>
        </motion.div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-12 md:mb-16">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground">42+</div>
            <div className="text-sm text-muted-foreground mt-1">{t("industryMemory.stats.packs")}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground">8</div>
            <div className="text-sm text-muted-foreground mt-1">{t("industryMemory.stats.categories")}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground">3</div>
            <div className="text-sm text-muted-foreground mt-1">{t("industryMemory.stats.countries")}</div>
          </div>
        </div>

        {/* Interactive demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="border border-border/50 rounded-2xl bg-card mb-12 md:mb-16 overflow-hidden"
        >
          <div className="grid lg:grid-cols-[240px_1fr]">
            {/* Industry tabs */}
            <div className="flex lg:flex-col gap-1 p-3 overflow-x-auto lg:overflow-visible border-b lg:border-b-0 lg:border-r border-border/50 bg-muted/30">
              {industryShowcase.map((industry, index) => {
                const Icon = industry.icon;
                return (
                  <button
                    key={industry.key}
                    onClick={() => {
                      setActiveIndustry(index);
                      setActivePreviewTab("forbidden");
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-3 rounded-lg text-left transition-colors shrink-0 text-sm",
                      activeIndustry === index
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-medium whitespace-nowrap">
                      {t(`industryMemory.industries.${industry.key}`)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Preview content */}
            <div>
              {/* Preview tabs */}
              <div className="flex border-b border-border/50">
                {previewTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActivePreviewTab(tab.key)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm transition-colors relative",
                        activePreviewTab === tab.key
                          ? "text-foreground bg-background"
                          : "text-muted-foreground hover:text-foreground bg-muted/30"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{t(`industryMemory.tabs.${tab.key}`)}</span>
                      <span className="text-xs text-muted-foreground">({tab.count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="p-5 md:p-6 min-h-[280px]">
                <AnimatePresence mode="wait">
                  {activePreviewTab === "forbidden" && (
                    <motion.div
                      key="forbidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <p className="text-sm text-muted-foreground mb-4">
                        {t("industryMemory.preview.forbiddenDesc")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {currentIndustry.forbiddenTerms.map((term, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-md text-sm"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            {term}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activePreviewTab === "compliance" && (
                    <motion.div
                      key="compliance"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <p className="text-sm text-muted-foreground mb-4">
                        {t("industryMemory.preview.complianceDesc")}
                      </p>
                      {currentIndustry.complianceRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "p-3 rounded-lg border text-sm",
                            rule.severity === "critical" && "bg-destructive/5 border-destructive/20",
                            rule.severity === "high" && "bg-orange-500/5 border-orange-500/20",
                            rule.severity === "medium" && "bg-amber-500/5 border-amber-500/20"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className={cn(
                              "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0",
                              rule.severity === "critical" && "bg-destructive/10 text-destructive",
                              rule.severity === "high" && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                              rule.severity === "medium" && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}>
                              {t(`industryMemory.severity.${rule.severity}`)}
                            </span>
                            <div className="flex-1">
                              <p className="text-foreground">{rule.text}</p>
                              <p className="text-xs text-muted-foreground mt-1">{rule.legalRef}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {activePreviewTab === "claims" && (
                    <motion.div
                      key="claims"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <p className="text-sm text-muted-foreground mb-4">
                        {t("industryMemory.preview.claimsDesc")}
                      </p>
                      {currentIndustry.claimRestrictions.map((claim, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm"
                        >
                          <div className="flex items-center gap-2 px-3 py-2 bg-destructive/5 border border-destructive/20 rounded-md flex-1">
                            <Ban className="w-3.5 h-3.5 text-destructive shrink-0" />
                            <span className="text-destructive line-through">{claim.forbidden}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block shrink-0" />
                          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-md flex-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-emerald-600 dark:text-emerald-400">{claim.suggested}</span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* More Industries Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 md:mb-16"
        >
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t("industryMemory.moreIndustries.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("industryMemory.moreIndustries.subtitle")}
            </p>
          </div>

          {/* Grid of additional industries */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {moreIndustries.slice(0, 12).map((industry) => {
              const Icon = industry.icon;
              return (
                <div
                  key={industry.key}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm"
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{t(`industryMemory.allIndustries.${industry.key}`)}</span>
                </div>
              );
            })}
          </div>

          {/* View all button */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setShowAllDialog(true)}
              className="gap-2"
            >
              {t("industryMemory.moreIndustries.viewAll")}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Value props */}
        <div className="grid md:grid-cols-3 gap-6">
          {valueProps.map((prop) => {
            const Icon = prop.icon;
            return (
              <div
                key={prop.key}
                className="text-center p-6 rounded-xl border border-border/50"
              >
                <div className="w-10 h-10 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {t(`industryMemory.features.${prop.key}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`industryMemory.features.${prop.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center p-6 rounded-xl bg-muted/30 border border-border/50"
        >
          <p className="text-muted-foreground mb-3">
            {t("industryMemory.cta.question")}
          </p>
          <Button variant="link" className="text-primary gap-1">
            {t("industryMemory.cta.action")}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>

      {/* All Industries Dialog */}
      <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {t("industryMemory.dialog.title")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {allCategories.map((category) => (
              <div key={category.key}>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {t(`industryMemory.categories.${category.key}`)} ({category.industries.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {category.industries.map((industryKey) => {
                    const Icon = industryIconMap[industryKey] || Shield;
                    return (
                      <div
                        key={industryKey}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm"
                      >
                        <Icon className="w-4 h-4 text-primary" />
                        <span>{t(`industryMemory.allIndustries.${industryKey}`)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Dialog CTA */}
          <div className="mt-6 pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {t("industryMemory.cta.question")}
            </p>
            <Button variant="link" className="text-primary gap-1">
              {t("industryMemory.cta.action")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
