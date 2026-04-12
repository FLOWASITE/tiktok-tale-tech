import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/* ─── Inline SVG icons (no emoji, no icon-font) ─── */
const PipelineIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="5" cy="12" r="2.5" />
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="19" cy="12" r="2.5" />
    <path d="M7.5 11L9.5 6.5" />
    <path d="M14.5 6.5L16.5 11" />
  </svg>
);

const CalendarXIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M3 9h18" />
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <path d="M10 14l4 4" />
    <path d="M14 14l-4 4" />
  </svg>
);

const ShieldAlertIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M12 3l9 4.5v5c0 4.7-3.6 8.8-9 10.5-5.4-1.7-9-5.8-9-10.5v-5L12 3z" />
    <path d="M12 9v4" />
    <circle cx="12" cy="16" r="0.5" fill="currentColor" />
  </svg>
);

const PuzzleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.5 3h4.413a1 1 0 0 1 .874.514C11.28 4.368 12 5.1 12 6c0 .9-.72 1.632-1.213 2.486A1 1 0 0 1 9.913 9H5.5A1.5 1.5 0 0 1 4 7.5v-3A1.5 1.5 0 0 1 5.5 3z" />
    <path d="M16 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 10 18.5v-4" opacity="0.35" />
  </svg>
);

/* ─── Count-up hook ─── */
function useCountUp(target: number, inView: boolean, duration = 1200, delay = 200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timeout);
  }, [inView, target, duration, delay]);
  return value;
}

/* ─── Card data ─── */
const cards = [
  {
    icon: PipelineIcon,
    statValue: 4,
    statSuffix: "-6 giờ",
    titleKey: "problem.card1.title",
    titleFallback: "6 bước thủ công — không ai giám sát pipeline",
    descKey: "problem.card1.desc",
    descFallback: "Nghiên cứu → Brief → Viết → Review → Sửa → Đăng. Mỗi bước một người khác, một tool khác. AI viết nhanh hơn — nhưng 5 bước còn lại vẫn do bạn làm tay.",
    insightKey: "problem.card1.insight",
    insightFallback: "→ Cần Agent điều phối toàn bộ pipeline, không chỉ viết",
  },
  {
    icon: CalendarXIcon,
    statValue: 72,
    statSuffix: "%",
    titleKey: "problem.card2.title",
    titleFallback: "Content plan không bao giờ thực thi đúng",
    descKey: "problem.card2.desc",
    descFallback: "Đầu tháng lên plan 20 bài, cuối tháng publish được 12. Không ai tracking bài nào đã viết, bài nào đang review, bài nào trễ. Plan trên Sheet, viết trên Canva, publish bằng tay — mỗi thứ một nơi.",
    insightKey: "problem.card2.insight",
    insightFallback: "→ Cần Agent tự lên plan VÀ tự thực thi theo đúng lịch",
  },
  {
    icon: ShieldAlertIcon,
    statValue: 70,
    statSuffix: " triệu",
    titleKey: "problem.card3.title",
    titleFallback: "Scale nhanh = mất kiểm soát chất lượng",
    descKey: "problem.card3.desc",
    descFallback: "Thêm kênh, thêm người viết — brand voice loãng dần. Ngành y tế, tài chính, giáo dục: một từ sai có thể bị phạt, bài viral sai thông tin thì không gỡ kịp. Không hệ thống nào review trước khi publish.",
    insightKey: "problem.card3.insight",
    insightFallback: "→ Cần Agent tự kiểm tra chất lượng + compliance trước khi xuất",
  },
  {
    icon: PuzzleIcon,
    statValue: 1,
    statSuffix: "/6",
    titleKey: "problem.card4.title",
    titleFallback: "AI tool chỉ giải quyết một khâu duy nhất",
    descKey: "problem.card4.desc",
    descFallback: "ChatGPT viết bài trong 30 giây. Nhưng ai check brand voice? Ai format từng kênh? Ai kiểm compliance? Ai xếp lịch? Ai học từ data để bài sau tốt hơn? Tiết kiệm khâu viết, mắc kẹt ở 5 khâu còn lại.",
    insightKey: "problem.card4.insight",
    insightFallback: "→ Cần Agent chạy end-to-end, không chỉ generate text",
  },
];

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] },
});

/* ─── Card component ─── */
function ProblemCard({ card, index }: { card: typeof cards[0]; index: number }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const count = useCountUp(card.statValue, inView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden rounded-[20px] border border-red-100/60 bg-red-50/30 p-8 sm:p-9 transition-all duration-350 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-100/30 hover:border-red-200/60 group"
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(248,113,113,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Icon */}
      <div className="w-[52px] h-[52px] rounded-[14px] bg-red-100/50 border border-red-200/40 flex items-center justify-center mb-6 text-red-400/70">
        <card.icon />
      </div>

      {/* Stat */}
      <div
        className="text-4xl sm:text-[36px] font-extrabold leading-none mb-1.5 tracking-tight"
        style={{
          background: "linear-gradient(135deg, #f87171, #fb923c)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {count}{card.statSuffix}
      </div>

      {/* Title */}
      <h3 className="text-[17px] font-bold text-foreground/88 leading-snug mb-3">
        {t(card.titleKey, card.titleFallback)}
      </h3>

      {/* Desc */}
      <p className="text-sm font-normal text-muted-foreground/70 leading-relaxed">
        {t(card.descKey, card.descFallback)}
      </p>

      {/* Bottom insight */}
      <div className="mt-5 pt-4 border-t border-border/30 text-[12.5px] font-medium italic text-indigo-400/50 tracking-wide">
        {t(card.insightKey, card.insightFallback)}
      </div>
    </motion.div>
  );
}

/* ─── Main Section ─── */
export function ProblemSection() {
  const { t } = useTranslation();
  const headRef = useRef<HTMLDivElement>(null);
  const headInView = useInView(headRef, { once: true, margin: "-60px" });
  const transRef = useRef<HTMLDivElement>(null);
  const transInView = useInView(transRef, { once: true, margin: "-60px" });

  return (
    <section id="problem" className="relative py-20 lg:py-28 overflow-hidden">
      {/* Ambient BG */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 60% 40% at 30% 30%, rgba(248,113,113,0.035) 0%, transparent 60%)",
            "radial-gradient(ellipse 50% 50% at 70% 70%, rgba(251,146,60,0.025) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

      <div className="container mx-auto relative z-10" style={{ maxWidth: 1200, padding: "0 clamp(20px, 5vw, 64px)" }}>
        {/* ── Heading ── */}
        <div ref={headRef} className="text-center mb-16">
          <motion.div
            {...fadeUp(0)}
            animate={headInView ? fadeUp(0).animate : {}}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-5"
            style={{
              borderColor: "rgba(248,113,113,0.15)",
              background: "rgba(248,113,113,0.04)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <circle cx="12" cy="16" r="0.5" fill="#f87171" />
            </svg>
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#e57373" }}>
              {t("problem.tag", "VẤN ĐỀ")}
            </span>
          </motion.div>

          <motion.h2
            {...fadeUp(0.08)}
            animate={headInView ? fadeUp(0.08).animate : {}}
            className="text-3xl sm:text-4xl md:text-[44px] font-extrabold text-foreground tracking-tight leading-tight"
          >
            {t("problem.heading", "Bạn đang vận hành content marketing bằng tay")}
          </motion.h2>

          <motion.p
            {...fadeUp(0.16)}
            animate={headInView ? fadeUp(0.16).animate : {}}
            className="text-base text-muted-foreground/50 max-w-[540px] mx-auto mt-4 leading-relaxed font-normal"
          >
            {t("problem.subheading", "Viết nhanh hơn không phải giải pháp — khi cả quy trình vẫn phụ thuộc vào con người.")}
          </motion.p>
        </div>

        {/* ── Cards grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map((card, i) => (
            <ProblemCard key={i} card={card} index={i} />
          ))}
        </div>

        {/* ── Transition statement ── */}
        <div ref={transRef} className="text-center pt-20 max-w-[720px] mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            animate={transInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="text-[13px] font-medium uppercase tracking-widest mb-5 text-foreground/15"
          >
            {t("problem.transition.ask", "VẬY GIẢI PHÁP LÀ GÌ?")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={transInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="text-2xl sm:text-3xl font-bold text-foreground/18 leading-snug tracking-tight">
              {t("problem.transition.line1", "Bạn không cần thêm một tool viết.")}
            </p>
            <p className="text-2xl sm:text-3xl font-bold leading-snug tracking-tight mt-1">
              <span className="text-foreground/18">
                {t("problem.transition.line2prefix", "Bạn cần một ")}
              </span>
              <span
                style={{
                  background: "linear-gradient(135deg, #818cf8, #c084fc)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t("problem.transition.line2highlight", "Agent vận hành")}
              </span>
              <span className="text-foreground/18">.</span>
            </p>
          </motion.div>

          {/* Decorative gradient line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={transInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="w-12 h-0.5 rounded-full mx-auto mt-8 opacity-40"
            style={{ background: "linear-gradient(90deg, #818cf8, #c084fc)" }}
          />
        </div>
      </div>
    </section>
  );
}
