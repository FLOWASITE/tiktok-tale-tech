import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SchedulePiece } from '@/lib/scheduleExport';

type RewriteContext = {
  organizationId: string;
  brandTemplateId?: string;
  campaignTitle: string;
  clarificationContext?: Record<string, any>;
  existingTitles: string[];
};

export function useRewritePiece() {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const rewrite = async (
    piece: SchedulePiece,
    ctx: RewriteContext,
  ): Promise<{ title: string; key_message: string; hook?: string } | null> => {
    setLoadingId(piece.piece_number);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-piece-topics', {
        body: {
          piece: {
            angle: piece.angle || 'educational',
            content_role: piece.content_role || 'seed',
            target_channel: piece.target_channel,
            pillar: piece.pillar,
            title: piece.title,
            key_message: piece.key_message,
          },
          brand_template_id: ctx.brandTemplateId,
          organization_id: ctx.organizationId,
          campaign_title: ctx.campaignTitle,
          existing_titles: ctx.existingTitles.filter((t) => t !== piece.title),
          clarification_context: ctx.clarificationContext,
        },
      });
      if (error) throw error;
      const first = data?.suggestions?.[0];
      if (!first?.title) return null;
      return { title: first.title, key_message: first.key_message || piece.key_message || '', hook: first.hook };
    } catch (e) {
      console.error('[useRewritePiece]', e);
      return null;
    } finally {
      setLoadingId(null);
    }
  };

  return { rewrite, loadingId };
}
