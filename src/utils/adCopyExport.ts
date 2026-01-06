// ============================================
// Ad Copy Export Utilities
// Phase 3 - Multi-format export functions
// ============================================

import type { AdCopy, AdCopyVariation } from '@/types/adCopy';
import type { ExportFormat, ExportResult, ExportOptions } from '@/types/adCopyExport';

// Helper to escape CSV values
function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Generic CSV export
export function exportGenericCSV(adCopy: AdCopy): ExportResult {
  const variations = adCopy.variations || [];
  if (variations.length === 0) {
    return { success: false, filename: '', format: 'csv_generic', rowCount: 0, error: 'No variations to export' };
  }

  const headers = ['Variation', 'Primary Text', 'Headline', 'Description', 'CTA', 'Approved'];
  const rows = variations.map(v => [
    escapeCSV(v.variation_label),
    escapeCSV(v.primary_text),
    escapeCSV(v.headline),
    escapeCSV(v.description),
    escapeCSV(v.cta_button),
    v.is_approved ? 'Yes' : 'No'
  ]);

  const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `ad-copy-${adCopy.id.substring(0, 8)}.csv`;

  return { success: true, filename, format: 'csv_generic', rowCount: rows.length, content };
}

// Google Ads Editor format
export function exportGoogleAdsCSV(adCopy: AdCopy): ExportResult {
  const variations = adCopy.variations || [];
  if (variations.length === 0 || adCopy.platform !== 'google_rsa') {
    return { success: false, filename: '', format: 'google_ads', rowCount: 0, error: 'Invalid platform or no variations' };
  }

  // Google Ads Editor RSA format
  const headers = [
    'Campaign', 'Ad Group', 'Ad Type',
    'Headline 1', 'Headline 2', 'Headline 3', 'Headline 4', 'Headline 5',
    'Headline 6', 'Headline 7', 'Headline 8', 'Headline 9', 'Headline 10',
    'Headline 11', 'Headline 12', 'Headline 13', 'Headline 14', 'Headline 15',
    'Description 1', 'Description 2', 'Description 3', 'Description 4',
    'Final URL', 'Status'
  ];

  const rows = variations.map(v => {
    const headlines = v.headlines || [];
    const descriptions = v.descriptions || [];
    return [
      escapeCSV(adCopy.title), // Campaign placeholder
      escapeCSV(`AdGroup_${v.variation_label}`), // Ad Group placeholder
      'Responsive search ad',
      ...Array.from({ length: 15 }, (_, i) => escapeCSV(headlines[i])),
      ...Array.from({ length: 4 }, (_, i) => escapeCSV(descriptions[i])),
      escapeCSV(adCopy.landing_url),
      v.is_approved ? 'Enabled' : 'Paused'
    ];
  });

  const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `google-ads-${adCopy.id.substring(0, 8)}.csv`;

  return { success: true, filename, format: 'google_ads', rowCount: rows.length, content };
}

// Meta Bulk Upload format
export function exportMetaBulkCSV(adCopy: AdCopy): ExportResult {
  const variations = adCopy.variations || [];
  if (variations.length === 0) {
    return { success: false, filename: '', format: 'meta_bulk', rowCount: 0, error: 'No variations to export' };
  }

  // Meta Ads bulk upload format
  const headers = [
    'Ad Name', 'Ad Set Name', 'Campaign Name',
    'Primary Text', 'Headline', 'Description',
    'Call to Action', 'Website URL', 'Status'
  ];

  const ctaMapping: Record<string, string> = {
    'learn_more': 'LEARN_MORE',
    'shop_now': 'SHOP_NOW',
    'sign_up': 'SIGN_UP',
    'get_offer': 'GET_OFFER',
    'contact_us': 'CONTACT_US',
    'download': 'DOWNLOAD',
    'book_now': 'BOOK_NOW',
    'send_message': 'SEND_MESSAGE',
  };

  const rows = variations.map(v => [
    escapeCSV(`${adCopy.title} - ${v.variation_label}`),
    escapeCSV(adCopy.title),
    escapeCSV(adCopy.campaign?.name || adCopy.title),
    escapeCSV(v.primary_text),
    escapeCSV(v.headline),
    escapeCSV(v.description),
    ctaMapping[v.cta_button] || 'LEARN_MORE',
    escapeCSV(adCopy.landing_url),
    v.is_approved ? 'ACTIVE' : 'PAUSED'
  ]);

  const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `meta-ads-${adCopy.id.substring(0, 8)}.csv`;

  return { success: true, filename, format: 'meta_bulk', rowCount: rows.length, content };
}

// TikTok Ads format
export function exportTikTokBulkCSV(adCopy: AdCopy): ExportResult {
  const variations = adCopy.variations || [];
  if (variations.length === 0) {
    return { success: false, filename: '', format: 'tiktok_bulk', rowCount: 0, error: 'No variations to export' };
  }

  const headers = [
    'Ad Name', 'Ad Group Name', 'Campaign Name',
    'Ad Text', 'Display Name', 'Call to Action',
    'Landing Page URL', 'Status'
  ];

  const rows = variations.map(v => [
    escapeCSV(`${adCopy.title} - ${v.variation_label}`),
    escapeCSV(adCopy.title),
    escapeCSV(adCopy.campaign?.name || adCopy.title),
    escapeCSV(v.primary_text),
    escapeCSV(v.headline),
    escapeCSV(v.cta_button?.toUpperCase().replace('_', ' ')),
    escapeCSV(adCopy.landing_url),
    v.is_approved ? 'Active' : 'Paused'
  ]);

  const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `tiktok-ads-${adCopy.id.substring(0, 8)}.csv`;

  return { success: true, filename, format: 'tiktok_bulk', rowCount: rows.length, content };
}

// Zalo Ads format
export function exportZaloBulkCSV(adCopy: AdCopy): ExportResult {
  const variations = adCopy.variations || [];
  if (variations.length === 0) {
    return { success: false, filename: '', format: 'zalo_bulk', rowCount: 0, error: 'No variations to export' };
  }

  const headers = [
    'Tên quảng cáo', 'Nhóm quảng cáo', 'Chiến dịch',
    'Nội dung chính', 'Tiêu đề', 'Mô tả',
    'Nút CTA', 'URL đích', 'Trạng thái'
  ];

  const ctaVietnamese: Record<string, string> = {
    'learn_more': 'Tìm hiểu thêm',
    'shop_now': 'Mua ngay',
    'sign_up': 'Đăng ký',
    'get_offer': 'Nhận ưu đãi',
    'contact_us': 'Liên hệ',
    'send_message': 'Gửi tin nhắn',
  };

  const rows = variations.map(v => [
    escapeCSV(`${adCopy.title} - ${v.variation_label}`),
    escapeCSV(adCopy.title),
    escapeCSV(adCopy.campaign?.name || adCopy.title),
    escapeCSV(v.primary_text),
    escapeCSV(v.headline),
    escapeCSV(v.description),
    escapeCSV(ctaVietnamese[v.cta_button] || v.cta_button),
    escapeCSV(adCopy.landing_url),
    v.is_approved ? 'Hoạt động' : 'Tạm dừng'
  ]);

  const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `zalo-ads-${adCopy.id.substring(0, 8)}.csv`;

  return { success: true, filename, format: 'zalo_bulk', rowCount: rows.length, content };
}

// LinkedIn Ads format
export function exportLinkedInBulkCSV(adCopy: AdCopy): ExportResult {
  const variations = adCopy.variations || [];
  if (variations.length === 0) {
    return { success: false, filename: '', format: 'linkedin_bulk', rowCount: 0, error: 'No variations to export' };
  }

  const headers = [
    'Ad Name', 'Campaign Group', 'Campaign',
    'Introductory Text', 'Headline', 'Description',
    'Call to Action', 'Destination URL', 'Status'
  ];

  const ctaMapping: Record<string, string> = {
    'learn_more': 'Learn More',
    'sign_up': 'Sign Up',
    'download': 'Download',
    'get_quote': 'Request Quote',
    'contact_us': 'Contact Us',
  };

  const rows = variations.map(v => [
    escapeCSV(`${adCopy.title} - ${v.variation_label}`),
    escapeCSV(adCopy.campaign?.name || 'Default'),
    escapeCSV(adCopy.title),
    escapeCSV(v.primary_text),
    escapeCSV(v.headline),
    escapeCSV(v.description),
    ctaMapping[v.cta_button] || 'Learn More',
    escapeCSV(adCopy.landing_url),
    v.is_approved ? 'Active' : 'Draft'
  ]);

  const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `linkedin-ads-${adCopy.id.substring(0, 8)}.csv`;

  return { success: true, filename, format: 'linkedin_bulk', rowCount: rows.length, content };
}

// JSON export
export function exportJSON(adCopy: AdCopy): ExportResult {
  const exportData = {
    id: adCopy.id,
    title: adCopy.title,
    topic: adCopy.topic,
    platform: adCopy.platform,
    objective: adCopy.objective,
    funnel_stage: adCopy.funnel_stage,
    landing_url: adCopy.landing_url,
    status: adCopy.status,
    created_at: adCopy.created_at,
    variations: adCopy.variations?.map(v => ({
      label: v.variation_label,
      primary_text: v.primary_text,
      headline: v.headline,
      description: v.description,
      headlines: v.headlines,
      descriptions: v.descriptions,
      cta_button: v.cta_button,
      is_approved: v.is_approved,
    })) || []
  };

  const content = JSON.stringify(exportData, null, 2);
  const filename = `ad-copy-${adCopy.id.substring(0, 8)}.json`;

  return { 
    success: true, 
    filename, 
    format: 'json', 
    rowCount: exportData.variations.length, 
    content 
  };
}

// Main export function
export function exportAdCopy(adCopy: AdCopy, options: ExportOptions): ExportResult {
  // Filter variations if needed
  if (options.variationFilter === 'approved' && adCopy.variations) {
    adCopy = {
      ...adCopy,
      variations: adCopy.variations.filter(v => v.is_approved)
    };
  }

  switch (options.format) {
    case 'csv_generic':
      return exportGenericCSV(adCopy);
    case 'google_ads':
      return exportGoogleAdsCSV(adCopy);
    case 'meta_bulk':
      return exportMetaBulkCSV(adCopy);
    case 'tiktok_bulk':
      return exportTikTokBulkCSV(adCopy);
    case 'zalo_bulk':
      return exportZaloBulkCSV(adCopy);
    case 'linkedin_bulk':
      return exportLinkedInBulkCSV(adCopy);
    case 'json':
      return exportJSON(adCopy);
    default:
      return { success: false, filename: '', format: options.format, rowCount: 0, error: 'Unknown format' };
  }
}

// Download helper
export function downloadExport(result: ExportResult) {
  if (!result.success || !result.content) {
    return false;
  }

  const mimeType = result.format === 'json' ? 'application/json' : 'text/csv';
  const blob = new Blob([result.content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return true;
}

// Copy to clipboard helper
export async function copyExportToClipboard(result: ExportResult): Promise<boolean> {
  if (!result.success || !result.content) {
    return false;
  }
  
  try {
    await navigator.clipboard.writeText(result.content);
    return true;
  } catch {
    return false;
  }
}
