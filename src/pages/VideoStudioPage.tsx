import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Film, Wand2, Music4, GalleryHorizontalEnd, DollarSign } from 'lucide-react';
import { QuickClipTab } from '@/components/video/QuickClipTab';
import { StoryboardVideoTab } from '@/components/video/StoryboardVideoTab';
import { AudioStudioTab } from '@/components/video/AudioStudioTab';
import { VideoGalleryTab } from '@/components/video/VideoGalleryTab';
import { VideoCostTracker } from '@/components/video/VideoCostTracker';

const TABS = [
  { value: 'quick', label: 'Quick Clip', icon: Wand2, hint: 'Một prompt → một video 5–10s' },
  { value: 'storyboard', label: 'Từ Storyboard', icon: Film, hint: 'Script → nhiều scene → video dài' },
  { value: 'audio', label: 'Audio Studio', icon: Music4, hint: 'Voiceover · Music · Subtitle' },
  { value: 'gallery', label: 'Thư viện', icon: GalleryHorizontalEnd, hint: 'Tất cả video đã tạo' },
  { value: 'costs', label: 'Chi phí', icon: DollarSign, hint: 'Theo dõi credit & spend' },
] as const;

export default function VideoStudioPage() {
  const [tab, setTab] = useState<typeof TABS[number]['value']>('quick');

  return (
    <>
      <Helmet>
        <title>Video Studio · Flowa</title>
        <meta name="description" content="Tạo video AI ngắn cho TikTok, Reels, YouTube Shorts với brand voice và compliance tự động." />
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Hero header */}
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground tracking-wide uppercase">
            <Film className="w-3.5 h-3.5" />
            Video Studio
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Biến ý tưởng thành video sẵn-đăng
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Sinh video ngắn 9:16 (TikTok/Reels/Shorts) hoặc landscape 16:9 (YouTube) với GeminiGen Veo & PoYo Seedance.
            Có brand voice, compliance, voiceover và subtitle tự động.
          </p>
        </header>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/50">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="flex flex-col gap-1 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">{t.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground hidden md:block">{t.hint}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="quick" className="mt-0">
            <Card className="border-border/60">
              <CardContent className="p-4 md:p-6">
                <QuickClipTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="storyboard" className="mt-0">
            <Card className="border-border/60">
              <CardContent className="p-4 md:p-6">
                <StoryboardVideoTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audio" className="mt-0">
            <Card className="border-border/60">
              <CardContent className="p-4 md:p-6">
                <AudioStudioTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gallery" className="mt-0">
            <Card className="border-border/60">
              <CardContent className="p-4 md:p-6">
                <VideoGalleryTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="mt-0">
            <Card className="border-border/60">
              <CardContent className="p-4 md:p-6">
                <VideoCostTracker />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
