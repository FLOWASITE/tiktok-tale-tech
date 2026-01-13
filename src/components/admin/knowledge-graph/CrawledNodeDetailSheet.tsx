/**
 * CrawledNodeDetailSheet - Detail view dialog for crawled node
 */

import { 
  FileText, 
  ExternalLink, 
  RotateCcw,
  Loader2,
  Copy,
  Maximize2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { hasHtmlLayoutArtifacts } from '@/hooks/useReparseRegulations';
import { ContentQualityBadge, estimateContentQuality } from './ContentQualityBadge';
import { CrawledNode, getJurisdictionFlag } from './CrawledNodeCard';

interface CrawledNodeDetailSheetProps {
  node: CrawledNode | null;
  isOpen: boolean;
  isReparsing: boolean;
  showFullTextSheet: boolean;
  onClose: () => void;
  onReparse: (nodeId: string) => void;
  onToggleFullTextSheet: (open: boolean) => void;
}

export function CrawledNodeDetailSheet({
  node,
  isOpen,
  isReparsing,
  showFullTextSheet,
  onClose,
  onReparse,
  onToggleFullTextSheet,
}: CrawledNodeDetailSheetProps) {
  if (!node) return null;

  const handleExportTxt = () => {
    if (!node.full_text) return;
    const blob = new Blob([node.full_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${node.node_key || 'document'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống file TXT');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(node.full_text || '');
    toast.success('Đã copy vào clipboard');
  };

  const canReparse = (hasHtmlLayoutArtifacts(node.full_text) || node.parse_status === 'failed') && node.source_url;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <span className="text-lg sm:text-xl">
                {getJurisdictionFlag(node.properties?.jurisdiction)}
              </span>
              <span className="line-clamp-2">
                {node.display_name?.vi || node.display_name?.en || 'Chi tiết'}
              </span>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2 sm:pr-4">
            <div className="space-y-4">
              {/* Meta info with Quality Score */}
              <div className="flex flex-wrap gap-2">
                <ContentQualityBadge 
                  score={node.content_quality_score ?? estimateContentQuality(node.full_text)}
                  breakdown={node.quality_breakdown}
                  size="md"
                  showLabel={true}
                />
                <Badge variant="outline" className="text-xs">{node.properties?.category}</Badge>
                <Badge variant="secondary" className="text-xs">{node.properties?.jurisdiction}</Badge>
                {node.properties?.auto_crawled && (
                  <Badge variant="default" className="bg-blue-500 text-xs">Auto-crawled</Badge>
                )}
                {node.parse_status && (
                  <Badge 
                    variant={node.parse_status === 'parsed' ? 'default' : 'destructive'} 
                    className="text-xs"
                  >
                    {node.parse_status}
                  </Badge>
                )}
              </div>

              {/* Source URL */}
              {node.source_url && (
                <div className="p-2 sm:p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">URL Nguồn</p>
                  <a
                    href={node.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm text-primary hover:underline break-all flex items-start gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 sm:line-clamp-none">{node.source_url}</span>
                  </a>
                </div>
              )}

              {/* Full Text Content */}
              {node.full_text && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      Nội dung đã Parse ({node.full_text.length.toLocaleString()} ký tự)
                    </p>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={handleCopy}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={handleExportTxt}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        TXT
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 px-2 text-xs sm:hidden"
                        onClick={() => onToggleFullTextSheet(true)}
                      >
                        <Maximize2 className="h-3 w-3 mr-1" />
                        Mở rộng
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[200px] sm:h-[300px]">
                    <div className="text-xs bg-muted p-2 sm:p-3 rounded-lg whitespace-pre-wrap font-mono leading-relaxed">
                      {node.full_text}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Extracted Data Summary */}
              {node.extracted_data?.summary && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">📋 Tóm tắt AI</p>
                  <p className="text-xs sm:text-sm bg-muted/50 p-2 sm:p-3 rounded-lg">
                    {node.extracted_data.summary}
                  </p>
                  {node.extracted_data.confidence_score && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Độ tin cậy: {(node.extracted_data.confidence_score * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              )}

              {/* Key Changes */}
              {node.extracted_data?.key_changes && node.extracted_data.key_changes.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">🔄 Thay đổi chính</p>
                  <ul className="text-xs sm:text-sm list-disc list-inside space-y-1 bg-muted/50 p-2 sm:p-3 rounded-lg">
                    {node.extracted_data.key_changes.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Claim Restrictions */}
              {node.extracted_data?.claim_restrictions && node.extracted_data.claim_restrictions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">⚠️ Hạn chế claim</p>
                  <div className="space-y-2">
                    {node.extracted_data.claim_restrictions.map((restriction, i) => (
                      <div key={i} className="text-xs sm:text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded border-l-2 border-red-500">
                        <p className="font-medium">{restriction.claim}</p>
                        <p className="text-xs text-muted-foreground">
                          Loại: {restriction.restriction_type}
                          {restriction.alternative && ` → ${restriction.alternative}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Mô tả</p>
                <p className="text-xs sm:text-sm">
                  {node.description?.vi || node.description?.en || 'Không có mô tả'}
                </p>
              </div>

              {/* Properties */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Thông tin chi tiết</p>
                <pre className="text-xs bg-muted p-2 sm:p-3 rounded-lg overflow-auto max-h-32 sm:max-h-40">
                  {JSON.stringify(node.properties, null, 2)}
                </pre>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Ngày tạo</p>
                  <p>{format(new Date(node.created_at), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                {node.last_verified_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Lần xác minh cuối</p>
                    <p>{format(new Date(node.last_verified_at), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                )}
                {node.properties?.crawled_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Ngày crawl</p>
                    <p>{format(new Date(node.properties.crawled_at), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                )}
              </div>

              {/* Node Key */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Node Key</p>
                <code className="text-xs bg-muted px-2 py-1 rounded break-all">{node.node_key}</code>
              </div>
            </div>
          </ScrollArea>
          {canReparse && (
            <DialogFooter className="mt-2">
              <Button 
                size="sm"
                onClick={() => {
                  onReparse(node.id);
                  onClose();
                }}
                disabled={isReparsing}
              >
                {isReparsing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-1" />
                )}
                Re-parse văn bản này
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Text Sheet for Mobile */}
      <Sheet open={showFullTextSheet} onOpenChange={onToggleFullTextSheet}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Nội dung đã Parse
              </span>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleCopy}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleExportTxt}
                >
                  <Download className="h-3 w-3 mr-1" />
                  TXT
                </Button>
              </div>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 mt-2">
            <div className="text-xs font-mono whitespace-pre-wrap leading-relaxed p-2 bg-muted rounded-lg">
              {node.full_text}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
