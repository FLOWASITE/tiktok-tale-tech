import { motion } from "framer-motion";
import { Clock, Eye, AlertTriangle } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Quy trình 6 bước, mỗi bước đều manual",
    body: "Nghiên cứu → Brief → Viết → Review → Sửa → Đăng. Team 3 người mất 4-6 giờ cho MỘT bài. Nhân lên 5 kênh, 20 bài/tháng = team kiệt sức, chất lượng giảm dần.",
    stat: "4-6 giờ / bài",
  },
  {
    icon: Eye,
    title: "AI tool viết xong — ai review?",
    body: "Jasper, ChatGPT viết nhanh nhưng output vẫn cần bạn kiểm tra brand voice, sửa CTA, format cho từng kênh, check compliance. Bạn tiết kiệm 30 phút viết, nhưng tốn thêm 45 phút sửa.",
    stat: "70% thời gian vẫn là review & sửa",
  },
  {
    icon: AlertTriangle,
    title: "Scale = Mất kiểm soát",
    body: "Thêm người viết = thêm giọng khác nhau. Thêm kênh = thêm format phải nhớ. Ngành regulated (y tế, tài chính, giáo dục) — một từ sai có thể bị phạt, mất uy tín.",
    stat: "Phạt đến 70 triệu đồng cho vi phạm quảng cáo y tế",
  },
];

export function ProblemSection() {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-red-500/30 bg-red-500/10 text-red-400 mb-4">
            VẤN ĐỀ
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Bạn đang chạy content marketing{" "}
            <span className="text-red-400">kiểu 2020</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Quy trình thủ công, không scale được, và AI tool chỉ giải quyết 1/10 vấn đề.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {problems.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="rounded-xl border border-border bg-muted/30 p-6"
            >
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.body}</p>
              <div className="pt-3 border-t border-border">
                <span className="text-sm font-bold text-red-400">{p.stat}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
