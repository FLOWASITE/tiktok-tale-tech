import { motion } from "framer-motion";
import { Lock, Building2, ShieldAlert, FileText } from "lucide-react";

const items = [
  { icon: Lock, text: "Mã hóa AES-256 + TLS" },
  { icon: Building2, text: "Cách ly dữ liệu tuyệt đối giữa các tổ chức (RLS)" },
  { icon: ShieldAlert, text: "Prompt Guard chống AI injection" },
  { icon: FileText, text: "Tuân thủ NĐ 13/2023 về bảo vệ dữ liệu cá nhân" },
];

export function TrustSection() {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Dữ liệu thương hiệu của bạn, được{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">bảo vệ tuyệt đối</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="rounded-xl border border-border bg-muted/30 p-4 text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground/70"
        >
          Nội dung gửi đến AI providers được ẩn danh hóa. Flowa không bán dữ liệu.
        </motion.p>
      </div>
    </section>
  );
}
