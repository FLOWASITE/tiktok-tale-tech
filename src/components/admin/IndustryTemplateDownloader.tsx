/**
 * Industry Template Downloader Component
 * UI for downloading Excel template for Industry Pack import
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Download,
  FileSpreadsheet,
  Info,
  Package,
  CheckCircle2,
  Circle,
  Users,
  Shield,
  Globe,
  Ban,
  Scale,
  Lightbulb,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  downloadIndustryPackTemplate,
  getSheetInfo,
} from '@/utils/industryExcelGenerator';

const SHEET_ICONS: Record<string, React.ReactNode> = {
  pack_info: <Package className="w-4 h-4" />,
  translations: <Globe className="w-4 h-4" />,
  forbidden_terms: <Ban className="w-4 h-4" />,
  compliance_rules: <Shield className="w-4 h-4" />,
  claim_restrictions: <Scale className="w-4 h-4" />,
  argument_patterns: <Lightbulb className="w-4 h-4" />,
  system_rules: <Settings className="w-4 h-4" />,
  jurisdictions: <Globe className="w-4 h-4" />,
  personas: <Users className="w-4 h-4" />,
};

interface IndustryTemplateDownloaderProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export function IndustryTemplateDownloader({
  className,
  variant = 'full',
}: IndustryTemplateDownloaderProps) {
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const sheets = getSheetInfo();

  const handleDownload = () => {
    downloadIndustryPackTemplate();
  };

  if (variant === 'compact') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Industry Pack Import Template
            </DialogTitle>
          </DialogHeader>
          <SheetList
            sheets={sheets}
            selectedSheet={selectedSheet}
            onSelect={setSelectedSheet}
            onDownload={handleDownload}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="w-5 h-5" />
              Industry Pack Import Template
            </CardTitle>
            <CardDescription className="mt-1">
              Download file Excel đa sheet để import toàn bộ Industry Pack
            </CardDescription>
          </div>
          <Button size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Tải Template (.xlsx)
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <SheetList
          sheets={sheets}
          selectedSheet={selectedSheet}
          onSelect={setSelectedSheet}
          onDownload={handleDownload}
          showActions={false}
        />
      </CardContent>
    </Card>
  );
}

interface SheetListProps {
  sheets: ReturnType<typeof getSheetInfo>;
  selectedSheet: string | null;
  onSelect: (key: string | null) => void;
  onDownload: () => void;
  showActions?: boolean;
}

function SheetList({
  sheets,
  selectedSheet,
  onSelect,
  onDownload,
  showActions = true,
}: SheetListProps) {
  const selectedInfo = sheets.find((s) => s.key === selectedSheet);

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sheet List */}
        <div className="space-y-2">
          {showActions && (
            <div className="flex gap-2 mb-3">
              <Button size="sm" onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                Tải Template (.xlsx)
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground mb-2">
            File Excel gồm 9 sheets + 1 sheet hướng dẫn
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-1.5 pr-3">
              {sheets.map((sheet) => (
                <div
                  key={sheet.key}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedSheet === sheet.key
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => onSelect(sheet.key === selectedSheet ? null : sheet.key)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                      {SHEET_ICONS[sheet.key] || <FileSpreadsheet className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{sheet.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {sheet.columnCount} cột • {sheet.requiredCount} bắt buộc
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Sheet
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Column Details */}
        <div className="border rounded-lg">
          {selectedInfo ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  {SHEET_ICONS[selectedInfo.key]}
                  {selectedInfo.title}
                </h3>
                <Badge variant="secondary">
                  Sheet trong Excel
                </Badge>
              </div>
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Cột</TableHead>
                      <TableHead className="w-[60px] text-center">Bắt buộc</TableHead>
                      <TableHead>Ví dụ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInfo.columns.map((col) => (
                      <TableRow key={col.name}>
                        <TableCell className="font-mono text-xs">
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1.5 cursor-help">
                              {col.name}
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              {col.description}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">
                          {col.required ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                          {col.example}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground p-8">
              <div className="text-center">
                <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Chọn sheet để xem chi tiết các cột</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
