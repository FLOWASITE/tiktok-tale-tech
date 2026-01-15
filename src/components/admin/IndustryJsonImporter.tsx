/**
 * Industry JSON Importer Component
 * UI for importing Industry Pack data from JSON
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileJson,
  Upload,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useIndustryJsonImport, validateJsonStructure, type IndustryJsonData } from '@/hooks/useIndustryJsonImport';

interface IndustryJsonImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function IndustryJsonImporter({ open, onOpenChange, onSuccess }: IndustryJsonImporterProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<IndustryJsonData | null>(null);
  const [step, setStep] = useState<'input' | 'preview' | 'importing' | 'done'>('input');

  const {
    isProcessing,
    steps,
    result,
    existingPack,
    reset,
    checkExistingPack,
    importFromJson,
  } = useIndustryJsonImport();

  const handleReset = useCallback(() => {
    setJsonInput('');
    setParseErrors([]);
    setParsedData(null);
    setStep('input');
    reset();
  }, [reset]);

  const handleClose = useCallback(() => {
    handleReset();
    onOpenChange(false);
  }, [handleReset, onOpenChange]);

  const handleParseJson = useCallback(async () => {
    setParseErrors([]);
    
    try {
      const data = JSON.parse(jsonInput);
      const validation = validateJsonStructure(data);
      
      if (!validation.valid) {
        setParseErrors(validation.errors);
        return;
      }

      setParsedData(data as IndustryJsonData);
      
      // Check if pack exists
      await checkExistingPack(data.global_pack.industry_code);
      
      setStep('preview');
    } catch (e) {
      setParseErrors([`JSON không hợp lệ: ${e instanceof Error ? e.message : 'Lỗi parse'}`]);
    }
  }, [jsonInput, checkExistingPack]);

  const handleImport = useCallback(async () => {
    if (!parsedData) return;
    
    setStep('importing');
    const result = await importFromJson(parsedData, 'merge');
    
    if (result.success) {
      setStep('done');
      onSuccess?.();
    }
  }, [parsedData, importFromJson, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Import Industry Pack từ JSON
          </DialogTitle>
          <DialogDescription>
            Paste JSON data từ AI research để import trực tiếp vào database
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Step 1: Input JSON */}
          {step === 'input' && (
            <div className="space-y-4">
              <Textarea
                placeholder='Paste JSON data ở đây... (bắt đầu với { "global_pack": {...} })'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
              
              {parseErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {parseErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && parsedData && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {existingPack && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Pack <strong>{existingPack.code}</strong> đã tồn tại. 
                      Dữ liệu sẽ được merge/cập nhật.
                    </AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Global Pack</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Industry Code:</span>{' '}
                        <Badge variant="outline">{parsedData.global_pack.industry_code}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Category:</span>{' '}
                        <Badge variant="secondary">{parsedData.global_pack.category_code}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target Audience:</span>{' '}
                        {parsedData.global_pack.target_audience}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Version:</span>{' '}
                        {parsedData.global_pack.version}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {parsedData.global_pack.global_compliance_rules.length} Compliance Rules
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {parsedData.global_pack.global_claim_restrictions.length} Claim Restrictions
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {parsedData.global_pack.global_terminology.forbidden_terms_global.length} Forbidden Terms
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {parsedData.global_pack.global_system_rules.length} System Rules
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Translations</CardTitle>
                    <CardDescription>
                      {Object.keys(parsedData.translations).length} ngôn ngữ
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(parsedData.translations).map(([lang, trans]) => (
                        <Badge key={lang} variant="secondary">
                          {lang.toUpperCase()}: {trans.name}
                          <span className="ml-1 text-xs opacity-70">
                            ({Object.keys(trans.glossary).length} glossary)
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Jurisdictions</CardTitle>
                    <CardDescription>
                      {Object.keys(parsedData.jurisdictions).length} quốc gia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(parsedData.jurisdictions).map(([code, jur]) => (
                        <div key={code} className="flex items-center justify-between text-sm">
                          <Badge variant="outline">{code}</Badge>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">
                              {jur.key_regulations.length} regulations
                            </span>
                            <span className="text-muted-foreground">
                              {jur.industry_trends.length} trends
                            </span>
                            <Badge 
                              variant={jur.validity_status === 'current' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {jur.validity_status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="mt-2 text-muted-foreground">Đang import...</p>
              </div>
              
              <div className="space-y-2">
                {steps.map((s) => (
                  <div key={s.step} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    {s.status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />}
                    {s.status === 'running' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    {s.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {s.status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                    <span className="flex-1">{s.name}</span>
                    {s.count !== undefined && (
                      <Badge variant="secondary">{s.count}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="text-center py-6">
                {result.success ? (
                  <>
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                    <h3 className="mt-3 text-lg font-semibold">Import thành công!</h3>
                    <p className="text-muted-foreground">{result.message}</p>
                  </>
                ) : (
                  <>
                    <XCircle className="h-12 w-12 text-destructive mx-auto" />
                    <h3 className="mt-3 text-lg font-semibold">Import thất bại</h3>
                    <p className="text-destructive">{result.message}</p>
                  </>
                )}
              </div>

              {result.success && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Pack ID:</span>{' '}
                        <code className="text-xs bg-muted px-1 rounded">{result.packId}</code>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pack Code:</span>{' '}
                        <Badge>{result.packCode}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Translations:</span>{' '}
                        {result.details.translations}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Jurisdictions:</span>{' '}
                        {result.details.jurisdictions}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Key Regulations:</span>{' '}
                        {result.details.keyRegulations}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button 
                onClick={handleParseJson} 
                disabled={!jsonInput.trim()}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Tiếp tục
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('input')}>
                Quay lại
              </Button>
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import ngay
              </Button>
            </>
          )}

          {step === 'importing' && (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Đang xử lý...
            </Button>
          )}

          {step === 'done' && (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Import thêm
              </Button>
              <Button onClick={handleClose}>
                Hoàn tất
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
