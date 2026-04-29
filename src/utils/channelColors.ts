import { Channel } from '@/types/multichannel';

// Channel color mapping with brand-specific colors
export const CHANNEL_COLORS: Record<Channel, { bg: string; text: string; border: string }> = {
  facebook: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-600',
    border: 'border-blue-500/30',
  },
  instagram: {
    bg: 'bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-orange-500/15',
    text: 'text-pink-600',
    border: 'border-pink-500/30',
  },
  pinterest: {
    bg: 'bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-orange-500/15',
    text: 'text-pink-600',
    border: 'border-pink-500/30',
  },
  twitter: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/30',
  },
  linkedin: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-600',
    border: 'border-sky-500/30',
  },
  youtube: {
    bg: 'bg-red-500/15',
    text: 'text-red-600',
    border: 'border-red-500/30',
  },
  tiktok: {
    bg: 'bg-gradient-to-r from-cyan-500/15 via-pink-500/15 to-pink-500/15',
    text: 'text-pink-600',
    border: 'border-pink-500/30',
  },
  threads: {
    bg: 'bg-slate-800/15 dark:bg-slate-200/15',
    text: 'text-slate-800 dark:text-slate-200',
    border: 'border-slate-600/30',
  },
  website: {
    bg: 'bg-blue-600/15',
    text: 'text-blue-700',
    border: 'border-blue-600/30',
  },
  blogger: {
    bg: 'bg-blue-600/15',
    text: 'text-blue-700',
    border: 'border-blue-600/30',
  },
  wordpress: {
    bg: 'bg-[#21759b]/15',
    text: 'text-[#21759b] dark:text-sky-400',
    border: 'border-[#21759b]/30',
  },
  email: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-600',
    border: 'border-amber-500/30',
  },
  zalo_oa: {
    bg: 'bg-blue-400/15',
    text: 'text-blue-500',
    border: 'border-blue-400/30',
  },
  telegram: {
    bg: 'bg-sky-400/15',
    text: 'text-sky-500',
    border: 'border-sky-400/30',
  },
  google_maps: {
    bg: 'bg-green-500/15',
    text: 'text-green-600',
    border: 'border-green-500/30',
  },
};

export const getChannelColorClasses = (channel: Channel): string => {
  const colors = CHANNEL_COLORS[channel];
  if (!colors) return 'bg-muted text-muted-foreground border-border';
  return `${colors.bg} ${colors.text} ${colors.border}`;
};
