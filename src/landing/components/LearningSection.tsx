import { motion } from "framer-motion";
import { Brain, TrendingUp, RefreshCcw } from "lucide-react";

const cards = [
  {
    icon: Brain,
    title: "Nhớ qua mọi phiên",
    body: "Brand voice, sản phẩm, persona, thuật ngữ ngành — Agent nhớ cross-session. Không cần nhắc lại guidelines mỗi lần.",
  },
  {
    icon: TrendingUp,
    title: "Học từ hiệu suất",
    body: "Bài nào engagement cao? Hook nào hoạt động tốt? CTA nào convert? Agent phân tích và áp dụng bài học vào content tiếp theo.",
  },
  {
    icon: RefreshCcw,
    title: "Không lặp, không nhàm",
    body: "Agent nhớ 10 chủ đề gần nhất, tự tránh lặp lại, và tự đề xuất góc nhìn mới cho cùng một topic.",
  },
];

export function LearningSection() {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-violet-500/30 bg-violet-500/10 text-violet-400 mb-4">
            CROSS-SESSION INTELLIGENCE
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Agent ghi nhớ, học hỏi,{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">tiến hóa</span>
          </h2>
          <p className="text-muted-foreground">Không bắt đầu lại từ đầu mỗi lần. Flowa nhớ mọi thứ về thương hiệu của bạn.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="rounded-xl border border-border bg-muted/30 p-6 text-center"
              >
                <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
