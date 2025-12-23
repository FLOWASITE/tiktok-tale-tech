import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { ChannelSettings, DEFAULT_CHANNEL_SETTINGS } from '@/types/channelSettings';
import { Channel } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface ComplianceCheck {
  label: string;
  status: 'pass' | 'fail' | 'warn';
  current: string;
  expected: string;
}

interface SampleRulesComplianceProps {
  channel: Channel;
  content: string;
  rulesUsed?: ChannelSettings;
  brandAllowEmoji?: boolean;
  size?: 'sm' | 'md';
  showDetails?: boolean;
}

// Count words in text
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// Count characters in text
function countChars(text: string): number {
  return text.length;
}

// Count emojis in text
function countEmojis(text: string): number {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;
  return (text.match(emojiRegex) || []).length;
}

// Count hashtags in text
function countHashtags(text: string): number {
  const hashtagRegex = /#\w+/g;
  return (text.match(hashtagRegex) || []).length;
}

// Check if text has a CTA
function hasCTA(text: string): boolean {
  const ctaPatterns = [
    /click|bấm|nhấn/i,
    /liên hệ|contact/i,
    /đăng ký|subscribe|sign up/i,
    /mua ngay|buy now|order/i,
    /tìm hiểu|learn more|read more/i,
    /follow|theo dõi/i,
    /share|chia sẻ/i,
    /comment|bình luận/i,
    /link in bio/i,
    /👉|➡️|→/,
  ];
  return ctaPatterns.some(p => p.test(text));
}

// Check if text starts with a hook
function hasHook(text: string): boolean {
  const firstLines = text.split('\n').slice(0, 2).join(' ').trim();
  if (firstLines.length < 10) return false;
  
  // Check for common hook patterns
  const hookPatterns = [
    /^(bạn|bí mật|stop|pov:|hey|tin hot|3 điều|5 cách|đây là|này là)/i,
    /^\?|!$/,
    /🔥|👀|✨|⚡|💡/,
    /^[A-Z]{2,}/,
  ];
  return hookPatterns.some(p => p.test(firstLines)) || firstLines.length > 20;
}

export function analyzeCompliance(
  content: string,
  channel: Channel,
  rulesUsed?: ChannelSettings,
  brandAllowEmoji: boolean = true
): { checks: ComplianceCheck[]; score: number; passCount: number; totalCount: number } {
  const settings = rulesUsed || DEFAULT_CHANNEL_SETTINGS[channel];
  const checks: ComplianceCheck[] = [];
  
  // Length check
  const length = settings.length_unit === 'chars' ? countChars(content) : countWords(content);
  const lengthUnit = settings.length_unit === 'chars' ? 'ký tự' : 'chữ';
  const minLength = settings.min_length || 0;
  const maxLength = settings.max_length;
  
  let lengthStatus: 'pass' | 'fail' | 'warn' = 'pass';
  if (length < minLength) {
    lengthStatus = 'fail';
  } else if (length > maxLength) {
    lengthStatus = length > maxLength * 1.1 ? 'fail' : 'warn';
  }
  
  checks.push({
    label: 'Độ dài',
    status: lengthStatus,
    current: `${length} ${lengthUnit}`,
    expected: minLength > 0 ? `${minLength}–${maxLength} ${lengthUnit}` : `≤${maxLength} ${lengthUnit}`,
  });
  
  // Emoji check
  const emojiCount = countEmojis(content);
  const effectiveEmojiAllowed = brandAllowEmoji && settings.emoji_allowed;
  const emojiLimit = settings.emoji_limit || 0;
  
  let emojiStatus: 'pass' | 'fail' | 'warn' = 'pass';
  if (!effectiveEmojiAllowed && emojiCount > 0) {
    emojiStatus = 'fail';
  } else if (effectiveEmojiAllowed && emojiLimit > 0 && emojiCount > emojiLimit) {
    emojiStatus = emojiCount > emojiLimit * 1.5 ? 'fail' : 'warn';
  }
  
  checks.push({
    label: 'Emoji',
    status: emojiStatus,
    current: `${emojiCount}`,
    expected: effectiveEmojiAllowed ? `≤${emojiLimit}` : 'Không',
  });
  
  // Hashtag check
  const hashtagCount = countHashtags(content);
  const hashtagLimit = settings.hashtag_limit;
  
  let hashtagStatus: 'pass' | 'fail' | 'warn' = 'pass';
  if (hashtagLimit === 0 && hashtagCount > 0) {
    hashtagStatus = hashtagCount > 2 ? 'fail' : 'warn';
  } else if (hashtagLimit > 0 && hashtagCount > hashtagLimit) {
    hashtagStatus = hashtagCount > hashtagLimit * 1.5 ? 'fail' : 'warn';
  }
  
  checks.push({
    label: 'Hashtag',
    status: hashtagStatus,
    current: `${hashtagCount}`,
    expected: hashtagLimit > 0 ? `≤${hashtagLimit}` : 'Không',
  });
  
  // CTA check
  const contentHasCTA = hasCTA(content);
  let ctaStatus: 'pass' | 'fail' | 'warn' = 'pass';
  
  if (settings.cta_policy === 'required' && !contentHasCTA) {
    ctaStatus = 'fail';
  } else if (settings.cta_policy === 'none' && contentHasCTA) {
    ctaStatus = 'warn';
  }
  
  const ctaLabels: Record<string, string> = {
    required: 'Bắt buộc',
    soft: 'Mềm',
    optional: 'Tuỳ chọn',
    none: 'Không',
  };
  
  checks.push({
    label: 'CTA',
    status: ctaStatus,
    current: contentHasCTA ? 'Có' : 'Không',
    expected: ctaLabels[settings.cta_policy],
  });
  
  // Hook check
  if (settings.hook_required) {
    const contentHasHook = hasHook(content);
    checks.push({
      label: 'Hook',
      status: contentHasHook ? 'pass' : 'fail',
      current: contentHasHook ? 'Có' : 'Không',
      expected: 'Bắt buộc',
    });
  }
  
  // Calculate score
  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const totalCount = checks.length;
  const score = Math.round(((passCount + warnCount * 0.5) / totalCount) * 100);
  
  return { checks, score, passCount, totalCount };
}

export function SampleRulesCompliance({
  channel,
  content,
  rulesUsed,
  brandAllowEmoji = true,
  size = 'sm',
  showDetails = true,
}: SampleRulesComplianceProps) {
  const { checks, score, passCount, totalCount } = useMemo(
    () => analyzeCompliance(content, channel, rulesUsed, brandAllowEmoji),
    [content, channel, rulesUsed, brandAllowEmoji]
  );
  
  const overallStatus = score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail';
  
  const StatusIcon = ({ status }: { status: 'pass' | 'fail' | 'warn' }) => {
    if (status === 'pass') return <Check className="w-3 h-3 text-green-500" />;
    if (status === 'warn') return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
    return <X className="w-3 h-3 text-red-500" />;
  };
  
  const badgeVariant = overallStatus === 'pass' ? 'default' : overallStatus === 'warn' ? 'secondary' : 'destructive';
  
  if (!showDetails) {
    return (
      <Badge variant={badgeVariant} className={cn(
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        overallStatus === 'pass' && 'bg-green-500/10 text-green-600 border-green-200',
        overallStatus === 'warn' && 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
      )}>
        <StatusIcon status={overallStatus} />
        <span className="ml-1">{passCount}/{totalCount}</span>
      </Badge>
    );
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1 cursor-help">
          <Badge variant={badgeVariant} className={cn(
            size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
            overallStatus === 'pass' && 'bg-green-500/10 text-green-600 border-green-200',
            overallStatus === 'warn' && 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
          )}>
            <StatusIcon status={overallStatus} />
            <span className="ml-1">{score}%</span>
          </Badge>
          <Info className="w-3 h-3 text-muted-foreground" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="p-3 max-w-xs">
        <div className="space-y-2">
          <div className="font-medium text-xs">Kiểm tra tuân thủ Rules</div>
          <div className="space-y-1">
            {checks.map((check, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-1">
                  <StatusIcon status={check.status} />
                  <span className="text-muted-foreground">{check.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    check.status === 'pass' && 'text-green-600',
                    check.status === 'warn' && 'text-yellow-600',
                    check.status === 'fail' && 'text-red-600',
                  )}>
                    {check.current}
                  </span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-muted-foreground">{check.expected}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Compact badge for list views
export function ComplianceBadge({
  channel,
  content,
  rulesUsed,
  brandAllowEmoji = true,
}: {
  channel: Channel;
  content: string;
  rulesUsed?: ChannelSettings;
  brandAllowEmoji?: boolean;
}) {
  const { score } = useMemo(
    () => analyzeCompliance(content, channel, rulesUsed, brandAllowEmoji),
    [content, channel, rulesUsed, brandAllowEmoji]
  );
  
  const status = score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail';
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] px-1 py-0 font-normal',
        status === 'pass' && 'bg-green-50 text-green-600 border-green-200',
        status === 'warn' && 'bg-yellow-50 text-yellow-600 border-yellow-200',
        status === 'fail' && 'bg-red-50 text-red-600 border-red-200',
      )}
    >
      {status === 'pass' ? '✓' : status === 'warn' ? '!' : '✗'} {score}%
    </Badge>
  );
}
