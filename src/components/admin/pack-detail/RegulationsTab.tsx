/**
 * RegulationsTab - Display key regulations with source URLs, status, and crawling capabilities
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  ExternalLink, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Globe,
  Database,
} from 'lucide-react';
import type { ProfileData } from '@/hooks/useGlobalPack';
import { usePackRegulationSources } from '@/hooks/usePackRegulationSources';
import { PackLinkedSourcesPanel } from './PackLinkedSourcesPanel';
import { PackCrawledRegulations } from './PackCrawledRegulations';

interface KeyRegulation {
  name?: string;
  regulation_name?: string;
  effective_date?: string;
  validity_status?: 'current' | 'superseded' | 'pending';
  summary?: string;
  source_url?: string;
  last_verified_date?: string;
}

interface RegulationsTabProps {
  profiles: ProfileData[];
  globalPackId: string;
}

export function RegulationsTab({ profiles, globalPackId }: RegulationsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('configured');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);

  // Hook for crawl sources and crawled regulations
  const {
    linkedSources,
    crawledRegulations,
    crawlingTarget,
    isLoadingSources,
    isLoadingCrawled,
    isCrawling,
    triggerCrawl,
    refetchSources,
    refetchCrawled,
    isSourceCrawling,
    isCrawlingAll,
    getCrawlingSourceName,
  } = usePackRegulationSources(globalPackId);

  // Collect all regulations from all profiles
  const allRegulations: Array<KeyRegulation & { jurisdiction: string }> = [];
  
  profiles.forEach(profile => {
    const resolvedRules = profile.resolvedRules as { key_regulations?: KeyRegulation[] };
    const regulations = resolvedRules?.key_regulations || [];
    
    regulations.forEach(reg => {
      allRegulations.push({
        ...reg,
        jurisdiction: profile.jurisdictionCode,
      });
    });
  });

  const filteredRegulations = allRegulations.filter(reg => {
    const matchesSearch = !searchTerm || 
      (reg.name || reg.regulation_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesJurisdiction = !selectedJurisdiction || reg.jurisdiction === selectedJurisdiction;
    
    return matchesSearch && matchesJurisdiction;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'current':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Hiện hành' };
      case 'superseded':
        return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Đã thay thế' };
      case 'pending':
        return { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Chờ hiệu lực' };
      default:
        return { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted', label: status || 'N/A' };
    }
  };

  const jurisdictions = [...new Set(allRegulations.map(r => r.jurisdiction))];

  // Configured regulations content (original)
  const ConfiguredContent = () => {
    if (allRegulations.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Chưa có quy định pháp luật nào được cấu hình</p>
            <p className="text-xs text-muted-foreground mt-2">
              Key Regulations sẽ được hiển thị từ resolved_rules của Jurisdiction Profiles
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm kiếm quy định..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant={selectedJurisdiction === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedJurisdiction(null)}
            >
              Tất cả
            </Button>
            {jurisdictions.map(code => (
              <Button 
                key={code}
                variant={selectedJurisdiction === code ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedJurisdiction(code)}
              >
                {code}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{allRegulations.length}</p>
              <p className="text-xs text-muted-foreground">Tổng quy định</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-green-500">
                {allRegulations.filter(r => r.validity_status === 'current').length}
              </p>
              <p className="text-xs text-muted-foreground">Hiện hành</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">
                {allRegulations.filter(r => r.validity_status === 'superseded').length}
              </p>
              <p className="text-xs text-muted-foreground">Đã thay thế</p>
            </CardContent>
          </Card>
        </div>

        {/* Regulations List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Key Regulations ({filteredRegulations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] sm:max-h-[500px] overflow-y-auto overscroll-contain">
              {filteredRegulations.length > 0 ? (
                <div className="divide-y">
                  {filteredRegulations.map((reg, i) => {
                    const statusConfig = getStatusConfig(reg.validity_status || '');
                    const StatusIcon = statusConfig.icon;
                    const regName = reg.name || reg.regulation_name || 'Untitled Regulation';

                    return (
                      <div key={i} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {reg.jurisdiction}
                                </Badge>
                                <Badge className={`text-xs ${statusConfig.bg} ${statusConfig.color}`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              <h4 className="font-medium">{regName}</h4>
                            </div>
                            {reg.source_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a 
                                  href={reg.source_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Nguồn
                                </a>
                              </Button>
                            )}
                          </div>

                          {/* Summary */}
                          {reg.summary && (
                            <p className="text-sm text-muted-foreground">
                              {reg.summary}
                            </p>
                          )}

                          {/* Dates */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {reg.effective_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Hiệu lực: {reg.effective_date}
                              </span>
                            )}
                            {reg.last_verified_date && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Xác minh: {reg.last_verified_date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Không tìm thấy quy định nào
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configured" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Quy định</span>
            <Badge variant="secondary" className="ml-1 hidden sm:flex">
              {allRegulations.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-1.5">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Nguồn Crawl</span>
            <Badge variant="secondary" className="ml-1 hidden sm:flex">
              {linkedSources.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="crawled" className="gap-1.5">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Đã Crawl</span>
            <Badge variant="secondary" className="ml-1 hidden sm:flex">
              {crawledRegulations.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configured" className="mt-4">
          <ConfiguredContent />
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <PackLinkedSourcesPanel
            sources={linkedSources}
            isLoading={isLoadingSources}
            isCrawling={isCrawling}
            isCrawlingAll={isCrawlingAll}
            crawlingTarget={crawlingTarget}
            getCrawlingSourceName={getCrawlingSourceName}
            onTriggerCrawl={triggerCrawl}
            onRefresh={refetchSources}
            isSourceCrawling={isSourceCrawling}
          />
        </TabsContent>

        <TabsContent value="crawled" className="mt-4">
          <PackCrawledRegulations
            regulations={crawledRegulations}
            isLoading={isLoadingCrawled}
            onRefresh={refetchCrawled}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
