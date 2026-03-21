import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, RefreshCw, Sparkles, CheckCircle, AlertCircle, Globe, Facebook, Instagram, MapPin, Linkedin, Mail, Youtube, Send, Music2, AtSign } from "lucide-react";
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Channel, ContentGoal, CONTENT_GOALS, CHANNELS } from "@/types/multichannel";

interface ContentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: {
    topic: string;
    industry?: string;
    contentGoal: ContentGoal;
    channels: Channel[];
    brandTemplateId?: string;
  };
  onConfirm: () => void;
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  google_maps: <MapPin className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  zalo_oa: <MessageCircle className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  tiktok: <Music2 className="w-4 h-4" />,
  threads: <AtSign className="w-4 h-4" />,
};

export function ContentPreviewDialog({
  open,
  onOpenChange,
  formData,
  onConfirm,
}: ContentPreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewChannel, setPreviewChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = async (channel: Channel) => {
    setIsLoading(true);
    setError(null);
    setPreviewChannel(channel);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-multichannel", {
        body: {
          action: 'preview',
          topic: formData.topic,
          industry: formData.industry,
          contentGoal: formData.contentGoal,
          previewChannel: channel,
          brandTemplateId: formData.brandTemplateId,
          channels: [channel], // Required by FormData interface
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setPreview(data.preview);
    } catch (err) {
      console.error("Preview error:", err);
      const message = err instanceof Error ? err.message : "Failed to generate preview";
      setError(message);
      toast.error("Không thể tạo preview", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPreview(null);
      setPreviewChannel(null);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const selectedGoal = CONTENT_GOALS.find((g) => g.value === formData.contentGoal);
  const GoalIcon = selectedGoal?.icon || Sparkles;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Preview nội dung
          </DialogTitle>
          <DialogDescription>
            Xem trước nội dung AI sẽ tạo cho từng kênh trước khi tạo đầy đủ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form Summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Chủ đề:</span>
              <span className="text-sm font-medium">{formData.topic}</span>
            </div>
            {formData.industry && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Ngành:</span>
                <span className="text-sm">{formData.industry}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mục tiêu:</span>
              <Badge variant="secondary" className="text-xs gap-1">
                <GoalIcon className="w-3 h-3" />
                {selectedGoal?.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Kênh:</span>
              {formData.channels.map((ch) => {
                const channelInfo = CHANNELS.find((c) => c.value === ch);
                return (
                  <Badge key={ch} variant="outline" className="text-xs gap-1">
                    {channelIcons[ch]}
                    {channelInfo?.label || ch}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Channel Selection for Preview */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Chọn kênh để xem preview:</p>
            <div className="flex flex-wrap gap-2">
              {formData.channels.map((ch) => {
                const channelInfo = CHANNELS.find((c) => c.value === ch);
                const isActive = previewChannel === ch;
                return (
                  <Button
                    key={ch}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => generatePreview(ch)}
                    disabled={isLoading}
                    className="gap-1.5"
                  >
                    {channelIcons[ch]}
                    {channelInfo?.label || ch}
                    {isActive && isLoading && (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Preview Content */}
          {(isLoading || preview || error) && (
            <div className="border rounded-lg p-4 min-h-[200px]">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-[150px] text-destructive gap-2">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-sm text-center">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => previewChannel && generatePreview(previewChannel)}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Thử lại
                  </Button>
                </div>
              ) : preview ? (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      {previewChannel && channelIcons[previewChannel]}
                      <span className="text-sm font-medium">
                        {CHANNELS.find((c) => c.value === previewChannel)?.label}
                      </span>
                      <Badge variant="secondary" className="text-xs">Preview</Badge>
                    </div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {preview}
                    </div>
                  </div>
                </ScrollArea>
              ) : null}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !preview && !error && (
            <div className="border rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Eye className="w-10 h-10 opacity-30" />
              <p className="text-sm">Chọn một kênh để xem preview nội dung</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={onConfirm} className="gap-1.5">
            <CheckCircle className="w-4 h-4" />
            Tạo nội dung đầy đủ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
