/**
 * JurisdictionsTab - Display jurisdiction profiles with resolved rules
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  MapPin,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Shield,
  FileText,
  Scale,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRegenerateProfile } from '@/hooks/useJurisdictionProfile';
import { SUPPORTED_JURISDICTIONS } from '@/types/industryParkV2';
import type { ProfileData } from '@/hooks/useGlobalPack';

interface JurisdictionsTabProps {
  profiles: ProfileData[];
  globalPackId: string;
  onRefetch: () => void;
}

export function JurisdictionsTab({ profiles, globalPackId, onRefetch }: JurisdictionsTabProps) {
  const [regeneratingCode, setRegeneratingCode] = useState<string | null>(null);
  const { mutate: regenerate } = useRegenerateProfile();

  const handleRegenerate = (jurisdictionCode: string) => {
    setRegeneratingCode(jurisdictionCode);
    regenerate(
      { globalPackId, jurisdictionCode },
      {
        onSuccess: () => {
          toast.success(`Đã regenerate profile cho ${jurisdictionCode}`);
          onRefetch();
          setRegeneratingCode(null);
        },
        onError: () => {
          toast.error('Lỗi khi regenerate profile');
          setRegeneratingCode(null);
        },
      }
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'current':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Current' };
      case 'superseded':
        return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Superseded' };
      case 'pending':
        return { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Pending' };
      default:
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Unknown' };
    }
  };

  const getJurisdictionInfo = (code: string) => {
    return SUPPORTED_JURISDICTIONS.find(j => j.code === code) || { code, name: code, flag: '🏳️' };
  };

  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Chưa có Jurisdiction Profile nào</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Jurisdiction Profiles ({profiles.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[600px]">
          <Accordion type="multiple" className="w-full">
            {profiles.map((profile) => {
              const jurisdictionInfo = getJurisdictionInfo(profile.jurisdictionCode);
              const statusConfig = getStatusConfig(profile.validityStatus);
              const StatusIcon = statusConfig.icon;
              const isRegenerating = regeneratingCode === profile.jurisdictionCode;
              
              const resolvedRules = profile.resolvedRules as {
                compliance_rules?: unknown[];
                claim_restrictions?: unknown[];
                terminology?: { forbidden_terms?: string[] };
                key_regulations?: unknown[];
                industry_trends?: string[];
                disclaimer?: string;
              };

              const stats = {
                complianceRules: resolvedRules?.compliance_rules?.length || 0,
                claimRestrictions: resolvedRules?.claim_restrictions?.length || 0,
                forbiddenTerms: resolvedRules?.terminology?.forbidden_terms?.length || 0,
                regulations: resolvedRules?.key_regulations?.length || 0,
                trends: resolvedRules?.industry_trends?.length || 0,
              };

              return (
                <AccordionItem key={profile.id} value={profile.id} className="border-b last:border-0">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{jurisdictionInfo.flag}</span>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{jurisdictionInfo.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {profile.jurisdictionCode} • Updated {new Date(profile.lastVerifiedDate || '').toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <Badge className={`${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <Shield className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                          <p className="font-medium">{stats.complianceRules}</p>
                          <p className="text-xs text-muted-foreground">Compliance</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <Scale className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                          <p className="font-medium">{stats.claimRestrictions}</p>
                          <p className="text-xs text-muted-foreground">Claims</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-500" />
                          <p className="font-medium">{stats.forbiddenTerms}</p>
                          <p className="text-xs text-muted-foreground">Forbidden</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <FileText className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                          <p className="font-medium">{stats.regulations}</p>
                          <p className="text-xs text-muted-foreground">Regulations</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
                          <p className="font-medium">{stats.trends}</p>
                          <p className="text-xs text-muted-foreground">Trends</p>
                        </div>
                      </div>

                      {/* Disclaimer */}
                      {(profile.disclaimer || resolvedRules?.disclaimer) && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">
                              {profile.disclaimer || resolvedRules?.disclaimer}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Industry Trends */}
                      {resolvedRules?.industry_trends && resolvedRules.industry_trends.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Industry Trends:</p>
                          <div className="flex flex-wrap gap-2">
                            {resolvedRules.industry_trends.map((trend, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {trend}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate(profile.jurisdictionCode)}
                          disabled={isRegenerating}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                          {isRegenerating ? 'Đang regenerate...' : 'Regenerate'}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
