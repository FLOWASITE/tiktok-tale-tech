import { motion } from "framer-motion";
import { PublicPageLayout } from "@/landing/components/PublicPageLayout";
import { SEOHead } from "@/components/SEOHead";
import { FileText, Shield, AlertTriangle, Scale, CreditCard, Ban, RefreshCw, Globe, Mail } from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

const sections = [
  {
    icon: FileText,
    title: "1. Giới thiệu",
    content: `Chào mừng bạn đến với Flowa ("Nền tảng", "chúng tôi"). Flowa là nền tảng AI tạo nội dung đa kênh thông minh, được phát triển và vận hành bởi Công ty Flowa.

Bằng việc truy cập hoặc sử dụng dịch vụ Flowa, bạn đồng ý tuân thủ và bị ràng buộc bởi các Điều khoản Dịch vụ này ("Điều khoản"). Nếu bạn không đồng ý với bất kỳ phần nào của Điều khoản, vui lòng ngừng sử dụng dịch vụ.

Điều khoản này có hiệu lực từ ngày bạn đăng ký tài khoản hoặc bắt đầu sử dụng dịch vụ.`,
  },
  {
    icon: Shield,
    title: "2. Tài khoản người dùng",
    content: `**2.1. Đăng ký tài khoản**
- Bạn phải cung cấp thông tin chính xác, đầy đủ khi đăng ký tài khoản.
- Mỗi cá nhân hoặc tổ chức chỉ được tạo một tài khoản chính.
- Bạn phải từ 18 tuổi trở lên hoặc có sự đồng ý của người giám hộ hợp pháp.

**2.2. Bảo mật tài khoản**
- Bạn có trách nhiệm bảo mật thông tin đăng nhập của mình.
- Thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép vào tài khoản.
- Flowa không chịu trách nhiệm cho các tổn thất do việc chia sẻ hoặc để lộ thông tin tài khoản.

**2.3. Quyền quản lý tổ chức**
- Chủ tài khoản tổ chức (Organization Admin) có quyền mời, quản lý thành viên và phân quyền truy cập.
- Quản trị viên chịu trách nhiệm về hoạt động của tất cả thành viên trong tổ chức.`,
  },
  {
    icon: Scale,
    title: "3. Quyền sử dụng dịch vụ",
    content: `**3.1. Giấy phép sử dụng**
Flowa cấp cho bạn giấy phép không độc quyền, không thể chuyển nhượng, có thể thu hồi để sử dụng nền tảng theo các điều khoản này.

**3.2. Quyền sở hữu nội dung**
- Nội dung bạn tạo ra bằng Flowa thuộc quyền sở hữu của bạn.
- Bạn cấp cho Flowa quyền sử dụng nội dung để cải thiện dịch vụ (dạng ẩn danh, tổng hợp).
- Flowa giữ quyền sở hữu trí tuệ đối với nền tảng, thuật toán AI, và các tính năng hệ thống.

**3.3. Sử dụng AI**
- Nội dung do AI tạo ra mang tính hỗ trợ và tham khảo.
- Bạn có trách nhiệm kiểm tra và chỉnh sửa nội dung trước khi xuất bản.
- Flowa không đảm bảo nội dung AI hoàn toàn chính xác hoặc phù hợp cho mọi mục đích.`,
  },
  {
    icon: AlertTriangle,
    title: "4. Hành vi bị cấm",
    content: `Khi sử dụng Flowa, bạn **không được**:

- Sử dụng dịch vụ để tạo nội dung vi phạm pháp luật Việt Nam hoặc quốc tế.
- Tạo nội dung kích động bạo lực, phân biệt đối xử, hoặc thù ghét.
- Sử dụng kỹ thuật prompt injection để vượt qua các bộ lọc an toàn.
- Cố ý khai thác lỗ hổng bảo mật hoặc tấn công hệ thống.
- Chia sẻ hoặc bán lại tài khoản cho bên thứ ba mà không có sự đồng ý.
- Sử dụng bot, scraper, hoặc công cụ tự động hóa trái phép.
- Tạo nội dung vi phạm quyền sở hữu trí tuệ của bên thứ ba.
- Lạm dụng hệ thống tuân thủ ngành (Industry Compliance) để tạo nội dung sai lệch.

Vi phạm các quy định trên có thể dẫn đến việc đình chỉ hoặc chấm dứt tài khoản mà không cần thông báo trước.`,
  },
  {
    icon: CreditCard,
    title: "5. Thanh toán và gói dịch vụ",
    content: `**5.1. Các gói dịch vụ**
Flowa cung cấp các gói: Miễn phí (Free), Cơ bản (Starter), Chuyên nghiệp (Professional), và Doanh nghiệp (Enterprise) với các tính năng và giới hạn khác nhau.

**5.2. Thanh toán**
- Thanh toán được xử lý qua các cổng thanh toán uy tín.
- Gói trả phí được tính theo tháng hoặc năm, tự động gia hạn trừ khi hủy.
- Giá có thể thay đổi với thông báo trước ít nhất 30 ngày.

**5.3. Hoàn tiền**
- Yêu cầu hoàn tiền trong vòng 7 ngày kể từ ngày thanh toán sẽ được xem xét.
- Token AI đã sử dụng sẽ không được hoàn lại.
- Trường hợp đặc biệt sẽ được xem xét riêng.`,
  },
  {
    icon: Ban,
    title: "6. Tuân thủ ngành và nội dung",
    content: `**6.1. Hệ thống tuân thủ**
Flowa tích hợp hệ thống tuân thủ ngành (Industry Compliance) tự động kiểm tra nội dung theo quy định pháp luật của từng khu vực và ngành nghề.

**6.2. Trách nhiệm người dùng**
- Bạn có trách nhiệm đảm bảo nội dung tuân thủ các quy định ngành nghề áp dụng.
- Hệ thống tuân thủ là công cụ hỗ trợ, không thay thế tư vấn pháp lý chuyên nghiệp.
- Flowa không chịu trách nhiệm pháp lý cho nội dung bạn xuất bản.

**6.3. Khu vực áp dụng**
Hệ thống hỗ trợ các khu vực: Việt Nam (VN), Thái Lan (TH), Hoa Kỳ (US), Singapore (SG), Indonesia (ID), Malaysia (MY), Philippines (PH), Nhật Bản (JP), Hàn Quốc (KR), EU và Toàn cầu (GLOBAL).`,
  },
  {
    icon: RefreshCw,
    title: "7. Thay đổi và chấm dứt",
    content: `**7.1. Thay đổi điều khoản**
- Flowa có quyền cập nhật Điều khoản này bất kỳ lúc nào.
- Thay đổi quan trọng sẽ được thông báo qua email hoặc thông báo trên nền tảng ít nhất 15 ngày trước khi có hiệu lực.
- Tiếp tục sử dụng dịch vụ sau khi thay đổi có nghĩa bạn chấp nhận điều khoản mới.

**7.2. Chấm dứt dịch vụ**
- Bạn có thể hủy tài khoản bất kỳ lúc nào qua phần Cài đặt tài khoản.
- Flowa có quyền đình chỉ hoặc chấm dứt tài khoản vi phạm điều khoản.
- Sau khi chấm dứt, dữ liệu sẽ được lưu trữ trong 30 ngày trước khi xóa vĩnh viễn.`,
  },
  {
    icon: Globe,
    title: "8. Giới hạn trách nhiệm",
    content: `**8.1. Miễn trừ bảo đảm**
Dịch vụ được cung cấp "nguyên trạng" (as-is). Flowa không đảm bảo dịch vụ sẽ không bị gián đoạn hoặc không có lỗi.

**8.2. Giới hạn bồi thường**
Trách nhiệm bồi thường tối đa của Flowa không vượt quá tổng số tiền bạn đã thanh toán trong 12 tháng gần nhất.

**8.3. Bất khả kháng**
Flowa không chịu trách nhiệm cho việc không thể thực hiện nghĩa vụ do các sự kiện ngoài tầm kiểm soát hợp lý (thiên tai, chiến tranh, đại dịch, sự cố hạ tầng internet, v.v.)`,
  },
  {
    icon: Mail,
    title: "9. Liên hệ",
    content: `Nếu bạn có câu hỏi về Điều khoản Dịch vụ, vui lòng liên hệ:

- **Email:** support@flowa.one
- **Website:** [flowa.one](https://flowa.one)

Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp sẽ được giải quyết tại tòa án có thẩm quyền tại Thành phố Hồ Chí Minh, Việt Nam.`,
  },
];

export default function TermsOfService() {
  return (
    <PublicPageLayout>
      <SEOHead
        title="Điều khoản dịch vụ"
        description="Điều khoản dịch vụ của Flowa - Nền tảng AI tạo nội dung đa kênh thông minh. Tìm hiểu quyền và nghĩa vụ khi sử dụng dịch vụ."
        canonicalPath="/terms"
        ogType="website"
      />

      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Pháp lý</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Điều khoản dịch vụ
            </h1>
            <p className="text-lg text-muted-foreground">
              Cập nhật lần cuối: 18 tháng 3, 2026
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-20 md:pb-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.article
                  key={section.title}
                  custom={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeIn}
                  className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 md:p-8 hover:border-primary/20 transition-colors duration-300"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground pt-1">
                      {section.title}
                    </h2>
                  </div>
                  <div className="ml-14 prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold">
                    {section.content.split("\n").map((line, i) => {
                      if (!line.trim()) return <br key={i} />;
                      if (line.startsWith("**") && line.includes("**")) {
                        const match = line.match(/^\*\*(.+?)\*\*$/);
                        if (match) return <h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-2">{match[1]}</h3>;
                      }
                      if (line.startsWith("- ")) {
                        return (
                          <div key={i} className="flex items-start gap-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0" />
                            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>') }} />
                          </div>
                        );
                      }
                      return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>') }} />;
                    })}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
