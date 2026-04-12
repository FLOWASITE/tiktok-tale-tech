import { motion } from "framer-motion";
import { Search, Target, PenTool, RefreshCw, CheckCircle, Rocket, Check } from "lucide-react";
import { getAuthUrl } from "@/hooks/useDomainRouting";

const pipelineNodes = [
  { id: "research", label: "Research", icon: Search, done: true, active: false },
  { id: "strategy", label: "Strategy", icon: Target, done: true, active: false },
  { id: "create", label: "Create", icon: PenTool, active: true, done: false },
  { id: "review", label: "Review", icon: RefreshCw, done: false, active: false },
  { id: "approve", label: "Approve", icon: CheckCircle, done: false, active: false },
  { id: "publish", label: "Publish", icon: Rocket, done: false, active: false },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export function HeroSection() {
  const handleScrollToWorkflow = () => {
    document.getElementById("workflow")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center bg-[#09090b] overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-500/[0.07] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <motion.div
          className="grid lg:grid-cols-[1fr_0.8fr] gap-12 lg:gap-16 items-center"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {/* Left — Text */}
          <div className="flex flex-col">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
                🤖 AI Marketing Agent — Không phải AI Writing Tool
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight text-white"
            >
              Đội ngũ content của bạn —{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                chạy bằng AI Agent
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg sm:text-xl text-gray-400 max-w-lg leading-relaxed"
            >
              Flowa tự nghiên cứu thị trường, lên chiến dịch cả tháng, tạo nội dung cho 12 kênh, tự chấm điểm chất lượng, và đăng bài — không cần bạn ngồi viết từng bài.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <a
                href={getAuthUrl("register")}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
              >
                Dùng thử miễn phí →
              </a>
              <button
                onClick={handleScrollToWorkflow}
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-8 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
              >
                Xem cách hoạt động
              </button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-6 flex flex-wrap gap-6 text-sm text-gray-500"
            >
              <span>⚡ Setup 5 phút</span>
              <span>🔒 Không cần thẻ tín dụng</span>
              <span>🌏 Hỗ trợ VI · TH · EN</span>
            </motion.div>
          </div>

          {/* Right — Pipeline Visual */}
          <motion.div variants={fadeUp} className="w-full">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Agent Pipeline — Live
                </span>
              </div>

              <div className="relative flex items-start justify-between gap-1">
                <div className="absolute top-5 left-[10%] right-[10%] h-px bg-white/10" />
                <motion.div
                  className="absolute top-5 left-[10%] h-px bg-gradient-to-r from-emerald-400 to-indigo-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "35%" }}
                  transition={{ duration: 2, ease: "easeOut", delay: 0.8 }}
                />

                {pipelineNodes.map((node) => {
                  const Icon = node.icon;
                  const isActive = node.active;
                  const isDone = node.done;

                  return (
                    <div
                      key={node.id}
                      className="relative flex flex-col items-center flex-1 min-w-0"
                    >
                      <div
                        className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border transition-all ${
                          isActive
                            ? "border-indigo-500 bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                            : isDone
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Icon
                            className={`w-4 h-4 ${
                              isActive ? "text-indigo-400" : "text-gray-500"
                            }`}
                          />
                        )}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 rounded-full border border-indigo-500/50"
                            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </div>
                      <span
                        className={`mt-2 text-[11px] font-medium ${
                          isActive
                            ? "text-indigo-300"
                            : isDone
                            ? "text-emerald-400/70"
                            : "text-gray-600"
                        }`}
                      >
                        {node.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-8 text-center text-xs text-gray-500">
                Toàn bộ pipeline chạy trong ~10 phút, không cần can thiệp
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
