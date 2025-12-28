export interface IndustryGlossaryTerm {
  id: string;
  industry_template_id: string;
  term: string;
  abbreviation: string | null;
  category: string;
  related_terms: string[];
  usage_context: string | null;
  is_preferred: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface IndustryGlossaryTranslation {
  id: string;
  glossary_id: string;
  language_code: string;
  definition: string;
  example_usage: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IndustryGlossaryTermWithTranslation extends IndustryGlossaryTerm {
  definition: string;
  example_usage: string | null;
  notes: string | null;
}

export const GLOSSARY_CATEGORIES = [
  { value: 'general', label: 'Chung', icon: '📚' },
  { value: 'technical', label: 'Kỹ thuật', icon: '⚙️' },
  { value: 'legal', label: 'Pháp lý', icon: '⚖️' },
  { value: 'marketing', label: 'Marketing', icon: '📢' },
  { value: 'compliance', label: 'Tuân thủ', icon: '✅' },
] as const;

export type GlossaryCategory = typeof GLOSSARY_CATEGORIES[number]['value'];
