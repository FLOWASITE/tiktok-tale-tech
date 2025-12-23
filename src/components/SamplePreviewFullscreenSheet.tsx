import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { BrandVoiceSamplePreview } from '@/components/BrandVoiceSamplePreview';
import { Eye, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SamplePreviewFullscreenSheetProps {
  brandName: string;
  positioning?: string;
  toneOfVoice?: string[];
  formalityLevel?: string;
  languageStyle?: string[];
  allowEmoji?: boolean;
  preferredWords?: string[];
  forbiddenWords?: string[];
  savedSampleTexts?: Record<string, string> | null;
  onSampleTextsChange?: (samples: Record<string, string>) => void;
  logoUrl?: string;
  primaryColor?: string;
}

export function SamplePreviewFullscreenSheet({
  brandName,
  positioning,
  toneOfVoice = [],
  formalityLevel = 'semi_formal',
  languageStyle = [],
  allowEmoji = true,
  preferredWords = [],
  forbiddenWords = [],
  savedSampleTexts,
  onSampleTextsChange,
  logoUrl,
  primaryColor,
}: SamplePreviewFullscreenSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 h-12 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <span className="font-medium">Xem trước nội dung mẫu</span>
              <p className="text-xs text-muted-foreground">Preview đa kênh với mockup thực tế</p>
            </div>
          </div>
          <Sparkles className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
        </Button>
      </SheetTrigger>

      <SheetContent 
        side="bottom" 
        className={cn(
          "h-[92vh] p-0 rounded-t-3xl overflow-hidden",
          "bg-gradient-to-b from-background via-background to-muted/20",
          "shadow-2xl border-t-2 border-primary/20"
        )}
      >
        {/* Decorative top gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        {/* Premium header */}
        <SheetHeader className="relative px-6 pt-4 pb-3 border-b bg-background/80 backdrop-blur-xl sticky top-0 z-20">
          {/* Drag indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-muted-foreground/20" />
          
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-lg font-semibold">
                  Xem trước nội dung mẫu
                </SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {brandName || 'Your Brand'} • Preview theo phong cách Brand Voice
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:flex gap-1 border-primary/30 text-primary">
                <Sparkles className="w-3 h-3" />
                Full Preview
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="rounded-full hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Content area with scroll */}
        <div className="overflow-y-auto h-[calc(92vh-80px)] pb-8">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <BrandVoiceSamplePreview
              brandName={brandName}
              positioning={positioning}
              toneOfVoice={toneOfVoice}
              formalityLevel={formalityLevel}
              languageStyle={languageStyle}
              allowEmoji={allowEmoji}
              preferredWords={preferredWords}
              forbiddenWords={forbiddenWords}
              savedSampleTexts={savedSampleTexts}
              onSampleTextsChange={onSampleTextsChange}
              logoUrl={logoUrl}
              primaryColor={primaryColor}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
