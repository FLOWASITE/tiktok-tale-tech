import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  History,
  Clock,
  User,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck,
  Lock,
  AlertTriangle,
  Eye,
  Loader2,
  GitBranch,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useIndustryMemoryVersions, IndustryMemoryVersion } from '@/hooks/useIndustryMemoryVersions';
import { cn } from '@/lib/utils';

interface IndustryVersionManagerProps {
  templateId: string;
  templateName: string;
  currentVersion?: string;
  countryName?: string;
}

function VersionDetailDialog({ 
  version, 
  templateName 
}: { 
  version: IndustryMemoryVersion;
  templateName: string;
}) {
  const complianceCount = version.compliance_rules?.length || 0;
  const forbiddenCount = version.forbidden_terms?.length || 0;
  const claimCount = version.claim_restrictions?.length || 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <Eye className="w-3.5 h-3.5 mr-1" />
          Chi tiết
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version {version.version}
          </DialogTitle>
          <DialogDescription>
            {templateName} • {format(new Date(version.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                <p className="text-lg font-bold text-emerald-600">{complianceCount}</p>
                <p className="text-[10px] text-muted-foreground">Compliance Rules</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-destructive/10">
                <p className="text-lg font-bold text-destructive">{forbiddenCount}</p>
                <p className="text-[10px] text-muted-foreground">Forbidden Terms</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-500/10">
                <p className="text-lg font-bold text-amber-600">{claimCount}</p>
                <p className="text-[10px] text-muted-foreground">Claim Restrictions</p>
              </div>
            </div>

            {/* Change notes */}
            {version.change_notes && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Ghi chú thay đổi:</p>
                <p className="text-sm">{version.change_notes}</p>
              </div>
            )}

            <Accordion type="multiple" className="w-full">
              {/* Compliance Rules */}
              {complianceCount > 0 && (
                <AccordionItem value="compliance">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Compliance Rules ({complianceCount})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1.5 text-sm">
                      {version.compliance_rules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{rule.rule}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Forbidden Terms */}
              {forbiddenCount > 0 && (
                <AccordionItem value="forbidden">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-destructive" />
                      Forbidden Terms ({forbiddenCount})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-1.5">
                      {version.forbidden_terms.map((term, i) => (
                        <Badge 
                          key={i} 
                          variant="outline" 
                          className="text-xs bg-destructive/10 text-destructive border-destructive/30"
                        >
                          <Lock className="w-2.5 h-2.5 mr-1" />
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Claim Restrictions */}
              {claimCount > 0 && (
                <AccordionItem value="claims">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Claim Restrictions ({claimCount})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1.5 text-sm">
                      {version.claim_restrictions.map((claim, i) => (
                        <li key={i} className="flex items-start gap-2 p-2 rounded bg-amber-500/10">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <span>{claim.claim}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function VersionTimelineItem({
  version,
  templateName,
  isCurrent,
  previousVersion,
}: {
  version: IndustryMemoryVersion;
  templateName: string;
  isCurrent: boolean;
  previousVersion?: IndustryMemoryVersion;
}) {
  // Calculate changes from previous version
  const newRules = version.compliance_rules?.length || 0;
  const prevRules = previousVersion?.compliance_rules?.length || 0;
  const rulesAdded = Math.max(0, newRules - prevRules);
  const rulesRemoved = Math.max(0, prevRules - newRules);

  const newTerms = version.forbidden_terms?.length || 0;
  const prevTerms = previousVersion?.forbidden_terms?.length || 0;
  const termsAdded = Math.max(0, newTerms - prevTerms);
  const termsRemoved = Math.max(0, prevTerms - newTerms);

  const hasChanges = previousVersion && (rulesAdded > 0 || rulesRemoved > 0 || termsAdded > 0 || termsRemoved > 0);

  return (
    <div className={cn(
      'relative flex gap-3 p-3 rounded-lg border transition-all hover:shadow-sm',
      isCurrent 
        ? 'bg-emerald-500/10 border-emerald-500/30' 
        : 'bg-muted/30 border-border/50'
    )}>
      {/* Timeline dot */}
      <div className={cn(
        'absolute -left-[21px] top-4 w-3 h-3 rounded-full border-2 border-background',
        isCurrent ? 'bg-emerald-500' : 'bg-muted-foreground/50'
      )} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">v{version.version}</span>
            {isCurrent && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-600">
                Current
              </Badge>
            )}
          </div>
          <VersionDetailDialog version={version} templateName={templateName} />
        </div>

        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <time>
            {format(new Date(version.created_at), "HH:mm - dd/MM/yyyy", { locale: vi })}
          </time>
        </div>

        {/* Changes summary */}
        {!previousVersion && (
          <p className="text-xs text-muted-foreground mt-2 italic">Initial version</p>
        )}

        {hasChanges && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {rulesAdded > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-500/30">
                <Plus className="w-2.5 h-2.5 mr-0.5" />
                {rulesAdded} quy tắc mới
              </Badge>
            )}
            {rulesRemoved > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">
                <Minus className="w-2.5 h-2.5 mr-0.5" />
                {rulesRemoved} quy tắc bỏ
              </Badge>
            )}
            {termsAdded > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-500/30">
                <Plus className="w-2.5 h-2.5 mr-0.5" />
                {termsAdded} từ cấm mới
              </Badge>
            )}
            {termsRemoved > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 border-blue-500/30">
                <Minus className="w-2.5 h-2.5 mr-0.5" />
                {termsRemoved} từ cấm bỏ
              </Badge>
            )}
          </div>
        )}

        {/* Change notes */}
        {version.change_notes && (
          <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
            "{version.change_notes}"
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            {version.compliance_rules?.length || 0} rules
          </span>
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-destructive" />
            {version.forbidden_terms?.length || 0} terms
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            {version.claim_restrictions?.length || 0} claims
          </span>
        </div>
      </div>
    </div>
  );
}

export function IndustryVersionManager({
  templateId,
  templateName,
  currentVersion,
  countryName = 'Việt Nam',
}: IndustryVersionManagerProps) {
  const { versions, loading, refetch } = useIndustryMemoryVersions(templateId);

  // Sort versions by date descending
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const latestVersion = sortedVersions[0];

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-5 w-5 text-primary" />
            Version History
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {versions.length} versions
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardDescription>
          {templateName} – {countryName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg bg-muted/30">
            <History className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">Chưa có version history</p>
            <p className="text-xs text-muted-foreground mt-1">
              Version sẽ được tự động tạo khi Industry Memory được cập nhật
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-2">
            <div className="relative pl-5 border-l-2 border-muted space-y-3">
              {sortedVersions.map((version, index) => (
                <VersionTimelineItem
                  key={version.id}
                  version={version}
                  templateName={templateName}
                  isCurrent={version.version === (currentVersion || latestVersion?.version)}
                  previousVersion={sortedVersions[index + 1]}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact version badge for table rows
 */
export function IndustryVersionBadge({
  templateId,
  currentVersion,
}: {
  templateId: string;
  currentVersion?: string;
}) {
  const { versions, loading } = useIndustryMemoryVersions(templateId);

  if (loading) {
    return <Skeleton className="h-5 w-16" />;
  }

  const latestVersion = versions[0];
  const hasVersions = versions.length > 0;
  const isOutdated = currentVersion && latestVersion && currentVersion !== latestVersion.version;

  return (
    <div className="flex items-center gap-1">
      <Badge 
        variant="outline" 
        className={cn(
          'text-[10px] px-1.5 py-0',
          isOutdated 
            ? 'text-amber-600 border-amber-500/30 bg-amber-500/10' 
            : 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'
        )}
      >
        <GitBranch className="w-2.5 h-2.5 mr-0.5" />
        {hasVersions ? `v${latestVersion.version}` : 'No version'}
      </Badge>
      <Badge variant="secondary" className="text-[10px] px-1 py-0">
        {versions.length}
      </Badge>
    </div>
  );
}
