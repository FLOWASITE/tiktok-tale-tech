import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const toolItems = [
  "Bạn viết prompt → AI viết 1 bài",
  "Bạn copy-paste sang từng kênh",
  "Bạn tự review, tự sửa",
  "Bạn tự nhớ brand guidelines",
  "Bạn tự check compliance",
  "Bạn tự lên lịch, tự đăng",
  "Mỗi bài bắt đầu từ con số 0",
  "Tạo từng bài một — không có campaign",
];

const agentItems = [
  "Bạn đặt mục tiêu → Agent tự chạy pipeline",
  "Tự tối ưu nội dung riêng cho từng kênh",
  "Tự chấm 8 tiêu chí, tự sửa nếu chưa đạt",
  "Tự nhớ brand voice, tone, pillars qua mọi bài",
  "Tự kiểm tra quy định ngành trước khi xuất",
  "Tự xếp lịch và đăng bài khi đạt chuẩn",
  "Học từ bài cũ — càng dùng càng hiểu brand",
  "Tự lên kế hoạch chiến dịch cả tháng/quý",
];

export function ReframeSection() {
  return (
    <section className="py-16 lg:py-24 bg-[#09090b]">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Bạn cần một <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Agent</span>, không phải thêm một Tool
          </h2>
          <p className="text-gray-400">AI Tool chờ lệnh. AI Agent tự hành động.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Tool column */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
          >
            <div className="text-sm font-semibold text-red-400 mb-4">❌ AI Writing Tool</div>
            <ul className="space-y-3">
              {toolItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <X className="w-4 h-4 text-red-400/60 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Agent column */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border border-indigo-500/30 bg-indigo-500/[0.05] p-6"
          >
            <div className="text-sm font-semibold text-indigo-400 mb-4">✅ Flowa AI Agent</div>
            <ul className="space-y-3">
              {agentItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
