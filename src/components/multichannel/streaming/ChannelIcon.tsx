import { 
  Mail, 
  Globe,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  ZaloIcon, 
  XIcon, 
  WordPressIcon, 
  BloggerIcon, 
  PinterestIcon, 
  BlueskyIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  YouTubeIcon,
  TikTokIcon,
  ThreadsIcon,
  TelegramIcon,
  GoogleBusinessIcon,
} from "@/components/icons/SocialIcons";

/* Wrapper to make custom SVG icons behave like LucideIcon */
const makeLucide = (Component: any, name: string): LucideIcon =>
  Object.assign(
    ({ size = 24, className, ...props }: any) => (
      <Component width={size} height={size} className={className} {...props} />
    ),
    { displayName: name }
  ) as unknown as LucideIcon;

const ZaloLucide = makeLucide(ZaloIcon, 'ZaloLucide');
const XLucide = makeLucide(XIcon, 'XLucide');
const WordPressLucide = makeLucide(WordPressIcon, 'WordPressLucide');
const BloggerLucide = makeLucide(BloggerIcon, 'BloggerLucide');
const PinterestLucide = makeLucide(PinterestIcon, 'PinterestLucide');
const BlueskyLucide = makeLucide(BlueskyIcon, 'BlueskyLucide');
const FacebookLucide = makeLucide(FacebookIcon, 'FacebookLucide');
const InstagramLucide = makeLucide(InstagramIcon, 'InstagramLucide');
const LinkedInLucide = makeLucide(LinkedInIcon, 'LinkedInLucide');
const YouTubeLucide = makeLucide(YouTubeIcon, 'YouTubeLucide');
const TikTokLucide = makeLucide(TikTokIcon, 'TikTokLucide');
const ThreadsLucide = makeLucide(ThreadsIcon, 'ThreadsLucide');
const TelegramLucide = makeLucide(TelegramIcon, 'TelegramLucide');
const GoogleBusinessLucide = makeLucide(GoogleBusinessIcon, 'GoogleBusinessLucide');

const channelConfig: Record<string, { 
  icon: LucideIcon; 
  bgClass: string;
  label: string;
}> = {
  facebook: { 
    icon: FacebookLucide, 
    bgClass: "bg-[#1877F2] text-white",
    label: "Facebook"
  },
  instagram: { 
    icon: InstagramLucide, 
    bgClass: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white",
    label: "Instagram"
  },
  tiktok: { 
    icon: TikTokLucide, 
    bgClass: "bg-black text-white",
    label: "TikTok"
  },
  threads: { 
    icon: ThreadsLucide, 
    bgClass: "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
    label: "Threads"
  },
  email: { 
    icon: Mail, 
    bgClass: "bg-emerald-500 text-white",
    label: "Email"
  },
  zalo: { 
    icon: ZaloLucide, 
    bgClass: "bg-[#0068FF] text-white",
    label: "Zalo"
  },
  zalo_oa: { 
    icon: ZaloLucide, 
    bgClass: "bg-[#0068FF] text-white",
    label: "Zalo OA"
  },
  linkedin: { 
    icon: LinkedInLucide, 
    bgClass: "bg-[#0A66C2] text-white",
    label: "LinkedIn"
  },
  twitter: { 
    icon: XLucide, 
    bgClass: "bg-black text-white dark:bg-white dark:text-black",
    label: "X"
  },
  x: { 
    icon: XLucide, 
    bgClass: "bg-black text-white dark:bg-white dark:text-black",
    label: "X"
  },
  youtube: { 
    icon: YouTubeLucide, 
    bgClass: "bg-[#FF0000] text-white",
    label: "YouTube"
  },
  website: { 
    icon: Globe, 
    bgClass: "bg-primary text-primary-foreground",
    label: "Website"
  },
  wordpress: {
    icon: WordPressLucide,
    bgClass: "bg-transparent text-[#21759B]",
    label: "WordPress"
  },
  blogger: {
    icon: BloggerLucide,
    bgClass: "bg-transparent text-[#FF5722]",
    label: "Blogger"
  },
  pinterest: {
    icon: PinterestLucide,
    bgClass: "bg-[#E60023] text-white",
    label: "Pinterest"
  },
  google_maps: { 
    icon: GoogleBusinessLucide, 
    bgClass: "bg-white text-[#4285F4] border border-border",
    label: "Google Maps"
  },
  google_business: { 
    icon: GoogleBusinessLucide, 
    bgClass: "bg-white text-[#4285F4] border border-border",
    label: "Google Business"
  },
  telegram: { 
    icon: TelegramLucide, 
    bgClass: "bg-[#26A5E4] text-white",
    label: "Telegram"
  },
  bluesky: {
    icon: BlueskyLucide,
    bgClass: "bg-[#0085FF] text-white",
    label: "Bluesky"
  },
};

interface ChannelIconProps {
  channel: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ChannelIcon({ 
  channel, 
  size = "md", 
  showLabel = false,
  className 
}: ChannelIconProps) {
  const normalizedChannel = channel.toLowerCase().replace(/\s+/g, '');
  const config = channelConfig[normalizedChannel] || {
    icon: Globe,
    bgClass: "bg-muted text-muted-foreground",
    label: channel
  };

  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "w-5 h-5 p-1",
    md: "w-7 h-7 p-1.5",
    lg: "w-9 h-9 p-2"
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "rounded-md flex items-center justify-center shrink-0",
        sizeClasses[size],
        config.bgClass
      )}>
        <Icon size={iconSizes[size]} />
      </div>
      {showLabel && (
        <span className="text-sm font-medium truncate">
          {config.label}
        </span>
      )}
    </div>
  );
}

export function getChannelLabel(channel: string): string {
  const normalizedChannel = channel.toLowerCase().replace(/\s+/g, '');
  return channelConfig[normalizedChannel]?.label || channel;
}
