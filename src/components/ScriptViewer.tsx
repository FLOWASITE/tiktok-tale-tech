// ScriptViewer component - displays script details with AI analyzer
import { Script, VIDEO_TYPE_LABELS, CHARACTER_TYPE_LABELS, DURATION_LABELS, ContentStatus, SCRIPT_PURPOSE_CONFIG, ScriptPurpose } from '@/types/script';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, 
  Clock, 
  User, 
  Film, 
  Check, 
  Edit2, 
  Save, 
  X, 
  Hash, 
  Monitor, 
  PanelRightOpen, 
  PanelRightClose, 
  Clapperboard, 
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react';
import { TopicPerformanceUpdater } from '@/components/topic/TopicPerformanceUpdater';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseScriptContent, getPromptCount, getBlockLabel } from '@/utils/parsePrompts';
import { PurposeAwarePromptCard } from '@/components/script/PurposeAwarePromptCard';
import { StatusSelector } from '@/components/StatusSelector';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { CreatorCell } from '@/components/CreatorCell';
import { IndustryGuardrailBadge } from '@/components/IndustryGuardrailBadge';
import { useIndustryMemoryById } from '@/hooks/useIndustryMemory';
import { ScriptAnalyzer } from '@/components/script/ScriptAnalyzer';
import { TeleprompterMode } from '@/components/script/TeleprompterMode';
import { StoryboardGenerator } from '@/components/script/StoryboardGenerator';
import { ScriptExportMenu } from '@/components/script/ScriptExportMenu';
import { ScriptCollaborationPanel } from '@/components/script/ScriptCollaborationPanel';
import { cn } from '@/lib/utils';

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
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  
  // Fetch creator profile
  const { profiles, isLoading: isLoadingProfile } = useCreatorProfiles([script?.user_id]);
  const creatorProfile = script?.user_id ? profiles[script.user_id] : undefined;

  // Fetch Industry Memory
  const { data: industryMemory, isLoading: isLoadingIndustry } = useIndustryMemoryById(script?.industry_template_id);

  useEffect(() => {
    if (script) {
      setEditedContent(script.content);
      setIsEditing(false);
    }
  }, [script]);

  if (!script) return null;

  const scriptPurpose = script.script_purpose as ScriptPurpose;
  const parsedPrompts = parseScriptContent(script.content, scriptPurpose);
  const promptCount = getPromptCount(script.content, scriptPurpose);
  const blockLabel = getBlockLabel(scriptPurpose);

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

  // Export functions moved to ScriptExportMenu component

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn(
          "w-[95vw] max-h-[95vh] xs:max-h-[90vh] gradient-card border-border overflow-hidden flex flex-col",
          showAnalytics ? "max-w-7xl" : "max-w-4xl"
        )}>
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

          {/* Central AI Analyzer Button */}
          {!showAnalytics && (
            <div className="hidden sm:flex justify-center my-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setShowAnalytics(true)}
                      className="gap-2 px-4 py-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Phân tích AI</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Phân tích kịch bản bằng AI để đánh giá chất lượng, cấu trúc và đưa ra gợi ý cải thiện</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Close AI button when panel is open */}
          {showAnalytics && (
            <div className="hidden sm:flex justify-center my-2">
              <Button
                variant="outline"
                onClick={() => setShowAnalytics(false)}
                className="gap-2 px-4 py-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all"
              >
                <PanelRightClose className="w-4 h-4" />
                <span>Đóng phân tích AI</span>
              </Button>
            </div>
          )}
          
          <div className={cn(
            "flex gap-4 flex-1 min-h-0",
            showAnalytics ? "flex-row" : "flex-col"
          )}>
            {/* Main Content */}
            <div className={cn(
              "flex flex-col min-h-0",
              showAnalytics ? "flex-1 w-0" : "w-full"
            )}>
              {/* Metadata badges */}
              <div className="flex flex-wrap items-center gap-1.5 xs:gap-2 text-xs xs:text-sm">
                {/* Script Purpose Badge */}
                {script.script_purpose && SCRIPT_PURPOSE_CONFIG[script.script_purpose as ScriptPurpose] && (
                  <span className="inline-flex items-center gap-0.5 xs:gap-1 px-2 xs:px-3 py-1 xs:py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border border-primary/30">
                    <Target className="w-3 h-3 xs:w-4 xs:h-4" />
                    <span className="hidden xs:inline">
                      {SCRIPT_PURPOSE_CONFIG[script.script_purpose as ScriptPurpose].label}
                    </span>
                    <span className="xs:hidden">
                      {SCRIPT_PURPOSE_CONFIG[script.script_purpose as ScriptPurpose].label.split(' ')[0]}
                    </span>
                  </span>
                )}
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

              {/* Industry Guardrail Badge */}
              <IndustryGuardrailBadge 
                industryMemory={industryMemory} 
                isLoading={isLoadingIndustry}
                className="mt-2"
              />

              {/* Action buttons */}
              <div className="flex gap-1.5 xs:gap-2 flex-wrap mt-2 xs:mt-3">
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
                      onClick={() => setShowTeleprompter(true)}
                      className="border-border hover:border-primary hover:bg-primary/10 h-7 xs:h-8 text-xs xs:text-sm"
                    >
                      <Monitor className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1" />
                      <span className="hidden xs:inline">Teleprompter</span>
                      <span className="xs:hidden">Đọc</span>
                    </Button>
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
                    <ScriptExportMenu script={script} />
                    {/* Performance Tracking - only when published */}
                    {script.status === 'published' && (
                      <TopicPerformanceUpdater
                        contentId={script.id}
                        onUpdate={() => {}}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-border hover:border-emerald-500 hover:bg-emerald-500/10 h-7 xs:h-8 text-xs xs:text-sm gap-1"
                          >
                            <TrendingUp className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                            <span className="hidden xs:inline">Hiệu suất</span>
                          </Button>
                        }
                      />
                    )}
                    {/* Mobile: AI Analyze button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAnalytics(!showAnalytics)}
                      className={cn(
                        "sm:hidden border-border h-7 text-xs",
                        showAnalytics && "bg-primary/10 text-primary border-primary"
                      )}
                    >
                      <PanelRightOpen className="w-3.5 h-3.5 mr-1" />
                      AI
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
                        {blockLabel} ({parsedPrompts.length})
                      </TabsTrigger>
                      <TabsTrigger value="full" className="data-[state=active]:bg-primary/10 text-xs xs:text-sm px-2 xs:px-3 py-1.5">
                        Toàn bộ
                      </TabsTrigger>
                      <TabsTrigger value="storyboard" className="data-[state=active]:bg-primary/10 text-xs xs:text-sm px-2 xs:px-3 py-1.5">
                        <Clapperboard className="w-3 h-3 mr-1" />
                        Storyboard
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="prompts" className="flex-1 min-h-0 mt-0">
                      <ScrollArea className={cn(
                        "rounded-lg bg-muted/30 p-3 xs:p-4 border border-border",
                        showAnalytics ? "h-[35vh] xs:h-[45vh]" : "h-[40vh] xs:h-[50vh]"
                      )}>
                        {parsedPrompts.length > 0 ? (
                          <div className="space-y-2 xs:space-y-3 pr-2 xs:pr-4">
                            {parsedPrompts.map((prompt) => (
                              <PurposeAwarePromptCard 
                                key={prompt.promptNumber} 
                                prompt={prompt} 
                                purpose={scriptPurpose}
                                totalPrompts={parsedPrompts.length}
                                videoType={script.video_type}
                                characterType={script.character_type}
                                fullScriptContext={script.content}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-xs xs:text-sm text-center py-8">
                            Không tìm thấy định dạng {blockLabel}
                          </p>
                        )}
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="full" className="flex-1 min-h-0 mt-0">
                      <ScrollArea className={cn(
                        "rounded-lg bg-muted/30 p-3 xs:p-4 border border-border",
                        showAnalytics ? "h-[35vh] xs:h-[45vh]" : "h-[40vh] xs:h-[50vh]"
                      )}>
                        <pre className="whitespace-pre-wrap font-sans text-xs xs:text-sm text-foreground leading-relaxed">
                          {script.content}
                        </pre>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="storyboard" className="flex-1 min-h-0 mt-0">
                      <StoryboardGenerator script={script} />
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </div>

            {/* Analytics Sidebar */}
            {showAnalytics && (
              <div className="w-full sm:w-[380px] md:w-[420px] flex-shrink-0 border-l border-border/40 pl-5 min-h-0 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold tracking-wide">AI Script Analyzer</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => setShowAnalytics(false)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <ScriptAnalyzer script={script} initialAnalysis={script.analysis_cache as any} onScriptUpdate={onScriptUpdate} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Teleprompter Mode */}
      <TeleprompterMode 
        script={script} 
        open={showTeleprompter} 
        onClose={() => setShowTeleprompter(false)} 
      />
    </>
  );
}
