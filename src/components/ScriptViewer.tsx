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
      <DialogContent className="max-w-4xl max-h-[90vh] gradient-card border-border">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl font-bold text-gradient pr-8">
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
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
            <Clock className="w-4 h-4" />
            {DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary">
            <Film className="w-4 h-4" />
            {VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
            <User className="w-4 h-4" />
            {CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}
          </span>
          {promptCount > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent/10 text-accent-foreground">
              <Hash className="w-4 h-4" />
              {promptCount} prompts
            </span>
          )}
          <span className="text-muted-foreground mx-1">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Tạo bởi:</span>
            <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="gradient-primary"
              >
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? 'Đang lưu...' : 'Lưu'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="border-border hover:border-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4 mr-1" />
                Hủy
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                className="border-border hover:border-primary hover:bg-primary/10"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Chỉnh sửa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="border-border hover:border-primary hover:bg-primary/10"
              >
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTxt}
                className="border-border hover:border-secondary hover:bg-secondary/10"
              >
                <FileText className="w-4 h-4 mr-1" />
                Xuất TXT
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportWord}
                className="border-border hover:border-secondary hover:bg-secondary/10"
              >
                <Download className="w-4 h-4 mr-1" />
                Xuất Word
              </Button>
            </>
          )}
        </div>

        {/* Script content with tabs */}
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="h-[50vh] font-sans text-sm bg-muted/30 border-border resize-none"
            placeholder="Nội dung kịch bản..."
          />
        ) : (
          <Tabs defaultValue="prompts" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="prompts" className="data-[state=active]:bg-primary/10">
                Theo Prompt ({parsedPrompts.length})
              </TabsTrigger>
              <TabsTrigger value="full" className="data-[state=active]:bg-primary/10">
                Toàn bộ
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="prompts">
              <ScrollArea className="h-[50vh] rounded-lg bg-muted/30 p-4 border border-border">
                {parsedPrompts.length > 0 ? (
                  <div className="space-y-3 pr-4">
                    {parsedPrompts.map((prompt) => (
                      <PromptCard key={prompt.promptNumber} prompt={prompt} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    Không tìm thấy định dạng PROMPT trong kịch bản
                  </p>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="full">
              <ScrollArea className="h-[50vh] rounded-lg bg-muted/30 p-4 border border-border">
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                  {script.content}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
