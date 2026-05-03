import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface TopicSuggestion {
  title: string;
  angle: string;
  keyword_ids: string[];
  intent: 'TOFU' | 'MOFU' | 'BOFU';
}

interface Props {
  clusterId: string | null | undefined;
  onPick: (title: string) => void;
  disabled?: boolean;
}

const INTENT_COLORS: Record<string, string> = {
  TOFU: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  MOFU: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  BOFU: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

export function SuggestedTopicsFromKeyword({ clusterId, onPick, disabled }: Props) {
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const generate = async () => {
    if (!clusterId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-cluster-topics', {
        body: { clusterId },
      });
      if (error) throw error;
      const list = (data?.suggestions || []) as TopicSuggestion[];
      setSuggestions(list);
      setHasFetched(true);
      if (list.length === 0) {
        toast.info(data?.message || 'Chưa có gợi ý phù hợp');
      }
    } catch (e: any) {
      toast.error(e.message || 'Không tạo được gợi ý topic');
    } finally {
      setLoading(false);
    }
  };

  if (!clusterId) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Chọn Pillar ở trên để AI gợi ý topic title bám sát keyword.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {hasFetched
            ? `${suggestions.length} gợi ý topic từ keyword chưa có content`
            : 'Để AI đề xuất topic bám sát keyword target'}
        </p>
        <Button
          type="button"
          size="sm"
          variant={hasFetched ? 'outline' : 'default'}
          onClick={generate}
          disabled={loading || disabled}
          className="h-7 text-xs gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : hasFetched ? (
            <RefreshCw className="w-3.5 h-3.5" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {hasFetched ? 'Tạo lại' : 'Gợi ý topic'}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPick(s.title)}
              disabled={disabled}
              className="w-full text-left p-2.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-accent/40 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground leading-snug">
                    {s.title}
                  </div>
                  {s.angle && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {s.angle}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <Badge variant="outline" className={`text-[10px] h-4 px-1 ${INTENT_COLORS[s.intent] || ''}`}>
                      {s.intent}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {s.keyword_ids.length} keyword
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
