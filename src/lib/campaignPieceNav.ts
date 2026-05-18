import type { CampaignContentPiece } from '@/types/agent';

export interface PieceNavContext {
  planId?: string;
  brandTemplateId?: string | null;
  organizationId?: string;
  /** Nếu pipeline đã sinh content thì route sang content đã có */
  pipelineContentId?: string | null;
}

const LONGFORM_CHANNELS = new Set(['website', 'wordpress', 'blogger']);

function buildQuery(params: Record<string, string | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/**
 * Trả về path để mở Content Studio tương ứng với một campaign piece.
 * - Nếu pipeline đã có content_id → mở content đã sinh
 * - Ngược lại → mở trang "new" với prefill query params
 */
export function getPieceTarget(
  piece: CampaignContentPiece,
  ctx: PieceNavContext = {},
): { path: string } {
  const format = piece.format || 'post';
  const channel = (piece.target_channel || '').toLowerCase();
  const contentId = ctx.pipelineContentId || null;

  // Đã có content → mở thẳng
  if (contentId) {
    if (format === 'carousel') return { path: `/carousel?id=${contentId}` };
    if (format === 'video_script') return { path: `/videos?tab=scripts&id=${contentId}` };
    return { path: `/multichannel?id=${contentId}` };
  }

  const base = buildQuery({
    title: piece.title || undefined,
    key_message: piece.key_message || undefined,
    brand: ctx.brandTemplateId || undefined,
    pieceId: piece.piece_number != null ? String(piece.piece_number) : undefined,
    planId: ctx.planId || undefined,
    scheduledDate: piece.scheduled_date || undefined,
  });

  if (format === 'carousel') {
    return {
      path: `/carousel${base}${base ? '&' : '?'}channel=${encodeURIComponent(channel)}`,
    };
  }
  if (format === 'video_script') {
    return {
      path: `/videos${base ? base + '&' : '?'}tab=scripts&channel=${encodeURIComponent(channel)}`,
    };
  }

  // post / email / fallback → multichannel
  const effectiveChannel = format === 'email' ? 'email' : channel || 'facebook';
  const longform = LONGFORM_CHANNELS.has(effectiveChannel);
  const channelsParam = effectiveChannel;
  return {
    path: `/multichannel/new${base}${base ? '&' : '?'}channels=${encodeURIComponent(channelsParam)}${longform ? '&mode=seo' : ''}`,
  };
}
