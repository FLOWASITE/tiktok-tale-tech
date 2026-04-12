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

/* ─── Count-up hook with overshoot ─── */
function useCountUp(target: number, inView: boolean, duration = 1200, delay = 200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const overshoot = Math.ceil(target * 0.06);
      const totalDuration = duration + 300;
      const step = (now: number) => {
        const elapsed = now - start;
        if (elapsed < duration) {
          const progress = elapsed / duration;
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(eased * (target + overshoot)));
        } else if (elapsed < totalDuration) {
          const settleProgress = (elapsed - duration) / 300;
          const settleEased = settleProgress * settleProgress;
          setValue(Math.round((target + overshoot) - overshoot * settleEased));
        } else {
          setValue(target);
          return;
        }
        requestAnimationFrame(step);
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
  transition: { duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
});

/* ─── Floating particles ─── */
function FloatingDots() {
  const dots = [
    { x: "12%", y: "18%", size: 4, dur: 12, delay: 0 },
    { x: "88%", y: "25%", size: 3, dur: 15, delay: 2 },
    { x: "75%", y: "72%", size: 5, dur: 10, delay: 1 },
    { x: "20%", y: "80%", size: 3, dur: 14, delay: 3 },
    { x: "50%", y: "45%", size: 4, dur: 11, delay: 4 },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: d.size,
            height: d.size,
            left: d.x,
            top: d.y,
            background: "rgba(248,113,113,0.15)",
          }}
          animate={{
            y: [0, -20, 0, 15, 0],
            opacity: [0.2, 0.5, 0.3, 0.5, 0.2],
          }}
          transition={{
            duration: d.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: d.delay,
          }}
        />
      ))}
    </>
  );
}

/* ─── Card component ─── */
function ProblemCard({ card, index }: { card: typeof cards[0]; index: number }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const count = useCountUp(card.statValue, inView);
  const cardNumber = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden rounded-[20px] border border-border/40 bg-card backdrop-blur-sm p-8 sm:p-9 transition-all duration-350 group"
      style={{
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
      }}
      whileHover={{
        y: -6,
        boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
        borderColor: "rgba(248,113,113,0.2)",
      }}
    >
      {/* Top accent gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-40 transition-opacity duration-300 group-hover:opacity-70 bg-primary"
      />

      {/* Ambient glow — subtle */}
      <motion.div
        className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(248,113,113,0.03) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
      />

      {/* Card number */}
      <span
        className="absolute top-5 right-6 text-[11px] font-bold tracking-wider pointer-events-none select-none"
        style={{ color: "rgba(248,113,113,0.1)" }}
      >
        {cardNumber}
      </span>

      {/* Icon */}
      <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-red-50 to-orange-50 border border-red-100/30 flex items-center justify-center mb-6 text-red-400/70 transition-all duration-300 group-hover:border-red-200/50 group-hover:scale-105">
        <card.icon />
      </div>

      {/* Stat */}
      <div
        className="text-4xl sm:text-[36px] font-extrabold leading-none mb-1.5"
        style={{
          background: "linear-gradient(135deg, #f87171, #fb923c)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-0.03em",
          textShadow: "0 2px 12px rgba(248,113,113,0.15)",
        }}
      >
        {count}{card.statSuffix}
      </div>

      {/* Title */}
      <h3 className="text-[17px] font-bold text-foreground/88 leading-snug mb-3" style={{ letterSpacing: "-0.02em" }}>
        {t(card.titleKey, card.titleFallback)}
      </h3>

      {/* Desc */}
      <p className="text-sm font-normal text-muted-foreground/60" style={{ lineHeight: 1.75 }}>
        {t(card.descKey, card.descFallback)}
      </p>

      {/* Bottom insight */}
      <div className="mt-5 pt-4 border-t border-dashed border-border/30 text-[12.5px] font-medium italic tracking-wide flex items-center gap-1.5 transition-colors duration-300 group-hover:text-indigo-400/60" style={{ color: "rgba(129,140,248,0.4)" }}>
        <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
        <span>{t(card.insightKey, card.insightFallback).replace(/^→\s*/, "")}</span>
      </div>
    </motion.div>
  );
}

/* ─── Transition particles ─── */
function TransitionParticles() {
  const particles = [
    { x: "30%", y: "20%", delay: 0 },
    { x: "70%", y: "30%", delay: 0.5 },
    { x: "45%", y: "60%", delay: 1 },
    { x: "55%", y: "15%", delay: 1.5 },
    { x: "35%", y: "75%", delay: 0.8 },
  ];
  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full pointer-events-none"
          style={{ left: p.x, top: p.y, background: "rgba(129,140,248,0.25)" }}
          animate={{
            x: [`0%`, `${50 - parseInt(p.x)}%`],
            y: [`0%`, `${50 - parseInt(p.y)}%`],
            opacity: [0.3, 0.6, 0],
            scale: [1, 1.5, 0],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}
    </>
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
    <section id="problem" className="relative py-20 lg:py-28 overflow-hidden border-t border-b border-red-100/20">
      {/* Ambient BG layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 60% 40% at 30% 30%, rgba(248,113,113,0.025) 0%, transparent 60%)",
            "radial-gradient(ellipse 50% 50% at 70% 70%, rgba(251,146,60,0.018) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(248,113,113,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(248,113,113,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating particles */}
      <FloatingDots />

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
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <circle cx="12" cy="16" r="0.5" fill="#f87171" />
              </svg>
            </motion.div>
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

          {/* Decorative dashed line from heading to cards */}
          <motion.div
            {...fadeUp(0.24)}
            animate={headInView ? fadeUp(0.24).animate : {}}
            className="flex justify-center mt-8"
          >
            <div className="w-px h-10 border-l border-dashed border-red-200/30" />
          </motion.div>
        </div>

        {/* ── Cards grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative">
          {/* Subtle crack line between rows */}
          <div
            className="hidden sm:block absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-px pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(248,113,113,0.08) 20%, rgba(248,113,113,0.12) 50%, rgba(248,113,113,0.08) 80%, transparent)",
            }}
          />
          {cards.map((card, i) => (
            <ProblemCard key={i} card={card} index={i} />
          ))}
        </div>

        {/* ── Transition statement ── */}
        <div ref={transRef} className="text-center pt-20 max-w-[720px] mx-auto relative">
          {/* Chevron down */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={transInView ? { opacity: 0.2, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-6"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground/20">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </motion.div>

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
            className="relative"
          >
            {/* Converging particles */}
            <TransitionParticles />

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

          {/* Decorative gradient line with glow */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={transInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="relative w-16 h-[3px] rounded-full mx-auto mt-8"
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: "linear-gradient(90deg, #818cf8, #c084fc)" }}
            />
            <div
              className="absolute inset-0 rounded-full blur-sm opacity-60"
              style={{ background: "linear-gradient(90deg, #818cf8, #c084fc)" }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
