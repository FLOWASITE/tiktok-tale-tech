import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getAuthUrl } from "@/hooks/useDomainRouting";

export function CTASection() {
  return (
    <section className="py-16 lg:py-24 bg-[#09090b]">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Ngừng viết content.{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Bắt đầu vận hành content.
            </span>
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Để AI Agent lo chiến dịch — bạn tập trung vào chiến lược tăng trưởng.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <a
              href={getAuthUrl("register")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
            >
              Tạo tài khoản miễn phí →
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="mailto:info@flowa.one"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-all"
            >
              Đặt lịch demo 15 phút
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Miễn phí mãi mãi cho gói Starter
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Không cần thẻ tín dụng
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Setup 5 phút
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
