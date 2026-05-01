import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Leaf, TrendingUp, Calendar, Zap, Sparkles, Clock, 
  BookmarkPlus, BookmarkCheck, Play, CalendarPlus, Info, ImageIcon, Video, Layers,
  Target, BarChart3, Users, Trophy, Flame, Gift, Star, X, Clapperboard, GripVertical, 
  Globe, Database, FileText, Link2, BookOpen, Navigation, Search, ShoppingCart, Key,
  Crown, GitBranch, ListTree, MessageCircleQuestion, Rocket, Repeat, 
  PieChart, Mic, Briefcase, BookMarked, Presentation, Radio, Smile, Vote, Quote, Mail,
  Home, Award, DollarSign,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { EnhancedTopicSuggestion, TopicCategory, TopicFormat, TopicDataSource, SearchIntent, ClusterRole, ContentTier, CONTENT_TIER_LABELS, MediaOwnership, MEDIA_OWNERSHIP_LABELS, calculateOverallScore, getScoreColor, SCORE_THRESHOLDS } from '@/types/topicDiscovery';
import { TopicQuickPreview } from './TopicQuickPreview';

interface TopicIdeaCardProps {
  topic: EnhancedTopicSuggestion;
  onSelect: (topic: EnhancedTopicSuggestion) => void;
  onSave?: (topic: EnhancedTopicSuggestion) => void;
  onSchedule?: (topic: EnhancedTopicSuggestion) => void;
  onShowExplanation?: (topic: EnhancedTopicSuggestion) => void;
  onRemove?: (topic: EnhancedTopicSuggestion) => void;
  onCreateScript?: (topic: EnhancedTopicSuggestion) => void;
  isSelected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  selectable?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  isDraft?: boolean;
  brandTemplateId?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, topic: EnhancedTopicSuggestion) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const categoryConfig: Record<TopicCategory, { icon: typeof Leaf; gradient: string; bgClass: string; textClass: string; label: string }> = {
  evergreen: {
    icon: Leaf,
    gradient: 'from-emerald-500 to-teal-500',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    label: 'Evergreen',
  },
  trending: {
    icon: TrendingUp,
    gradient: 'from-orange-500 to-amber-500',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-600 dark:text-orange-400',
    label: 'Trending',
  },
  seasonal: {
    icon: Calendar,
    gradient: 'from-purple-500 to-violet-500',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-600 dark:text-purple-400',
    label: 'Seasonal',
  },
  reactive: {
    icon: Zap,
    gradient: 'from-red-500 to-rose-500',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-600 dark:text-red-400',
    label: 'Reactive',
  },
};

const formatIcons: Record<TopicFormat, LucideIcon> = {
  carousel: ImageIcon,
  script: Video,
  multichannel: Layers,
  // Extended formats
  blog_post: FileText,
  infographic: PieChart,
  podcast: Mic,
  case_study: Briefcase,
  whitepaper: BookMarked,
  webinar: Presentation,
  live_stream: Radio,
  ugc: Users,
  meme: Smile,
  poll: Vote,
  testimonial: Quote,
  newsletter: Mail,
};

// Search Intent configuration
const searchIntentConfig: Record<SearchIntent, { icon: LucideIcon; label: string; color: string; bgClass: string; textClass: string; description: string }> = {
  informational: {
    icon: BookOpen,
    label: 'Info',
    color: 'blue',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
    description: 'Tìm kiếm thông tin, kiến thức',
  },
  navigational: {
    icon: Navigation,
    label: 'Nav',
    color: 'slate',
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-600 dark:text-slate-400',
    description: 'Tìm kiếm brand/website cụ thể',
  },
  commercial: {
    icon: Search,
    label: 'Com',
    color: 'amber',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    description: 'So sánh, nghiên cứu trước khi mua',
  },
  transactional: {
    icon: ShoppingCart,
    label: 'Trans',
    color: 'emerald',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    description: 'Sẵn sàng mua hàng, chuyển đổi',
  },
};

// Cluster Role configuration
const clusterRoleConfig: Record<ClusterRole, { icon: LucideIcon; label: string; color: string; bgClass: string; textClass: string; description: string }> = {
  pillar: {
    icon: Crown,
    label: 'Pillar',
    color: 'amber',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    description: 'Nội dung trụ cột, bao quát chủ đề lớn',
  },
  cluster: {
    icon: GitBranch,
    label: 'Cluster',
    color: 'blue',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
    description: 'Nội dung chi tiết, liên kết với pillar',
  },
  standalone: {
    icon: FileText,
    label: 'Standalone',
    color: 'slate',
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-600 dark:text-slate-400',
    description: 'Nội dung độc lập',
  },
};

// Content Tier (3H Model) configuration
const contentTierConfig: Record<ContentTier, { icon: LucideIcon; label: string; color: string; bgClass: string; textClass: string; description: string; percentage: string }> = {
  hero: {
    icon: Rocket,
    label: 'Hero',
    color: 'purple',
    bgClass: 'bg-gradient-to-r from-purple-500/10 to-pink-500/10',
    textClass: 'text-purple-600 dark:text-purple-400',
    description: 'Big campaign, viral content, tạo awareness mạnh',
    percentage: '10%',
  },
  hub: {
    icon: Repeat,
    label: 'Hub',
    color: 'blue',
    bgClass: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
    description: 'Regular series, xây dựng audience trung thành',
    percentage: '30%',
  },
  hygiene: {
    icon: Search,
    label: 'Hygiene',
    color: 'emerald',
    bgClass: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    description: 'Always-on, SEO-driven, thu hút traffic tự nhiên',
    percentage: '60%',
  },
};

// Media Ownership (Owned/Earned/Paid) configuration
const mediaOwnershipConfig: Record<MediaOwnership, { icon: LucideIcon; label: string; color: string; bgClass: string; textClass: string; description: string; examples: string[] }> = {
  owned: {
    icon: Home,
    label: 'Owned',
    color: 'blue',
    bgClass: 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
    description: 'Kênh do brand sở hữu và kiểm soát hoàn toàn',
    examples: ['Website/Blog', 'Email', 'Fanpage', 'App'],
  },
  earned: {
    icon: Award,
    label: 'Earned',
    color: 'emerald',
    bgClass: 'bg-gradient-to-r from-emerald-500/10 to-green-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    description: 'Nội dung viral, được chia sẻ tự nhiên',
    examples: ['PR/Media', 'Reviews', 'Word-of-mouth', 'UGC'],
  },
  paid: {
    icon: DollarSign,
    label: 'Paid',
    color: 'amber',
    bgClass: 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    description: 'Quảng cáo trả phí để đạt reach nhanh',
    examples: ['Facebook Ads', 'Google Ads', 'Sponsored', 'Influencer'],
  },
};

const scoreConfig = [
  { key: 'brandFit' as const, label: 'Brand', icon: Target, description: 'Phù hợp với brand positioning' },
  { key: 'trend' as const, label: 'Trend', icon: TrendingUp, description: 'Mức độ trending hiện tại' },
  { key: 'competition' as const, label: 'Cạnh tranh', icon: BarChart3, description: 'Ít cạnh tranh = điểm cao' },
  { key: 'engagement' as const, label: 'Tương tác', icon: Users, description: 'Tiềm năng engagement' },
];

// Event icon mapping for seasonal/reactive topics
const getEventIcon = (eventName?: string) => {
  if (!eventName) return null;
  const lowerEvent = eventName.toLowerCase();
  if (lowerEvent.includes('tết') || lowerEvent.includes('new year')) return Gift;
  if (lowerEvent.includes('valentine')) return Star;
  if (lowerEvent.includes('black friday') || lowerEvent.includes('sale')) return Flame;
  if (lowerEvent.includes('deadline') || lowerEvent.includes('quyết toán')) return Clock;
  return Calendar;
};

export function TopicIdeaCard({
  topic,
  onSelect,
  onSave,
  onSchedule,
  onShowExplanation,
  onRemove,
  onCreateScript,
  isSelected,
  disabled,
  compact = false,
  selectable = false,
  checked = false,
  onCheckedChange,
  isDraft = true,
  brandTemplateId,
  draggable = false,
  onDragStart,
  onDragEnd,
}: TopicIdeaCardProps) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const config = categoryConfig[topic.category] || categoryConfig.evergreen;
  const CategoryIcon = config.icon;
  const EventIcon = getEventIcon(topic.relatedEvent);

  const overallScore = topic.scores ? calculateOverallScore(topic.scores) : null;
  const scoreColorClass = overallScore !== null ? getScoreColor(overallScore) : 'slate';

  // Check if topic supports script format
  const supportsScript = topic.formats.includes('script');

  const handleCreateScript = () => {
    if (onCreateScript) {
      onCreateScript(topic);
    } else {
      // Default: navigate to script creation with topic
      const params = new URLSearchParams({ topic: topic.topic });
      if (brandTemplateId) params.set('brandId', brandTemplateId);
      navigate(`/videos?tab=scripts&${params.toString()}`);
    }
  };

  const getScoreBarColor = (value: number) => {
    if (value >= SCORE_THRESHOLDS.excellent) return 'bg-emerald-500';
    if (value >= SCORE_THRESHOLDS.good) return 'bg-amber-500';
    if (value >= SCORE_THRESHOLDS.fair) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreGradient = (value: number) => {
    if (value >= SCORE_THRESHOLDS.excellent) return 'from-emerald-500 to-teal-400';
    if (value >= SCORE_THRESHOLDS.good) return 'from-amber-500 to-yellow-400';
    if (value >= SCORE_THRESHOLDS.fair) return 'from-orange-500 to-amber-400';
    return 'from-red-500 to-rose-400';
  };

  // Format event date for display
  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (draggable && onDragStart) {
      e.dataTransfer.setData('application/json', JSON.stringify(topic));
      e.dataTransfer.effectAllowed = 'move';
      onDragStart(e, topic);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  const cardContent = (
    <Card
      className={cn(
        'group relative transition-all duration-300 cursor-pointer overflow-hidden',
        'hover:shadow-lg hover:-translate-y-0.5',
        'border-border/50 hover:border-primary/30',
        isSelected && 'ring-2 ring-primary border-primary',
        checked && 'ring-2 ring-primary/50 bg-primary/5',
        disabled && 'opacity-50 cursor-not-allowed',
        draggable && 'cursor-grab active:cursor-grabbing',
        compact ? 'p-3' : 'p-4'
      )}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        if (selectable && onCheckedChange) {
          e.stopPropagation();
          onCheckedChange(!checked);
        } else if (!disabled) {
          onSelect(topic);
        }
      }}
    >
      {/* Category gradient accent */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r',
          config.gradient
        )}
      />

      {/* Drag Handle */}
      {draggable && (
        <div className="absolute top-1/2 -left-0.5 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-1 rounded-r bg-muted/80 backdrop-blur-sm">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Checkbox for selection mode */}
      {selectable && (
        <div 
          className="absolute top-3 left-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={checked}
            onCheckedChange={(val) => onCheckedChange?.(!!val)}
            className="bg-background"
          />
        </div>
      )}

      {/* Header */}
      <div className={cn('flex items-start gap-3', compact ? 'mb-2' : 'mb-3', selectable && 'pl-6', draggable && !selectable && 'pl-2')}>
        <div className={cn('rounded-lg shrink-0', config.bgClass, compact ? 'p-1.5' : 'p-2')}>
          <CategoryIcon className={cn(config.textClass, compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={cn('font-medium line-clamp-2 mb-1', compact ? 'text-xs' : 'text-sm')}>{topic.topic}</h4>
          
          {/* Category, Event & Pillar badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.bgClass, config.textClass)}>
              {config.label}
            </Badge>
            
            {/* Seasonal Event Badge */}
            {topic.relatedEvent && EventIcon && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 gap-0.5 animate-pulse"
                    >
                      <EventIcon className="w-2.5 h-2.5" />
                      {formatEventDate(topic.eventDate)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {topic.relatedEvent}
                    </p>
                    {topic.eventDate && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Ngày: {topic.eventDate}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {topic.pillar && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {topic.pillar}
              </Badge>
            )}
          </div>

          {/* Data Source Badges - Phase 1 */}
          {topic.dataSources?.hasRealData && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {topic.dataSources.perplexity && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className="text-[9px] px-1.5 py-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 gap-0.5"
                      >
                        <Globe className="w-2.5 h-2.5" />
                        Web Data
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Dữ liệu từ Perplexity Web Search
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Topic này sử dụng dữ liệu thực tế từ internet
                      </p>
                      {topic.dataSources.citations && topic.dataSources.citations.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-border/50">
                          <p className="text-[10px] text-muted-foreground">Nguồn:</p>
                          {topic.dataSources.citations.slice(0, 2).map((cite, i) => (
                            <p key={i} className="text-[9px] text-blue-500 truncate">{cite}</p>
                          ))}
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {topic.dataSources.statistics && topic.dataSources.statistics.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className="text-[9px] px-1.5 py-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-0.5"
                      >
                        <Database className="w-2.5 h-2.5" />
                        Stats
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        Số liệu thực tế
                      </p>
                      <div className="mt-1 space-y-0.5">
                        {topic.dataSources.statistics.slice(0, 2).map((stat, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground">• {stat}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}

          {/* Search Intent & Keywords Badge */}
          {topic.searchIntent && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-[9px] px-1.5 py-0 gap-0.5',
                        searchIntentConfig[topic.searchIntent].bgClass,
                        searchIntentConfig[topic.searchIntent].textClass,
                        'border-current/30'
                      )}
                    >
                      {React.createElement(searchIntentConfig[topic.searchIntent].icon, { className: 'w-2.5 h-2.5' })}
                      {searchIntentConfig[topic.searchIntent].label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px]">
                    <p className="text-xs font-medium flex items-center gap-1">
                      {React.createElement(searchIntentConfig[topic.searchIntent].icon, { className: 'w-3 h-3' })}
                      Search Intent: {topic.searchIntent.charAt(0).toUpperCase() + topic.searchIntent.slice(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {searchIntentConfig[topic.searchIntent].description}
                    </p>
                    {topic.suggestedKeywords && (
                      <div className="mt-1.5 pt-1.5 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Key className="w-2.5 h-2.5" /> SEO Keywords:
                        </p>
                        {topic.suggestedKeywords.primary && (
                          <p className="text-[10px] text-foreground font-medium mt-0.5">
                            Primary: {topic.suggestedKeywords.primary}
                          </p>
                        )}
                        {topic.suggestedKeywords.secondary?.length > 0 && (
                          <p className="text-[9px] text-muted-foreground">
                            Secondary: {topic.suggestedKeywords.secondary.join(', ')}
                          </p>
                        )}
                        {topic.suggestedKeywords.longTail?.length > 0 && (
                          <p className="text-[9px] text-muted-foreground">
                            Long-tail: {topic.suggestedKeywords.longTail.slice(0, 2).join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Cluster Role Badge */}
              {topic.clusterRole && topic.clusterRole !== 'standalone' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[9px] px-1.5 py-0 gap-0.5',
                          clusterRoleConfig[topic.clusterRole].bgClass,
                          clusterRoleConfig[topic.clusterRole].textClass,
                          'border-current/30'
                        )}
                      >
                        {React.createElement(clusterRoleConfig[topic.clusterRole].icon, { className: 'w-2.5 h-2.5' })}
                        {clusterRoleConfig[topic.clusterRole].label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-xs font-medium flex items-center gap-1">
                        {React.createElement(clusterRoleConfig[topic.clusterRole].icon, { className: 'w-3 h-3' })}
                        {clusterRoleConfig[topic.clusterRole].label} Content
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {clusterRoleConfig[topic.clusterRole].description}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Content Series Badge */}
              {topic.series && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className="text-[9px] px-1.5 py-0 gap-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                      >
                        <ListTree className="w-2.5 h-2.5" />
                        Series {topic.series.currentPart || 1}/{topic.series.totalParts}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px]">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <ListTree className="w-3 h-3" />
                        {topic.series.seriesName}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Phần {topic.series.currentPart || 1} / {topic.series.totalParts} phần
                      </p>
                      {topic.series.relatedTopics && topic.series.relatedTopics.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-border/50">
                          <p className="text-[10px] text-muted-foreground">Các phần khác:</p>
                          {topic.series.relatedTopics.slice(0, 3).map((t, i) => (
                            <p key={i} className="text-[9px] text-foreground truncate">• {t}</p>
                          ))}
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Audience Q&A Badge */}
              {topic.isFromAudienceQA && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className="text-[9px] px-1.5 py-0 gap-0.5 bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400"
                      >
                        <MessageCircleQuestion className="w-2.5 h-2.5" />
                        FAQ
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px]">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <MessageCircleQuestion className="w-3 h-3" />
                        Audience Q&A Mining
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Topic này được tạo dựa trên câu hỏi thực tế từ khách hàng
                      </p>
                      {topic.audienceQuestion && (
                        <div className="mt-1.5 pt-1.5 border-t border-border/50">
                          <p className="text-[10px] text-muted-foreground">Câu hỏi gốc:</p>
                          <p className="text-[10px] text-foreground italic">"{topic.audienceQuestion}"</p>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Content Tier Badge (3H Model) */}
              {topic.contentTier && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[9px] px-1.5 py-0 gap-0.5',
                          contentTierConfig[topic.contentTier].bgClass,
                          contentTierConfig[topic.contentTier].textClass,
                          'border-current/30'
                        )}
                      >
                        {React.createElement(contentTierConfig[topic.contentTier].icon, { className: 'w-2.5 h-2.5' })}
                        {contentTierConfig[topic.contentTier].label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px]">
                      <p className="text-xs font-medium flex items-center gap-1">
                        {React.createElement(contentTierConfig[topic.contentTier].icon, { className: 'w-3 h-3' })}
                        {contentTierConfig[topic.contentTier].label} Content ({contentTierConfig[topic.contentTier].percentage})
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {contentTierConfig[topic.contentTier].description}
                      </p>
                      <div className="mt-1.5 pt-1.5 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground">
                          Recommended balance: Hero 10%, Hub 30%, Hygiene 60%
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Media Ownership Badge (Owned/Earned/Paid) */}
              {topic.mediaOwnership && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[9px] px-1.5 py-0 gap-0.5',
                          mediaOwnershipConfig[topic.mediaOwnership].bgClass,
                          mediaOwnershipConfig[topic.mediaOwnership].textClass,
                          'border-current/30'
                        )}
                      >
                        {React.createElement(mediaOwnershipConfig[topic.mediaOwnership].icon, { className: 'w-2.5 h-2.5' })}
                        {mediaOwnershipConfig[topic.mediaOwnership].label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px]">
                      <p className="text-xs font-medium flex items-center gap-1">
                        {React.createElement(mediaOwnershipConfig[topic.mediaOwnership].icon, { className: 'w-3 h-3' })}
                        {mediaOwnershipConfig[topic.mediaOwnership].label} Media
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {mediaOwnershipConfig[topic.mediaOwnership].description}
                      </p>
                      <div className="mt-1.5 pt-1.5 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground">
                          VD: {mediaOwnershipConfig[topic.mediaOwnership].examples.join(', ')}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Scores with animation */}
      {topic.scores && (
        <div className="space-y-1.5 mb-3">
          {scoreConfig.map(({ key, label, icon: Icon, description }) => {
            const value = topic.scores![key];
            return (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r',
                            getScoreGradient(value)
                          )}
                          style={{ 
                            width: `${value}%`,
                            animationDelay: `${scoreConfig.findIndex(s => s.key === key) * 100}ms`
                          }}
                        />
                      </div>
                      <span className={cn(
                        'text-[10px] font-medium w-6 text-right',
                        value >= SCORE_THRESHOLDS.excellent ? 'text-emerald-600 dark:text-emerald-400' :
                        value >= SCORE_THRESHOLDS.good ? 'text-amber-600 dark:text-amber-400' :
                        'text-red-600 dark:text-red-400'
                      )}>
                        {value}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    <p className="text-xs font-medium">{label}: {value}/100</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      )}

      {/* Format compatibility */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground">Phù hợp:</span>
        <div className="flex gap-1">
          {topic.formats.map((format) => {
            const FormatIcon = formatIcons[format];
            if (!FormatIcon) return null;
            return (
              <TooltipProvider key={format}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-1 rounded bg-muted/50">
                      <FormatIcon className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {format === 'carousel' && 'Carousel'}
                      {format === 'script' && 'Video Script'}
                      {format === 'multichannel' && 'Đa kênh'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {topic.bestTimeToPost && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
            <Clock className="w-3 h-3" />
            {topic.bestTimeToPost}
          </div>
        )}
      </div>

      {/* Keywords */}
      {topic.relatedKeywords && topic.relatedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {topic.relatedKeywords.slice(0, 4).map((keyword) => (
            <Badge key={keyword} variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/30">
              {keyword}
            </Badge>
          ))}
          {topic.relatedKeywords.length > 4 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/30">
              +{topic.relatedKeywords.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Reasoning button - opens explanation dialog */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-[10px] gap-1"
          onClick={(e) => {
            e.stopPropagation();
            if (onShowExplanation) {
              onShowExplanation(topic);
            }
          }}
        >
          <Info className="w-3 h-3" />
          Tại sao?
        </Button>

        <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {onSave && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 w-6 p-0 transition-all duration-300",
                      isSaved && "text-amber-500 scale-110",
                      isSaving && "animate-pulse"
                    )}
                    disabled={isSaving}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setIsSaving(true);
                      try {
                        await onSave(topic);
                        setIsSaved(true);
                        // Reset after 2 seconds
                        setTimeout(() => setIsSaved(false), 2000);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    ) : isDraft ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <BookmarkPlus className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isSaved ? 'Đã lưu!' : isDraft ? 'Giữ lại' : 'Lưu'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(topic);
                  }}
                >
                  <Play className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sử dụng ngay</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Create Script button - only show if format includes script */}
          {supportsScript && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateScript();
                    }}
                  >
                    <Clapperboard className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tạo Script</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {onSchedule && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSchedule(topic);
                    }}
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lên lịch</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Overall score badge - enhanced */}
      {overallScore !== null && (
        <div className="absolute -top-2 -right-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ring-2 ring-background',
                    'bg-gradient-to-br',
                    overallScore >= SCORE_THRESHOLDS.excellent ? 'from-emerald-500 to-teal-600' :
                    overallScore >= SCORE_THRESHOLDS.good ? 'from-amber-500 to-yellow-600' :
                    overallScore >= SCORE_THRESHOLDS.fair ? 'from-orange-500 to-amber-600' :
                    'from-red-500 to-rose-600'
                  )}
                >
                  {overallScore}
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <div className="space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Điểm tổng hợp: {overallScore}/100
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {overallScore >= SCORE_THRESHOLDS.excellent && 'Xuất sắc - Nên triển khai ngay'}
                    {overallScore >= SCORE_THRESHOLDS.good && overallScore < SCORE_THRESHOLDS.excellent && 'Tốt - Đáng để thử'}
                    {overallScore >= SCORE_THRESHOLDS.fair && overallScore < SCORE_THRESHOLDS.good && 'Khá - Cần cân nhắc'}
                    {overallScore < SCORE_THRESHOLDS.fair && 'Thấp - Không ưu tiên'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-12">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>
      )}
    </Card>
  );

  // Wrap with HoverCard for detailed preview using TopicQuickPreview
  return (
    <HoverCard openDelay={300} closeDelay={150}>
      <HoverCardTrigger asChild>
        {cardContent}
      </HoverCardTrigger>
      <HoverCardContent 
        side="right" 
        align="start" 
        className="p-0 w-auto border-0 shadow-none bg-transparent animate-in fade-in-0 zoom-in-95 slide-in-from-left-2 duration-200"
        sideOffset={12}
      >
        <TopicQuickPreview
          topic={topic}
          brandTemplateId={brandTemplateId}
          onCreateContent={(format) => {
            if (format === 'script') {
              handleCreateScript();
            } else {
              onSelect(topic);
            }
          }}
          className="animate-in fade-in-0 zoom-in-95 duration-300"
        />
      </HoverCardContent>
    </HoverCard>
  );
}
