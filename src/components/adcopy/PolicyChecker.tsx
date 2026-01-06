import { useState, useMemo } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Copy,
  Loader2,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAdCopyPolicyChecker } from '@/hooks/useAdCopyPolicyChecker';
import { 
  ComplianceReport, 
  PolicyIssue,
  getScoreColor, 
  getScoreBgColor,
  getSeverityColor,
  getSeverityIcon
} from '@/types/adCopyPolicy';
import type { AdCopy, AdCopyVariation, AdPlatform } from '@/types/adCopy';

interface PolicyCheckerProps {
  adCopy: AdCopy;
  onApplySuggestion?: (variationId: string, field: string, value: string) => void;
}

export function PolicyChecker({ adCopy, onApplySuggestion }: PolicyCheckerProps) {
  const { generateReport, suggestFix, isSuggestingFix } = useAdCopyPolicyChecker();
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Record<string, { suggestion: string; explanation: string }>>({});
  const [loadingField, setLoadingField] = useState<string | null>(null);

  const report = useMemo(() => {
    if (!adCopy.variations || adCopy.variations.length === 0) return null;
    return generateReport(adCopy.variations, adCopy.platform);
  }, [adCopy.variations, adCopy.platform, generateReport]);

  const handleGetSuggestion = async (fieldKey: string, text: string, issues: PolicyIssue[]) => {
    setLoadingField(fieldKey);
    const result = await suggestFix(text, fieldKey, adCopy.platform, issues);
    if (result) {
      setSuggestions(prev => ({ ...prev, [fieldKey]: result }));
    }
    setLoadingField(null);
  };

  const handleCopySuggestion = (suggestion: string) => {
    navigator.clipboard.writeText(suggestion);
    toast.success('Đã copy nội dung gợi ý');
  };

  const toggleExpanded = (fieldKey: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  if (!report) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Không có variations để kiểm tra
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Score Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Policy Compliance Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Display */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white",
              getScoreBgColor(report.overallScore)
            )}>
              {report.overallScore}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Điểm tuân thủ</span>
                {report.overallScore >= 80 && (
                  <Badge className="bg-green-500/10 text-green-600 gap-1">
                    <CheckCircle className="h-3 w-3" /> Tốt
                  </Badge>
                )}
                {report.overallScore >= 60 && report.overallScore < 80 && (
                  <Badge className="bg-yellow-500/10 text-yellow-600 gap-1">
                    <AlertTriangle className="h-3 w-3" /> Cần cải thiện
                  </Badge>
                )}
                {report.overallScore < 60 && (
                  <Badge className="bg-red-500/10 text-red-600 gap-1">
                    <XCircle className="h-3 w-3" /> Cần sửa ngay
                  </Badge>
                )}
              </div>
              <Progress 
                value={report.overallScore} 
                className={cn("h-2", `[&>div]:${getScoreBgColor(report.overallScore)}`)} 
              />
              <p className="text-sm text-muted-foreground mt-2">
                Đã kiểm tra {report.totalChecks} quy tắc • Vượt qua {report.passedChecks}
              </p>
            </div>
          </div>

          {/* Issue Summary */}
          <div className="flex gap-4 pt-2 border-t">
            {report.criticalIssues > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-600">{report.criticalIssues} lỗi nghiêm trọng</span>
              </div>
            )}
            {report.warnings > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-600">{report.warnings} cảnh báo</span>
              </div>
            )}
            {report.suggestions > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-blue-600">{report.suggestions} gợi ý</span>
              </div>
            )}
            {report.criticalIssues === 0 && report.warnings === 0 && report.suggestions === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Không phát hiện vấn đề nào
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Issues */}
      {report.fields.filter(f => f.issues.length > 0).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chi tiết các vấn đề</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            {report.fields
              .filter(f => f.issues.length > 0)
              .map((field) => {
                const isExpanded = expandedFields.has(field.field);
                const suggestion = suggestions[field.field];
                const isLoading = loadingField === field.field;

                return (
                  <Collapsible 
                    key={field.field} 
                    open={isExpanded} 
                    onOpenChange={() => toggleExpanded(field.field)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white",
                            getScoreBgColor(field.score)
                          )}>
                            {field.score}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{field.field}</p>
                            <p className="text-xs text-muted-foreground">
                              {field.issues.length} vấn đề
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {field.issues.filter(i => i.severity === 'error').length > 0 && (
                              <Badge variant="destructive" className="text-xs px-1.5">
                                {field.issues.filter(i => i.severity === 'error').length}
                              </Badge>
                            )}
                            {field.issues.filter(i => i.severity === 'warning').length > 0 && (
                              <Badge className="text-xs px-1.5 bg-yellow-500">
                                {field.issues.filter(i => i.severity === 'warning').length}
                              </Badge>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="px-4 pb-4 space-y-3">
                      {/* Original Text */}
                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="text-muted-foreground text-xs mb-1">Nội dung gốc:</p>
                        <p className="line-clamp-3">{field.text}</p>
                      </div>

                      {/* Issues List */}
                      <div className="space-y-2">
                        {field.issues.map((issue, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "p-3 rounded-lg flex items-start gap-3",
                              getSeverityColor(issue.severity)
                            )}
                          >
                            <span className="text-lg">{getSeverityIcon(issue.severity)}</span>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{issue.ruleName}</p>
                              <p className="text-xs opacity-80">{issue.message}</p>
                              {issue.fixHint && (
                                <p className="text-xs mt-1 opacity-70">
                                  💡 {issue.fixHint}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* AI Suggestion */}
                      {suggestion ? (
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <Sparkles className="h-4 w-4" />
                            Gợi ý từ AI
                          </div>
                          <p className="text-sm">{suggestion.suggestion}</p>
                          <p className="text-xs text-muted-foreground">{suggestion.explanation}</p>
                          <div className="flex gap-2 pt-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs"
                              onClick={() => handleCopySuggestion(suggestion.suggestion)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            {onApplySuggestion && (
                              <Button 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={() => {
                                  // Extract variation index and field from field.field
                                  // Format: "Variation A - primary_text"
                                  const match = field.field.match(/Variation ([A-E]) - (\w+)/);
                                  if (match && adCopy.variations) {
                                    const varIndex = match[1].charCodeAt(0) - 65;
                                    const fieldName = match[2];
                                    const variation = adCopy.variations[varIndex];
                                    if (variation) {
                                      onApplySuggestion(variation.id, fieldName, suggestion.suggestion);
                                    }
                                  }
                                }}
                              >
                                Áp dụng
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => handleGetSuggestion(field.field, field.text, field.issues)}
                          disabled={isLoading || isSuggestingFix}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Đang tạo gợi ý...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Nhờ AI gợi ý sửa
                            </>
                          )}
                        </Button>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
