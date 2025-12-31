import { 
  Shield, TrendingUp, Users, Package, Map, Sparkles, BookOpen,
  Info, User, Brain, Flame, TreeDeciduous, Search, Globe
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Context badge types from AI response
export type ContextBadgeType = 
  | 'compliance' 
  | 'top-performer' 
  | 'persona-fit' 
  | 'product-linked' 
  | 'journey' 
  | 'brand-voice' 
  | 'glossary'
  | 'personalized'
  | 'memory'
  | 'trending'
  | 'evergreen'
  | 'rag-enhanced'
  | 'web-search';

export interface ParsedContextBadge {
  type: ContextBadgeType;
  label: string;
  detail?: string; // e.g., journey stage name
  confidence?: number; // 0-1 confidence score from AI
}

// Badge configuration
const BADGE_CONFIG: Record<ContextBadgeType, {
  icon: typeof Shield;
  color: string;
  bgColor: string;
  label: string;
  description: string;
}> = {
  compliance: {
    icon: Shield,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20',
    label: 'Compliance',
    description: 'Tuân thủ quy tắc ngành nghề',
  },
  'top-performer': {
    icon: TrendingUp,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20',
    label: 'Top Performer',
    description: 'Dựa trên topics có hiệu suất cao',
  },
  'persona-fit': {
    icon: Users,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/10 hover:bg-violet-500/15 border-violet-500/20',
    label: 'Persona-fit',
    description: 'Phù hợp với Customer Persona',
  },
  'product-linked': {
    icon: Package,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20',
    label: 'Product',
    description: 'Liên kết với sản phẩm/dịch vụ',
  },
  journey: {
    icon: Map,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/15 border-cyan-500/20',
    label: 'Journey',
    description: 'Phù hợp giai đoạn hành trình khách hàng',
  },
  'brand-voice': {
    icon: Sparkles,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-500/10 hover:bg-pink-500/15 border-pink-500/20',
    label: 'Brand Voice',
    description: 'Áp dụng giọng điệu thương hiệu',
  },
  glossary: {
    icon: BookOpen,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/20',
    label: 'Glossary',
    description: 'Sử dụng thuật ngữ chuyên ngành',
  },
  personalized: {
    icon: User,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-500/10 hover:bg-teal-500/15 border-teal-500/20',
    label: 'Personalized',
    description: 'Điều chỉnh theo preferences của user',
  },
  memory: {
    icon: Brain,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/20',
    label: 'Memory',
    description: 'Nhớ từ các cuộc trò chuyện trước',
  },
  trending: {
    icon: Flame,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/15 border-orange-500/20',
    label: 'Trending',
    description: 'Topic trending hoặc theo mùa',
  },
  evergreen: {
    icon: TreeDeciduous,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10 hover:bg-green-500/15 border-green-500/20',
    label: 'Evergreen',
    description: 'Topic có giá trị lâu dài',
  },
  'rag-enhanced': {
    icon: Search,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-500/10 hover:bg-slate-500/15 border-slate-500/20',
    label: 'RAG-enhanced',
    description: 'Tham khảo content đã publish',
  },
  'web-search': {
    icon: Globe,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/15 border-cyan-500/20',
    label: 'Web Search',
    description: 'Kết quả real-time từ Perplexity',
  },
};

// Parse context badges from AI response content
export function parseContextBadges(content: string): ParsedContextBadge[] {
  const badges: ParsedContextBadge[] = [];
  
  // Pattern: 🏷️ Context: badge1, badge2, badge3
  const contextLineRegex = /🏷️\s*(?:Context|Ngữ cảnh)\s*:\s*(.+?)(?:\n|$)/gi;
  const match = contextLineRegex.exec(content);
  
  if (!match) return badges;
  
  const contextString = match[1];
  
  // Parse individual badges
  if (/🛡️\s*Compliance/i.test(contextString)) {
    badges.push({ type: 'compliance', label: 'Compliance' });
  }
  if (/📊\s*Top\s*Performer/i.test(contextString)) {
    badges.push({ type: 'top-performer', label: 'Top Performer' });
  }
  if (/🎭\s*Persona-fit/i.test(contextString)) {
    badges.push({ type: 'persona-fit', label: 'Persona-fit' });
  }
  if (/📦\s*Product-linked/i.test(contextString)) {
    badges.push({ type: 'product-linked', label: 'Product' });
  }
  
  // Journey badge with optional stage
  const journeyMatch = /🗺️\s*Journey(?::([^,\n`]+))?/i.exec(contextString);
  if (journeyMatch) {
    badges.push({ 
      type: 'journey', 
      label: 'Journey',
      detail: journeyMatch[1]?.trim() 
    });
  }
  
  if (/✨\s*Brand\s*Voice/i.test(contextString)) {
    badges.push({ type: 'brand-voice', label: 'Brand Voice' });
  }
  if (/📖\s*Glossary/i.test(contextString)) {
    badges.push({ type: 'glossary', label: 'Glossary' });
  }
  if (/👤\s*Personalized/i.test(contextString)) {
    badges.push({ type: 'personalized', label: 'Personalized' });
  }
  if (/🧠\s*Memory/i.test(contextString)) {
    badges.push({ type: 'memory', label: 'Memory' });
  }
  if (/🔥\s*Trending/i.test(contextString)) {
    badges.push({ type: 'trending', label: 'Trending' });
  }
  if (/🌲\s*Evergreen/i.test(contextString)) {
    badges.push({ type: 'evergreen', label: 'Evergreen' });
  }
  if (/🔍\s*RAG-enhanced/i.test(contextString)) {
    badges.push({ type: 'rag-enhanced', label: 'RAG-enhanced' });
  }
  if (/🌐\s*Web\s*Search/i.test(contextString)) {
    badges.push({ type: 'web-search', label: 'Web Search' });
  }
  
  return badges;
}

// Remove context line from content for cleaner display
export function removeContextLine(content: string): string {
  return content.replace(/🏷️\s*(?:Context|Ngữ cảnh)\s*:\s*.+?(?:\n|$)/gi, '').trim();
}

interface ContextBadgesProps {
  badges: ParsedContextBadge[];
  className?: string;
  variant?: 'inline' | 'stacked';
}

export function ContextBadges({ 
  badges, 
  className,
  variant = 'inline' 
}: ContextBadgesProps) {
  if (badges.length === 0) return null;
  
  return (
    <TooltipProvider>
      <div className={cn(
        'flex gap-1 flex-wrap',
        variant === 'stacked' && 'flex-col items-start',
        className
      )}>
        {badges.map((badge, index) => {
          const config = BADGE_CONFIG[badge.type];
          const Icon = config.icon;
          
          return (
            <Tooltip key={`${badge.type}-${index}`}>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className={cn(
                    'gap-1 px-1.5 py-0.5 text-[10px] font-medium cursor-help transition-colors border',
                    config.bgColor,
                    config.color
                  )}
                >
                  <Icon className="w-2.5 h-2.5" />
                  <span>
                    {config.label}
                    {badge.detail && (
                      <span className="opacity-75">: {badge.detail}</span>
                    )}
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px]">
                <div className="flex items-start gap-2">
                  <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', config.color)} />
                  <div>
                    <p className="font-medium">{config.label}</p>
                    <p className="text-muted-foreground">{config.description}</p>
                    {badge.detail && (
                      <p className="text-muted-foreground mt-1">
                        Giai đoạn: <span className="font-medium">{badge.detail}</span>
                      </p>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// Summary component for multiple context indicators
interface ContextSummaryProps {
  badges: ParsedContextBadge[];
  className?: string;
}

export function ContextSummary({ badges, className }: ContextSummaryProps) {
  if (badges.length === 0) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 border border-border/50 text-[10px] text-muted-foreground cursor-help',
            className
          )}>
            <Info className="w-3 h-3" />
            <span>{badges.length} context{badges.length > 1 ? 's' : ''} applied</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-2">
          <ContextBadges badges={badges} variant="stacked" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
