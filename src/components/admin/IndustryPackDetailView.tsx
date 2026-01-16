/**
 * IndustryPackDetailView - Comprehensive view of an Industry Pack with 8 tabs
 * Replaces JurisdictionProfilesPanel with full content display
 */

import { useState } from 'react';
import { useGlobalPack } from '@/hooks/useGlobalPack';
import { useIndustryPersonasCount } from '@/hooks/useIndustryPersonasV2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft,
  RefreshCw,
  LayoutDashboard,
  MessageSquare,
  Shield,
  BookOpen,
  FileText,
  Globe,
  BookMarked,
  Users,
} from 'lucide-react';

// Tab components
import { OverviewTab } from './pack-detail/OverviewTab';
import { BrandVoiceTab } from './pack-detail/BrandVoiceTab';
import { RulesTab } from './pack-detail/RulesTab';
import { TerminologyTab } from './pack-detail/TerminologyTab';
import { RegulationsTab } from './pack-detail/RegulationsTab';
import { JurisdictionsTab } from './pack-detail/JurisdictionsTab';
import { GlossaryTab } from './pack-detail/GlossaryTab';
import { IndustryPersonasTab } from './IndustryPersonasTab';

interface IndustryPackDetailViewProps {
  globalPackId: string;
  onBack?: () => void;
}

export function IndustryPackDetailView({ globalPackId, onBack }: IndustryPackDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading, refetch } = useGlobalPack(globalPackId, 'vi');
  const { data: personasCount } = useIndustryPersonasCount(globalPackId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
        </Card>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Không tìm thấy Industry Pack</p>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="mt-4">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const { pack, translations, profiles } = data;
  const viTranslation = translations['vi'] || translations['en'];

  // Extract data for tabs
  const brandVoice = pack.globalBrandVoice as Record<string, unknown>;
  const complianceRules = (pack.globalComplianceRules as unknown[]) || [];
  const claimRestrictions = (pack.globalClaimRestrictions as unknown[]) || [];
  const systemRules = pack.globalSystemRules || [];
  const argumentPatterns = pack.globalArgumentPatterns as { valid_patterns?: string[]; forbidden_patterns?: string[] } || {};
  const terminology = pack.globalTerminology as {
    forbidden_terms_global?: string[];
    preferred_terms?: Record<string, string>;
  };
  const riskGuidelines = pack.riskGuidelines as {
    high_risk_keywords?: string[];
    weights?: Record<string, number>;
    thresholds?: Record<string, number>;
  };

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
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">
                  {pack.industryCode}
                </code>
                <span>{viTranslation?.name || pack.industryCode}</span>
                <Badge variant="outline" className="ml-2">v{pack.version}</Badge>
              </CardTitle>
              <CardDescription className="mt-1 flex flex-wrap gap-2 items-center">
                <Badge variant="secondary">{pack.targetAudience}</Badge>
                <span>•</span>
                <span>{profiles.length} jurisdictions</span>
                <span>•</span>
                <span>{personasCount || 0} personas</span>
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="gap-1.5 flex-1 min-w-[100px]">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Tổng quan</span>
          </TabsTrigger>
          <TabsTrigger value="brand-voice" className="gap-1.5 flex-1 min-w-[100px]">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Brand Voice</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 flex-1 min-w-[100px]">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Quy tắc</span>
          </TabsTrigger>
          <TabsTrigger value="terminology" className="gap-1.5 flex-1 min-w-[100px]">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Thuật ngữ</span>
          </TabsTrigger>
          <TabsTrigger value="regulations" className="gap-1.5 flex-1 min-w-[100px]">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Quy định</span>
          </TabsTrigger>
          <TabsTrigger value="jurisdictions" className="gap-1.5 flex-1 min-w-[100px]">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Profiles</span>
          </TabsTrigger>
          <TabsTrigger value="glossary" className="gap-1.5 flex-1 min-w-[100px]">
            <BookMarked className="h-4 w-4" />
            <span className="hidden sm:inline">Glossary</span>
          </TabsTrigger>
          <TabsTrigger value="personas" className="gap-1.5 flex-1 min-w-[100px]">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Personas</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="overview">
            <OverviewTab 
              pack={pack} 
              translations={translations} 
              profiles={profiles}
              personasCount={personasCount || 0}
            />
          </TabsContent>

          <TabsContent value="brand-voice">
            <BrandVoiceTab brandVoice={brandVoice} />
          </TabsContent>

          <TabsContent value="rules">
            <RulesTab 
              complianceRules={complianceRules as any[]}
              claimRestrictions={claimRestrictions as any[]}
              systemRules={systemRules}
              argumentPatterns={argumentPatterns}
            />
          </TabsContent>

          <TabsContent value="terminology">
            <TerminologyTab 
              terminology={terminology || {}}
              riskGuidelines={riskGuidelines || {}}
              translationForbiddenTerms={viTranslation?.forbiddenTerms}
              translationPreferredTerms={viTranslation?.preferredTerms}
            />
          </TabsContent>

          <TabsContent value="regulations">
            <RegulationsTab profiles={profiles} globalPackId={globalPackId} />
          </TabsContent>

          <TabsContent value="jurisdictions">
            <JurisdictionsTab 
              profiles={profiles}
              globalPackId={globalPackId}
              onRefetch={refetch}
            />
          </TabsContent>

          <TabsContent value="glossary">
            <GlossaryTab translations={translations} />
          </TabsContent>

          <TabsContent value="personas">
            <IndustryPersonasTab 
              globalPackId={globalPackId}
              industryCode={pack.industryCode}
              targetAudience={pack.targetAudience}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
