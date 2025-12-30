import { BrandProduct } from './product';
import { CustomerPersona } from './customerPersona';

export interface ProductPersonaMapping {
  id: string;
  product_id: string;
  persona_id: string;
  brand_template_id: string;
  
  // Mapping metadata
  relevance_score: number; // 0-100
  is_primary_product: boolean;
  
  // Custom messaging per persona
  custom_pitch: string | null;
  key_benefits: string[];
  objection_handlers: string[];
  
  // Content hints
  preferred_content_angles: string[];
  avoid_topics: string[];
  
  // Ownership
  organization_id: string | null;
  user_id: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined data (optional when fetching with relations)
  product?: BrandProduct;
  persona?: CustomerPersona;
}

export interface ProductPersonaMappingFormData {
  product_id: string;
  persona_id: string;
  relevance_score: number;
  is_primary_product: boolean;
  custom_pitch: string;
  key_benefits: string[];
  objection_handlers: string[];
  preferred_content_angles: string[];
  avoid_topics: string[];
}

export const DEFAULT_MAPPING_FORM: ProductPersonaMappingFormData = {
  product_id: '',
  persona_id: '',
  relevance_score: 80,
  is_primary_product: false,
  custom_pitch: '',
  key_benefits: [],
  objection_handlers: [],
  preferred_content_angles: [],
  avoid_topics: [],
};
