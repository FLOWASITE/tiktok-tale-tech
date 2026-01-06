// ============================================
// Ad Copy Export Types
// Phase 3 - Multi-format export system
// ============================================

export type ExportFormat = 
  | 'csv_generic'      // Generic CSV
  | 'google_ads'       // Google Ads Editor format
  | 'meta_bulk'        // Meta Business Suite bulk
  | 'tiktok_bulk'      // TikTok Ads Manager
  | 'zalo_bulk'        // Zalo Ads bulk format
  | 'linkedin_bulk'    // LinkedIn Campaign Manager
  | 'json';            // JSON for API integration

export interface ExportOptions {
  format: ExportFormat;
  includeVariations: boolean;
  includePerformance: boolean;
  variationFilter?: 'all' | 'approved';
}

export interface ExportResult {
  success: boolean;
  filename: string;
  format: ExportFormat;
  rowCount: number;
  content?: string;
  error?: string;
}

export interface ExportFormatConfig {
  value: ExportFormat;
  label: string;
  description: string;
  icon: string;
  platforms: string[];
}

export const EXPORT_FORMATS: ExportFormatConfig[] = [
  { 
    value: 'csv_generic', 
    label: 'CSV Generic', 
    description: 'File CSV chuẩn',
    icon: '📄',
    platforms: ['all']
  },
  { 
    value: 'google_ads', 
    label: 'Google Ads Editor', 
    description: 'Import trực tiếp vào Google Ads Editor',
    icon: '🔍',
    platforms: ['google_rsa', 'google_display']
  },
  { 
    value: 'meta_bulk', 
    label: 'Meta Bulk Upload', 
    description: 'Import vào Facebook Ads Manager',
    icon: '📱',
    platforms: ['meta_feed', 'meta_story', 'meta_reels']
  },
  { 
    value: 'tiktok_bulk', 
    label: 'TikTok Ads Manager', 
    description: 'Import vào TikTok Ads',
    icon: '🎵',
    platforms: ['tiktok']
  },
  { 
    value: 'zalo_bulk', 
    label: 'Zalo Ads', 
    description: 'Format cho Zalo Ads Manager',
    icon: '💬',
    platforms: ['zalo_oa', 'zalo_message', 'zalo_article', 'zalo']
  },
  { 
    value: 'linkedin_bulk', 
    label: 'LinkedIn Campaign Manager', 
    description: 'Import vào LinkedIn Ads',
    icon: '💼',
    platforms: ['linkedin']
  },
  { 
    value: 'json', 
    label: 'JSON', 
    description: 'Format JSON cho API integration',
    icon: '{ }',
    platforms: ['all']
  },
];

export function getAvailableFormats(platform: string) {
  return EXPORT_FORMATS.filter(f => 
    f.platforms.includes('all') || f.platforms.includes(platform)
  );
}

export function getFormatConfig(format: ExportFormat) {
  return EXPORT_FORMATS.find(f => f.value === format);
}
