// ============================================
// Prompt Variable Preview Component
// ============================================

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Eye, 
  EyeOff, 
  Variable, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface PromptVariablePreviewProps {
  content: string;
  variables?: Record<string, any>;
}

export function PromptVariablePreview({ content, variables = {} }: PromptVariablePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mockValues, setMockValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Extract variables from content
  const extractedVars = useMemo(() => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(v => v.slice(2, -2)))];
  }, [content]);

  // Generate preview with replaced variables
  const previewContent = useMemo(() => {
    let result = content;
    extractedVars.forEach(varName => {
      const value = mockValues[varName] || `[${varName}]`;
      result = result.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value);
    });
    return result;
  }, [content, extractedVars, mockValues]);

  // Reset mock values
  const handleReset = () => {
    setMockValues({});
  };

  // Copy preview to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewContent);
      setCopied(true);
      toast.success('Đã copy preview');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  // Auto-fill with sample values - includes Core Content presets
  const handleAutoFill = () => {
    // General samples
    const generalSamples: Record<string, string> = {
      brandName: 'Acme Corp',
      productName: 'Widget Pro',
      topic: 'Cách tăng doanh số bán hàng trong thời đại AI',
      channel: 'Facebook',
      targetAudience: 'Chủ doanh nghiệp SMB tại Việt Nam, 30-50 tuổi',
      tone: 'professional',
      style: 'friendly',
      language: 'Vietnamese',
      industry: 'E-commerce',
      companyName: 'TechVN',
      userName: 'Nguyễn Văn A',
      date: new Date().toLocaleDateString('vi-VN'),
      time: new Date().toLocaleTimeString('vi-VN'),
    };

    // Core Content specific presets
    const coreContentPresets: Record<string, string> = {
      // Main content variables
      contentGoalDescription: 'Giáo dục - Chia sẻ kiến thức hữu ích, hướng dẫn chi tiết',
      contentAngle: 'Góc tiếp cận: Tips, hướng dẫn, thông tin hữu ích',
      roleContext: `## CONTENT ROLE: SPROUT (Trust Building)
- Mục tiêu: Xây dựng lòng tin, chứng minh chuyên môn
- Focus: Case study, phân tích sâu, giải pháp cụ thể
- Tone: Chuyên gia, đáng tin cậy, có số liệu
- CTA: Trung bình (đăng ký, liên hệ tư vấn)`,
      
      // Context blocks
      brandContext: `## BRAND CONTEXT
- Thương hiệu: TechVN
- Định vị: Giải pháp công nghệ hàng đầu cho SMB Việt Nam
- Tone of voice: Chuyên nghiệp, thân thiện, đáng tin cậy
- USP: Tích hợp AI thông minh, tiết kiệm 40% thời gian`,
      personaContext: `## TARGET PERSONAS
### Persona 1: Anh Minh - Chủ doanh nghiệp
- Mô tả: Chủ doanh nghiệp nhỏ, 35-45 tuổi
- Pain points: Thiếu nhân sự marketing; Không có thời gian làm content
- Triggers: Thấy đối thủ thành công với digital marketing`,
      productContext: `## SẢN PHẨM/DỊCH VỤ CHÍNH
### 1. ContentAI Pro
- Mô tả: Nền tảng tạo content tự động bằng AI
- USPs: Tích hợp brand voice; Đa kênh trong 1 nền tảng
- Lợi ích: Tiết kiệm 10 giờ/tuần; Tăng engagement 150%`,
      
      // Word count variables
      targetWords: '1200',
      minWords: '1000',
      maxWords: '1500',
      introWords: '180',
      analysisWords: '380',
      impactWords: '180',
      solutionWords: '340',
      conclusionWords: '120',
      
      // Additional context blocks
      additionalContext: 'Bài viết này hướng đến chủ doanh nghiệp SMB đang tìm kiếm giải pháp tăng doanh số trong Q1 2025.',
      smartContextInjection: '',
      competitiveContext: `## 🎯 COMPETITIVE POSITIONING (Tinh tế - Không Attack)
### UNIQUE VALUE PROPOSITION (lồng ghép tự nhiên):
"Giải pháp duy nhất tích hợp AI + Brand Voice tại Việt Nam"`,
      styleGuide: `## ✍️ STYLE GUIDE (Brand Writing Rules)
### ✅ Từ ngữ ƯU TIÊN sử dụng:
- "giải pháp", "tối ưu", "thông minh"
### ❌ Từ ngữ CẤM sử dụng:
- "rẻ", "miễn phí", "dễ dàng"
### 📝 Phong cách câu: BALANCED
Câu vừa phải (15-25 từ/câu), cân bằng chi tiết và súc tích`,
    };

    // Merge both sample sets
    const allSamples = { ...generalSamples, ...coreContentPresets };

    const newMockValues: Record<string, string> = {};
    extractedVars.forEach(varName => {
      const lowerVar = varName.toLowerCase();
      
      // Direct match first
      if (allSamples[varName]) {
        newMockValues[varName] = allSamples[varName];
        return;
      }
      
      // Try to find matching sample by fuzzy match
      const matchingKey = Object.keys(allSamples).find(
        k => k.toLowerCase() === lowerVar || 
        lowerVar.includes(k.toLowerCase()) ||
        k.toLowerCase().includes(lowerVar)
      );
      newMockValues[varName] = matchingKey ? allSamples[matchingKey] : `Sample ${varName}`;
    });
    setMockValues(newMockValues);
  };

  if (extractedVars.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic p-3 bg-muted/30 rounded-lg">
        Không có biến nào được phát hiện trong prompt này.
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between gap-2">
          <span className="flex items-center gap-2">
            {isOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Variable Preview
            <Badge variant="secondary" className="ml-1">
              {extractedVars.length} biến
            </Badge>
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Variable className="h-4 w-4" />
                Nhập giá trị mẫu
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleAutoFill}>
                  Auto-fill
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Variable Inputs */}
            <div className="grid grid-cols-2 gap-3">
              {extractedVars.map(varName => {
                const varDef = variables[varName];
                return (
                  <div key={varName} className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <code className="bg-muted px-1 rounded">{`{{${varName}}}`}</code>
                      {varDef?.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      value={mockValues[varName] || ''}
                      onChange={(e) => setMockValues(prev => ({
                        ...prev,
                        [varName]: e.target.value
                      }))}
                      placeholder={varDef?.description || `Nhập ${varName}...`}
                      className="h-8 text-sm"
                    />
                  </div>
                );
              })}
            </div>

            {/* Preview Output */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Preview:</Label>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1" />
                  )}
                  {copied ? 'Đã copy' : 'Copy'}
                </Button>
              </div>
              <ScrollArea className="h-[200px]">
                <pre className="p-3 bg-muted/50 rounded-lg text-sm font-mono whitespace-pre-wrap">
                  {previewContent}
                </pre>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
