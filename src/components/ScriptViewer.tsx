import { Script, VIDEO_TYPE_LABELS, CHARACTER_TYPE_LABELS, DURATION_LABELS, ContentStatus } from '@/types/script';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, FileText, Clock, User, Film, Check, Edit2, Save, X, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseScriptContent, getPromptCount } from '@/utils/parsePrompts';
import { PromptCard } from '@/components/PromptCard';
import { StatusSelector } from '@/components/StatusSelector';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { CreatorCell } from '@/components/CreatorCell';

interface ScriptViewerProps {
  script: Script | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScriptUpdate?: (updatedScript: Script) => void;
}

export function ScriptViewer({ script, open, onOpenChange, onScriptUpdate }: ScriptViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch creator profile
  const { profiles, isLoading: isLoadingProfile } = useCreatorProfiles([script?.user_id]);
  const creatorProfile = script?.user_id ? profiles[script.user_id] : undefined;

  useEffect(() => {
    if (script) {
      setEditedContent(script.content);
      setIsEditing(false);
    }
  }, [script]);

  if (!script) return null;

  const parsedPrompts = parseScriptContent(script.content);
  const promptCount = getPromptCount(script.content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script.content);
    setCopied(true);
    toast.success('Đã sao chép kịch bản!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setEditedContent(script.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedContent(script.content);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!script || editedContent === script.content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('scripts')
        .update({ content: editedContent, updated_at: new Date().toISOString() })
        .eq('id', script.id);

      if (error) throw error;

      const updatedScript = { ...script, content: editedContent, updated_at: new Date().toISOString() };
      onScriptUpdate?.(updatedScript);
      setIsEditing(false);
      toast.success('Đã lưu thay đổi!');
    } catch (error) {
      console.error('Error updating script:', error);
      toast.error('Không thể lưu thay đổi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: ContentStatus) => {
    if (!script) return;

    try {
      const { error } = await supabase
        .from('scripts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', script.id);

      if (error) throw error;

      const updatedScript = { ...script, status: newStatus, updated_at: new Date().toISOString() };
      onScriptUpdate?.(updatedScript);
      toast.success('Đã cập nhật trạng thái!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const handleExportTxt = () => {
    const content = `${script.title}\n${'='.repeat(50)}\n\nChủ đề: ${script.topic}\nThời lượng: ${DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}\nThể loại: ${VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}\nNhân vật: ${CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}\n\n${'='.repeat(50)}\n\n${script.content}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${script.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Đã tải file TXT!');
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${script.title}</title></head>
        <body>
          <h1>${script.title}</h1>
          <hr/>
          <p><strong>Chủ đề:</strong> ${script.topic}</p>
          <p><strong>Thời lượng:</strong> ${DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}</p>
          <p><strong>Thể loại:</strong> ${VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}</p>
          <p><strong>Nhân vật:</strong> ${CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}</p>
          <hr/>
          <pre style="font-family: Arial; white-space: pre-wrap;">${script.content}</pre>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${script.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Đã tải file Word!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] xs:w-full max-h-[95vh] xs:max-h-[90vh] gradient-card border-border overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 xs:pb-4">
          <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-2 xs:gap-4">
            <DialogTitle className="text-base xs:text-xl font-bold text-gradient pr-0 xs:pr-8 line-clamp-2">
              {script.title}
            </DialogTitle>
            <StatusSelector 
              status={script.status || 'draft'} 
              onStatusChange={handleStatusChange}
              disabled={isEditing || isSaving}
            />
          </div>
        </DialogHeader>
        
        {/* Metadata badges */}
        <div className="flex flex-wrap items-center gap-1.5 xs:gap-2 text-xs xs:text-sm">
          <span className="inline-flex items-center gap-0.5 xs:gap-1 px-2 xs:px-3 py-1 xs:py-1.5 rounded-full bg-primary/10 text-primary">
            <Clock className="w-3 h-3 xs:w-4 xs:h-4" />
            <span className="hidden xs:inline">{DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}</span>
            <span className="xs:hidden">{script.duration}s</span>
          </span>
          <span className="inline-flex items-center gap-0.5 xs:gap-1 px-2 xs:px-3 py-1 xs:py-1.5 rounded-full bg-secondary/10 text-secondary">
            <Film className="w-3 h-3 xs:w-4 xs:h-4" />
            <span className="truncate max-w-[60px] xs:max-w-none">
              {VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}
            </span>
          </span>
          <span className="inline-flex items-center gap-0.5 xs:gap-1 px-2 xs:px-3 py-1 xs:py-1.5 rounded-full bg-muted text-muted-foreground">
            <User className="w-3 h-3 xs:w-4 xs:h-4" />
            <span className="hidden xs:inline">
              {CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}
            </span>
          </span>
          {promptCount > 0 && (
            <span className="inline-flex items-center gap-0.5 xs:gap-1 px-2 xs:px-3 py-1 xs:py-1.5 rounded-full bg-accent/10 text-accent-foreground">
              <Hash className="w-3 h-3 xs:w-4 xs:h-4" />
              {promptCount}
            </span>
          )}
        </div>

        {/* Creator & Time - Visible on larger screens */}
        <div className="hidden xs:flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-2">
          <span>Tạo bởi:</span>
          <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
          <span className="mx-1">•</span>
          <span>{new Date(script.created_at).toLocaleDateString('vi-VN')}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 xs:gap-2 flex-wrap mt-2 xs:mt-0">
          {isEditing ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="gradient-primary h-7 xs:h-8 text-xs xs:text-sm"
              >
                <Save className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1" />
                {isSaving ? 'Lưu...' : 'Lưu'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="border-border hover:border-destructive hover:bg-destructive/10 h-7 xs:h-8 text-xs xs:text-sm"
              >
                <X className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1" />
                Hủy
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                className="border-border hover:border-primary hover:bg-primary/10 h-7 xs:h-8 text-xs xs:text-sm"
              >
                <Edit2 className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1" />
                <span className="hidden xs:inline">Chỉnh sửa</span>
                <span className="xs:hidden">Sửa</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="border-border hover:border-primary hover:bg-primary/10 h-7 xs:h-8 text-xs xs:text-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1" /> : <Copy className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1" />}
                <span className="hidden xs:inline">{copied ? 'Đã copy' : 'Copy'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTxt}
                className="border-border hover:border-secondary hover:bg-secondary/10 h-7 xs:h-8 text-xs xs:text-sm"
              >
                <FileText className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1" />
                <span className="hidden xs:inline">TXT</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportWord}
                className="border-border hover:border-secondary hover:bg-secondary/10 h-7 xs:h-8 text-xs xs:text-sm"
              >
                <Download className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1" />
                <span className="hidden xs:inline">Word</span>
              </Button>
            </>
          )}
        </div>

        {/* Script content with tabs */}
        <div className="flex-1 min-h-0 mt-3 xs:mt-4">
          {isEditing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="h-full min-h-[40vh] xs:min-h-[50vh] font-sans text-xs xs:text-sm bg-muted/30 border-border resize-none"
              placeholder="Nội dung kịch bản..."
            />
          ) : (
            <Tabs defaultValue="prompts" className="w-full h-full flex flex-col">
              <TabsList className="mb-3 xs:mb-4 h-auto flex-wrap">
                <TabsTrigger value="prompts" className="data-[state=active]:bg-primary/10 text-xs xs:text-sm px-2 xs:px-3 py-1.5">
                  Prompt ({parsedPrompts.length})
                </TabsTrigger>
                <TabsTrigger value="full" className="data-[state=active]:bg-primary/10 text-xs xs:text-sm px-2 xs:px-3 py-1.5">
                  Toàn bộ
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="prompts" className="flex-1 min-h-0 mt-0">
                <ScrollArea className="h-[40vh] xs:h-[50vh] rounded-lg bg-muted/30 p-3 xs:p-4 border border-border">
                  {parsedPrompts.length > 0 ? (
                    <div className="space-y-2 xs:space-y-3 pr-2 xs:pr-4">
                      {parsedPrompts.map((prompt) => (
                        <PromptCard key={prompt.promptNumber} prompt={prompt} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs xs:text-sm text-center py-8">
                      Không tìm thấy định dạng PROMPT
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="full" className="flex-1 min-h-0 mt-0">
                <ScrollArea className="h-[40vh] xs:h-[50vh] rounded-lg bg-muted/30 p-3 xs:p-4 border border-border">
                  <pre className="whitespace-pre-wrap font-sans text-xs xs:text-sm text-foreground leading-relaxed">
                    {script.content}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
