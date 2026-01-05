import { 
  Facebook, 
  Instagram, 
  Mail, 
  MessageCircle,
  Globe,
  Linkedin,
  Twitter,
  Youtube,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const channelConfig: Record<string, { 
  icon: LucideIcon; 
  bgClass: string;
  label: string;
}> = {
  facebook: { 
    icon: Facebook, 
    bgClass: "bg-blue-500 text-white",
    label: "Facebook"
  },
  instagram: { 
    icon: Instagram, 
    bgClass: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white",
    label: "Instagram"
  },
  tiktok: { 
    icon: Globe, 
    bgClass: "bg-black text-white",
    label: "TikTok"
  },
  threads: { 
    icon: MessageCircle, 
    bgClass: "bg-gray-900 text-white",
    label: "Threads"
  },
  email: { 
    icon: Mail, 
    bgClass: "bg-emerald-500 text-white",
    label: "Email"
  },
  zalo: { 
    icon: MessageCircle, 
    bgClass: "bg-blue-600 text-white",
    label: "Zalo"
  },
  linkedin: { 
    icon: Linkedin, 
    bgClass: "bg-blue-700 text-white",
    label: "LinkedIn"
  },
  twitter: { 
    icon: Twitter, 
    bgClass: "bg-sky-500 text-white",
    label: "Twitter"
  },
  x: { 
    icon: Twitter, 
    bgClass: "bg-black text-white",
    label: "X"
  },
  youtube: { 
    icon: Youtube, 
    bgClass: "bg-red-600 text-white",
    label: "YouTube"
  },
  website: { 
    icon: Globe, 
    bgClass: "bg-primary text-primary-foreground",
    label: "Website"
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
