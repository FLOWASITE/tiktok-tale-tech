import { describe, it, expect, vi } from 'vitest';
import { resolveSocialPayload, SOCIAL_RESOLVE_MAP } from '../resolve-social-payload.ts';

/**
 * Tests for the Telegram "🚀 Đăng ngay" → channel-publisher resolve flow.
 *
 * These guarantee that, BEFORE the payload is forwarded to publish-facebook /
 * publish-instagram / publish-zalo / etc., it always carries:
 *   - connectionId (resolved from social_connections by org + platform + brand)
 *   - content      (resolved from multi_channel_contents.<platform>_content)
 *   - mediaUrls    (when channel_images[<channelKey>] is present)
 *
 * If any of these regress, the Telegram button would 400 with
 * "connectionId and content are required" — exactly the bug we just fixed.
 */

interface Row {
  // multi_channel_contents row
  id?: string;
  organization_id?: string | null;
  brand_template_id?: string | null;
  facebook_content?: string | null;
  instagram_content?: string | null;
  linkedin_content?: string | null;
  twitter_content?: string | null;
  threads_content?: string | null;
  tiktok_content?: string | null;
  zalo_content?: string | null;
  google_business_content?: string | null;
  content?: string | null;
  channel_images?: Record<string, unknown> | null;
}

/**
 * Build a fake Supabase client whose `.from(table)` returns a chainable
 * query that resolves with the row(s) the test wants.
 */
function buildSupabase(opts: {
  contentRow: Row | null;
  connectionId: string | null;
}) {
  const handlers: Record<string, () => any> = {
    multi_channel_contents: () => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: opts.contentRow, error: null }),
      };
      return chain;
    },
    social_connections: () => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: opts.connectionId ? { id: opts.connectionId } : null,
          error: null,
        }),
      };
      return chain;
    },
  };

  return {
    from: vi.fn((table: string) => {
      const h = handlers[table];
      if (!h) throw new Error(`Unexpected table: ${table}`);
      return h();
    }),
  };
}

describe('resolveSocialPayload — payload contract for "🚀 Đăng ngay"', () => {
  // -------- Happy path: every supported platform --------
  const platformCases: Array<{
    action: keyof typeof SOCIAL_RESOLVE_MAP;
    contentColumn: keyof Row;
    channelKey: string;
  }> = [
    { action: 'facebook', contentColumn: 'facebook_content', channelKey: 'facebook' },
    { action: 'instagram', contentColumn: 'instagram_content', channelKey: 'instagram' },
    { action: 'linkedin', contentColumn: 'linkedin_content', channelKey: 'linkedin' },
    { action: 'twitter', contentColumn: 'twitter_content', channelKey: 'twitter' },
    { action: 'threads', contentColumn: 'threads_content', channelKey: 'threads' },
    { action: 'tiktok', contentColumn: 'tiktok_content', channelKey: 'tiktok' },
    { action: 'zalo', contentColumn: 'zalo_content', channelKey: 'zalo_oa' },
    { action: 'google-business', contentColumn: 'google_business_content', channelKey: 'google_maps' },
  ];

  for (const { action, contentColumn, channelKey } of platformCases) {
    it(`[${action}] resolves connectionId + content + mediaUrls from contentId only`, async () => {
      const supabase = buildSupabase({
        contentRow: {
          id: 'mcc-1',
          organization_id: 'org-1',
          brand_template_id: 'brand-1',
          [contentColumn]: `Hello from ${action}`,
          // PRODUCTION shape: single object {url} written by generate-brand-image
          channel_images: {
            [channelKey]: { url: `https://cdn.test/${action}-branded.jpg` },
          },
        } as Row,
        connectionId: `conn-${action}`,
      });

      const result = await resolveSocialPayload({
        action,
        payload: { contentId: 'mcc-1' },
        supabase,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.payload.connectionId).toBe(`conn-${action}`);
      expect(result.payload.content).toBe(`Hello from ${action}`);
      expect(result.payload.organization_id).toBe('org-1');
      expect(result.payload.mediaUrls).toEqual([`https://cdn.test/${action}-branded.jpg`]);
      expect(result.payload.mediaUrl).toBe(`https://cdn.test/${action}-branded.jpg`);
    });
  }

  // -------- Regression: 3 supported channel_images shapes --------
  describe('channel_images shape parsing (regression)', () => {
    it('production shape: single object {url} → mediaUrls=[url]', async () => {
      const supabase = buildSupabase({
        contentRow: {
          id: 'mcc-1',
          organization_id: 'org-1',
          facebook_content: 'hi',
          channel_images: { facebook: { url: 'https://cdn.test/branded.jpg', meta: 'x' } },
        },
        connectionId: 'c',
      });
      const r = await resolveSocialPayload({ action: 'facebook', payload: { contentId: 'mcc-1' }, supabase });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.payload.mediaUrls).toEqual(['https://cdn.test/branded.jpg']);
      expect(r.payload.mediaUrl).toBe('https://cdn.test/branded.jpg');
    });

    it('legacy array shape: [{url}, "string"] → mediaUrls=[a,b]', async () => {
      const supabase = buildSupabase({
        contentRow: {
          id: 'mcc-1',
          organization_id: 'org-1',
          facebook_content: 'hi',
          channel_images: { facebook: [{ url: 'https://cdn.test/a.jpg' }, 'https://cdn.test/b.jpg'] },
        },
        connectionId: 'c',
      });
      const r = await resolveSocialPayload({ action: 'facebook', payload: { contentId: 'mcc-1' }, supabase });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.payload.mediaUrls).toEqual(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
    });

    it('bare string shape: "https://x.jpg" → mediaUrls=[url]', async () => {
      const supabase = buildSupabase({
        contentRow: {
          id: 'mcc-1',
          organization_id: 'org-1',
          facebook_content: 'hi',
          channel_images: { facebook: 'https://cdn.test/bare.jpg' },
        },
        connectionId: 'c',
      });
      const r = await resolveSocialPayload({ action: 'facebook', payload: { contentId: 'mcc-1' }, supabase });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.payload.mediaUrls).toEqual(['https://cdn.test/bare.jpg']);
    });

    it('empty/missing image: null → mediaUrls undefined (no inject)', async () => {
      const supabase = buildSupabase({
        contentRow: {
          id: 'mcc-1',
          organization_id: 'org-1',
          facebook_content: 'hi',
          channel_images: { facebook: null },
        },
        connectionId: 'c',
      });
      const r = await resolveSocialPayload({ action: 'facebook', payload: { contentId: 'mcc-1' }, supabase });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.payload.mediaUrls).toBeUndefined();
      expect(r.payload.mediaUrl).toBeUndefined();
    });
  });

  // -------- Error: no active connection --------
  it('returns NO_CONNECTION with vietnamese message when social_connections row missing', async () => {
    const supabase = buildSupabase({
      contentRow: {
        id: 'mcc-1',
        organization_id: 'org-1',
        facebook_content: 'hi',
      },
      connectionId: null,
    });

    const result = await resolveSocialPayload({
      action: 'facebook',
      payload: { contentId: 'mcc-1' },
      supabase,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.errorCode).toBe('NO_CONNECTION');
    // Telegram bot heuristic matches "chưa kết nối" → shows Reconnect button
    expect(result.error.toLowerCase()).toContain('chưa kết nối');
  });

  // -------- Error: channel content empty AND no fallback `content` --------
  it('returns "Bài chưa có nội dung" when platform-specific column is empty', async () => {
    const supabase = buildSupabase({
      contentRow: {
        id: 'mcc-1',
        organization_id: 'org-1',
        facebook_content: '',
        content: '',
      },
      connectionId: 'conn-x',
    });

    const result = await resolveSocialPayload({
      action: 'facebook',
      payload: { contentId: 'mcc-1' },
      supabase,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/chưa có nội dung/i);
  });

  // -------- Fallback: platform column empty but generic `content` present --------
  it('falls back to multi_channel_contents.content when platform column is empty', async () => {
    const supabase = buildSupabase({
      contentRow: {
        id: 'mcc-1',
        organization_id: 'org-1',
        google_business_content: '',
        content: 'Generic body',
      },
      connectionId: 'conn-gbp',
    });

    const result = await resolveSocialPayload({
      action: 'google-business',
      payload: { contentId: 'mcc-1' },
      supabase,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.content).toBe('Generic body');
    expect(result.payload.connectionId).toBe('conn-gbp');
  });

  // -------- Passthrough: caller already provided full payload --------
  it('passthrough when caller already supplied connectionId + content (web/scheduler path)', async () => {
    const supabase = buildSupabase({ contentRow: null, connectionId: null });
    const result = await resolveSocialPayload({
      action: 'facebook',
      payload: { connectionId: 'pre-conn', content: 'pre-content', contentId: 'mcc-1' },
      supabase,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Must NOT touch DB or override
    expect(supabase.from).not.toHaveBeenCalled();
    expect(result.payload.connectionId).toBe('pre-conn');
    expect(result.payload.content).toBe('pre-content');
  });

  // -------- Non-social action passthrough --------
  it('passthrough for non-social actions (website/blog handled elsewhere)', async () => {
    const supabase = buildSupabase({ contentRow: null, connectionId: null });
    const result = await resolveSocialPayload({
      action: 'website',
      payload: { contentId: 'mcc-1' },
      supabase,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(supabase.from).not.toHaveBeenCalled();
  });

  // -------- Error: missing contentId entirely --------
  it('returns 400 when neither connectionId/content nor contentId is provided', async () => {
    const supabase = buildSupabase({ contentRow: null, connectionId: null });
    const result = await resolveSocialPayload({
      action: 'facebook',
      payload: {},
      supabase,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/connectionId/);
  });
});
