import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight, 
  Undo2, 
  Check, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Facebook,
  Linkedin,
  Instagram,
  MessageCircle,
  Mail,
  Sparkles,
  GitCompare
} from 'lucide-react';
import { VoiceSnapshot } from '@/hooks/useBrandVoiceSnapshot';
import { cn } from '@/lib/utils';
import { ChannelType } from '@/utils/generateSampleText';

interface BrandVoiceDiffPanelProps {
  snapshot: VoiceSnapshot | null;
  isGenerating?: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
  formatValue: (value: unknown) => string;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  facebook: { label: 'Facebook', icon: <Facebook className="w-3.5 h-3.5" /> },
  linkedin: { label: 'LinkedIn', icon: <Linkedin className="w-3.5 h-3.5" /> },
  instagram: { label: 'Instagram', icon: <Instagram className="w-3.5 h-3.5" /> },
  tiktok: { label: 'TikTok', icon: <MessageCircle className="w-3.5 h-3.5" /> },
  email: { label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
};

const VISIBLE_CHANNELS: ChannelType[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'email'];

type DiffType = 'added' | 'removed' | 'unchanged';

interface DiffWord {
  type: DiffType;
  text: string;
}

// Compute word-level diff between two texts
function computeWordDiff(before: string, after: string): { beforeDiff: DiffWord[]; afterDiff: DiffWord[] } {
  const beforeWords = before.split(/(\s+)/); // Keep whitespace
  const afterWords = after.split(/(\s+)/);
  
  const beforeDiff: DiffWord[] = [];
  const afterDiff: DiffWord[] = [];
  
  // Create sets for quick lookup (only non-whitespace)
  const beforeSet = new Set(beforeWords.filter(w => w.trim()));
  const afterSet = new Set(afterWords.filter(w => w.trim()));
  
  // Mark words in before text
  beforeWords.forEach(word => {
    if (!word.trim()) {
      beforeDiff.push({ type: 'unchanged', text: word });
    } else if (!afterSet.has(word)) {
      beforeDiff.push({ type: 'removed', text: word });
    } else {
      beforeDiff.push({ type: 'unchanged', text: word });
    }
  });
  
  // Mark words in after text
  afterWords.forEach(word => {
    if (!word.trim()) {
      afterDiff.push({ type: 'unchanged', text: word });
    } else if (!beforeSet.has(word)) {
      afterDiff.push({ type: 'added', text: word });
    } else {
      afterDiff.push({ type: 'unchanged', text: word });
    }
  });
  
  return { beforeDiff, afterDiff };
}

// Render diff with highlighting
function DiffText({ diff, variant }: { diff: DiffWord[]; variant: 'before' | 'after' }) {
  return (
    <span className="text-xs leading-relaxed">
      {diff.map((word, index) => {
        if (word.type === 'unchanged') {
          return <span key={index}>{word.text}</span>;
        }
        
        if (word.type === 'removed' && variant === 'before') {
          return (
            <span
              key={index}
              className={cn(
                "bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200",
                "px-0.5 rounded-sm line-through decoration-red-500/50",
                "animate-in fade-in duration-500"
              )}
              style={{ animationDelay: `${index * 20}ms` }}
            >
              {word.text}
            </span>
          );
        }
        
        if (word.type === 'added' && variant === 'after') {
          return (
            <span
              key={index}
              className={cn(
                "bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-200",
                "px-0.5 rounded-sm font-medium",
                "animate-in fade-in zoom-in-95 duration-500"
              )}
              style={{ animationDelay: `${index * 20}ms` }}
            >
              {word.text}
            </span>
          );
        }
        
        return <span key={index}>{word.text}</span>;
      })}
    </span>
  );
}

export function BrandVoiceDiffPanel({
  snapshot,
  isGenerating = false,
  onConfirm,
  onDiscard,
  formatValue,
}: BrandVoiceDiffPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeChannel, setActiveChannel] = useState<ChannelType>('facebook');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline'>('side-by-side');

  // Compute diffs for all channels
  const channelDiffs = useMemo(() => {
    if (!snapshot?.previousSamples || !snapshot?.newSamples) return null;
    
    const diffs: Record<string, { beforeDiff: DiffWord[]; afterDiff: DiffWord[] }> = {};
    
    VISIBLE_CHANNELS.forEach(channel => {
      const before = snapshot.previousSamples?.[channel] || '';
      const after = snapshot.newSamples?.[channel] || '';
      diffs[channel] = computeWordDiff(before, after);
    });
    
    return diffs;
  }, [snapshot?.previousSamples, snapshot?.newSamples]);

  if (!snapshot) return null;

  const hasSamples = snapshot.previousSamples && snapshot.newSamples;
  const currentDiff = channelDiffs?.[activeChannel];

  // Count changes
  const changeCount = useMemo(() => {
    if (!currentDiff) return { added: 0, removed: 0 };
    const added = currentDiff.afterDiff.filter(w => w.type === 'added').length;
    const removed = currentDiff.beforeDiff.filter(w => w.type === 'removed').length;
    return { added, removed };
  }, [currentDiff]);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background shadow-lg animate-in slide-in-from-top-2 duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">
                So sánh thay đổi
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {snapshot.attributeLabel}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isGenerating && (
              <Badge variant="secondary" className="animate-pulse gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Đang tạo mẫu mới...
              </Badge>
            )}
            {!isGenerating && hasSamples && (
              <div className="flex items-center gap-1 text-xs">
                {changeCount.removed > 0 && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 text-[10px] h-5">
                    -{changeCount.removed}
                  </Badge>
                )}
                {changeCount.added > 0 && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 text-[10px] h-5">
                    +{changeCount.added}
                  </Badge>
                )}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode(viewMode === 'side-by-side' ? 'inline' : 'side-by-side')}
              title={viewMode === 'side-by-side' ? 'Chuyển sang inline view' : 'Chuyển sang side-by-side view'}
            >
              <GitCompare className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2 space-y-4">
          {/* Attribute change summary */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm flex-wrap">
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
              Trước
            </Badge>
            <span className="font-medium truncate max-w-[120px]">
              {formatValue(snapshot.previousValue)}
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
              Sau
            </Badge>
            <span className="font-medium truncate max-w-[120px]">
              {formatValue(snapshot.newValue)}
            </span>
          </div>

          {/* Sample comparison */}
          {hasSamples && (
            <div className="space-y-3">
              <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as ChannelType)}>
                <TabsList className="grid grid-cols-5 h-8">
                  {VISIBLE_CHANNELS.map((channel) => {
                    const config = CHANNEL_CONFIG[channel];
                    return (
                      <TabsTrigger 
                        key={channel} 
                        value={channel}
                        className="text-xs gap-1 px-2"
                      >
                        {config.icon}
                        <span className="hidden sm:inline">{config.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {VISIBLE_CHANNELS.map((channel) => {
                  const diff = channelDiffs?.[channel];
                  
                  return (
                    <TabsContent key={channel} value={channel} className="mt-3">
                      {viewMode === 'side-by-side' ? (
                        <div className="grid grid-cols-2 gap-3">
                          {/* Before */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-xs font-medium text-red-600">Trước</span>
                            </div>
                            <ScrollArea className="h-36 rounded-lg border bg-red-50/50 dark:bg-red-950/20 p-3">
                              {diff ? (
                                <DiffText diff={diff.beforeDiff} variant="before" />
                              ) : (
                                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                  {snapshot.previousSamples?.[channel] || 'Chưa có nội dung'}
                                </p>
                              )}
                            </ScrollArea>
                          </div>

                          {/* After */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-xs font-medium text-green-600">Sau</span>
                            </div>
                            <ScrollArea className="h-36 rounded-lg border bg-green-50/50 dark:bg-green-950/20 p-3">
                              {isGenerating ? (
                                <div className="flex items-center justify-center h-full">
                                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                              ) : diff ? (
                                <DiffText diff={diff.afterDiff} variant="after" />
                              ) : (
                                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                  {snapshot.newSamples?.[channel] || 'Đang chờ tạo mẫu...'}
                                </p>
                              )}
                            </ScrollArea>
                          </div>
                        </div>
                      ) : (
                        /* Inline diff view */
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">So sánh inline</span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span className="px-1 rounded bg-red-200 dark:bg-red-900/50 line-through">đã xoá</span>
                              <span className="px-1 rounded bg-green-200 dark:bg-green-900/50">đã thêm</span>
                            </div>
                          </div>
                          <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
                            {isGenerating ? (
                              <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : diff ? (
                              <div className="text-xs leading-relaxed space-y-2">
                                <div className="opacity-60">
                                  <DiffText diff={diff.beforeDiff} variant="before" />
                                </div>
                                <div className="border-t pt-2">
                                  <DiffText diff={diff.afterDiff} variant="after" />
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs">Không có dữ liệu so sánh</p>
                            )}
                          </ScrollArea>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDiscard}
              disabled={isGenerating}
              className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Hoàn tác
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onConfirm}
              disabled={isGenerating}
              className="gap-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <Check className="w-3.5 h-3.5" />
              Giữ thay đổi
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
