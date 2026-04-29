import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ContentType } from '@/components/reports/ContentTypeBadge';

export interface ContentPreview {
  caption?: string | null;
  body?: string | null;
  hashtags?: string[];
  channels?: string[];
  imageUrls?: string[];
  fields?: { label: string; value: string }[];
}

const TABLE_FOR_TYPE: Record<ContentType, string> = {
  multichannel: 'multi_channel_contents',
  script: 'scripts',
  carousel: 'carousels',
  core: 'core_contents',
  ad_copy: 'ad_copies',
};

export function useContentPreview(type: ContentType | null, id: string | null) {
  return useQuery({
    queryKey: ['content-preview', type, id],
    enabled: !!type && !!id,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ContentPreview> => {
      const table = TABLE_FOR_TYPE[type!];
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return {};
      const r: any = data;

      switch (type) {
        case 'multichannel': {
          const channels = (r.selected_channels as string[]) ?? [];
          const generated = r.generated_content ?? r.channel_contents ?? null;
          let caption: string | null = null;
          if (generated && typeof generated === 'object') {
            const firstKey = Object.keys(generated)[0];
            const first = firstKey ? generated[firstKey] : null;
            caption = first?.caption ?? first?.content ?? first?.text ?? null;
          }
          return {
            caption,
            channels,
            hashtags: r.hashtags ?? [],
            fields: [
              { label: 'Topic', value: r.topic ?? '—' },
              { label: 'Goal', value: r.goal ?? '—' },
            ],
          };
        }
        case 'script': {
          return {
            body: r.script_content ?? r.content ?? r.full_script ?? null,
            fields: [
              { label: 'Topic', value: r.topic ?? '—' },
              { label: 'Duration', value: `${r.duration_seconds ?? '—'}s` },
              { label: 'Hook', value: r.hook ?? '—' },
            ],
          };
        }
        case 'carousel': {
          const slides = (r.slides as any[]) ?? [];
          return {
            caption: r.caption ?? r.description ?? null,
            imageUrls: slides
              .map((s) => s?.image_url ?? s?.imageUrl)
              .filter(Boolean)
              .slice(0, 6),
            fields: [
              { label: 'Topic', value: r.topic ?? '—' },
              { label: 'Số slide', value: String(slides.length || r.slide_count || '—') },
            ],
          };
        }
        case 'core': {
          return {
            body: r.body ?? r.content ?? r.brief ?? null,
            fields: [
              { label: 'Topic', value: r.topic ?? '—' },
              { label: 'Angle', value: r.angle ?? '—' },
            ],
          };
        }
        case 'ad_copy': {
          return {
            body: r.primary_text ?? r.body ?? r.content ?? null,
            fields: [
              { label: 'Headline', value: r.headline ?? '—' },
              { label: 'CTA', value: r.cta ?? '—' },
              { label: 'Topic', value: r.topic ?? '—' },
            ],
          };
        }
        default:
          return {};
      }
    },
  });
}
