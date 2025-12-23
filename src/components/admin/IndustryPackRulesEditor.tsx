import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Zap,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Scale,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndustryPackRulesEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packId: string;
  packName: string;
  initialData: {
    system_rules: string[];
    argument_patterns: {
      valid_patterns: string[];
      forbidden_patterns: string[];
    };
    metadata: {
      applies_to: string[];
      legal_basis: string[];
    };
  };
  onSave: (data: {
    system_rules: string[];
    argument_patterns: {
      valid_patterns: string[];
      forbidden_patterns: string[];
    };
    metadata: {
      applies_to: string[];
      legal_basis: string[];
    };
  }) => Promise<void>;
  isSaving?: boolean;
}

function ArrayEditor({
  label,
  description,
  items,
  onChange,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  placeholder = 'Nhập nội dung...',
  variant = 'default',
}: {
  label: string;
  description?: string;
  items: string[];
  onChange: (items: string[]) => void;
  icon: React.ElementType;
  iconColor?: string;
  placeholder?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const variantStyles = {
    default: 'border-border',
    success: 'border-emerald-500/30 bg-emerald-500/5',
    danger: 'border-destructive/30 bg-destructive/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', iconColor)} />
        <Label className="text-sm font-medium">{label}</Label>
        <Badge variant="secondary" className="text-xs">
          {items.length}
        </Badge>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Existing items */}
      <div className={cn('rounded-lg border p-3 space-y-2', variantStyles[variant])}>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Chưa có mục nào</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-2 group bg-background/50 rounded-md p-2"
              >
                <span className="text-xs text-muted-foreground mt-0.5 w-5 shrink-0">
                  {index + 1}.
                </span>
                <span className="flex-1 text-sm">{item}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemove(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add new item */}
      <div className="flex gap-2">
        <Textarea
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[60px] text-sm"
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TagsEditor({
  label,
  description,
  items,
  onChange,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  placeholder = 'Thêm tag...',
}: {
  label: string;
  description?: string;
  items: string[];
  onChange: (items: string[]) => void;
  icon: React.ElementType;
  iconColor?: string;
  placeholder?: string;
}) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', iconColor)} />
        <Label className="text-sm font-medium">{label}</Label>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="gap-1 pr-1"
          >
            {item}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
            >
              <XCircle className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleAdd}
          disabled={!newItem.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Thêm
        </Button>
      </div>
    </div>
  );
}

export function IndustryPackRulesEditor({
  open,
  onOpenChange,
  packId,
  packName,
  initialData,
  onSave,
  isSaving = false,
}: IndustryPackRulesEditorProps) {
  const [systemRules, setSystemRules] = useState<string[]>([]);
  const [validPatterns, setValidPatterns] = useState<string[]>([]);
  const [forbiddenPatterns, setForbiddenPatterns] = useState<string[]>([]);
  const [appliesTo, setAppliesTo] = useState<string[]>([]);
  const [legalBasis, setLegalBasis] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from props
  useEffect(() => {
    if (open) {
      setSystemRules(initialData.system_rules || []);
      setValidPatterns(initialData.argument_patterns?.valid_patterns || []);
      setForbiddenPatterns(initialData.argument_patterns?.forbidden_patterns || []);
      setAppliesTo(initialData.metadata?.applies_to || []);
      setLegalBasis(initialData.metadata?.legal_basis || []);
      setHasChanges(false);
    }
  }, [open, initialData]);

  // Track changes
  useEffect(() => {
    const changed =
      JSON.stringify(systemRules) !== JSON.stringify(initialData.system_rules || []) ||
      JSON.stringify(validPatterns) !== JSON.stringify(initialData.argument_patterns?.valid_patterns || []) ||
      JSON.stringify(forbiddenPatterns) !== JSON.stringify(initialData.argument_patterns?.forbidden_patterns || []) ||
      JSON.stringify(appliesTo) !== JSON.stringify(initialData.metadata?.applies_to || []) ||
      JSON.stringify(legalBasis) !== JSON.stringify(initialData.metadata?.legal_basis || []);
    setHasChanges(changed);
  }, [systemRules, validPatterns, forbiddenPatterns, appliesTo, legalBasis, initialData]);

  const handleSave = async () => {
    await onSave({
      system_rules: systemRules,
      argument_patterns: {
        valid_patterns: validPatterns,
        forbidden_patterns: forbiddenPatterns,
      },
      metadata: {
        applies_to: appliesTo,
        legal_basis: legalBasis,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            Quản lý Rules - {packName}
          </DialogTitle>
          <DialogDescription>
            Chỉnh sửa System Rules, Argument Patterns và Metadata cho Industry Memory Pack
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="system-rules" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="system-rules" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              System Rules
              <Badge variant="secondary" className="text-[10px] ml-1">
                {systemRules.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="argument-patterns" className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Argument Patterns
            </TabsTrigger>
            <TabsTrigger value="metadata" className="gap-1.5">
              <Scale className="h-3.5 w-3.5" />
              Metadata
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4 pr-4" style={{ maxHeight: 'calc(90vh - 280px)' }}>
            <TabsContent value="system-rules" className="mt-0 space-y-4">
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                <div className="flex items-start gap-2 text-sm text-purple-600 dark:text-purple-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">System Rules là LUẬT CAO NHẤT</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      AI BẮT BUỘC tuân theo các quy tắc này. Không được vi phạm dưới bất kỳ hình thức nào.
                    </p>
                  </div>
                </div>
              </div>

              <ArrayEditor
                label="System Rules"
                description="Các quy tắc bắt buộc cao nhất cho AI. Ví dụ: 'Industry Memory này OVERRIDE mọi Brand Voice nếu có xung đột'"
                items={systemRules}
                onChange={setSystemRules}
                icon={Zap}
                iconColor="text-purple-500"
                placeholder="Nhập quy tắc hệ thống..."
                variant="warning"
              />
            </TabsContent>

            <TabsContent value="argument-patterns" className="mt-0 space-y-6">
              <ArrayEditor
                label="Valid Patterns (Cấu trúc lập luận ĐƯỢC PHÉP)"
                description="AI CHỈ ĐƯỢC lập luận theo các mẫu này. Ví dụ: '[Quy định] → [Giải thích] → [Ví dụ] → [Lưu ý]'"
                items={validPatterns}
                onChange={setValidPatterns}
                icon={CheckCircle}
                iconColor="text-emerald-500"
                placeholder="Nhập cấu trúc lập luận được phép..."
                variant="success"
              />

              <Separator />

              <ArrayEditor
                label="Forbidden Patterns (Cấu trúc lập luận CẤM)"
                description="AI KHÔNG ĐƯỢC sử dụng các cấu trúc này. Ví dụ: 'Ví dụ trước – luật sau', 'Kể câu chuyện cảm xúc'"
                items={forbiddenPatterns}
                onChange={setForbiddenPatterns}
                icon={XCircle}
                iconColor="text-destructive"
                placeholder="Nhập cấu trúc lập luận bị cấm..."
                variant="danger"
              />
            </TabsContent>

            <TabsContent value="metadata" className="mt-0 space-y-6">
              <TagsEditor
                label="Căn cứ pháp lý (Legal Basis)"
                description="Các văn bản pháp luật làm căn cứ cho Industry Memory. Ví dụ: 'Luật Quản lý thuế', 'Thông tư Bộ Tài chính'"
                items={legalBasis}
                onChange={setLegalBasis}
                icon={Scale}
                iconColor="text-blue-500"
                placeholder="Thêm căn cứ pháp lý..."
              />

              <Separator />

              <TagsEditor
                label="Áp dụng cho (Applies To)"
                description="Các đối tượng mà Industry Memory này áp dụng. Ví dụ: 'dịch vụ kế toán', 'hộ kinh doanh'"
                items={appliesTo}
                onChange={setAppliesTo}
                icon={FileText}
                iconColor="text-muted-foreground"
                placeholder="Thêm đối tượng áp dụng..."
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
