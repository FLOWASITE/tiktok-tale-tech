import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Shield, Scale, Zap, Building2, Heart, Home, Utensils, Sparkles, GraduationCap, Ban, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Detailed industry data for 6 industries
const industryShowcase = [
  {
    key: "healthcare",
    icon: Heart,
    forbiddenTerms: [
      "Cam kết chữa khỏi 100%",
      "Không tác dụng phụ",
      "Thay thế thuốc Tây",
      "Thần dược",
      "Đặc trị dứt điểm",
      "Tiên dược",
      "Công nghệ NASA"
    ],
    complianceRules: [
      { severity: "critical", text: "Phải có giấy phép quảng cáo y tế từ Bộ Y tế", legalRef: "Nghị định 181/2013/NĐ-CP" },
      { severity: "critical", text: "Không được dùng hình ảnh bác sĩ, nhân viên y tế", legalRef: "Luật Quảng cáo 2012" },
      { severity: "high", text: "Phải ghi rõ thành phần, liều lượng sử dụng", legalRef: "Thông tư 09/2015/TT-BYT" },
      { severity: "high", text: "Không cam kết kết quả điều trị cụ thể", legalRef: "Nghị định 181/2013/NĐ-CP" },
      { severity: "medium", text: "Ghi rõ 'Đọc kỹ hướng dẫn trước khi sử dụng'", legalRef: "Luật Quảng cáo 2012" }
    ],
    claimRestrictions: [
      { forbidden: "Chữa khỏi 100%", suggested: "Hỗ trợ điều trị theo phác đồ bác sĩ" },
      { forbidden: "Không tác dụng phụ", suggested: "An toàn khi sử dụng đúng liều" },
      { forbidden: "Thay thế thuốc Tây", suggested: "Kết hợp với phác đồ điều trị" },
      { forbidden: "Công nghệ độc quyền", suggested: "Công nghệ tiên tiến được nghiên cứu" }
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
      "Đầu tư an toàn tuyệt đối",
      "Thu nhập thụ động đảm bảo",
      "Lãi kép 50%/tháng"
    ],
    complianceRules: [
      { severity: "critical", text: "Phải ghi cảnh báo rủi ro đầu tư rõ ràng", legalRef: "Luật Chứng khoán 2019" },
      { severity: "critical", text: "Không cam kết lợi nhuận cụ thể", legalRef: "Nghị định 156/2020/NĐ-CP" },
      { severity: "high", text: "Phải ghi rõ điều kiện vay, lãi suất tham khảo", legalRef: "Luật Tín dụng 2010" },
      { severity: "high", text: "Công bố đầy đủ phí và chi phí liên quan", legalRef: "Thông tư 39/2016/TT-NHNN" },
      { severity: "medium", text: "Ghi nguồn số liệu khi trích dẫn thống kê", legalRef: "Luật Quảng cáo 2012" }
    ],
    claimRestrictions: [
      { forbidden: "Lãi suất thấp nhất", suggested: "Lãi suất cạnh tranh từ X%/năm" },
      { forbidden: "Đảm bảo lợi nhuận", suggested: "Lợi nhuận kỳ vọng dựa trên lịch sử" },
      { forbidden: "Không rủi ro", suggested: "Rủi ro được quản lý chặt chẽ" },
      { forbidden: "Thu nhập thụ động đảm bảo", suggested: "Cơ hội tạo thu nhập thụ động" }
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
      "Độc quyền duy nhất",
      "Cháy hàng",
      "Chỉ còn 3 căn cuối"
    ],
    complianceRules: [
      { severity: "critical", text: "Phải có giấy phép mở bán từ Sở Xây dựng", legalRef: "Luật Kinh doanh BĐS 2023" },
      { severity: "critical", text: "Thông tin quy hoạch phải chính xác, có nguồn", legalRef: "Nghị định 02/2022/NĐ-CP" },
      { severity: "high", text: "Tiến độ xây dựng phải cập nhật thực tế", legalRef: "Luật Nhà ở 2023" },
      { severity: "high", text: "Giá bán phải công khai, minh bạch", legalRef: "Luật Bảo vệ NTD 2023" },
      { severity: "medium", text: "Hình ảnh phối cảnh phải ghi rõ 'Hình minh họa'", legalRef: "Luật Quảng cáo 2012" }
    ],
    claimRestrictions: [
      { forbidden: "Sinh lời chắc chắn 30%", suggested: "Tiềm năng tăng giá dựa trên quy hoạch" },
      { forbidden: "Pháp lý hoàn chỉnh", suggested: "Pháp lý rõ ràng, đang hoàn thiện" },
      { forbidden: "Chỉ còn 3 căn cuối", suggested: "Số lượng có hạn, liên hệ để biết chi tiết" },
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
      "FDA Mỹ chứng nhận",
      "Thay thế Botox",
      "Xóa nếp nhăn vĩnh viễn"
    ],
    complianceRules: [
      { severity: "critical", text: "Không tuyên bố mỹ phẩm có tác dụng điều trị", legalRef: "Nghị định 93/2016/NĐ-CP" },
      { severity: "critical", text: "Hình ảnh Before/After phải là thật, có xác nhận", legalRef: "Luật Quảng cáo 2012" },
      { severity: "high", text: "Influencer phải ghi rõ 'Nội dung tài trợ'", legalRef: "Nghị định 70/2021/NĐ-CP" },
      { severity: "high", text: "Không được dùng từ 'điều trị', 'chữa trị'", legalRef: "Thông tư 06/2011/TT-BYT" },
      { severity: "medium", text: "Ghi rõ thành phần chính của sản phẩm", legalRef: "Nghị định 93/2016/NĐ-CP" }
    ],
    claimRestrictions: [
      { forbidden: "Trắng da vĩnh viễn", suggested: "Hỗ trợ làm sáng da đều màu" },
      { forbidden: "Trẻ hóa 10 tuổi", suggested: "Giảm thiểu dấu hiệu lão hóa" },
      { forbidden: "100% tự nhiên", suggested: "Chiết xuất từ thiên nhiên" },
      { forbidden: "Xóa nếp nhăn", suggested: "Làm mờ nếp nhăn, căng mịn da" }
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
      "Siêu thực phẩm",
      "Detox cơ thể",
      "Tăng cường miễn dịch 100%"
    ],
    complianceRules: [
      { severity: "critical", text: "Phải có giấy chứng nhận ATTP", legalRef: "Nghị định 15/2018/NĐ-CP" },
      { severity: "critical", text: "Không cam kết công dụng y tế với thực phẩm", legalRef: "Luật An toàn thực phẩm 2010" },
      { severity: "high", text: "Ghi rõ thành phần, hạn sử dụng", legalRef: "Nghị định 43/2017/NĐ-CP" },
      { severity: "high", text: "Organic phải có chứng nhận cơ quan có thẩm quyền", legalRef: "Nghị định 109/2018/NĐ-CP" },
      { severity: "medium", text: "Hình ảnh sản phẩm phải đúng thực tế", legalRef: "Luật Quảng cáo 2012" }
    ],
    claimRestrictions: [
      { forbidden: "Chữa bệnh tiểu đường", suggested: "Hỗ trợ kiểm soát đường huyết" },
      { forbidden: "100% Organic", suggested: "Nguyên liệu hữu cơ được chứng nhận" },
      { forbidden: "Detox cơ thể", suggested: "Hỗ trợ thanh lọc, bổ sung dưỡng chất" },
      { forbidden: "Tăng cường miễn dịch", suggested: "Bổ sung vitamin, khoáng chất" }
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
      "Học 1 lần nhớ mãi",
      "Thần đồng sau 3 tháng",
      "Giáo viên số 1"
    ],
    complianceRules: [
      { severity: "critical", text: "Phải có giấy phép đào tạo từ Sở GD&ĐT", legalRef: "Nghị định 46/2017/NĐ-CP" },
      { severity: "critical", text: "Không cam kết kết quả thi, điểm số cụ thể", legalRef: "Luật Giáo dục 2019" },
      { severity: "high", text: "Chứng chỉ phải được công nhận bởi cơ quan có thẩm quyền", legalRef: "Nghị định 99/2019/NĐ-CP" },
      { severity: "high", text: "Thông tin giảng viên phải chính xác, có xác minh", legalRef: "Thông tư 21/2018/TT-BGDĐT" },
      { severity: "medium", text: "Học phí phải công khai, minh bạch", legalRef: "Nghị định 81/2021/NĐ-CP" }
    ],
    claimRestrictions: [
      { forbidden: "Cam kết đỗ 100%", suggested: "Tỷ lệ đỗ cao dựa trên thống kê thực tế" },
      { forbidden: "Việc làm đảm bảo", suggested: "Hỗ trợ kết nối việc làm sau tốt nghiệp" },
      { forbidden: "Top 1 Việt Nam", suggested: "Đơn vị uy tín hàng đầu trong lĩnh vực" },
      { forbidden: "Học 1 lần nhớ mãi", suggested: "Phương pháp học hiệu quả, dễ nhớ" }
    ]
  }
];

const valueProps = [
  { icon: Shield, key: "noViolation" },
  { icon: Scale, key: "compliance" },
  { icon: Zap, key: "autoUpdate" }
];

type PreviewTab = "forbidden" | "compliance" | "claims";

const severityConfig = {
  critical: { color: "bg-destructive/15 text-destructive border-destructive/30", label: "Nghiêm trọng", dot: "bg-destructive" },
  high: { color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30", label: "Cao", dot: "bg-orange-500" },
  medium: { color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", label: "Trung bình", dot: "bg-amber-500" }
};

export function IndustryMemorySection() {
  const { t } = useTranslation();
  const [activeIndustry, setActiveIndustry] = useState(0);
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>("forbidden");
  const [showAllForbidden, setShowAllForbidden] = useState(false);

  const currentIndustry = industryShowcase[activeIndustry];
  const visibleForbiddenTerms = showAllForbidden 
    ? currentIndustry.forbiddenTerms 
    : currentIndustry.forbiddenTerms.slice(0, 5);

  const previewTabs = [
    { key: "forbidden" as const, icon: Ban, count: currentIndustry.forbiddenTerms.length },
    { key: "compliance" as const, icon: CheckCircle2, count: currentIndustry.complianceRules.length },
    { key: "claims" as const, icon: AlertTriangle, count: currentIndustry.claimRestrictions.length }
  ];

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
          className="bg-card border border-border/50 rounded-2xl p-4 md:p-8 mb-12 md:mb-16 shadow-lg"
        >
          <div className="grid lg:grid-cols-[260px_1fr] gap-6 md:gap-8">
            {/* Industry tabs */}
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-thin">
              {industryShowcase.map((industry, index) => {
                const Icon = industry.icon;
                return (
                  <motion.button
                    key={industry.key}
                    onClick={() => {
                      setActiveIndustry(index);
                      setActivePreviewTab("forbidden");
                      setShowAllForbidden(false);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all shrink-0 border",
                      activeIndustry === index
                        ? "bg-primary text-primary-foreground shadow-md border-primary"
                        : "bg-muted/50 hover:bg-muted text-foreground border-transparent hover:border-border/50"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium whitespace-nowrap">
                      {t(`industryMemory.industries.${industry.key}`)}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Preview card with tabs */}
            <div className="bg-muted/30 rounded-xl overflow-hidden">
              {/* Preview tabs */}
              <div className="flex border-b border-border/50 bg-muted/50">
                {previewTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActivePreviewTab(tab.key)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all relative",
                        activePreviewTab === tab.key
                          ? "text-primary bg-background"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{t(`industryMemory.tabs.${tab.key}`)}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        activePreviewTab === tab.key 
                          ? "bg-primary/10 text-primary" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {tab.count}
                      </span>
                      {activePreviewTab === tab.key && (
                        <motion.div
                          layoutId="activePreviewTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="p-4 md:p-6 min-h-[320px]">
                <AnimatePresence mode="wait">
                  {/* Forbidden Terms Tab */}
                  {activePreviewTab === "forbidden" && (
                    <motion.div
                      key="forbidden"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-sm text-muted-foreground mb-4">
                        {t("industryMemory.preview.forbiddenDesc")}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {visibleForbiddenTerms.map((term, idx) => (
                          <motion.span
                            key={idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm"
                          >
                            <Ban className="w-3.5 h-3.5 shrink-0" />
                            {term}
                          </motion.span>
                        ))}
                      </div>
                      {currentIndustry.forbiddenTerms.length > 5 && (
                        <button
                          onClick={() => setShowAllForbidden(!showAllForbidden)}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          {showAllForbidden 
                            ? t("industryMemory.showLess")
                            : t("industryMemory.showMore", { count: currentIndustry.forbiddenTerms.length - 5 })}
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Compliance Rules Tab */}
                  {activePreviewTab === "compliance" && (
                    <motion.div
                      key="compliance"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <p className="text-sm text-muted-foreground mb-4">
                        {t("industryMemory.preview.complianceDesc")}
                      </p>
                      {currentIndustry.complianceRules.map((rule, idx) => {
                        const config = severityConfig[rule.severity];
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className={cn(
                              "p-3 rounded-lg border",
                              config.color
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", config.dot)} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{rule.text}</p>
                                <p className="text-xs opacity-70 mt-1">{rule.legalRef}</p>
                              </div>
                              <span className={cn(
                                "text-[10px] font-semibold uppercase px-2 py-0.5 rounded shrink-0",
                                rule.severity === "critical" && "bg-destructive/20",
                                rule.severity === "high" && "bg-orange-500/20",
                                rule.severity === "medium" && "bg-amber-500/20"
                              )}>
                                {t(`industryMemory.severity.${rule.severity}`)}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}

                  {/* Claim Restrictions Tab */}
                  {activePreviewTab === "claims" && (
                    <motion.div
                      key="claims"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <p className="text-sm text-muted-foreground mb-4">
                        {t("industryMemory.preview.claimsDesc")}
                      </p>
                      {currentIndustry.claimRestrictions.map((claim, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="grid sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-center"
                        >
                          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <Ban className="w-4 h-4 text-destructive shrink-0" />
                            <span className="text-sm text-destructive line-through">{claim.forbidden}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-sm text-emerald-600 dark:text-emerald-400">{claim.suggested}</span>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
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
          {valueProps.map((prop) => {
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
