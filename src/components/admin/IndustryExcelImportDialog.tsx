/**
 * Industry Pack Excel Import Dialog
 * UI for importing a complete Industry Pack from the Excel template
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Package,
  Languages,
  Ban,
  Scale,
  MessageSquareWarning,
  Lightbulb,
  Settings,
  Globe,
  Users,
} from 'lucide-react';
import { useIndustryExcelImport } from '@/hooks/useIndustryExcelImport';
import { cn } from '@/lib/utils';
import { downloadIndustryPackTemplate } from '@/utils/industryExcelGenerator';

interface IndustryExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const SHEET_ICONS: Record<string, React.ElementType> = {
  pack_info: Package,
  translations: Languages,
  forbidden_terms: Ban,
  compliance_rules: Scale,
  claim_restrictions: MessageSquareWarning,
  argument_patterns: Lightbulb,
  system_rules: Settings,
  jurisdictions: Globe,
  personas: Users,
};

export function IndustryExcelImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: IndustryExcelImportDialogProps) {
  const {
    step,
    file,
    sheetData,
    parseResult,
    errors,
    warnings,
    isProcessing,
    progress,
    importResult,
    existingPack,
    conflictAction,
    setStep,
    setConflictAction,
    handleFileSelect,
    checkConflicts,
    importData,
    reset,
    getSummary,
  } = useIndustryExcelImport();

  const summary = getSummary();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      await handleFileSelect(acceptedFiles[0]);
    }
  }, [handleFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleNext = async () => {
    if (step === 'preview') {
      await checkConflicts();
    } else if (step === 'validate') {
      await importData();
    }
  };

  const handleBack = () => {
    if (step === 'preview') {
      setStep('upload');
    } else if (step === 'validate') {
      setStep('preview');
    }
  };

  const handleDone = () => {
    onSuccess?.();
    handleClose();
  };

  const stepTitles: Record<string, string> = {
    upload: 'Tải lên file Excel',
    preview: 'Xem trước dữ liệu',
    validate: 'Xác thực & Cấu hình',
    importing: 'Đang import...',
    done: 'Hoàn thành',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Industry Pack từ Excel
          </DialogTitle>
          <DialogDescription>
            {stepTitles[step]}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-2">
          {['upload', 'preview', 'validate', 'done'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === s || ['preview', 'validate', 'importing', 'done'].indexOf(step) > i
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-1 transition-colors',
                    ['preview', 'validate', 'importing', 'done'].indexOf(step) > i
                      ? 'bg-primary'
                      : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="max-h-[60vh]">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                )}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-lg font-medium">Thả file Excel tại đây...</p>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">Kéo thả file Excel vào đây</p>
                    <p className="text-sm text-muted-foreground">hoặc click để chọn file (.xlsx)</p>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
                <div>
                  <h4 className="font-medium mb-1">Chưa có template?</h4>
                  <p className="text-sm text-muted-foreground">
                    Tải xuống template Excel với 9 sheets đầy đủ
                  </p>
                </div>
                <Button variant="outline" onClick={() => downloadIndustryPackTemplate()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Tải Template
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                {Object.entries(SHEET_ICONS).map(([key, Icon]) => (
                  <div key={key} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && parseResult && (
            <div className="space-y-4">
              {/* Pack Info Header */}
              {parseResult.packInfo && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Package className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold text-lg">{parseResult.packInfo.code}</h3>
                        <p className="text-sm text-muted-foreground">
                          {parseResult.packInfo.category_code} • {parseResult.packInfo.target_audience || 'B2C'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary Stats */}
              {summary && (
                <div className="grid grid-cols-5 gap-2">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Languages className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-bold">{summary.translations}</p>
                    <p className="text-xs text-muted-foreground">Bản dịch</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Ban className="h-4 w-4 mx-auto mb-1 text-red-500" />
                    <p className="text-lg font-bold">{summary.forbiddenTerms}</p>
                    <p className="text-xs text-muted-foreground">Từ cấm</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Scale className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-bold">{summary.complianceRules}</p>
                    <p className="text-xs text-muted-foreground">Quy tắc</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Globe className="h-4 w-4 mx-auto mb-1 text-green-500" />
                    <p className="text-lg font-bold">{summary.jurisdictions}</p>
                    <p className="text-xs text-muted-foreground">Quốc gia</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Users className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                    <p className="text-lg font-bold">{summary.personas}</p>
                    <p className="text-xs text-muted-foreground">Personas</p>
                  </div>
                </div>
              )}

              {/* Data Preview Tabs - All 9 sheets */}
              <Tabs defaultValue="pack_info">
                <TabsList className="grid grid-cols-5 w-full mb-2">
                  <TabsTrigger value="pack_info" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    Pack Info
                  </TabsTrigger>
                  <TabsTrigger value="translations" className="text-xs">
                    <Languages className="h-3 w-3 mr-1" />
                    Dịch ({parseResult.translations.length})
                  </TabsTrigger>
                  <TabsTrigger value="forbidden" className="text-xs">
                    <Ban className="h-3 w-3 mr-1" />
                    Cấm ({parseResult.forbiddenTerms.length})
                  </TabsTrigger>
                  <TabsTrigger value="rules" className="text-xs">
                    <Scale className="h-3 w-3 mr-1" />
                    Quy tắc ({parseResult.complianceRules.length})
                  </TabsTrigger>
                  <TabsTrigger value="claims" className="text-xs">
                    <MessageSquareWarning className="h-3 w-3 mr-1" />
                    Claims ({parseResult.claimRestrictions.length})
                  </TabsTrigger>
                </TabsList>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="patterns" className="text-xs">
                    <Lightbulb className="h-3 w-3 mr-1" />
                    Patterns ({parseResult.argumentPatterns.length})
                  </TabsTrigger>
                  <TabsTrigger value="system" className="text-xs">
                    <Settings className="h-3 w-3 mr-1" />
                    System ({parseResult.systemRules.length})
                  </TabsTrigger>
                  <TabsTrigger value="jurisdictions" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    Quốc gia ({parseResult.jurisdictions.length})
                  </TabsTrigger>
                  <TabsTrigger value="personas" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    Personas ({parseResult.personas.length})
                  </TabsTrigger>
                </TabsList>

                {/* Pack Info Tab */}
                <TabsContent value="pack_info" className="mt-4">
                  {parseResult.packInfo ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Mã ngành:</span>
                          <span className="font-mono font-medium">{parseResult.packInfo.code}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Category:</span>
                          <span>{parseResult.packInfo.category_code}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Level:</span>
                          <Badge variant="outline">{parseResult.packInfo.industry_level || 'core'}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Target:</span>
                          <Badge>{parseResult.packInfo.target_audience || 'B2C'}</Badge>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Formality:</span>
                          <span>{parseResult.packInfo.formality_level || 'semi_formal'}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Emoji:</span>
                          <span>{parseResult.packInfo.allow_emoji === 'true' ? '✅ Cho phép' : '❌ Không'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground p-4">
                      Không có thông tin Pack Info
                    </div>
                  )}
                </TabsContent>

                {/* Translations Tab */}
                <TabsContent value="translations" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngôn ngữ</TableHead>
                        <TableHead>Tên</TableHead>
                        <TableHead>Tên ngắn</TableHead>
                        <TableHead>Từ ưu tiên</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.translations.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge variant="outline">{row.language_code}</Badge>
                          </TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.short_name || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {row.preferred_words || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {parseResult.translations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* Forbidden Terms Tab */}
                <TabsContent value="forbidden" className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {parseResult.forbiddenTerms.slice(0, 30).map((t, i) => (
                      <Badge key={i} variant="destructive" className="text-xs">
                        {t.term}
                      </Badge>
                    ))}
                    {parseResult.forbiddenTerms.length > 30 && (
                      <Badge variant="outline">+{parseResult.forbiddenTerms.length - 30} khác</Badge>
                    )}
                    {parseResult.forbiddenTerms.length === 0 && (
                      <p className="text-muted-foreground text-sm">Không có thuật ngữ cấm</p>
                    )}
                  </div>
                </TabsContent>

                {/* Compliance Rules Tab */}
                <TabsContent value="rules" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã</TableHead>
                        <TableHead>Nội dung</TableHead>
                        <TableHead>Mức độ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.complianceRules.slice(0, 8).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{row.rule_id}</TableCell>
                          <TableCell className="max-w-md truncate">{row.rule_text}</TableCell>
                          <TableCell>
                            <Badge variant={row.severity === 'error' ? 'destructive' : 'outline'}>
                              {row.severity}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {parseResult.complianceRules.length > 8 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            ... và {parseResult.complianceRules.length - 8} quy tắc khác
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* Claims Tab */}
                <TabsContent value="claims" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Claim cấm</TableHead>
                        <TableHead>Gợi ý thay thế</TableHead>
                        <TableHead>Mức độ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.claimRestrictions.slice(0, 8).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-destructive">{row.forbidden_claim}</TableCell>
                          <TableCell className="text-green-600">{row.suggested_alternative}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.severity || 'warning'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {parseResult.claimRestrictions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            Không có claim restrictions
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* Argument Patterns Tab */}
                <TabsContent value="patterns" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-green-600">✓ Valid Patterns</h4>
                      <div className="space-y-1">
                        {parseResult.argumentPatterns.filter(p => p.type === 'valid').slice(0, 5).map((p, i) => (
                          <p key={i} className="text-xs bg-green-500/10 p-2 rounded">{p.pattern}</p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-red-600">✗ Forbidden</h4>
                      <div className="space-y-1">
                        {parseResult.argumentPatterns.filter(p => p.type === 'forbidden').slice(0, 5).map((p, i) => (
                          <p key={i} className="text-xs bg-red-500/10 p-2 rounded">{p.pattern}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* System Rules Tab */}
                <TabsContent value="system" className="mt-4">
                  <div className="space-y-2">
                    {parseResult.systemRules.slice(0, 10).map((rule, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-muted/30 rounded text-sm">
                        <Badge variant={rule.priority === 'critical' ? 'destructive' : rule.priority === 'high' ? 'default' : 'outline'} className="text-xs">
                          {rule.priority}
                        </Badge>
                        <span className="flex-1">{rule.rule}</span>
                      </div>
                    ))}
                    {parseResult.systemRules.length === 0 && (
                      <p className="text-muted-foreground text-sm text-center">Không có system rules</p>
                    )}
                  </div>
                </TabsContent>

                {/* Jurisdictions Tab */}
                <TabsContent value="jurisdictions" className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {parseResult.jurisdictions.map((j, i) => (
                      <Badge key={i} variant="outline" className="gap-1">
                        <Globe className="h-3 w-3" />
                        {j.jurisdiction_code}
                      </Badge>
                    ))}
                    {parseResult.jurisdictions.length === 0 && (
                      <p className="text-muted-foreground text-sm">Không có jurisdiction profiles</p>
                    )}
                  </div>
                </TabsContent>

                {/* Personas Tab */}
                <TabsContent value="personas" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {parseResult.personas.slice(0, 4).map((persona, i) => (
                      <Card key={i} className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="font-medium">{persona.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {persona.description || 'Không có mô tả'}
                        </p>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {persona.age_range && (
                            <Badge variant="outline" className="text-xs">{persona.age_range}</Badge>
                          )}
                          {persona.gender && (
                            <Badge variant="outline" className="text-xs">{persona.gender}</Badge>
                          )}
                          {persona.income_level && (
                            <Badge variant="outline" className="text-xs">{persona.income_level}</Badge>
                          )}
                        </div>
                      </Card>
                    ))}
                    {parseResult.personas.length > 4 && (
                      <div className="col-span-2 text-center text-muted-foreground text-sm">
                        ... và {parseResult.personas.length - 4} personas khác
                      </div>
                    )}
                    {parseResult.personas.length === 0 && (
                      <div className="col-span-2 text-center text-muted-foreground p-4">
                        Không có personas
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Step 3: Validate */}
          {step === 'validate' && parseResult && (
            <div className="space-y-6">
              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <h4 className="font-medium text-destructive">Lỗi xác thực ({errors.length})</h4>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {errors.map((err, i) => (
                      <div key={i} className="text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-mono text-xs">{err.sheet}</span>
                          {err.row > 0 && <span className="text-muted-foreground"> (dòng {err.row})</span>}
                          : {err.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h4 className="font-medium text-amber-600">Cảnh báo ({warnings.length})</h4>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {warnings.map((warn, i) => (
                      <div key={i} className="text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-mono text-xs">{warn.sheet}</span>
                          {warn.row > 0 && <span className="text-muted-foreground"> (dòng {warn.row})</span>}
                          : {warn.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conflict Resolution */}
              {existingPack && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-5 w-5 text-blue-500" />
                    <h4 className="font-medium text-blue-600">
                      Industry Pack "{existingPack.code}" đã tồn tại
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chọn cách xử lý khi import dữ liệu mới:
                  </p>
                  <RadioGroup
                    value={conflictAction}
                    onValueChange={(v) => setConflictAction(v as 'skip' | 'merge' | 'replace')}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="merge" id="merge" />
                      <Label htmlFor="merge" className="font-normal cursor-pointer">
                        <span className="font-medium">Gộp (Merge)</span>
                        <span className="text-muted-foreground"> - Cập nhật và thêm mới, giữ dữ liệu cũ không trùng</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="replace" id="replace" />
                      <Label htmlFor="replace" className="font-normal cursor-pointer">
                        <span className="font-medium">Thay thế (Replace)</span>
                        <span className="text-muted-foreground"> - Xóa toàn bộ và import lại từ đầu</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="skip" id="skip" />
                      <Label htmlFor="skip" className="font-normal cursor-pointer">
                        <span className="font-medium">Bỏ qua (Skip)</span>
                        <span className="text-muted-foreground"> - Không import, giữ nguyên dữ liệu hiện tại</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Ready to import */}
              {errors.length === 0 && !existingPack && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <h4 className="font-medium text-green-600">Sẵn sàng import!</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Dữ liệu đã được xác thực. Click "Import" để tiến hành.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <h3 className="mt-4 text-lg font-medium">{progress.currentStep}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Bước {progress.current} / {progress.total}
                </p>
              </div>
              <Progress value={(progress.current / progress.total) * 100} className="h-2" />
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && importResult && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                {importResult.success ? (
                  <>
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                    <h3 className="mt-4 text-xl font-semibold text-green-600">Import thành công!</h3>
                    <p className="text-muted-foreground mt-2">{importResult.message}</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
                    <h3 className="mt-4 text-xl font-semibold text-destructive">Import thất bại</h3>
                    <p className="text-muted-foreground mt-2">{importResult.message}</p>
                  </>
                )}
              </div>

              {importResult.success && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-500">{importResult.details.translations}</p>
                    <p className="text-xs text-muted-foreground">Bản dịch</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{importResult.details.forbiddenTerms}</p>
                    <p className="text-xs text-muted-foreground">Từ cấm</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-500">{importResult.details.complianceRules}</p>
                    <p className="text-xs text-muted-foreground">Quy tắc</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-500">{importResult.details.personas}</p>
                    <p className="text-xs text-muted-foreground">Personas</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex justify-between">
          <div>
            {(step === 'preview' || step === 'validate') && (
              <Button variant="outline" onClick={handleBack} disabled={isProcessing}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {step === 'done' ? 'Đóng' : 'Hủy'}
            </Button>
            {step === 'preview' && (
              <Button onClick={handleNext} disabled={isProcessing || errors.length > 0}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2" />
                )}
                Tiếp tục
              </Button>
            )}
            {step === 'validate' && (
              <Button
                onClick={handleNext}
                disabled={isProcessing || (errors.length > 0 && !existingPack)}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import
              </Button>
            )}
            {step === 'done' && importResult?.success && (
              <Button onClick={handleDone}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Hoàn tất
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
