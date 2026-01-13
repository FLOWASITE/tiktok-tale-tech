/**
 * CrawledNodeCard - Single node card for CrawledContentViewer
 */

import { useState } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Clock, 
  Tag, 
  ChevronDown,
  ChevronRight,
  Eye,
  Hash,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { hasHtmlLayoutArtifacts } from '@/hooks/useReparseRegulations';
import { cn } from '@/lib/utils';
import { ContentQualityBadge, estimateContentQuality } from './ContentQualityBadge';

// Source color mapping
export const getSourceColor = (sourceName: string): string => {
  const colors: Record<string, string> = {
    'vbpl.vn': 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400',
    'luatvietnam.vn': 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400',
    'chinhphu.vn': 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400',
    'thuvienphapluat.vn': 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400',
    'eur-lex.europa.eu': 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400',
    'sec.gov': 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400',
  };
  const normalized = sourceName.toLowerCase();
  for (const [key, color] of Object.entries(colors)) {
    if (normalized.includes(key)) return color;
  }
  return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400';
};

export const getJurisdictionFlag = (jurisdiction?: string) => {
  const flags: Record<string, string> = {
    'VN': '🇻🇳',
    'US': '🇺🇸',
    'EU': '🇪🇺',
    'SG': '🇸🇬',
    'JP': '🇯🇵',
  };
  return flags[jurisdiction || ''] || '🌐';
};

export interface QualityBreakdown {
  artifact_penalty?: number;
  legal_structure?: number;
  completeness?: number;
  readability?: number;
}

export interface VersionHistoryEntry {
  text: string;
  edited_at: string;
  quality_score: number | null;
  char_count: number;
}

export interface CrawledNode {
  id: string;
  node_key: string;
  node_type: string;
  display_name: { vi?: string; en?: string } | null;
  description: { vi?: string; en?: string } | null;
  properties: {
    jurisdiction?: string;
    category?: string;
    published_date?: string;
    auto_crawled?: boolean;
    crawled_at?: string;
    markdown?: string;
    // Manual edit tracking
    version_history?: VersionHistoryEntry[];
    last_manual_edit?: string;
    manual_edit_count?: number;
    [key: string]: unknown; // Allow additional properties
  } | null;
  source_url: string | null;
  source_id: string | null;
  content_hash: string | null;
  last_verified_at: string | null;
  created_at: string;
  full_text: string | null;
  extracted_data: {
    document_number?: string;
    document_type?: string;
    document_title?: string;
    effective_date?: string;
    issuing_authority?: string;
    summary?: string;
    key_changes?: string[];
    claim_restrictions?: Array<{ claim: string; restriction_type: string; alternative?: string }>;
    compliance_impacts?: Array<{ industry_code: string; impact_type: string; description: string; severity: string }>;
    confidence_score?: number;
  } | null;
  document_url: string | null;
  document_type: string | null;
  effective_date: string | null;
  parse_status: 'pending' | 'parsing' | 'parsed' | 'failed' | 'skipped' | null;
  content_quality_score: number | null;
  quality_breakdown: QualityBreakdown | null;
}

interface CrawledNodeCardProps {
  node: CrawledNode;
  isSelected: boolean;
  isExpanded: boolean;
  isParsing: boolean;
  getSourceName: (sourceId: string | null) => string;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onView: () => void;
  onParse: () => void;
  onDelete: () => void;
}

export function CrawledNodeCard({
  node,
  isSelected,
  isExpanded,
  isParsing,
  getSourceName,
  onToggleSelect,
  onToggleExpand,
  onView,
  onParse,
  onDelete,
}: CrawledNodeCardProps) {
  const title = node.display_name?.vi || node.display_name?.en || node.node_key;
  const description = node.description?.vi || node.description?.en;
  const isDirty = hasHtmlLayoutArtifacts(node.full_text);

  return (
    <Card className={cn('overflow-hidden', isDirty && 'border-amber-300 dark:border-amber-700')}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              {/* Selection checkbox */}
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 mt-0.5">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">
                    {getJurisdictionFlag(node.properties?.jurisdiction)}
                  </span>
                  <CardTitle className="text-sm font-medium line-clamp-1">
                    {title}
                  </CardTitle>
                  <ContentQualityBadge 
                    score={node.content_quality_score ?? estimateContentQuality(node.full_text)}
                    breakdown={node.quality_breakdown}
                    showLabel={false}
                  />
                  {isDirty && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/30 border-amber-300 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            HTML Layout
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Nội dung chứa layout HTML, cần re-parse</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {node.properties?.category || 'general'}
                  </Badge>
                  {node.source_id && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getSourceColor(getSourceName(node.source_id)))}
                    >
                      {getSourceName(node.source_id)}
                    </Badge>
                  )}
                  {node.parse_status && (
                    <Badge 
                      variant={node.parse_status === 'parsed' ? 'default' : 'secondary'}
                      className={cn('text-xs', {
                        'bg-green-500': node.parse_status === 'parsed',
                        'bg-red-500': node.parse_status === 'failed',
                        'bg-blue-500': node.parse_status === 'parsing',
                      })}
                    >
                      {node.parse_status === 'parsed' ? '✓ Đã parse' :
                       node.parse_status === 'failed' ? '✗ Lỗi' :
                       node.parse_status === 'parsing' ? '⏳ Đang parse' :
                       node.parse_status === 'skipped' ? '⏭ Bỏ qua' : 'Chờ'}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(node.created_at), { 
                      addSuffix: true, 
                      locale: vi 
                    })}
                  </span>
                  {node.source_url && (
                    <a
                      href={node.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Nguồn gốc
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {node.source_url && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isDirty || node.parse_status === 'failed' ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onParse();
                          }}
                          disabled={isParsing}
                          className={cn(isDirty || node.parse_status === 'failed' ? "bg-amber-500 hover:bg-amber-600" : "")}
                        >
                          {isParsing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          )}
                          {isParsing ? 'Đang parse...' : 'Parse'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isDirty ? 'Re-parse (có HTML artifacts)' : node.parse_status === 'failed' ? 'Thử lại parse' : 'Parse nội dung'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Xem
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Xóa văn bản này</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 ml-9">
            {description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                {description}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                <span className="font-mono">{node.node_key.slice(0, 30)}...</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                <span>{getSourceName(node.source_id)}</span>
              </div>
              {node.content_hash && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="font-mono">Hash: {node.content_hash}</span>
                </div>
              )}
              {node.last_verified_at && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Xác minh: {formatDistanceToNow(new Date(node.last_verified_at), { addSuffix: true, locale: vi })}</span>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
