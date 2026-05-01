import { motion, useReducedMotion } from "framer-motion";
import { Mail, Globe, ShieldCheck, Wand2, CalendarClock, ArrowRight } from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  LinkedInIcon,
  XIcon,
  ThreadsIcon,
  PinterestIcon,
  BlueskyIcon,
  TelegramIcon,
  ZaloIcon,
  GoogleBusinessIcon,
  WordPressIcon,
  BloggerIcon,
} from "@/components/icons/SocialIcons";
import { cn } from "@/lib/utils";

type Channel = {
  name: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Brand color class for the icon itself */
  colorClass: string;
};

// 16 platforms — order optimized for visual rhythm (recognizable brands first per row)
const CHANNELS: Channel[] = [
  { name: "Facebook", Icon: FacebookIcon, colorClass: "text-[#1877F2]" },
  { name: "Instagram", Icon: InstagramIcon, colorClass: "text-[#E1306C]" },
  { name: "TikTok", Icon: TikTokIcon, colorClass: "text-foreground" },
  { name: "YouTube", Icon: YouTubeIcon, colorClass: "text-[#FF0000]" },
  { name: "LinkedIn", Icon: LinkedInIcon, colorClass: "text-[#0A66C2]" },
  { name: "X (Twitter)", Icon: XIcon, colorClass: "text-foreground" },
  { name: "Threads", Icon: ThreadsIcon, colorClass: "text-foreground" },
  { name: "Pinterest", Icon: PinterestIcon, colorClass: "text-[#E60023]" },
  { name: "Bluesky", Icon: BlueskyIcon, colorClass: "text-[#0085FF]" },
  { name: "Telegram", Icon: TelegramIcon, colorClass: "text-[#26A5E4]" },
  { name: "Zalo OA", Icon: ZaloIcon, colorClass: "text-[#0068FF]" },
  { name: "Google Business", Icon: GoogleBusinessIcon, colorClass: "text-[#4285F4]" },
  { name: "WordPress", Icon: WordPressIcon, colorClass: "text-[#21759B]" },
  { name: "Blogger", Icon: BloggerIcon, colorClass: "text-[#FF5722]" },
  { name: "Website", Icon: Globe, colorClass: "text-primary" },
  { name: "Email", Icon: Mail, colorClass: "text-emerald-500" },
];

const BENEFITS = [
  {
    Icon: ShieldCheck,
    title: "Kết nối an toàn 1-click",
    body: "OAuth chính thức từ Meta, Google, LinkedIn, TikTok, X… Token tự refresh mỗi 30 phút — bạn không bao giờ phải đăng nhập lại giữa chiến dịch.",
  },
  {
    Icon: Wand2,
    title: "Tối ưu format từng kênh",
    body: "AI tự điều chỉnh độ dài, hashtag, CTA theo \"thói quen\" của Pinterest 2:3, X 280 ký tự, LinkedIn 150–400 chữ — đúng chuẩn native, không nhìn ra là AI.",
  },
  {
    Icon: CalendarClock,
    title: "Lên lịch & đăng tự động",
    body: "Đặt lịch trước cả tháng. Cron job chạy mỗi 2 phút đảm bảo bài đăng đúng giờ vàng — kể cả khi bạn đang ngủ.",
  },
];

export function SocialChannelsSection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="kenh-ket-noi"
      aria-labelledby="social-channels-heading"
      className="relative overflow-hidden py-20 sm:py-28"
    >
      {/* Subtle radial accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.06), transparent 70%)",
        }}
      />

      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Kết nối đa kênh
          </span>
          <h2
            id="social-channels-heading"
            className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
          >
            Một lần soạn — đăng khắp nơi khách hàng của bạn ở
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            16 nền tảng social & blog. Kết nối OAuth 1-click, tự động đăng đúng format từng kênh —
            bạn không cần mở 16 tab nữa.
          </p>
        </motion.div>

        {/* Logo grid */}
        <ul
          role="list"
          className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4"
        >
          {CHANNELS.map((ch, i) => (
            <motion.li
              key={ch.name}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.35,
                ease: "easeOut",
                delay: reduce ? 0 : Math.min(i * 0.04, 0.4),
              }}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border border-border/60",
                "bg-card/60 px-4 py-3.5 backdrop-blur-sm transition-all duration-300",
                "hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/90",
                "hover:shadow-[0_0_28px_-8px_hsl(var(--primary)/0.28)]"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  "bg-background/80 ring-1 ring-border/50 transition-transform duration-300",
                  "group-hover:scale-105",
                  ch.colorClass
                )}
              >
                <ch.Icon width={18} height={18} aria-hidden />
              </span>
              <span className="truncate text-sm font-medium text-foreground/90">
                {ch.name}
              </span>
            </motion.li>
          ))}
        </ul>

        {/* Benefits */}
        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:mt-20 md:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, ease: "easeOut", delay: reduce ? 0 : i * 0.08 }}
              className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <b.Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground sm:text-lg">
                {b.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Secondary CTA */}
        <div className="mt-12 flex justify-center">
          <a
            href="#pricing"
            className="group inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Xem tất cả tích hợp trong gói của bạn
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
