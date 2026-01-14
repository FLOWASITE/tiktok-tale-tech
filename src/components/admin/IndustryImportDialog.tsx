import { useState, useCallback } from 'react';
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
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  FileWarning,
  RefreshCw,
  Download,
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
import { useIndustryImport, type ConflictAction } from '@/hooks/useIndustryImport';
import { cn } from '@/lib/utils';
import { downloadIndustryPackTemplate } from '@/utils/industryExcelGenerator';

interface IndustryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function IndustryImportDialog({ open, onOpenChange, onSuccess }: IndustryImportDialogProps) {
  const {
    step,
    files,
    parseResult,
    conflicts,
    conflictAction,
    progress,
    importResult,
    isProcessing,
    setStep,
    setConflictAction,
    handleFileSelect,
    checkConflicts,
    importData,
    reset,
    getSummary,
  } = useIndustryImport();

  const summary = getSummary();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    await handleFileSelect(acceptedFiles);
  }, [handleFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: true,
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

  const stepTitles = {
    upload: 'Tải lên file Excel/CSV',
    preview: 'Xem trước dữ liệu',
    validate: 'Xác thực & Cấu hình',
    importing: 'Đang import...',
    done: 'Hoàn thành',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Industry Memory
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
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
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
                    'w-12 h-0.5 mx-1',
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
                  <p className="text-lg font-medium">Thả file tại đây...</p>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">Kéo thả file Excel/CSV vào đây</p>
                    <p className="text-sm text-muted-foreground">hoặc click để chọn file</p>
                  </>
                )}
              </div>

              {/* Download Template Button */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
                <div>
                  <h4 className="font-medium mb-1">Chưa có template?</h4>
                  <p className="text-sm text-muted-foreground">
                    Tải xuống template Excel với 9 sheets đầy đủ
                  </p>
                </div>
                <Button variant="outline" onClick={() => downloadIndustryPackTemplate()}>
                  <Download className="h-4 w-4 mr-2" />
                  Tải Template Excel
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Các sheet trong template Excel:</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-2 p-2 bg-background rounded">
                    <Package className="h-4 w-4 text-primary" />
                    <span>1. Pack Info</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-background rounded">
                    <Languages className="h-4 w-4 text-blue-500" />
                    <span>2. Translations</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-background rounded">
                    <Ban className="h-4 w-4 text-red-500" />
                    <span>3. Forbidden Terms</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-background rounded">
                    <Scale className="h-4 w-4 text-amber-500" />
                    <span>4. Compliance Rules</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-background rounded">
                    <MessageSquareWarning className="h-4 w-4 text-orange-500" />
                    <span>5. Claim Restrictions</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-background rounded">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <span>6. Argument Patterns</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-background rounded">
                    <Settings className="h-4 w-4 text-gray-500" />
                    <span>7. System Rules</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-background rounded">
                    <Globe className="h-4 w-4 text-green-500" />
                    <span>8. Jurisdictions</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-background rounded">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span>9. Personas</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && parseResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              {summary && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{summary.totalIndustries}</p>
                    <p className="text-xs text-muted-foreground">Industries</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{files.length}</p>
                    <p className="text-xs text-muted-foreground">Files</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-500">{summary.warnings}</p>
                    <p className="text-xs text-muted-foreground">Warnings</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-destructive">{summary.errors}</p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                </div>
              )}

              {/* Data Preview Tabs */}
              <Tabs defaultValue="industry_info">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="industry_info" className="text-xs">
                    Industries ({parseResult.data.industryInfo.length})
                  </TabsTrigger>
                  <TabsTrigger value="terms" className="text-xs">
                    Terms ({parseResult.data.forbiddenTerms.length + parseResult.data.preferredWords.length})
                  </TabsTrigger>
                  <TabsTrigger value="rules" className="text-xs">
                    Rules ({parseResult.data.complianceRules.length + parseResult.data.systemRules.length})
                  </TabsTrigger>
                  <TabsTrigger value="patterns" className="text-xs">
                    Patterns ({parseResult.data.argumentPatterns.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="industry_info" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Name (VI)</TableHead>
                        <TableHead>Target</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.data.industryInfo.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{row.industry_code}</TableCell>
                          <TableCell>{row.country_code}</TableCell>
                          <TableCell>{row.category_code}</TableCell>
                          <TableCell>{row.name_vi}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.target_audience}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parseResult.data.industryInfo.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      ... and {parseResult.data.industryInfo.length - 10} more
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="terms" className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Forbidden Terms ({parseResult.data.forbiddenTerms.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {parseResult.data.forbiddenTerms.slice(0, 20).map((t, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">
                            {t.term}
                          </Badge>
                        ))}
                        {parseResult.data.forbiddenTerms.length > 20 && (
                          <Badge variant="outline">+{parseResult.data.forbiddenTerms.length - 20}</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Preferred Words ({parseResult.data.preferredWords.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {parseResult.data.preferredWords.slice(0, 20).map((w, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {w.word}
                          </Badge>
                        ))}
                        {parseResult.data.preferredWords.length > 20 && (
                          <Badge variant="outline">+{parseResult.data.preferredWords.length - 20}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="rules" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Industry</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead>Severity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.data.complianceRules.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{row.industry_code}</TableCell>
                          <TableCell className="max-w-xs truncate">{row.rule}</TableCell>
                          <TableCell>
                            <Badge variant={row.severity === 'error' ? 'destructive' : 'outline'}>
                              {row.severity}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="patterns" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-green-600">Valid Patterns</h4>
                      <div className="space-y-1">
                        {parseResult.data.argumentPatterns.filter(p => p.type === 'valid').slice(0, 5).map((p, i) => (
                          <p key={i} className="text-xs bg-green-500/10 p-2 rounded">{p.pattern}</p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-red-600">Forbidden Patterns</h4>
                      <div className="space-y-1">
                        {parseResult.data.argumentPatterns.filter(p => p.type === 'forbidden').slice(0, 5).map((p, i) => (
                          <p key={i} className="text-xs bg-red-500/10 p-2 rounded">{p.pattern}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Step 3: Validate */}
          {step === 'validate' && parseResult && (
            <div className="space-y-6">
              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <h4 className="font-medium text-destructive">Validation Errors ({parseResult.errors.length})</h4>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {parseResult.errors.map((err, i) => (
                      <div key={i} className="text-sm flex items-start gap-2">
                        <X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-mono text-xs">{err.file}</span>
                          {err.row > 0 && <span className="text-muted-foreground"> (row {err.row})</span>}
                          : {err.message}
                          {err.value && <span className="text-muted-foreground"> — "{err.value}"</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h4 className="font-medium text-amber-600">Warnings ({parseResult.warnings.length})</h4>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {parseResult.warnings.slice(0, 10).map((warn, i) => (
                      <div key={i} className="text-sm flex items-start gap-2">
                        <FileWarning className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-mono text-xs">{warn.file}</span>
                          {warn.row > 0 && <span className="text-muted-foreground"> (row {warn.row})</span>}
                          : {warn.message}
                        </span>
                      </div>
                    ))}
                    {parseResult.warnings.length > 10 && (
                      <p className="text-sm text-muted-foreground">... and {parseResult.warnings.length - 10} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Conflicts */}
              {conflicts.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw className="h-5 w-5 text-blue-500" />
                    <h4 className="font-medium text-blue-600">Existing Industries Found ({conflicts.length})</h4>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {conflicts.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {c.industryCode} ({c.countryCode})
                      </Badge>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium mb-3 block">How to handle conflicts?</Label>
                    <RadioGroup
                      value={conflictAction}
                      onValueChange={(v) => setConflictAction(v as ConflictAction)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="update" id="update" />
                        <Label htmlFor="update" className="text-sm font-normal">
                          Update existing industries with new data
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="skip" id="skip" />
                        <Label htmlFor="skip" className="text-sm font-normal">
                          Skip conflicts (only import new industries)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new_only" id="new_only" />
                        <Label htmlFor="new_only" className="text-sm font-normal">
                          Cancel if any conflicts exist
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {/* Ready to import */}
              {parseResult.errors.length === 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <h4 className="font-medium text-green-600">Ready to Import</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {summary?.totalIndustries} industries will be processed
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && progress && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-medium mb-2">Importing Industries...</h3>
                <p className="text-sm text-muted-foreground">
                  Processing: <span className="font-mono">{progress.currentItem}</span>
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress.processed} / {progress.total}</span>
                </div>
                <Progress value={(progress.processed / progress.total) * 100} />
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-500/10 rounded-lg p-3">
                  <p className="text-xl font-bold text-green-600">{progress.succeeded}</p>
                  <p className="text-xs text-muted-foreground">Succeeded</p>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-3">
                  <p className="text-xl font-bold text-amber-600">{progress.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3">
                  <p className="text-xl font-bold text-red-600">{progress.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && importResult && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                {importResult.success ? (
                  <>
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-medium mb-2">Import Completed Successfully!</h3>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-xl font-medium mb-2">Import Completed with Errors</h3>
                  </>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-500/10 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-sm text-muted-foreground">New Industries</p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-4">
                  <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                  <p className="text-sm text-muted-foreground">Updated</p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-2xl font-bold">{importResult.skipped}</p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <h4 className="font-medium text-destructive mb-2">Errors ({importResult.errors.length})</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto text-sm">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-destructive">{err}</p>
                    ))}
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
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step !== 'done' && step !== 'importing' && (
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            )}
            
            {step === 'preview' && (
              <Button onClick={handleNext} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Check Conflicts
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {step === 'validate' && parseResult?.errors.length === 0 && (
              <Button onClick={handleNext} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Start Import
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {step === 'done' && (
              <Button onClick={handleDone}>
                Done
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
