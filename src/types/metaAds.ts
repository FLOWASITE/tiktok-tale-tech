// Meta Ads API Types

export interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  account_status: number;
  business_name?: string;
  amount_spent?: string;
  balance?: string;
}

export interface MetaAction {
  action_type: string;
  value: string;
}

export interface MetaAdInsights {
  impressions: string;
  reach: string;
  clicks: string;
  spend: string;
  ctr: string;
  cpc: string;
  cpm: string;
  actions?: MetaAction[];
  cost_per_action_type?: MetaAction[];
  conversions?: string;
  conversion_values?: MetaAction[];
  purchase_roas?: MetaAction[];
  date_start: string;
  date_stop: string;
}

export interface AdSyncConfig {
  id: string;
  ad_copy_id: string;
  organization_id: string;
  connection_id: string | null;
  external_ad_id: string;
  external_campaign_id: string | null;
  external_adset_id: string | null;
  external_ad_name: string | null;
  sync_enabled: boolean;
  sync_frequency: 'hourly' | 'daily' | 'manual';
  last_synced_at: string | null;
  next_sync_at: string | null;
  sync_status: 'pending' | 'syncing' | 'success' | 'error';
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAdsConnection {
  id: string;
  platform: 'facebook' | 'instagram';
  connection_type: 'meta_ads';
  ad_account_id: string;
  ad_account_name: string;
  business_id: string | null;
  app_id: string;
  access_token: string;
  is_active: boolean;
  organization_id?: string;
  brand_template_id?: string;
}

export interface MetaAdsConnectRequest {
  appId: string;
  appSecret: string;
  accessToken: string;
  adAccountId?: string;
  organizationId?: string;
  brandTemplateId?: string;
}

export interface MetaAdsConnectResponse {
  success: boolean;
  connection?: MetaAdsConnection;
  connectionId?: string;
  adAccounts?: MetaAdAccount[];
  error?: string;
  needsAccountSelection?: boolean;
}

export interface FetchInsightsRequest {
  connectionId: string;
  externalAdId: string;
  datePreset?: 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'lifetime';
  dateRange?: {
    since: string;
    until: string;
  };
}

export interface SyncPerformanceRequest {
  syncConfigId?: string;
  adCopyId?: string;
  forceSync?: boolean;
}

// Map Meta API status codes to readable status
export const META_ACCOUNT_STATUS: Record<number, string> = {
  1: 'Hoạt động',
  2: 'Tạm ngưng',
  3: 'Chưa thanh toán',
  7: 'Đang chờ duyệt',
  8: 'Đang xét duyệt',
  9: 'Đóng',
  100: 'Đang chờ đóng',
  101: 'Bị vô hiệu hóa',
  201: 'Bất thường',
};

export function getAccountStatusLabel(status: number): string {
  return META_ACCOUNT_STATUS[status] || 'Không xác định';
}

export function parseMetaInsightsToPerformance(insights: MetaAdInsights) {
  const impressions = parseInt(insights.impressions || '0', 10);
  const reach = parseInt(insights.reach || '0', 10);
  const clicks = parseInt(insights.clicks || '0', 10);
  const spend = parseFloat(insights.spend || '0');
  
  // Extract actions
  const actions = insights.actions || [];
  const likes = parseInt(actions.find(a => a.action_type === 'like')?.value || '0', 10);
  const comments = parseInt(actions.find(a => a.action_type === 'comment')?.value || '0', 10);
  const shares = parseInt(actions.find(a => a.action_type === 'post')?.value || '0', 10);
  const saves = parseInt(actions.find(a => a.action_type === 'onsite_conversion.post_save')?.value || '0', 10);
  const leads = parseInt(actions.find(a => a.action_type === 'lead')?.value || '0', 10);
  const conversions = parseInt(actions.find(a => 
    a.action_type === 'purchase' || a.action_type === 'omni_purchase'
  )?.value || '0', 10);
  
  // Extract conversion value
  const conversionValues = insights.conversion_values || [];
  const conversionValue = parseFloat(conversionValues.find(a => 
    a.action_type === 'purchase' || a.action_type === 'omni_purchase'
  )?.value || '0');
  
  // Extract ROAS
  const roasData = insights.purchase_roas || [];
  const roas = parseFloat(roasData.find(a => 
    a.action_type === 'omni_purchase'
  )?.value || '0');
  
  return {
    impressions,
    reach,
    clicks,
    spend,
    likes,
    comments,
    shares,
    saves,
    leads,
    conversions,
    conversion_value: conversionValue,
    ctr: parseFloat(insights.ctr || '0'),
    cpc: parseFloat(insights.cpc || '0'),
    cpm: parseFloat(insights.cpm || '0'),
    roas,
  };
}
