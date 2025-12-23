import { ReactNode } from 'react';
import { 
  Facebook, 
  Linkedin, 
  Instagram, 
  Mail,
  Music2,
  Globe,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Share2,
  ThumbsUp
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EngagementMetrics } from './EngagementMetrics';

type ChannelType = 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email' | 'twitter' | 'general';

interface ChannelMockupFrameProps {
  channel: ChannelType;
  content: string;
  brandName: string;
  logoUrl?: string;
  primaryColor?: string;
  isGenerating?: boolean;
}

// Facebook Post Mockup
function FacebookMockup({ content, brandName, logoUrl, isGenerating }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  return (
    <div className="bg-card rounded-xl shadow-lg border overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-blue-500/20">
          {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
            {brandName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm">{brandName}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>2 giờ trước</span>
            <span>·</span>
            <Globe className="w-3 h-3" />
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {isGenerating ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        )}
      </div>

      {/* Reactions bar */}
      <div className="px-4 py-2 border-t border-b flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
              <ThumbsUp className="w-3 h-3 text-white" />
            </div>
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <Heart className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className="text-xs text-muted-foreground ml-1">1.2K</span>
        </div>
        <div className="text-xs text-muted-foreground">
          89 bình luận · 34 chia sẻ
        </div>
      </div>

      {/* Action bar */}
      <div className="px-4 py-2">
        <EngagementMetrics channel="facebook" />
      </div>
    </div>
  );
}

// LinkedIn Post Mockup
function LinkedInMockup({ content, brandName, logoUrl, isGenerating }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  return (
    <div className="bg-card rounded-xl shadow-lg border overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-blue-600/20">
          {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white font-semibold">
            {brandName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm">{brandName}</p>
          <p className="text-xs text-muted-foreground">Company · 15,432 followers</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <span>3h</span>
            <span>·</span>
            <Globe className="w-3 h-3" />
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {isGenerating ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        )}
      </div>

      {/* Engagement */}
      <div className="px-4 py-3 border-t">
        <EngagementMetrics channel="linkedin" />
      </div>
    </div>
  );
}

// Instagram Post Mockup
function InstagramMockup({ content, brandName, logoUrl, isGenerating }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  return (
    <div className="bg-card rounded-xl shadow-lg border overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center gap-3 border-b">
        <div className="relative">
          <Avatar className="h-8 w-8 ring-2 ring-pink-500 ring-offset-2 ring-offset-background">
            {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 text-white font-semibold text-xs">
              {brandName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <p className="font-semibold text-sm flex-1">{brandName.toLowerCase().replace(/\s+/g, '')}</p>
        <MoreHorizontal className="w-5 h-5" />
      </div>

      {/* Image placeholder */}
      <div className="aspect-square bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-pink-900/20 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
        <Instagram className="w-16 h-16 text-muted-foreground/30" />
      </div>

      {/* Action icons */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Heart className="w-6 h-6 cursor-pointer hover:text-red-500 transition-colors" />
          <MessageCircle className="w-6 h-6 cursor-pointer hover:text-primary transition-colors" />
          <Send className="w-6 h-6 cursor-pointer hover:text-primary transition-colors" />
        </div>
        <Bookmark className="w-6 h-6 cursor-pointer hover:text-primary transition-colors" />
      </div>

      {/* Likes */}
      <div className="px-3">
        <p className="text-sm font-semibold">3,456 likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 pt-1">
        {isGenerating ? (
          <div className="space-y-1.5 animate-pulse">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-4/5" />
          </div>
        ) : (
          <p className="text-sm">
            <span className="font-semibold mr-1">{brandName.toLowerCase().replace(/\s+/g, '')}</span>
            <span className="whitespace-pre-wrap">{content}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// TikTok Post Mockup
function TikTokMockup({ content, brandName, logoUrl, isGenerating }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  return (
    <div className="bg-black rounded-xl shadow-lg overflow-hidden relative aspect-[9/16] max-h-[400px]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      
      {/* Content area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        {/* Username */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-10 w-10 border-2 border-white">
            {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-pink-500 text-white font-bold">
              {brandName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">@{brandName.toLowerCase().replace(/\s+/g, '')}</p>
          </div>
        </div>

        {/* Caption */}
        {isGenerating ? (
          <div className="space-y-1.5 animate-pulse">
            <div className="h-3 bg-white/30 rounded w-full" />
            <div className="h-3 bg-white/30 rounded w-3/4" />
          </div>
        ) : (
          <p className="text-sm mb-3 line-clamp-3">{content}</p>
        )}

        {/* Music */}
        <div className="flex items-center gap-2 text-xs">
          <Music2 className="w-3 h-3" />
          <span className="truncate">Original Sound - {brandName}</span>
        </div>
      </div>

      {/* Right sidebar actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs mt-1">12.5K</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs mt-1">456</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs mt-1">234</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs mt-1">Share</span>
        </div>
      </div>
    </div>
  );
}

// Email Mockup
function EmailMockup({ content, brandName, logoUrl, isGenerating }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  // Parse email content if it has subject
  const emailSubject = content.includes('Subject:') 
    ? content.split('\n')[0].replace('📧 Subject:', '').trim()
    : `Thông báo từ ${brandName}`;
  const emailBody = content.includes('Subject:')
    ? content.split('\n').slice(2).join('\n')
    : content;

  return (
    <div className="bg-card rounded-xl shadow-lg border overflow-hidden">
      {/* Email client header */}
      <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-muted-foreground">Inbox</span>
        </div>
      </div>

      {/* Email header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-semibold">
              {brandName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{brandName}</p>
              <span className="text-xs text-muted-foreground">10:30 AM</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">to: you@email.com</p>
          </div>
        </div>
        <h3 className="font-semibold">{emailSubject}</h3>
      </div>

      {/* Email body */}
      <div className="p-4">
        {isGenerating ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{emailBody}</p>
        )}
      </div>

      {/* Email footer */}
      <div className="px-4 py-3 border-t bg-muted/30">
        <EngagementMetrics channel="email" />
      </div>
    </div>
  );
}

export function ChannelMockupFrame(props: ChannelMockupFrameProps) {
  const { channel, ...rest } = props;

  switch (channel) {
    case 'facebook':
      return <FacebookMockup {...rest} />;
    case 'linkedin':
      return <LinkedInMockup {...rest} />;
    case 'instagram':
      return <InstagramMockup {...rest} />;
    case 'tiktok':
      return <TikTokMockup {...rest} />;
    case 'email':
      return <EmailMockup {...rest} />;
    default:
      return null;
  }
}
