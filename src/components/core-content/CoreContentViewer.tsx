import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  Archive,
  Layers,
  FileText,
  Sparkles,
  Target,
  MessageSquare,
  Clock,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import type { CoreContent } from '@/types/coreContent';
import { useCoreContents } from '@/hooks/useCoreContents';

interface CoreContentViewerProps {
  coreContent: CoreContent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: () => void;
  onArchive?: () => void;
  onTransform?: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Bản nháp', className: 'bg-slate-500/15 text-slate-600 border-slate-500/30' },
  approved: { label: 'Đã duyệt', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  archived: { label: 'Lưu trữ', className: 'bg-slate-400/15 text-slate-500 border-slate-400/30' },
};

export function CoreContentViewer({
  coreContent,
  open,
  onOpenChange,
  onApprove,
  onArchive,
  onTransform,
}: CoreContentViewerProps) {
  const { getDerivedVariants } = useCoreContents({});
  const [derivedVariants, setDerivedVariants] = useState<any[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  useEffect(() => {
    if (open && coreContent.id) {
      setLoadingVariants(true);
      getDerivedVariants(coreContent.id)
        .then(setDerivedVariants)
        .finally(() => setLoadingVariants(false));
    }
  }, [open, coreContent.id]);

  const status = statusConfig[coreContent.status] || statusConfig.draft;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">{coreContent.title}</SheetTitle>
              <SheetDescription className="mt-1">{coreContent.topic}</SheetDescription>
            </div>
            <Badge variant="outline" className={cn('flex-shrink-0', status.className)}>
              {status.label}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Số từ
                </p>
                <p className="font-semibold">{coreContent.word_count || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Điểm chất lượng
                </p>
                <p className="font-semibold">{coreContent.quality_score || '-'}/10</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Mục tiêu
                </p>
                <p className="font-semibold capitalize">{coreContent.content_goal}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Variants
                </p>
                <p className="font-semibold">{derivedVariants.length}</p>
              </div>
            </div>

            <Separator />

            {/* Key Messages */}
            {coreContent.key_messages && coreContent.key_messages.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Key Messages
                </h4>
                <ul className="space-y-1.5">
                  {coreContent.key_messages.map((msg, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />

            {/* Content */}
            <div className="space-y-2">
              <h4 className="font-semibold">Nội dung</h4>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{coreContent.content}</ReactMarkdown>
              </div>
            </div>

            <Separator />

            {/* Derived Variants */}
            {derivedVariants.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Derived Variants ({derivedVariants.length})
                </h4>
                <div className="space-y-2">
                  {derivedVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className="p-3 rounded-lg border border-border/50 bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{variant.title}</p>
                        <div className="flex gap-1">
                          {variant.selected_channels?.map((ch: string) => (
                            <Badge key={ch} variant="secondary" className="text-xs">
                              {ch}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(variant.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Tạo: {format(new Date(coreContent.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
              </p>
              <p className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Cập nhật: {formatDistanceToNow(new Date(coreContent.updated_at), { addSuffix: true, locale: vi })}
              </p>
              {coreContent.ai_model_used && (
                <p className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Model: {coreContent.ai_model_used}
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex-shrink-0 pt-4 border-t flex gap-2">
          {coreContent.status === 'draft' && (
            <Button onClick={onApprove} className="flex-1 gap-2">
              <CheckCircle className="w-4 h-4" />
              Phê duyệt
            </Button>
          )}
          {coreContent.status === 'approved' && (
            <Button onClick={onTransform} className="flex-1 gap-2">
              <Layers className="w-4 h-4" />
              Transform → Multi-channel
            </Button>
          )}
          {coreContent.status !== 'archived' && (
            <Button variant="outline" onClick={onArchive} className="gap-2">
              <Archive className="w-4 h-4" />
              Lưu trữ
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
