import { motion } from "framer-motion";
import { MessageSquare, Search, PenTool, ShieldCheck, Send } from "lucide-react";

const steps = [
  {
    num: 1,
    title: "Bạn đặt mục tiêu",
    actor: "BẠN LÀM",
    actorColor: "bg-indigo-500/20 text-indigo-400",
    body: "Gõ tự nhiên như đang nhắn tin cho đồng nghiệp.",
    icon: MessageSquare,
    examples: [
      "Lên content plan tháng 8, tập trung skincare mùa hè, 20 bài cho FB + IG + TikTok",
      "Viết bài case study về khách hàng tiết kiệm thuế 42 triệu",
      "Chiến dịch ra mắt sản phẩm mới — từ teaser đến conversion, 2 tuần, 5 kênh",
    ],
    note: "Không cần brief template. Không cần format đặc biệt. Agent tự hiểu.",
  },
  {
    num: 2,
    title: "Agent nghiên cứu & lên chiến lược",
    actor: "AGENT LÀM",
    actorColor: "bg-emerald-500/20 text-emerald-400",
    body: "Agent tự động thực hiện song song:",
    icon: Search,
    bullets: [
      "Phân tích xu hướng ngành real-time",
      "Scan nội dung đối thủ",
      "Recall bài cũ đã hoạt động tốt",
      "Chọn chủ đề & phân bổ theo customer journey",
    ],
  },
  {
    num: 3,
    title: "Tạo nội dung — đã tối ưu cho từng kênh",
    actor: "AGENT LÀM",
    actorColor: "bg-emerald-500/20 text-emerald-400",
    body: "Tạo bài gốc chất lượng cao → tự động biến thể cho từng kênh. Facebook nhận bài dài storytelling. TikTok nhận hook 3 giây + script ngắn. LinkedIn nhận thought leadership.",
    icon: PenTool,
    note: "Không phải copy-paste rồi cắt ngắn. Mỗi kênh được tái cấu trúc hoàn toàn.",
  },
  {
    num: 4,
    title: "Tự đánh giá — tự sửa",
    actor: "AGENT LÀM",
    actorColor: "bg-emerald-500/20 text-emerald-400",
    body: "Trước khi bạn thấy output, Agent đã tự chấm điểm 8 tiêu chí:",
    icon: ShieldCheck,
    criteria: ["Hook Strength", "Brand Voice", "Compliance", "Channel Fit", "Content Structure", "Engagement", "CTA Quality", "Readability"],
    note: "Tổng 100 điểm. Score < 75 → Agent tự sửa rồi chấm lại. Vẫn chưa đạt → gửi cho bạn review kèm ghi chú cụ thể.",
  },
  {
    num: 5,
    title: "Duyệt & đăng bài",
    actor: "TỰ ĐỘNG HOẶC BẠN DUYỆT",
    actorColor: "bg-violet-500/20 text-violet-400",
    body: "Đạt chuẩn chất lượng + không vi phạm compliance → tự động xếp vào lịch đăng. Bạn có thể bật Smart Auto-Approve hoặc duyệt thủ công.",
    icon: Send,
    channels: ["Facebook", "Instagram", "TikTok", "LinkedIn", "X/Twitter", "Zalo OA", "Email", "YouTube", "Telegram", "Google Maps", "Website", "Blog"],
  },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 mb-4">
            CÁCH HOẠT ĐỘNG
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            5 bước — bạn chỉ làm{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">bước 1</span>
          </h2>
          <p className="text-muted-foreground">Phần còn lại, Agent tự xử lý trong pipeline tự động.</p>
        </motion.div>

        <div className="space-y-0">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
                className="relative pl-12 pb-10 last:pb-0"
              >
                {/* Timeline line */}
                {idx < steps.length - 1 && (
                  <div className="absolute left-[18px] top-10 bottom-0 w-px bg-border" />
                )}

                {/* Number circle */}
                <div className="absolute left-0 top-0 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                  {step.num}
                </div>

                {/* Content */}
                <div className="rounded-xl border border-border bg-muted/30 p-5">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${step.actorColor}`}>
                      {step.actor}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>

                  {step.examples && (
                    <ul className="mt-3 space-y-1.5">
                      {step.examples.map((ex, i) => (
                        <li key={i} className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
                          "{ex}"
                        </li>
                      ))}
                    </ul>
                  )}

                  {step.bullets && (
                    <ul className="mt-3 space-y-1">
                      {step.bullets.map((b, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {step.criteria && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {step.criteria.map((c) => (
                        <span key={c} className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {step.channels && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {step.channels.map((c) => (
                        <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {step.note && (
                    <p className="text-xs text-muted-foreground/70 mt-3 italic">{step.note}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
