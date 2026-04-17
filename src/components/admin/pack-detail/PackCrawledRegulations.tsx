/**
 * PackCrawledRegulations - Display crawled regulations from Knowledge Graph for an Industry Pack
 */

import { useState } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Loader2,
  RefreshCw,
  Star,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { CrawledRegulation } from '@/hooks/usePackRegulationSources';

interface PackCrawledRegulationsProps {
  regulations: CrawledRegulation[];
  isLoading: boolean;
  onRefresh: () => void;
}

// Quality score badge (0-100 scale)
const getQualityBadge = (score: number | null) => {
  if (score === null) return { label: 'N/A', className: 'bg-muted text-muted-foreground' };
  if (score >= 80) return { label: 'Tốt', className: 'bg-green-500/10 text-green-700 dark:text-green-400' };
  if (score >= 50) return { label: 'Trung bình', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' };
  return { label: 'Cần xem lại', className: 'bg-red-500/10 text-red-700 dark:text-red-400' };
};

// Parse status badge
const getParseStatusBadge = (status: string | null) => {
  switch (status) {
    case 'parsed':
    case 'completed':
      return { icon: CheckCircle, label: 'Hoàn thành', className: 'text-green-500' };
    case 'pending':
      return { icon: Clock, label: 'Chờ xử lý', className: 'text-blue-500' };
    case 'failed':
      return { icon: AlertTriangle, label: 'Lỗi', className: 'text-red-500' };
    case 'skipped':
      return { icon: AlertCircle, label: 'Bỏ qua', className: 'text-muted-foreground' };
    case 'needs_reparse':
      return { icon: AlertCircle, label: 'Cần re-parse', className: 'text-yellow-500' };
    default:
      return { icon: FileText, label: status || 'N/A', className: 'text-muted-foreground' };
  }
};

export function PackCrawledRegulations({
  regulations,
  isLoading,
  onRefresh,
}: PackCrawledRegulationsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegulation, setSelectedRegulation] = useState<CrawledRegulation | null>(null);

  // Filter regulations
  const filteredRegulations = regulations.filter(reg => {
    if (!searchTerm) return true;
    const name = reg.display_name?.vi || reg.display_name?.en || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Stats
  const completedCount = regulations.filter(r => r.parse_status === 'completed').length;
  const pendingCount = regulations.filter(r => r.parse_status === 'pending' || r.parse_status === 'needs_reparse').length;
  const avgScore = regulations.length > 0 
    ? regulations.reduce((sum, r) => sum + (r.quality_score || 0), 0) / regulations.length 
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (regulations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center mb-2">
            Chưa có quy định nào được crawl cho Industry Pack này
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Hãy thêm nguồn crawl và kích hoạt crawl để lấy dữ liệu quy định
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{regulations.length}</p>
            <p className="text-xs text-muted-foreground">Tổng số</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Đã parse</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold flex items-center justify-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              {(avgScore * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Độ tin cậy TB</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm kiếm văn bản..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Làm mới
        </Button>
      </div>

      {/* Regulations list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Văn bản đã crawl ({filteredRegulations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
            {filteredRegulations.length > 0 ? (
              <div className="divide-y">
                {filteredRegulations.map((reg) => {
                  const qualityBadge = getQualityBadge(reg.quality_score);
                  const statusBadge = getParseStatusBadge(reg.parse_status);
                  const StatusIcon = statusBadge.icon;
                  const name = reg.display_name?.vi || reg.display_name?.en || 'Untitled';

                  return (
                    <div 
                      key={reg.id} 
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedRegulation(reg)}
                    >
                      <div className="space-y-2">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className={qualityBadge.className}>
                                <Star className="h-3 w-3 mr-1" />
                                {reg.quality_score !== null 
                                  ? `${(reg.quality_score * 100).toFixed(0)}%` 
                                  : 'N/A'}
                              </Badge>
                              <Badge variant="outline" className={statusBadge.className}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusBadge.label}
                              </Badge>
                            </div>
                            <h4 className="font-medium line-clamp-2">{name}</h4>
                          </div>
                          {reg.source_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(reg.source_url!, '_blank');
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          {reg.effective_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Hiệu lực: {reg.effective_date}
                            </span>
                          )}
                          <span>
                            Thêm: {formatDistanceToNow(new Date(reg.created_at), { 
                              addSuffix: true, 
                              locale: vi 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Không tìm thấy văn bản nào
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedRegulation} onOpenChange={() => setSelectedRegulation(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedRegulation && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">
                  {selectedRegulation.display_name?.vi || selectedRegulation.display_name?.en || 'Chi tiết văn bản'}
                </SheetTitle>
                <SheetDescription className="text-left">
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <Badge variant="outline" className={getQualityBadge(selectedRegulation.quality_score).className}>
                      Độ tin cậy: {selectedRegulation.quality_score !== null 
                        ? `${(selectedRegulation.quality_score * 100).toFixed(0)}%` 
                        : 'N/A'}
                    </Badge>
                    {selectedRegulation.effective_date && (
                      <Badge variant="outline">
                        Hiệu lực: {selectedRegulation.effective_date}
                      </Badge>
                    )}
                  </div>
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                {/* Source link */}
                {selectedRegulation.source_url && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Nguồn</h4>
                    <a 
                      href={selectedRegulation.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {selectedRegulation.source_url}
                    </a>
                  </div>
                )}

                {/* Content preview */}
                {selectedRegulation.full_text && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Nội dung</h4>
                    <div className="bg-muted rounded-lg p-4 max-h-[50vh] overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {selectedRegulation.full_text.slice(0, 5000)}
                        {selectedRegulation.full_text.length > 5000 && '...'}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Parse status:</span>
                    <span className="ml-2">{selectedRegulation.parse_status || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Xác minh:</span>
                    <span className="ml-2">
                      {selectedRegulation.last_verified_at 
                        ? format(new Date(selectedRegulation.last_verified_at), 'dd/MM/yyyy HH:mm')
                        : 'Chưa xác minh'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
