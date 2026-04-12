import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const ease = [0.4, 0, 0.2, 1] as [number, number, number, number];

// Count-up hook
function useCountUp(target: string, inView: boolean, delay = 0) {
  const [display, setDisplay] = useState("0");
  const hasRun = useRef(false);

  useEffect(() => {
    if (!inView || hasRun.current) return;
    hasRun.current = true;

    // Parse numeric part
    const numeric = parseFloat(target.replace(/[^0-9.]/g, ""));
    const suffix = target.replace(/[0-9.]/g, "");
    const isDecimal = target.includes(".");
    const duration = 1200;
    const startTime = performance.now() + delay;

    function tick(now: number) {
      const elapsed = now - startTime;
      if (elapsed < 0) {
        requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = numeric * easedProgress;

      if (isDecimal) {
        setDisplay(current.toFixed(1) + suffix);
      } else {
        setDisplay(Math.round(current) + suffix);
      }

      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [inView, target, delay]);

  return display;
}

const cards = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="5" cy="12" r="2.5" />
        <circle cx="12" cy="5" r="2.5" />
        <circle cx="19" cy="12" r="2.5" />
        <path d="M7.5 11L9.5 6.5" />
        <path d="M14.5 6.5L16.5 11" />
      </svg>
    ),
    stat: "4-6",
    statSuffix: " giờ",
    statRaw: "6",
    title: "6 bước thủ công — không ai giám sát pipeline",
    desc: "Nghiên cứu → Brief → Viết → Review → Sửa → Đăng. Mỗi bước một người khác, một tool khác. AI viết nhanh hơn — nhưng 5 bước còn lại vẫn do bạn làm tay.",
    bottom: "→ Cần Agent điều phối toàn bộ pipeline, không chỉ viết",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M3 9h18" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M10 14l4 4" />
        <path d="M14 14l-4 4" />
      </svg>
    ),
    stat: "72",
    statSuffix: "%",
    statRaw: "72",
    title: "Content plan không bao giờ thực thi đúng",
    desc: "Đầu tháng lên plan 20 bài, cuối tháng publish được 12. Không ai tracking bài nào đã viết, bài nào đang review, bài nào trễ. Plan trên Sheet, viết trên Canva, publish bằng tay — mỗi thứ một nơi.",
    bottom: "→ Cần Agent tự lên plan VÀ tự thực thi theo đúng lịch",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 3l9 4.5v5c0 4.7-3.6 8.8-9 10.5-5.4-1.7-9-5.8-9-10.5v-5L12 3z" />
        <path d="M12 9v4" />
        <circle cx="12" cy="16" r="0.5" fill="currentColor" />
      </svg>
    ),
    stat: "70",
    statSuffix: " triệu",
    statRaw: "70",
    title: "Scale nhanh = mất kiểm soát chất lượng",
    desc: "Thêm kênh, thêm người viết — brand voice loãng dần. Ngành y tế, tài chính, giáo dục: một từ sai có thể bị phạt, bài viral sai thông tin thì không gỡ kịp. Không hệ thống nào review trước khi publish.",
    bottom: "→ Cần Agent tự kiểm tra chất lượng + compliance trước khi xuất",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.5 3h4.413a1 1 0 0 1 .874.514C11.28 4.368 12 5.1 12 6c0 .9-.72 1.632-1.213 2.486A1 1 0 0 1 9.913 9H5.5A1.5 1.5 0 0 1 4 7.5v-3A1.5 1.5 0 0 1 5.5 3z" />
        <path d="M16 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 10 18.5v-4" opacity="0.35" />
      </svg>
    ),
    stat: "1/6",
    statSuffix: "",
    statRaw: "1",
    title: "AI tool chỉ giải quyết một khâu duy nhất",
    desc: "ChatGPT viết bài trong 30 giây. Nhưng ai check brand voice? Ai format từng kênh? Ai kiểm compliance? Ai xếp lịch? Ai học từ data để bài sau tốt hơn? Tiết kiệm khâu viết, mắc kẹt ở 5 khâu còn lại.",
    bottom: "→ Cần Agent chạy end-to-end, không chỉ generate text",
  },
];

function ProblemCard({ card, index }: { card: typeof cards[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  // For stat with "/" like "1/6", just display directly
  const isSlash = card.stat.includes("/");
  const countedStat = useCountUp(card.statRaw, inView, 200);

  const displayStat = isSlash
    ? (inView ? card.stat : "0/6")
    : countedStat + card.statSuffix;

  // Special display for "4-6 giờ"
  const finalStat = card.stat === "4-6"
    ? (inView ? "4-6" + card.statSuffix : "0 giờ")
    : displayStat;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease }}
      className="relative overflow-hidden rounded-[20px] p-8 sm:p-9 group"
      style={{
        background: "rgba(255, 255, 255, 0.018)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      whileHover={{
        y: -4,
        borderColor: "rgba(255, 255, 255, 0.09)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(248, 113, 113, 0.04) 0%, transparent 70%)",
        }}
      />

      {/* Icon */}
      <div
        className="flex items-center justify-center mb-6"
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "rgba(248, 113, 113, 0.05)",
          border: "1px solid rgba(248, 113, 113, 0.08)",
          color: "rgba(248, 113, 113, 0.55)",
        }}
      >
        {card.icon}
      </div>

      {/* Stat */}
      <div
        className="text-[28px] sm:text-[32px] lg:text-[36px] font-extrabold mb-1.5"
        style={{
          letterSpacing: "-0.03em",
          lineHeight: 1,
          background: "linear-gradient(135deg, #f87171, #fb923c)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {finalStat}
      </div>

      {/* Title */}
      <h3
        className="text-[17px] font-bold mb-3"
        style={{ color: "rgba(255, 255, 255, 0.88)", lineHeight: 1.35 }}
      >
        {card.title}
      </h3>

      {/* Desc */}
      <p
        className="text-sm"
        style={{ color: "rgba(255, 255, 255, 0.35)", lineHeight: 1.7 }}
      >
        {card.desc}
      </p>

      {/* Bottom insight */}
      <div
        className="mt-5 pt-4 text-[12.5px] font-medium italic"
        style={{
          borderTop: "1px dashed rgba(255, 255, 255, 0.04)",
          color: "rgba(129, 140, 248, 0.4)",
          letterSpacing: "0.01em",
        }}
      >
        {card.bottom}
      </div>
    </motion.div>
  );
}

export function ProblemSection() {
  const transRef = useRef(null);
  const transInView = useInView(transRef, { once: true, margin: "-60px" });

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#060612" }}
    >
      {/* Ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 30% 30%, rgba(248, 113, 113, 0.025) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 70% 70%, rgba(251, 146, 60, 0.018) 0%, transparent 60%)
          `,
        }}
      />

      <div
        className="relative mx-auto"
        style={{
          maxWidth: 1200,
          padding: "120px clamp(20px, 5vw, 64px) 80px",
        }}
      >
        {/* Heading block */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
          >
            <span
              className="inline-flex items-center gap-2"
              style={{
                padding: "5px 14px",
                borderRadius: 100,
                border: "1px solid rgba(248, 113, 113, 0.15)",
                background: "rgba(248, 113, 113, 0.04)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.5 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <circle cx="12" cy="16" r="0.5" fill="#f87171" />
              </svg>
              <span
                className="uppercase font-semibold"
                style={{ fontSize: 11, color: "#fca5a5", letterSpacing: "0.1em" }}
              >
                VẤN ĐỀ
              </span>
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08, ease }}
            className="font-extrabold mt-5"
            style={{
              fontSize: "clamp(28px, 3.5vw, 44px)",
              color: "#ffffff",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            Bạn đang vận hành content marketing bằng tay
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.16, ease }}
            className="mx-auto mt-4"
            style={{
              fontSize: 16,
              color: "rgba(255, 255, 255, 0.32)",
              maxWidth: 540,
              lineHeight: 1.65,
              fontWeight: 400,
            }}
          >
            Viết nhanh hơn không phải giải pháp — khi cả quy trình vẫn phụ thuộc vào con người.
          </motion.p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
          {cards.map((card, i) => (
            <ProblemCard key={i} card={card} index={i} />
          ))}
        </div>

        {/* Transition statement */}
        <div
          ref={transRef}
          className="text-center mx-auto"
          style={{ padding: "80px 20px 0", maxWidth: 720 }}
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={transInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, ease }}
            className="uppercase font-medium mb-5"
            style={{
              fontSize: 13,
              color: "rgba(255, 255, 255, 0.12)",
              letterSpacing: "0.08em",
            }}
          >
            VẬY GIẢI PHÁP LÀ GÌ?
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={transInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="font-bold"
            style={{
              fontSize: "clamp(22px, 2.8vw, 32px)",
              color: "rgba(255, 255, 255, 0.14)",
              lineHeight: 1.4,
              letterSpacing: "-0.02em",
            }}
          >
            Bạn không cần thêm một tool viết.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={transInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="font-bold mt-1"
            style={{
              fontSize: "clamp(22px, 2.8vw, 32px)",
              lineHeight: 1.4,
              letterSpacing: "-0.02em",
              color: "rgba(255, 255, 255, 0.14)",
            }}
          >
            Bạn cần một{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #818cf8, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Agent vận hành
            </span>
            .
          </motion.p>

          {/* Gradient line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={transInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5, ease }}
            className="mx-auto mt-8"
            style={{
              width: 48,
              height: 2,
              background: "linear-gradient(90deg, #818cf8, #c084fc)",
              borderRadius: 2,
              opacity: 0.4,
            }}
          />
        </div>
      </div>
    </section>
  );
}
