/**
 * JurisdictionProfilesPanel - v2 Admin component for managing jurisdiction profiles
 */

import { useState } from 'react';
import { useGlobalPack } from '@/hooks/useGlobalPack';
import { useRegenerateProfile } from '@/hooks/useJurisdictionProfile';
import { useIndustryPersonasCount } from '@/hooks/useIndustryPersonasV2';
import { SUPPORTED_JURISDICTIONS } from '@/types/industryParkV2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Sparkles,
  ChevronLeft,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProfileData } from '@/hooks/useGlobalPack';
import { IndustryPersonasTab } from './IndustryPersonasTab';

interface JurisdictionProfilesPanelProps {
  globalPackId: string;
  onBack?: () => void;
}

export function JurisdictionProfilesPanel({ globalPackId, onBack }: JurisdictionProfilesPanelProps) {
  const [regeneratingCode, setRegeneratingCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profiles');

  const { data, isLoading, refetch } = useGlobalPack(globalPackId, 'vi');
  const { mutate: regenerate } = useRegenerateProfile();
  const { data: personasCount } = useIndustryPersonasCount(globalPackId);

  const handleRegenerate = (jurisdictionCode: string) => {
    setRegeneratingCode(jurisdictionCode);
    regenerate(
      { globalPackId, jurisdictionCode },
      {
        onSuccess: () => {
          toast.success(`Đã regenerate profile cho ${jurisdictionCode}`);
          refetch();
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Không tìm thấy Global Pack</p>
        </CardContent>
      </Card>
    );
  }

  const { pack, translations, profiles } = data;
  const viTranslation = translations['vi'] || translations['en'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Button>
            )}
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">
                  {pack.industryCode}
                </code>
                <span>{viTranslation?.name || pack.industryCode}</span>
              </CardTitle>
              <CardDescription className="mt-1">
                Version {pack.version} • {pack.targetAudience} • {profiles.length} profiles • {personasCount || 0} personas
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Global Pack Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Global Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Compliance Rules</p>
              <p className="font-medium">{(pack.globalComplianceRules as unknown[])?.length || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Claim Restrictions</p>
              <p className="font-medium">{(pack.globalClaimRestrictions as unknown[])?.length || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">System Rules</p>
              <p className="font-medium">{pack.globalSystemRules?.length || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Related Industries</p>
              <p className="font-medium">{pack.relatedIndustries?.length || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target Personas</p>
              <p className="font-medium text-primary">{personasCount || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Profiles & Personas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profiles" className="gap-2">
            <MapPin className="h-4 w-4" />
            Jurisdictions ({profiles.length})
          </TabsTrigger>
          <TabsTrigger value="personas" className="gap-2">
            <Users className="h-4 w-4" />
            Personas ({personasCount || 0})
          </TabsTrigger>
          <TabsTrigger value="translations" className="gap-2">
            <FileText className="h-4 w-4" />
            Translations ({Object.keys(translations).length})
          </TabsTrigger>
        </TabsList>

        {/* Jurisdiction Profiles Tab */}
        <TabsContent value="profiles" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <Accordion type="multiple" className="w-full">
                  {profiles.map((profile) => {
                    const jurisdictionInfo = getJurisdictionInfo(profile.jurisdictionCode);
                    const statusConfig = getStatusConfig(profile.validityStatus);
                    const StatusIcon = statusConfig.icon;
                    const isRegenerating = regeneratingCode === profile.jurisdictionCode;

                    return (
                      <AccordionItem key={profile.id} value={profile.id} className="border-b last:border-0">
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-xl">{jurisdictionInfo.flag}</span>
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
                            {/* Resolved Rules Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              <div className="bg-muted/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Shield className="h-3 w-3" />
                                  <span>Compliance Rules</span>
                                </div>
                                <p className="font-medium">
                                  {(profile.resolvedRules as any)?.compliance_rules?.length || 0}
                                </p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Scale className="h-3 w-3" />
                                  <span>Claim Restrictions</span>
                                </div>
                                <p className="font-medium">
                                  {(profile.resolvedRules as any)?.claim_restrictions?.length || 0}
                                </p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <FileText className="h-3 w-3" />
                                  <span>Forbidden Terms</span>
                                </div>
                                <p className="font-medium">
                                  {(profile.resolvedRules as any)?.terminology?.forbidden_terms?.length || 0}
                                </p>
                              </div>
                            </div>

                            {/* Disclaimer */}
                            {profile.disclaimer && (
                              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
                                <p className="text-yellow-600 dark:text-yellow-400">{profile.disclaimer}</p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-2">
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
        </TabsContent>

        {/* Personas Tab */}
        <TabsContent value="personas" className="mt-4">
          <IndustryPersonasTab 
            globalPackId={globalPackId}
            industryCode={pack.industryCode}
            targetAudience={pack.targetAudience}
          />
        </TabsContent>

        {/* Translations Tab */}
        <TabsContent value="translations" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {Object.entries(translations).map(([lang, t]) => (
                  <Badge key={lang} variant="secondary" className="gap-1 py-2 px-3">
                    <span className="uppercase font-mono text-xs">{lang}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{t.name}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
