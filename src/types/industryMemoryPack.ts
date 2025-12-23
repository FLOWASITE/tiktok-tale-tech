/**
 * Industry Memory Pack - Đóng gói Country + Industry với lifecycle rõ ràng
 */
export type IndustryPackStatus = 'draft' | 'stable' | 'deprecated';

export interface IndustryMemoryPack {
  id: string;
  code: string;
  name: string | null;
  shortName: string | null;
  // Country info
  countryId: string;
  countryCode: string;
  countryName: string;
  flagEmoji: string | null;
  // Industry info
  version: string;
  status: IndustryPackStatus;
  targetAudience: string;
  // Category info
  categoryCode: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  // Computed stats
  complianceRulesCount: number;
  forbiddenTermsCount: number;
  claimRestrictionsCount: number;
  versionCount: number;
  // Timestamps
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface PackStats {
  total: number;
  draft: number;
  stable: number;
  deprecated: number;
  byCountry: Record<string, number>;
}
