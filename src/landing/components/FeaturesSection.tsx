import { motion } from "framer-motion";
import { Mic, Shield, Layers, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: Mic,
    heading: "Agent nhớ giọng thương hiệu của bạn — mãi mãi",
    body: "Upload brand guidelines hoặc paste 3-5 bài mẫu. Agent tự học tone, style, từ vựng đặc trưng, và áp dụng nhất quán trên mọi bài viết, mọi kênh. Viết 5 bài hay 500 bài — giọng vẫn là bạn.",
    tag: "Brand Voice AI",
  },
  {
    icon: Shield,
    heading: "Trí nhớ ngành — tự học, tự nhớ, tự kiểm tra",
    body: "Agent ghi nhớ thuật ngữ chuẩn ngành, từ cấm, quy tắc quảng cáo. Ngành y tế? Không claim 'chữa bệnh'. Tài chính? Bắt buộc disclaimer. Compliance được kiểm tra tự động TRƯỚC KHI output. Hỗ trợ 9+ nhóm ngành.",
    tag: "Industry Memory & Compliance",
  },
  {
    icon: Layers,
    heading: "Không phải copy-paste — mỗi kênh được tái cấu trúc",
    body: "Facebook nhận storytelling dài. TikTok nhận hook 3 giây + script ngắn. LinkedIn nhận insight chuyên sâu. Email nhận subject line A/B. Zalo OA nhận format phù hợp người Việt. Agent hiểu DNA từng platform.",
    tag: "12 Kênh, mỗi kênh một chiến lược",
  },
  {
    icon: CheckCircle2,
    heading: "Bạn không cần review — Agent đã review rồi",
    body: "8 tiêu chí chất lượng, tổng 100 điểm. Hook có đủ mạnh? Brand voice có đúng? CTA có rõ benefit? Compliance có vi phạm? Agent tự chấm, tự sửa nếu chưa đạt, và chỉ gửi đến bạn khi thực sự cần con người quyết định.",
    tag: "Quality Gate — Tự chấm, tự sửa",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 lg:py-24 bg-[#09090b]">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 mb-4">
            TÍNH NĂNG
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Tính năng chi tiết
          </h2>
        </motion.div>

        <div className="space-y-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-6 lg:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{f.tag}</span>
                    <h3 className="text-lg font-semibold text-white mt-1 mb-2">{f.heading}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{f.body}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
