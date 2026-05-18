/**
 * Per-channel support map for content types (post / carousel / video)
 * used by the GoalWizard "Kênh × Tần suất × Loại nội dung" table.
 */

export type ContentMixCell = { post: number; carousel: number; video: number };

export type ChannelContentSupport = { post: boolean; carousel: boolean; video: boolean };

/**
 * Channel id used here matches `AVAILABLE_CHANNELS[].id` in GoalWizard
 * (not `channelKey`). Keep both in sync if new channels are added.
 */
export const CHANNEL_CONTENT_SUPPORT: Record<string, ChannelContentSupport> = {
  // Long-form: chỉ post (bài viết dài)
  website:   { post: true, carousel: false, video: false },
  blogger:   { post: true, carousel: false, video: false },
  wordpress: { post: true, carousel: false, video: false },
  shopify:   { post: true, carousel: false, video: false },
  wix:       { post: true, carousel: false, video: false },
  medium:    { post: true, carousel: false, video: false },
  email:     { post: true, carousel: false, video: false },
  // Social: visual platforms — full support
  facebook:  { post: true, carousel: true,  video: true  },
  instagram: { post: true, carousel: true,  video: true  },
  linkedin:  { post: true, carousel: true,  video: true  },
  threads:   { post: true, carousel: true,  video: true  },
  twitter:   { post: true, carousel: true,  video: true  },
  bluesky:   { post: true, carousel: true,  video: true  },
  telegram:  { post: true, carousel: true,  video: true  },
  // Social: visual-only carousel
  pinterest: { post: true, carousel: true,  video: false },
  // Social: text-only
  zalo:        { post: true, carousel: false, video: false },
  google_maps: { post: true, carousel: false, video: false },
};

export function getChannelSupport(channelId: string): ChannelContentSupport {
  return CHANNEL_CONTENT_SUPPORT[channelId] ?? { post: true, carousel: false, video: false };
}

/**
 * Default heuristic mix for a channel given the total post count.
 *  - long-form / text-only: 100% post
 *  - visual social: ~60% post, 30% carousel, 10% video
 *  - pinterest: 60% post, 40% carousel
 */
export function defaultContentMix(channelId: string, totalPosts: number): ContentMixCell {
  const total = Math.max(0, Math.round(totalPosts));
  const support = getChannelSupport(channelId);

  if (!support.carousel && !support.video) {
    return { post: total, carousel: 0, video: 0 };
  }

  if (!support.video && support.carousel) {
    // pinterest-like
    const carousel = Math.round(total * 0.4);
    return { post: Math.max(0, total - carousel), carousel, video: 0 };
  }

  // full support
  const video = Math.floor(total * 0.1);
  const carousel = Math.floor(total * 0.3);
  const post = Math.max(0, total - carousel - video);
  return { post, carousel, video };
}

/**
 * Rebalance a mix when the user edits one cell so the sum stays equal to `total`.
 * The two other (supported) cells absorb the difference proportionally,
 * never going negative. Disabled cells stay at 0.
 */
export function rebalanceMix(
  channelId: string,
  current: ContentMixCell,
  changedKey: keyof ContentMixCell,
  newValue: number,
  total: number,
): ContentMixCell {
  const support = getChannelSupport(channelId);
  const supported: (keyof ContentMixCell)[] = (['post', 'carousel', 'video'] as const).filter(k => support[k]);

  const next: ContentMixCell = { ...current };
  next[changedKey] = Math.max(0, Math.min(total, Math.round(newValue)));

  // Force zero on unsupported cells
  (['post', 'carousel', 'video'] as const).forEach(k => {
    if (!support[k]) next[k] = 0;
  });

  const others = supported.filter(k => k !== changedKey);
  const remaining = Math.max(0, total - next[changedKey]);

  if (others.length === 0) {
    return next;
  }
  if (others.length === 1) {
    next[others[0]] = remaining;
    return next;
  }

  // 2 cells to distribute. Keep their previous ratio if possible.
  const prevSum = others.reduce((s, k) => s + current[k], 0);
  if (prevSum <= 0) {
    // split evenly, give remainder to first
    const half = Math.floor(remaining / 2);
    next[others[0]] = remaining - half;
    next[others[1]] = half;
  } else {
    const a = Math.round((current[others[0]] / prevSum) * remaining);
    next[others[0]] = Math.min(remaining, a);
    next[others[1]] = remaining - next[others[0]];
  }
  return next;
}

export function sumMix(mix: ContentMixCell): number {
  return (mix.post || 0) + (mix.carousel || 0) + (mix.video || 0);
}
