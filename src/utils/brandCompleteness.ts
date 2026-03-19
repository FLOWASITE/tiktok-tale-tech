import { BrandTemplate } from '@/hooks/useBrandTemplates';

export interface CompletenessItem {
  key: string;
  label: string;
  completed: boolean;
  weight: number;
}

export interface BrandCompleteness {
  score: number;
  items: CompletenessItem[];
  level: 'low' | 'medium' | 'high' | 'complete';
}

export function calculateBrandCompleteness(
  template: BrandTemplate,
  personasCount: number = 0,
  productsCount: number = 0
): BrandCompleteness {
  const items: CompletenessItem[] = [
    // Identity (30%)
    {
      key: 'name',
      label: 'Tên thương hiệu',
      completed: !!template.brand_name && template.brand_name.trim().length > 0,
      weight: 10,
    },
    {
      key: 'industry',
      label: 'Ngành hàng',
      completed: !!template.industry && template.industry.length > 0,
      weight: 10,
    },
    {
      key: 'colors',
      label: 'Màu sắc thương hiệu',
      completed: !!template.primary_color,
      weight: 10,
    },

    // Voice (20%)
    {
      key: 'tone',
      label: 'Tone of Voice',
      completed: !!template.tone_of_voice && template.tone_of_voice.length > 0,
      weight: 10,
    },
    {
      key: 'formality',
      label: 'Formality Level',
      completed: !!template.formality_level,
      weight: 5,
    },
    {
      key: 'positioning',
      label: 'Brand Positioning',
      completed: !!template.brand_positioning && template.brand_positioning.trim().length > 0,
      weight: 5,
    },

    // Personas (20%)
    {
      key: 'personas',
      label: 'Customer Personas',
      completed: personasCount > 0,
      weight: 20,
    },

    // Products (15%)
    {
      key: 'products',
      label: 'Sản phẩm/Dịch vụ',
      completed: productsCount > 0,
      weight: 15,
    },

    // Strategy (15%)
    {
      key: 'guideline',
      label: 'Brand Guideline',
      completed: !!template.brand_guideline && template.brand_guideline.trim().length > 50,
      weight: 10,
    },
    {
      key: 'channels',
      label: 'Channel Settings',
      completed: !!template.channel_overrides && Object.keys(template.channel_overrides as object).length > 0,
      weight: 5,
    },
  ];

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const completedWeight = items
    .filter((item) => item.completed)
    .reduce((sum, item) => sum + item.weight, 0);

  const score = Math.round((completedWeight / totalWeight) * 100);

  let level: BrandCompleteness['level'] = 'low';
  if (score >= 100) level = 'complete';
  else if (score >= 70) level = 'high';
  else if (score >= 40) level = 'medium';

  return { score, items, level };
}

export function getCompletenessColor(level: BrandCompleteness['level']): string {
  switch (level) {
    case 'complete':
      return 'text-emerald-500';
    case 'high':
      return 'text-blue-500';
    case 'medium':
      return 'text-amber-500';
    case 'low':
    default:
      return 'text-destructive';
  }
}

export function getCompletenessRingColor(level: BrandCompleteness['level']): string {
  switch (level) {
    case 'complete':
      return 'stroke-emerald-500';
    case 'high':
      return 'stroke-blue-500';
    case 'medium':
      return 'stroke-amber-500';
    case 'low':
    default:
      return 'stroke-destructive';
  }
}
