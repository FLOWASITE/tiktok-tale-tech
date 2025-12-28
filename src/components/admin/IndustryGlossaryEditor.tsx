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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Book,
  Plus,
  Trash2,
  Save,
  Loader2,
  Search,
  Edit2,
  FileUp,
  X,
  Tag,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIndustryGlossary, useIndustryGlossaryAdmin } from '@/hooks/useIndustryGlossary';
import { 
  GLOSSARY_CATEGORIES, 
  type GlossaryCategory,
  type IndustryGlossaryTermWithTranslation 
} from '@/types/industryGlossary';
import { toast } from 'sonner';

interface IndustryGlossaryEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packId: string;
  packName: string;
}

function GlossaryTermCard({
  term,
  onEdit,
  onDelete,
  isDeleting,
}: {
  term: IndustryGlossaryTermWithTranslation;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const category = GLOSSARY_CATEGORIES.find(c => c.value === term.category);

  return (
    <div className="group rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-foreground">{term.term}</h4>
            {term.abbreviation && (
              <Badge variant="outline" className="text-xs">
                {term.abbreviation}
              </Badge>
            )}
            {term.is_preferred && (
              <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-xs">
                Ưu tiên
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs gap-1">
              {category?.icon} {category?.label}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {term.definition}
          </p>

          {term.example_usage && (
            <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
              VD: {term.example_usage}
            </p>
          )}

          {term.related_terms && term.related_terms.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <Link2 className="h-3 w-3 text-muted-foreground" />
              {term.related_terms.slice(0, 3).map((rt, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {rt}
                </Badge>
              ))}
              {term.related_terms.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{term.related_terms.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TermFormDialog({
  open,
  onOpenChange,
  industryTemplateId,
  editingTerm,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  industryTemplateId: string;
  editingTerm?: IndustryGlossaryTermWithTranslation | null;
  onSuccess: () => void;
}) {
  const { createTerm, updateTerm, updateTranslation, isCreating, isUpdating } = useIndustryGlossaryAdmin();
  
  const [term, setTerm] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [category, setCategory] = useState<GlossaryCategory>('general');
  const [definition, setDefinition] = useState('');
  const [exampleUsage, setExampleUsage] = useState('');
  const [usageContext, setUsageContext] = useState('');
  const [relatedTerms, setRelatedTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [isPreferred, setIsPreferred] = useState(true);

  const isEditing = !!editingTerm;
  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (open && editingTerm) {
      setTerm(editingTerm.term);
      setAbbreviation(editingTerm.abbreviation || '');
      setCategory(editingTerm.category as GlossaryCategory || 'general');
      setDefinition(editingTerm.definition || '');
      setExampleUsage(editingTerm.example_usage || '');
      setUsageContext(editingTerm.usage_context || '');
      setRelatedTerms(editingTerm.related_terms?.join(', ') || '');
      setNotes(editingTerm.notes || '');
      setIsPreferred(editingTerm.is_preferred);
    } else if (open) {
      // Reset form for new term
      setTerm('');
      setAbbreviation('');
      setCategory('general');
      setDefinition('');
      setExampleUsage('');
      setUsageContext('');
      setRelatedTerms('');
      setNotes('');
      setIsPreferred(true);
    }
  }, [open, editingTerm]);

  const handleSubmit = async () => {
    if (!term.trim() || !definition.trim()) {
      toast.error('Vui lòng nhập thuật ngữ và định nghĩa');
      return;
    }

    try {
      const relatedTermsArray = relatedTerms
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (isEditing && editingTerm) {
        // Update existing term
        await updateTerm({
          id: editingTerm.id,
          term: term.trim(),
          abbreviation: abbreviation.trim() || null,
          category,
          relatedTerms: relatedTermsArray,
          usageContext: usageContext.trim() || null,
          isPreferred,
        });

        // Update translation
        await updateTranslation({
          glossaryId: editingTerm.id,
          languageCode: 'vi',
          definition: definition.trim(),
          exampleUsage: exampleUsage.trim() || null,
          notes: notes.trim() || null,
        });

        toast.success('Đã cập nhật thuật ngữ');
      } else {
        // Create new term
        await createTerm({
          industryTemplateId,
          term: term.trim(),
          abbreviation: abbreviation.trim() || undefined,
          category,
          relatedTerms: relatedTermsArray,
          usageContext: usageContext.trim() || undefined,
          isPreferred,
          translations: [{
            languageCode: 'vi',
            definition: definition.trim(),
            exampleUsage: exampleUsage.trim() || undefined,
            notes: notes.trim() || undefined,
          }],
        });

        toast.success('Đã thêm thuật ngữ mới');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving term:', error);
      toast.error('Có lỗi xảy ra khi lưu thuật ngữ');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Book className="h-5 w-5 text-blue-500" />
            {isEditing ? 'Chỉnh sửa thuật ngữ' : 'Thêm thuật ngữ mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Cập nhật thông tin thuật ngữ' : 'Thêm thuật ngữ vào từ điển ngành'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="term">Thuật ngữ *</Label>
              <Input
                id="term"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="VD: Thuế GTGT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="abbreviation">Viết tắt</Label>
              <Input
                id="abbreviation"
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                placeholder="VD: VAT"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Danh mục</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as GlossaryCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GLOSSARY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ưu tiên sử dụng</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={isPreferred}
                  onCheckedChange={setIsPreferred}
                />
                <span className="text-sm text-muted-foreground">
                  {isPreferred ? 'Có' : 'Không'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="definition">Định nghĩa *</Label>
            <Textarea
              id="definition"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="Giải thích ngắn gọn về thuật ngữ..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exampleUsage">Ví dụ sử dụng</Label>
            <Textarea
              id="exampleUsage"
              value={exampleUsage}
              onChange={(e) => setExampleUsage(e.target.value)}
              placeholder="VD: 'Doanh nghiệp phải nộp thuế GTGT hàng tháng...'"
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relatedTerms">Thuật ngữ liên quan</Label>
            <Input
              id="relatedTerms"
              value={relatedTerms}
              onChange={(e) => setRelatedTerms(e.target.value)}
              placeholder="Nhập các thuật ngữ, cách nhau bởi dấu phẩy"
            />
            <p className="text-xs text-muted-foreground">
              VD: Thuế TNDN, Thuế thu nhập, Hóa đơn
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usageContext">Ngữ cảnh sử dụng</Label>
            <Input
              id="usageContext"
              value={usageContext}
              onChange={(e) => setUsageContext(e.target.value)}
              placeholder="VD: Dùng trong ngữ cảnh tư vấn thuế doanh nghiệp"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm cho thuật ngữ..."
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !term.trim() || !definition.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkImportDialog({
  open,
  onOpenChange,
  industryTemplateId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  industryTemplateId: string;
  onSuccess: () => void;
}) {
  const { bulkImport, isImporting } = useIndustryGlossaryAdmin();
  const [importText, setImportText] = useState('');

  const exampleFormat = `Thuế GTGT|VAT|technical|Thuế giá trị gia tăng, là loại thuế gián thu đánh vào giá trị tăng thêm của hàng hóa, dịch vụ|Doanh nghiệp phải kê khai thuế GTGT hàng tháng
Thuế TNDN|CIT|technical|Thuế thu nhập doanh nghiệp, đánh trên lợi nhuận của doanh nghiệp|Thuế TNDN hiện hành là 20%`;

  const handleImport = async () => {
    if (!importText.trim()) {
      toast.error('Vui lòng nhập dữ liệu');
      return;
    }

    try {
      const lines = importText.trim().split('\n').filter(Boolean);
      const terms = lines.map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
          term: parts[0] || '',
          abbreviation: parts[1] || undefined,
          category: (parts[2] as GlossaryCategory) || 'general',
          definition: parts[3] || '',
          exampleUsage: parts[4] || undefined,
        };
      }).filter(t => t.term && t.definition);

      if (terms.length === 0) {
        toast.error('Không tìm thấy thuật ngữ hợp lệ');
        return;
      }

      await bulkImport({
        industryTemplateId,
        terms,
      });

      toast.success(`Đã import ${terms.length} thuật ngữ`);
      setImportText('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error importing terms:', error);
      toast.error('Có lỗi xảy ra khi import');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-blue-500" />
            Import hàng loạt
          </DialogTitle>
          <DialogDescription>
            Import nhiều thuật ngữ cùng lúc bằng format: Thuật ngữ|Viết tắt|Danh mục|Định nghĩa|Ví dụ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Ví dụ format:</p>
            <pre className="text-xs whitespace-pre-wrap font-mono">{exampleFormat}</pre>
          </div>

          <div className="space-y-2">
            <Label>Dữ liệu import</Label>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Dán dữ liệu vào đây, mỗi dòng một thuật ngữ..."
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Danh mục có thể là: general, technical, legal, marketing, compliance
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !importText.trim()}>
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4 mr-2" />
            )}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IndustryGlossaryEditor({
  open,
  onOpenChange,
  packId,
  packName,
}: IndustryGlossaryEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GlossaryCategory | 'all'>('all');
  const [termFormOpen, setTermFormOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<IndustryGlossaryTermWithTranslation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { glossary, isLoading, refetch } = useIndustryGlossary({
    industryTemplateId: packId,
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    searchQuery: searchQuery || undefined,
  });

  const { deleteTerm, isDeleting } = useIndustryGlossaryAdmin();

  const handleEdit = (term: IndustryGlossaryTermWithTranslation) => {
    setEditingTerm(term);
    setTermFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa thuật ngữ này?')) return;
    
    setDeletingId(id);
    try {
      await deleteTerm(id);
      toast.success('Đã xóa thuật ngữ');
      refetch();
    } catch (error) {
      console.error('Error deleting term:', error);
      toast.error('Có lỗi xảy ra khi xóa');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddNew = () => {
    setEditingTerm(null);
    setTermFormOpen(true);
  };

  const handleSuccess = () => {
    refetch();
  };

  // Group by category for stats
  const categoryStats = GLOSSARY_CATEGORIES.map(cat => ({
    ...cat,
    count: glossary.filter(t => t.category === cat.value).length,
  }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-blue-500" />
              Từ điển ngành - {packName}
            </DialogTitle>
            <DialogDescription>
              Quản lý thuật ngữ chuyên ngành cho Industry Memory Pack
            </DialogDescription>
          </DialogHeader>

          {/* Stats */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              📚 Tổng: {glossary.length}
            </Badge>
            {categoryStats.filter(c => c.count > 0).map(cat => (
              <Badge key={cat.value} variant="outline" className="gap-1 text-xs">
                {cat.icon} {cat.label}: {cat.count}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm thuật ngữ..."
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Select 
              value={selectedCategory} 
              onValueChange={(v) => setSelectedCategory(v as GlossaryCategory | 'all')}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {GLOSSARY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => setBulkImportOpen(true)}>
              <FileUp className="h-4 w-4 mr-1" />
              Import
            </Button>

            <Button size="sm" onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-1" />
              Thêm mới
            </Button>
          </div>

          {/* Glossary List */}
          <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: 'calc(90vh - 320px)' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : glossary.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Book className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Không tìm thấy thuật ngữ phù hợp'
                    : 'Chưa có thuật ngữ nào'}
                </p>
                {!searchQuery && selectedCategory === 'all' && (
                  <Button variant="link" onClick={handleAddNew} className="mt-2">
                    <Plus className="h-4 w-4 mr-1" />
                    Thêm thuật ngữ đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {glossary.map((term) => (
                  <GlossaryTermCard
                    key={term.id}
                    term={term}
                    onEdit={() => handleEdit(term)}
                    onDelete={() => handleDelete(term.id)}
                    isDeleting={deletingId === term.id}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Term Form Dialog */}
      <TermFormDialog
        open={termFormOpen}
        onOpenChange={setTermFormOpen}
        industryTemplateId={packId}
        editingTerm={editingTerm}
        onSuccess={handleSuccess}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        industryTemplateId={packId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
