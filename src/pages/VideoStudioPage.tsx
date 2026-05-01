import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Film, Wand2, Music4, GalleryHorizontalEnd, DollarSign, Clapperboard } from 'lucide-react';
import { QuickClipTab } from '@/components/video/QuickClipTab';
import { StoryboardVideoTab } from '@/components/video/StoryboardVideoTab';
import { AudioStudioTab } from '@/components/video/AudioStudioTab';
import { VideoGalleryTab } from '@/components/video/VideoGalleryTab';
import { VideoCostTracker } from '@/components/video/VideoCostTracker';
import { ScriptLinkBanner } from '@/components/video/ScriptLinkBanner';
import { ScriptsTab } from '@/components/video/ScriptsTab';
import { ScriptToVideoProvider, useScriptToVideo, ActiveScript } from '@/contexts/ScriptToVideoContext';

const TABS = [
  { value: 'scripts', label: 'Kịch bản', icon: Clapperboard, hint: 'Viết kịch bản AI cho video' },
  { value: 'quick', label: 'Quick Clip', icon: Wand2, hint: 'Một prompt → một video 5–10s' },
  { value: 'storyboard', label: 'Từ Storyboard', icon: Film, hint: 'Script → nhiều scene → video dài' },
  { value: 'audio', label: 'Audio Studio', icon: Music4, hint: 'Voiceover · Music · Subtitle' },
  { value: 'gallery', label: 'Thư viện', icon: GalleryHorizontalEnd, hint: 'Tất cả video đã tạo' },
  { value: 'costs', label: 'Chi phí', icon: DollarSign, hint: 'Theo dõi credit & spend' },
] as const;

type TabValue = typeof TABS[number]['value'];

interface FromScriptState {
  fromScript?: {
    script: ActiveScript;
    activeSceneIndex?: number;
  };
  tab?: string;
  prefillTopic?: string;
  topicHistoryId?: string;
  action?: string;
}

function VideoStudioInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabValue>('scripts');
  const { setActiveScript } = useScriptToVideo();

  // Script creation state from navigation
  const [prefillTopic, setPrefillTopic] = useState<string | undefined>();
  const [topicHistoryId, setTopicHistoryId] = useState<string | undefined>();
  const [autoOpenNew, setAutoOpenNew] = useState(false);

  // Hydrate from navigation state once
  useEffect(() => {
    const state = location.state as FromScriptState | null;
    if (state?.fromScript?.script) {
      setActiveScript(state.fromScript.script, state.fromScript.activeSceneIndex ?? 0);
      setTab('quick');
      navigate(location.pathname, { replace: true });
    } else if (state?.tab) {
      setTab(state.tab as TabValue);
      if (state.prefillTopic) {
        setPrefillTopic(state.prefillTopic);
        setTopicHistoryId(state.topicHistoryId);
      }
      if (state.action === 'new') {
        setAutoOpenNew(true);
      }
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also check URL search params for tab and view
  const [initialViewScriptId, setInitialViewScriptId] = useState<string | undefined>();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && TABS.some(t => t.value === tabParam)) {
      setTab(tabParam as TabValue);
    }
    const viewParam = params.get('view');
    if (viewParam && tabParam === 'scripts') {
      setInitialViewScriptId(viewParam);
    }
  }, [location.search]);

  return (
    <>
      <Helmet>
        <title>Video Studio · Flowa</title>
        <meta name="description" content="Tạo video AI ngắn cho TikTok, Reels, YouTube Shorts với brand voice và compliance tự động." />
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Compact header */}
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Video Studio</h1>
        </div>

        {/* Script link banner — chỉ hiện khi có activeScript */}
        <ScriptLinkBanner onJumpToTab={(t) => setTab(t)} />

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto p-1 bg-muted/50">
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

          <TabsContent value="scripts" className="mt-0">
            <ScriptsTab
              prefillTopic={prefillTopic}
              topicHistoryId={topicHistoryId}
              autoOpenNew={autoOpenNew}
              initialViewScriptId={initialViewScriptId}
              onSwitchTab={(t) => setTab(t as TabValue)}
            />
          </TabsContent>

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
                <StoryboardVideoTab onJumpToTab={(t) => setTab(t)} />
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

export default function VideoStudioPage() {
  return (
    <ScriptToVideoProvider>
      <VideoStudioInner />
    </ScriptToVideoProvider>
  );
}
