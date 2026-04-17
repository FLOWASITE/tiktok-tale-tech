/**
 * OverviewTab - Summary cards and quick stats for an Industry Pack
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Layers, 
  Shield, 
  Scale, 
  FileText,
  AlertTriangle,
  Users,
  Globe,
  TrendingUp,
} from 'lucide-react';
import type { GlobalPackData, TranslationData, ProfileData } from '@/hooks/useGlobalPack';

interface OverviewTabProps {
  pack: GlobalPackData;
  translations: Record<string, TranslationData>;
  profiles: ProfileData[];
  personasCount: number;
}

export function OverviewTab({ pack, translations, profiles, personasCount }: OverviewTabProps) {
  const terminology = pack.globalTerminology as {
    forbidden_terms_global?: string[];
    preferred_terms?: Record<string, string | string[]>;
  };
  const riskGuidelines = pack.riskGuidelines as {
    high_risk_keywords?: string[];
    thresholds?: Record<string, number>;
    risk_thresholds?: Record<string, number>;
    weights?: Record<string, number>;
    scoring_weights?: Record<string, number>;
  };

  // Count preferred terms across all languages (handles both string and string[] values)
  const countPreferredTerms = (pt: Record<string, string | string[]> | undefined): number => {
    if (!pt) return 0;
    return Object.values(pt).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : (v ? 1 : 0)), 0);
  };

  const stats = {
    complianceRules: (pack.globalComplianceRules as unknown[])?.length || 0,
    claimRestrictions: (pack.globalClaimRestrictions as unknown[])?.length || 0,
    systemRules: pack.globalSystemRules?.length || 0,
    forbiddenTerms: terminology?.forbidden_terms_global?.length || 0,
    highRiskKeywords: riskGuidelines?.high_risk_keywords?.length || 0,
    preferredTerms: countPreferredTerms(terminology?.preferred_terms),
    relatedIndustries: pack.relatedIndustries?.length || 0,
    translations: Object.keys(translations).length,
    jurisdictions: profiles.length,
    personas: personasCount,
  };

  const thresholds = riskGuidelines?.risk_thresholds || riskGuidelines?.thresholds || {};

  return (
    <div className="space-y-6">
      {/* Main Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="text-lg font-semibold">{pack.version}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="text-lg font-semibold">{pack.targetAudience}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Globe className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jurisdictions</p>
                <p className="text-lg font-semibold">{stats.jurisdictions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Personas</p>
                <p className="text-lg font-semibold">{stats.personas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules & Terms Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thống kê Quy tắc & Thuật ngữ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{stats.complianceRules}</p>
              <p className="text-xs text-muted-foreground">Compliance Rules</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Scale className="h-5 w-5 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{stats.claimRestrictions}</p>
              <p className="text-xs text-muted-foreground">Claim Restrictions</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <FileText className="h-5 w-5 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{stats.systemRules}</p>
              <p className="text-xs text-muted-foreground">System Rules</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">{stats.forbiddenTerms}</p>
              <p className="text-xs text-muted-foreground">Forbidden Terms</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{stats.highRiskKeywords}</p>
              <p className="text-xs text-muted-foreground">High Risk Keywords</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Thresholds */}
      {Object.keys(thresholds).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ngưỡng Rủi ro (Risk Thresholds)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {thresholds.low !== undefined && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Low Risk</span>
                  <span className="text-green-500">&lt; {thresholds.low}</span>
                </div>
                <Progress value={(thresholds.low / 100) * 100} className="h-2 bg-green-100" />
              </div>
            )}
            {thresholds.medium !== undefined && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Medium Risk</span>
                  <span className="text-yellow-500">{thresholds.low || 0} - {thresholds.medium}</span>
                </div>
                <Progress value={(thresholds.medium / 100) * 100} className="h-2 bg-yellow-100" />
              </div>
            )}
            {thresholds.high !== undefined && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>High Risk</span>
                  <span className="text-orange-500">{thresholds.medium || 0} - {thresholds.high}</span>
                </div>
                <Progress value={(thresholds.high / 100) * 100} className="h-2 bg-orange-100" />
              </div>
            )}
            {thresholds.blocked !== undefined && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Blocked</span>
                  <span className="text-red-500">&gt; {thresholds.blocked}</span>
                </div>
                <Progress value={100} className="h-2 bg-red-100" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Related Industries */}
      {pack.relatedIndustries?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ngành liên quan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pack.relatedIndustries.map((code) => (
                <Badge key={code} variant="secondary" className="font-mono">
                  {code}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Translations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bản dịch có sẵn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(translations).map(([lang, t]) => (
              <Badge key={lang} variant="outline" className="py-2 px-3 gap-2">
                <span className="uppercase font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{lang}</span>
                <span>{t.name}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
