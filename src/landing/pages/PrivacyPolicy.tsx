import { motion } from "framer-motion";
import { PublicPageLayout } from "@/landing/components/PublicPageLayout";
import { SEOHead } from "@/components/SEOHead";
import { Shield, Database, Eye, Lock, UserCheck, Share2, Clock, Globe, Mail, Bell } from "lucide-react";

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
    icon: Shield,
    title: "1. Giới thiệu",
    content: `Chính sách Bảo mật này ("Chính sách") áp dụng cho ứng dụng **Flowa** ("Flowa", "ứng dụng", "chúng tôi") — nền tảng AI Content Marketing được vận hành tại flowa.one và app.flowa.one. Chính sách này giải thích cách ứng dụng Flowa thu thập, sử dụng, lưu trữ và bảo vệ thông tin cá nhân của bạn khi bạn truy cập, đăng ký hoặc sử dụng các tính năng của ứng dụng Flowa.

Bằng việc sử dụng ứng dụng Flowa, bạn xác nhận đã đọc và đồng ý với các điều khoản trong Chính sách Bảo mật này. Chính sách này tuân thủ các quy định hiện hành về bảo vệ dữ liệu cá nhân tại Việt Nam (Nghị định 13/2023/NĐ-CP) và các tiêu chuẩn quốc tế.`,
  },
  {
    icon: Database,
    title: "2. Thông tin chúng tôi thu thập",
    content: `**2.1. Thông tin bạn cung cấp trực tiếp**
- Họ tên, địa chỉ email khi đăng ký tài khoản.
- Thông tin tổ chức (tên công ty, ngành nghề, quy mô).
- Thông tin thương hiệu (brand voice, sản phẩm, đối tượng khách hàng).
- Nội dung bạn tạo và chỉnh sửa trên nền tảng.
- Thông tin thanh toán (được xử lý qua cổng thanh toán bảo mật).

**2.2. Thông tin thu thập tự động**
- Địa chỉ IP, loại trình duyệt, hệ điều hành.
- Dữ liệu sử dụng: tần suất truy cập, tính năng sử dụng, thời gian phiên làm việc.
- Cookie và công nghệ theo dõi tương tự.

**2.3. Thông tin từ bên thứ ba**
- Dữ liệu từ kết nối mạng xã hội (Facebook, Instagram, LinkedIn, TikTok, v.v.) khi bạn liên kết tài khoản.
- Thông tin xác thực từ đăng nhập Google (nếu sử dụng).`,
  },
  {
    icon: Eye,
    title: "3. Mục đích sử dụng thông tin",
    content: `Chúng tôi sử dụng thông tin của bạn để:

- Cung cấp và cải thiện dịch vụ Flowa.
- Cá nhân hóa trải nghiệm AI và nội dung gợi ý.
- Xử lý thanh toán và quản lý gói dịch vụ.
- Gửi thông báo quan trọng về dịch vụ và bảo mật.
- Phân tích xu hướng sử dụng để cải thiện sản phẩm (dạng ẩn danh).
- Đảm bảo tuân thủ ngành nghề thông qua hệ thống Compliance.
- Phòng chống gian lận và bảo vệ an toàn hệ thống.
- Hỗ trợ khách hàng và giải quyết vấn đề kỹ thuật.`,
  },
  {
    icon: Lock,
    title: "4. Bảo mật dữ liệu",
    content: `**4.1. Biện pháp kỹ thuật**
- Mã hóa AES-256 cho dữ liệu nhạy cảm (token mạng xã hội, API keys).
- Mã hóa TLS/SSL cho tất cả dữ liệu truyền tải.
- Row-Level Security (RLS) cách ly dữ liệu giữa các tổ chức.
- Prompt Guard bảo vệ chống tấn công injection.
- Hệ thống audit log theo dõi mọi hoạt động quản trị.

**4.2. Biện pháp tổ chức**
- Phân quyền truy cập theo vai trò (RBAC): chỉ người có thẩm quyền mới truy cập dữ liệu nhạy cảm.
- Dữ liệu PII (Thông tin nhận dạng cá nhân) chỉ dành cho Global Admin.
- Safe views che giấu thông tin nhạy cảm trong giao diện quản trị.
- Đào tạo nhân viên về bảo mật thông tin định kỳ.

**4.3. Lưu trữ dữ liệu**
- Dữ liệu được lưu trữ trên hạ tầng đám mây đáng tin cậy với tiêu chuẩn bảo mật cao.
- Sao lưu tự động hàng ngày với mã hóa.`,
  },
  {
    icon: UserCheck,
    title: "5. Quyền của bạn",
    content: `Bạn có các quyền sau đối với dữ liệu cá nhân:

- **Quyền truy cập:** Yêu cầu bản sao dữ liệu cá nhân chúng tôi lưu trữ về bạn.
- **Quyền chỉnh sửa:** Cập nhật hoặc sửa đổi thông tin cá nhân không chính xác.
- **Quyền xóa:** Yêu cầu xóa dữ liệu cá nhân (trừ dữ liệu cần thiết cho nghĩa vụ pháp lý).
- **Quyền hạn chế xử lý:** Hạn chế cách chúng tôi sử dụng dữ liệu trong một số trường hợp.
- **Quyền di chuyển dữ liệu:** Xuất dữ liệu ở định dạng phổ biến.
- **Quyền rút lại đồng ý:** Rút lại sự đồng ý đã cho trước đó bất kỳ lúc nào.

Để thực hiện các quyền trên, liên hệ chúng tôi qua email: support@flowa.one. Chúng tôi sẽ phản hồi trong vòng 15 ngày làm việc.`,
  },
  {
    icon: Share2,
    title: "6. Chia sẻ thông tin",
    content: `**6.1. Chúng tôi KHÔNG bán dữ liệu cá nhân của bạn.**

**6.2. Chia sẻ giới hạn**
Chúng tôi chỉ chia sẻ thông tin trong các trường hợp:

- **Nhà cung cấp dịch vụ:** Các đối tác xử lý thanh toán, lưu trữ đám mây, gửi email (đều có thỏa thuận bảo mật).
- **Mạng xã hội:** Khi bạn chủ động kết nối và đăng nội dung (chỉ chia sẻ thông tin cần thiết).
- **AI Providers:** Nội dung gửi để xử lý AI được ẩn danh hóa, không chứa PII.
- **Yêu cầu pháp lý:** Khi có yêu cầu từ cơ quan có thẩm quyền theo quy định pháp luật.
- **Bảo vệ quyền lợi:** Khi cần thiết để bảo vệ quyền lợi, tài sản hoặc an toàn của Flowa và người dùng.`,
  },
  {
    icon: Clock,
    title: "7. Thời gian lưu trữ",
    content: `- **Tài khoản hoạt động:** Dữ liệu được lưu trữ suốt thời gian tài khoản còn hoạt động.
- **Sau khi hủy tài khoản:** Dữ liệu được giữ trong 30 ngày để phục hồi nếu cần, sau đó xóa vĩnh viễn.
- **Dữ liệu thanh toán:** Lưu trữ theo yêu cầu pháp luật kế toán (tối thiểu 5 năm).
- **Dữ liệu audit log:** Lưu trữ 12 tháng cho mục đích bảo mật.
- **Dữ liệu ẩn danh:** Có thể được giữ vô thời hạn cho mục đích nghiên cứu và cải thiện sản phẩm.`,
  },
  {
    icon: Bell,
    title: "8. Cookie và theo dõi",
    content: `**8.1. Các loại cookie**
- **Cookie cần thiết:** Để duy trì phiên đăng nhập và bảo mật. Không thể tắt.
- **Cookie phân tích:** Thu thập dữ liệu sử dụng ẩn danh để cải thiện dịch vụ.
- **Cookie tùy chọn:** Lưu trữ cài đặt ngôn ngữ, giao diện (sáng/tối).

**8.2. Quản lý cookie**
Bạn có thể quản lý cookie qua cài đặt trình duyệt. Tuy nhiên, tắt cookie cần thiết có thể ảnh hưởng đến trải nghiệm sử dụng.`,
  },
  {
    icon: Globe,
    title: "9. Chuyển dữ liệu quốc tế",
    content: `Dữ liệu có thể được xử lý tại các máy chủ bên ngoài Việt Nam. Trong trường hợp này, chúng tôi đảm bảo:

- Áp dụng các biện pháp bảo vệ phù hợp (Standard Contractual Clauses).
- Đối tác nhận dữ liệu tuân thủ các tiêu chuẩn bảo mật tương đương hoặc cao hơn.
- Tuân thủ quy định về chuyển dữ liệu xuyên biên giới theo Nghị định 13/2023/NĐ-CP.`,
  },
  {
    icon: Mail,
    title: "10. Liên hệ về bảo mật",
    content: `Nếu bạn có câu hỏi, khiếu nại, hoặc yêu cầu về quyền riêng tư, vui lòng liên hệ:

- **Email bảo mật:** security@flowa.one
- **Email hỗ trợ:** support@flowa.one
- **Website:** [flowa.one](https://flowa.one)

Chúng tôi cam kết phản hồi mọi yêu cầu liên quan đến bảo mật trong vòng 15 ngày làm việc.

Chính sách này có thể được cập nhật theo thời gian. Thay đổi quan trọng sẽ được thông báo qua email ít nhất 15 ngày trước khi có hiệu lực.`,
  },
];

export default function PrivacyPolicy() {
  return (
    <PublicPageLayout>
      <SEOHead
        title="Chính sách bảo mật — Flowa"
        description="Chính sách bảo mật của ứng dụng Flowa (flowa.one) — Cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của người dùng. Tuân thủ Nghị định 13/2023/NĐ-CP."
        canonicalPath="/privacy"
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
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Bảo mật</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Chính sách bảo mật của Flowa
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-2">
              Chính sách bảo mật này áp dụng cho ứng dụng <strong className="text-foreground">Flowa</strong> (flowa.one) — nền tảng AI Content Marketing.
            </p>
            <p className="text-sm text-muted-foreground">
              Cập nhật lần cuối: 17 tháng 4, 2026
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
