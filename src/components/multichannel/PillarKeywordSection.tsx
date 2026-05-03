import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Target, Sparkles, ArrowRight, AlertTriangle } from 'lucide-react';
import ClusterPicker from '@/components/seo/ClusterPicker';
import KeywordTargetPicker from '@/components/seo/KeywordTargetPicker';

interface Props {
  clusterId: string | null | undefined;
  selectedKeywordIds: string[];
  onClusterChange: (clusterId: string | null, keywordIds: string[]) => void;
  onKeywordIdsChange: (ids: string[]) => void;
  /** Heuristic suggestion (used in idea mode) */
  suggestion?: { clusterId: string; name: string; color: string | null } | null;
  onAcceptSuggestion?: () => void;
  variant?: 'card' | 'inline';
}

/**
 * Shared Pillar + Keyword target block. Used by both SEO mode (Step 1 top)
 * and Idea mode (below topic input, with heuristic suggest banner).
 */
export function PillarKeywordSection({
  clusterId,
  selectedKeywordIds,
  onClusterChange,
  onKeywordIdsChange,
  suggestion,
  onAcceptSuggestion,
  variant = 'card',
}: Props) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  // Pillar context stats
  const { data: ctx } = useQuery({
    queryKey: ['pillar-context', orgId, clusterId],
    enabled: !!orgId && !!clusterId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [{ data: kws }, { count: usedCount }] = await Promise.all([
        supabase
          .from('seo_keywords')
          .select('id,search_volume')
          .eq('cluster_id', clusterId!),
        supabase
          .from('multi_channel_contents')
          .select('id', { count: 'exact', head: true })
          .eq('cluster_id', clusterId!),
      ]);
      const list = kws || [];
      const totalVol = list.reduce((s: number, k: any) => s + (k.search_volume || 0), 0);
      return {
        keywordCount: list.length,
        avgVolume: list.length ? Math.round(totalVol / list.length) : 0,
        usedCount: usedCount || 0,
      };
    },
  });

  // Auto pre-fill top-5 keyword when cluster picked and no manual selection yet
  useEffect(() => {
    if (!clusterId || selectedKeywordIds.length > 0) return;
    (async () => {
      const { data } = await supabase
        .from('seo_keywords')
        .select('id')
        .eq('cluster_id', clusterId)
        .order('priority_score', { ascending: false })
        .limit(5);
      const ids = (data || []).map((r: any) => r.id);
      if (ids.length > 0) onKeywordIdsChange(ids);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId]);

  const Wrapper: any = variant === 'card' ? Card : 'div';
  const wrapperClass = variant === 'card'
    ? 'p-4 space-y-4 border-border/60 bg-muted/20'
    : 'space-y-3';

  const empty = ctx === undefined && !clusterId;

  return (
    <Wrapper className={wrapperClass}>
      {variant === 'card' && (
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold">Định hướng SEO</Label>
        </div>
      )}

      {/* Heuristic suggestion banner (idea mode only) */}
      {suggestion && !clusterId && onAcceptSuggestion && (
        <button
          type="button"
          onClick={onAcceptSuggestion}
          className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs">
              Có vẻ liên quan đến nhóm "Cần cho SEO"{' '}
              <strong className="text-primary">{suggestion.name}</strong> — gắn ngay?
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-primary shrink-0" />
        </button>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {variant === 'card' ? '1. Cần cho SEO' : 'Cần cho SEO (tùy chọn)'}
        </Label>
        <ClusterPicker
          value={clusterId ?? null}
          onChange={(cid, meta) => onClusterChange(cid, meta?.keywordIds ?? [])}
        />
        {clusterId && ctx && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground pt-1">
            <span>{ctx.keywordCount} keyword</span>
            <span>· Avg vol: {ctx.avgVolume.toLocaleString()}</span>
            <span>· Đã dùng: {ctx.usedCount}</span>
            <Link to="/seo?tab=plan" className="text-primary hover:underline ml-auto">
              Xem chi tiết →
            </Link>
          </div>
        )}
      </div>

      {clusterId && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {variant === 'card' ? '2. Keyword mục tiêu' : 'Keyword mục tiêu'}
          </Label>
          <KeywordTargetPicker
            selectedIds={selectedKeywordIds}
            onChange={onKeywordIdsChange}
            max={5}
            clusterId={clusterId}
          />
          <p className="text-[11px] text-muted-foreground">
            Tick để chọn/bỏ — không cần thao tác 2 bước. AI ưu tiên keyword theo thứ tự bạn chọn.
          </p>
        </div>
      )}

      {/* Inline warning khi đang bật SEO (variant=card) nhưng chưa đủ dữ liệu */}
      {variant === 'card' && (() => {
        let msg: string | null = null;
        let cta: { to: string; label: string } | null = null;
        if (!clusterId) {
          msg = 'Bạn đang bật chế độ SEO nhưng chưa chọn nhóm Pillar — AI sẽ thiếu định hướng từ khoá.';
          cta = { to: '/seo?tab=plan', label: 'Chọn hoặc tạo Pillar →' };
        } else if (ctx && ctx.keywordCount === 0) {
          msg = 'Pillar này chưa có keyword nào — AI không có target cụ thể để tối ưu.';
          cta = { to: '/seo?tab=discover', label: 'Research keyword →' };
        } else if (ctx && ctx.keywordCount > 0 && selectedKeywordIds.length === 0) {
          msg = 'Pillar đã chọn nhưng chưa tick keyword mục tiêu — chọn ít nhất 1 keyword để AI tập trung.';
        }
        if (!msg) return null;
        return (
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-foreground/80">{msg}</p>
              {cta && (
                <Link to={cta.to} className="text-amber-700 dark:text-amber-400 hover:underline mt-0.5 inline-block">
                  {cta.label}
                </Link>
              )}
            </div>
          </div>
        );
      })()}

      {empty && (
        <p className="text-[11px] text-muted-foreground">
          Chưa có nhóm "Cần cho SEO" nào.{' '}
          <Link to="/seo?tab=plan" className="text-primary hover:underline">
            Tạo nhóm đầu tiên →
          </Link>
        </p>
      )}
    </Wrapper>
  );
}
