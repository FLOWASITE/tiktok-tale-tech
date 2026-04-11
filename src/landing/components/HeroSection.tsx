import { motion } from "framer-motion";
import { ArrowRight, Play, Check, Loader2, Search, Lightbulb, PenTool, ShieldCheck, ThumbsUp, Send } from "lucide-react";
import { getAuthUrl } from "@/hooks/useDomainRouting";

const pipelineNodes = [
  { label: "Research", icon: Search, status: "done" as const },
  { label: "Strategy", icon: Lightbulb, status: "done" as const },
  { label: "Create", icon: PenTool, status: "active" as const },
  { label: "Review", icon: ShieldCheck, status: "pending" as const },
  { label: "Approve", icon: ThumbsUp, status: "pending" as const },
  { label: "Publish", icon: Send, status: "pending" as const },
];

const channelOutputs = [
  { channel: "Facebook", score: 89, status: "done", color: "from-blue-500 to-blue-600" },
  { channel: "Instagram", score: 91, status: "done", color: "from-pink-500 to-purple-500" },
  { channel: "TikTok", score: 85, status: "loading", color: "from-cyan-400 to-pink-500" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" },
  }),
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-[#09090b] overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-24">
      {/* Subtle grid bg */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-[55%_45%] gap-12 lg:gap-16 items-center">

          {/* Left — Text */}
          <div className="space-y-6">
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                🤖 AI Marketing Agent — Không phải AI Writing Tool
              </span>
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
            >
              Đội ngũ content của bạn
              <br />
              — chạy bằng{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                AI Agent
              </span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-lg sm:text-xl text-gray-400 max-w-lg leading-relaxed"
            >
              Flowa tự nghiên cứu, lên chiến dịch, tạo content đa kênh, tự đánh giá chất lượng và đăng bài — hoàn toàn tự động.
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-3 pt-2"
            >
              <a
                href={getAuthUrl("register")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                Bắt đầu miễn phí
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#workflow"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-all"
              >
                <Play className="w-4 h-4" />
                Xem cách hoạt động
              </a>
            </motion.div>

            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-4 pt-2 text-sm text-gray-500"
            >
              <span>⚡ Setup 5 phút</span>
              <span>🔒 Không cần thẻ tín dụng</span>
              <span>🌏 Hỗ trợ VI · TH · EN</span>
            </motion.div>
          </div>

          {/* Right — Pipeline Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="space-y-4"
          >
            {/* Chat input mockup */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  M
                </div>
                <div className="bg-white/[0.06] rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-gray-300 leading-relaxed">
                  "Tạo campaign 2 tuần cho dòng sản phẩm mới, ưu tiên Facebook + Instagram + TikTok, tone trẻ trung năng động"
                </div>
              </div>
            </div>

            {/* Pipeline nodes */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-1 mb-3">
                {pipelineNodes.map((node) => {
                  const Icon = node.icon;
                  const isDone = node.status === "done";
                  const isActive = node.status === "active";
                  return (
                    <div key={node.label} className="flex flex-col items-center gap-1.5 flex-1 relative">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                          isDone
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isActive
                            ? "bg-indigo-500/20 text-indigo-400 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/20"
                            : "bg-white/5 text-gray-600"
                        }`}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`text-[10px] font-medium ${isDone ? "text-emerald-400" : isActive ? "text-indigo-400" : "text-gray-600"}`}>
                        {node.label}
                      </span>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-indigo-500/90 text-white text-[10px] px-2 py-0.5 rounded-full"
                        >
                          Đang tạo 20 bài cho 4 kênh...
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Spacer for tooltip */}
              <div className="h-5" />

              {/* Pulse animation bar */}
              <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  animate={{ left: ["0%", "40%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                />
              </div>
            </div>

            {/* Channel output cards */}
            <div className="grid grid-cols-3 gap-3">
              {channelOutputs.map((ch, i) => (
                <motion.div
                  key={ch.channel}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.15 }}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center"
                >
                  <div className={`text-xs font-semibold bg-gradient-to-r ${ch.color} bg-clip-text text-transparent mb-1`}>
                    {ch.channel}
                  </div>
                  <div className="text-lg font-bold text-white">{ch.score}</div>
                  <div className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
                    {ch.status === "done" ? (
                      <>Score <Check className="w-3 h-3 text-emerald-400" /></>
                    ) : (
                      <>Score <Loader2 className="w-3 h-3 text-gray-400 animate-spin" /></>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
