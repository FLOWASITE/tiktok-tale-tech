/**
 * RulesTab - Display compliance rules, claim restrictions, system rules, argument patterns
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Scale, 
  FileText, 
  GitBranch,
  Search,
  Check,
  X,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface ComplianceRule {
  rule_id?: string;
  rule_text?: string;
  rule?: string;
  category?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  source?: string;
}

interface ClaimRestriction {
  forbidden_claim?: string;
  claim?: string;
  alternative?: string;
  reason?: string;
  severity?: string;
}

// Helper getters supporting both schema variants
const getRuleText = (r: ComplianceRule): string => r.rule || r.rule_text || '';
const getClaimText = (c: ClaimRestriction): string => c.claim || c.forbidden_claim || '';

interface ArgumentPatterns {
  valid_patterns?: string[];
  forbidden_patterns?: string[];
}

interface SystemRule {
  rule: string;
  priority?: number | string;
}

interface RulesTabProps {
  complianceRules: ComplianceRule[];
  claimRestrictions: ClaimRestriction[];
  systemRules: (string | SystemRule)[];
  argumentPatterns: ArgumentPatterns;
}

// Helper to extract rule text from system rule (can be string or object)
const getSystemRuleText = (rule: string | SystemRule): string => {
  if (typeof rule === 'string') return rule;
  if (typeof rule === 'object' && rule !== null && typeof rule.rule === 'string') {
    return rule.rule;
  }
  return '';
};

export function RulesTab({ 
  complianceRules, 
  claimRestrictions, 
  systemRules, 
  argumentPatterns 
}: RulesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy vào clipboard');
  };

  const filteredComplianceRules = complianceRules.filter(r => 
    !searchTerm || 
    getRuleText(r).toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClaimRestrictions = claimRestrictions.filter(r =>
    !searchTerm ||
    getClaimText(r).toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.alternative?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSystemRules = systemRules.filter(r => {
    const text = getSystemRuleText(r);
    return !searchTerm || text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Tìm kiếm quy tắc..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="compliance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compliance" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Compliance</span>
            <Badge variant="secondary" className="ml-1">{complianceRules.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="claims" className="gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Claims</span>
            <Badge variant="secondary" className="ml-1">{claimRestrictions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
            <Badge variant="secondary" className="ml-1">{systemRules.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="arguments" className="gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Arguments</span>
          </TabsTrigger>
        </TabsList>

        {/* Compliance Rules */}
        <TabsContent value="compliance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Compliance Rules ({filteredComplianceRules.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                {filteredComplianceRules.length > 0 ? (
                  <div className="divide-y">
                    {filteredComplianceRules.map((rule, i) => (
                      <div key={i} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {rule.rule_id && (
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                  {rule.rule_id}
                                </code>
                              )}
                              {rule.category && (
                                <Badge variant="outline" className="text-xs">
                                  {rule.category}
                                </Badge>
                              )}
                              {rule.severity && (
                                <Badge className={`text-xs ${getSeverityColor(rule.severity)}`}>
                                  {rule.severity}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm">{getRuleText(rule)}</p>
                            {rule.source && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                {rule.source}
                              </p>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => copyToClipboard(getRuleText(rule))}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    Không có dữ liệu
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Claim Restrictions */}
        <TabsContent value="claims" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Claim Restrictions ({filteredClaimRestrictions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                {filteredClaimRestrictions.length > 0 ? (
                  <div className="divide-y">
                    {filteredClaimRestrictions.map((claim, i) => (
                      <div key={i} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                {getClaimText(claim)}
                              </p>
                            </div>
                            {claim.severity && (
                              <Badge className={`text-xs ${getSeverityColor(claim.severity)}`}>
                                {claim.severity}
                              </Badge>
                            )}
                          </div>
                          {claim.alternative && (
                            <div className="flex items-start gap-3 ml-7">
                              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              <p className="text-sm text-green-600 dark:text-green-400">
                                {claim.alternative}
                              </p>
                            </div>
                          )}
                          {claim.reason && (
                            <p className="text-xs text-muted-foreground ml-7 bg-muted/50 rounded p-2">
                              💡 {claim.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    Không có dữ liệu
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Rules */}
        <TabsContent value="system" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                System Rules ({filteredSystemRules.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSystemRules.length > 0 ? (
                <ol className="space-y-3">
                  {filteredSystemRules.map((rule, i) => {
                    const ruleText = getSystemRuleText(rule);
                    return (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <Badge variant="outline" className="shrink-0 font-mono">
                          {i + 1}
                        </Badge>
                        <span className="text-sm flex-1">{ruleText}</span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="shrink-0"
                          onClick={() => copyToClipboard(ruleText)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Không có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Argument Patterns */}
        <TabsContent value="arguments" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Valid Patterns ({argumentPatterns.valid_patterns?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[300px]">
                  {argumentPatterns.valid_patterns?.length ? (
                    <ul className="space-y-2">
                      {argumentPatterns.valid_patterns.map((pattern, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-green-500/5 border border-green-500/10">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      Không có dữ liệu
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  Forbidden Patterns ({argumentPatterns.forbidden_patterns?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[300px]">
                  {argumentPatterns.forbidden_patterns?.length ? (
                    <ul className="space-y-2">
                      {argumentPatterns.forbidden_patterns.map((pattern, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-red-500/5 border border-red-500/10">
                          <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                          <span>{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      Không có dữ liệu
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
