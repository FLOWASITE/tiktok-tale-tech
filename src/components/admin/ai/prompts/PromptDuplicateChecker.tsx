// ============================================
// Prompt Duplicate Checker - Admin Utility
// Detect duplicates and integration gaps
// ============================================

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DuplicateIssue {
  type: "duplicate_system" | "similar_content" | "missing_integration";
  severity: "high" | "medium" | "low";
  functionName: string;
  details: string;
  affectedPrompts?: Array<{ id: string; name: string; prompt_key: string; is_active: boolean }>;
  recommendation: string;
}

// Known edge functions that should use PromptManager
const KNOWN_EDGE_FUNCTIONS = [
  "generate-core-content",
  "generate-multichannel",
  "generate-ad-copy",
  "generate-hooks",
  "generate-carousel",
  "generate-storyboard",
  "ai-help-chat",
  "ai-sales-chat",
  "topic-ai",
  "kpi-ai",
  "generate-video-script",
];

export function PromptDuplicateChecker() {
  const [isLoading, setIsLoading] = useState(false);
  const [issues, setIssues] = useState<DuplicateIssue[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const { data: prompts, error } = await supabase
        .from("ai_prompts")
        .select("id, function_name, prompt_key, prompt_type, name, content, is_active, is_default")
        .order("function_name");

      if (error) throw error;

      const foundIssues: DuplicateIssue[] = [];

      // Group prompts by function
      const byFunction = new Map<string, typeof prompts>();
      for (const p of prompts || []) {
        const list = byFunction.get(p.function_name) || [];
        list.push(p);
        byFunction.set(p.function_name, list);
      }

      // Check 1: Multiple system prompts for same function
      for (const [fn, fnPrompts] of byFunction) {
        const systemPrompts = fnPrompts.filter(
          (p) => p.prompt_type === "system" && p.is_active
        );
        if (systemPrompts.length > 1) {
          foundIssues.push({
            type: "duplicate_system",
            severity: "high",
            functionName: fn,
            details: `Có ${systemPrompts.length} system prompts đang active cho function này`,
            affectedPrompts: systemPrompts.map((p) => ({
              id: p.id,
              name: p.name,
              prompt_key: p.prompt_key,
              is_active: p.is_active,
            })),
            recommendation:
              "Chọn 1 system prompt làm canonical và tắt (is_active=false) các prompt còn lại",
          });
        }
      }

      // Check 2: Similar content detection (basic - same first 100 chars)
      for (const [fn, fnPrompts] of byFunction) {
        const activePrompts = fnPrompts.filter((p) => p.is_active);
        for (let i = 0; i < activePrompts.length; i++) {
          for (let j = i + 1; j < activePrompts.length; j++) {
            const a = activePrompts[i];
            const b = activePrompts[j];
            const aStart = (a.content || "").substring(0, 200).toLowerCase();
            const bStart = (b.content || "").substring(0, 200).toLowerCase();
            
            if (aStart && bStart && aStart === bStart && a.prompt_key !== b.prompt_key) {
              foundIssues.push({
                type: "similar_content",
                severity: "medium",
                functionName: fn,
                details: `Prompts "${a.name}" và "${b.name}" có nội dung tương tự`,
                affectedPrompts: [
                  { id: a.id, name: a.name, prompt_key: a.prompt_key, is_active: a.is_active },
                  { id: b.id, name: b.name, prompt_key: b.prompt_key, is_active: b.is_active },
                ],
                recommendation: "Review và merge hoặc differentiate nội dung các prompts này",
              });
            }
          }
        }
      }

      // Check 3: Missing integration (functions have prompts but may not use PromptManager)
      // This is informational - we flag functions that exist in DB but aren't in known list
      const dbFunctions = new Set(byFunction.keys());
      const knownSet = new Set(KNOWN_EDGE_FUNCTIONS);
      
      for (const fn of dbFunctions) {
        if (!knownSet.has(fn)) {
          foundIssues.push({
            type: "missing_integration",
            severity: "low",
            functionName: fn,
            details: `Function "${fn}" có prompts trong DB nhưng không nằm trong danh sách known integrations`,
            recommendation:
              "Verify edge function code đã tích hợp PromptManager hoặc thêm vào KNOWN_EDGE_FUNCTIONS",
          });
        }
      }

      setIssues(foundIssues);
      setLastChecked(new Date());
      toast.success(`Phân tích hoàn tất: ${foundIssues.length} vấn đề được phát hiện`);
    } catch (error: any) {
      toast.error("Lỗi phân tích: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIssues(newExpanded);
  };

  const getSeverityColor = (severity: DuplicateIssue["severity"]) => {
    switch (severity) {
      case "high":
        return "bg-red-500/10 text-red-600 border-red-500/30";
      case "medium":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "low":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    }
  };

  const getTypeIcon = (type: DuplicateIssue["type"]) => {
    switch (type) {
      case "duplicate_system":
        return <Copy className="h-4 w-4" />;
      case "similar_content":
        return <AlertTriangle className="h-4 w-4" />;
      case "missing_integration":
        return <Info className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: DuplicateIssue["type"]) => {
    switch (type) {
      case "duplicate_system":
        return "Duplicate System Prompt";
      case "similar_content":
        return "Similar Content";
      case "missing_integration":
        return "Unknown Integration";
    }
  };

  const { highCount, mediumCount, lowCount } = useMemo(() => {
    return {
      highCount: issues.filter((i) => i.severity === "high").length,
      mediumCount: issues.filter((i) => i.severity === "medium").length,
      lowCount: issues.filter((i) => i.severity === "low").length,
    };
  }, [issues]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Duplicate & Integration Checker
        </CardTitle>
        <Button onClick={runAnalysis} disabled={isLoading} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Đang phân tích..." : "Chạy phân tích"}
        </Button>
      </CardHeader>
      <CardContent>
        {lastChecked && (
          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
            <span>Lần kiểm tra cuối: {lastChecked.toLocaleString("vi-VN")}</span>
            {issues.length === 0 ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Không có vấn đề
              </Badge>
            ) : (
              <div className="flex gap-2">
                {highCount > 0 && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-600">
                    {highCount} High
                  </Badge>
                )}
                {mediumCount > 0 && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                    {mediumCount} Medium
                  </Badge>
                )}
                {lowCount > 0 && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                    {lowCount} Low
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {!lastChecked && (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nhấn "Chạy phân tích" để kiểm tra các vấn đề tiềm ẩn</p>
            <p className="text-xs mt-1">Phát hiện duplicate prompts, nội dung tương tự, và gaps integration</p>
          </div>
        )}

        {issues.length > 0 && (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {issues.map((issue, index) => (
                <Collapsible
                  key={index}
                  open={expandedIssues.has(index)}
                  onOpenChange={() => toggleExpand(index)}
                >
                  <Card className={`border ${getSeverityColor(issue.severity)}`}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-3 text-left hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedIssues.has(index) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {getTypeIcon(issue.type)}
                            <div>
                              <div className="font-medium">{issue.functionName}</div>
                              <div className="text-sm text-muted-foreground">
                                {getTypeLabel(issue.type)}
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={getSeverityColor(issue.severity)}
                          >
                            {issue.severity.toUpperCase()}
                          </Badge>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-2 border-t border-border/50">
                        <p className="text-sm mb-3">{issue.details}</p>
                        
                        {issue.affectedPrompts && issue.affectedPrompts.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Prompts liên quan:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {issue.affectedPrompts.map((p) => (
                                <Badge
                                  key={p.id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {p.is_active ? (
                                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 mr-1 text-red-500" />
                                  )}
                                  {p.prompt_key}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="p-2 bg-muted/50 rounded text-sm">
                          <span className="font-medium">💡 Khuyến nghị: </span>
                          {issue.recommendation}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
