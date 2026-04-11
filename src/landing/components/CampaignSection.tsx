import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { CalendarDays, Rocket, Sparkles, BarChart3 } from "lucide-react";

const tabs = [
  {
    key: "calendar",
    icon: CalendarDays,
    label: "Content Calendar tháng",
    input: "Tháng 8 — skincare mùa hè, 20 bài, Facebook + TikTok + Instagram",
    output: "Agent tự tạo 20 bài với mix: 8 educate, 7 engage, 5 convert. Tự cân bằng content pillars, không lặp chủ đề, phân bổ đều 3 kênh.",
  },
  {
    key: "launch",
    icon: Rocket,
    label: "Ra mắt sản phẩm",
    input: "Launch serum Vitamin C mới, 2 tuần, 5 kênh",
    output: "Agent tự tạo chuỗi: Ngày 1-3 Teaser (IG Story, TikTok) → Ngày 4-5 Reveal (FB, LinkedIn) → Ngày 6-9 USP Deep-dive (Blog, Email) → Ngày 10-12 Social Proof → Ngày 13-14 Conversion Push.",
  },
  {
    key: "festival",
    icon: Sparkles,
    label: "Chiến dịch lễ hội",
    input: "Chiến dịch Tết 2027 cho thương hiệu bánh truyền thống",
    output: "Agent tự tạo chuỗi: T12 tuần 1-2 Nostalgia & Storytelling → Tuần 3 Gift Guide → Tuần 4 Urgency — \"Đặt trước 28 Tết\" → Mùng 1-3 Celebration + recap. Tự điều chỉnh tone theo thời điểm.",
  },
  {
    key: "quarterly",
    icon: BarChart3,
    label: "Kế hoạch quý / năm",
    input: "Q3: Tăng brand awareness 40% tại Đà Nẵng, 3 kênh chính",
    output: "Agent phân rã: T7 Local content — Đà Nẵng lifestyle → T8 Collab + UGC — KOL review, user stories → T9 Event-driven — Back to school, Mid-autumn. Phân rã OKR → chiến dịch tháng → bài viết hàng ngày.",
  },
];

export function CampaignSection() {
  const [active, setActive] = useState(0);

  return (
    <section id="campaign" className="py-16 lg:py-24 bg-[#09090b]">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 mb-4">
            CAMPAIGN AUTOPILOT
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Một câu lệnh →{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              cả chiến dịch hoàn chỉnh
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Content plan cả tháng. Chuỗi ra mắt sản phẩm. Chiến dịch Tết. Agent tự lên kế hoạch, phân bổ chủ đề, tạo nội dung, xếp lịch.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActive(i)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active === i
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "text-gray-500 border border-white/10 hover:text-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-6 lg:p-8"
          >
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Input</span>
                <p className="text-white mt-1 text-sm lg:text-base">"{tabs[active].input}"</p>
              </div>
              <div className="h-px bg-white/10" />
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Output</span>
                <p className="text-gray-300 mt-1 text-sm lg:text-base leading-relaxed">{tabs[active].output}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Pull quote */}
        <motion.blockquote
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-10 text-center"
        >
          <p className="text-gray-400 italic text-sm lg:text-base max-w-2xl mx-auto">
            "Trước mất 2 ngày lên content plan cho 1 tháng. Giờ Flowa tạo trong 30 phút — và output tốt hơn vì Agent nhớ data từ những tháng trước."
          </p>
        </motion.blockquote>
      </div>
    </section>
  );
}
