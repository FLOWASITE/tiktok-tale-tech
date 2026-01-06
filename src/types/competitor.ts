export interface CompetitorProfile {
  id: string;
  organization_id: string;
  competitor_name: string;
  website_url: string | null;
  industry: string | null;
  notes: string | null;
  facebook_page_id: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitorFormData {
  competitor_name: string;
  website_url?: string;
  industry?: string;
  notes?: string;
  facebook_page_id?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
}
