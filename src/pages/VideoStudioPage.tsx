import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Film, Music4, GalleryHorizontalEnd, DollarSign, Clapperboard, Users, ArrowRight } from 'lucide-react';
import { StoryboardVideoTab } from '@/components/video/StoryboardVideoTab';
import { AudioStudioTab } from '@/components/video/AudioStudioTab';
import { VideoGalleryTab } from '@/components/video/VideoGalleryTab';
import { VideoCostTracker } from '@/components/video/VideoCostTracker';
import { ScriptLinkBanner } from '@/components/video/ScriptLinkBanner';
import { ScriptsTab } from '@/components/video/ScriptsTab';
import { ScriptToVideoProvider, useScriptToVideo, ActiveScript } from '@/contexts/ScriptToVideoContext';

const TABS = [
  { value: 'scripts', label: 'Kịch bản & Quay', icon: Clapperboard, hint: 'Tạo kịch bản → quay từng scene' },
  { value: 'storyboard', label: 'Từ Storyboard', icon: Film, hint: 'Storyboard rời → video dài' },
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
  const [initialViewScriptId, setInitialViewScriptId] = useState<string | undefined>();

  // Hydrate from navigation state once
  useEffect(() => {
    const state = location.state as FromScriptState | null;
    if (state?.fromScript?.script) {
      setActiveScript(state.fromScript.script, state.fromScript.activeSceneIndex ?? 0);
      // Auto-open script workspace via deep-link to its view
      setTab('scripts');
      setInitialViewScriptId(state.fromScript.script.id);
      navigate(location.pathname, { replace: true });
    } else if (state?.tab) {
      // Legacy ?tab=quick → redirect sang scripts (Quick Clip giờ là panel trong workspace)
      const requestedTab = state.tab === 'quick' ? 'scripts' : state.tab;
      setTab(requestedTab as TabValue);
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
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      // Legacy: ?tab=quick → redirect to scripts (Quick Clip nhúng trong workspace)
      const mapped = tabParam === 'quick' ? 'scripts' : tabParam;
      if (TABS.some(t => t.value === mapped)) {
        setTab(mapped as TabValue);
      }
    }
    const viewParam = params.get('view');
    if (viewParam && (tabParam === 'scripts' || tabParam === 'quick')) {
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

        {/* Script link banner — chỉ hiện khi có activeScript ngoài tab scripts */}
        {tab !== 'scripts' && (
          <ScriptLinkBanner onJumpToTab={(t) => setTab((t === 'quick' ? 'scripts' : t) as TabValue)} />
        )}
        {/* Character profiles — full management on dedicated page */}
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Nhân vật</span>
              <span className="text-xs text-muted-foreground">— giữ nhất quán ngoại hình giữa các scene</span>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/characters">
                Mở trang quản lý <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto p-1 bg-muted/50">
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

          {/* Quick Clip giờ là panel trong ScriptWorkspace (tab "scripts") — không còn tab độc lập */}

          <TabsContent value="storyboard" className="mt-0">
            <Card className="border-border/60">
              <CardContent className="p-4 md:p-6">
                <StoryboardVideoTab onJumpToTab={(t) => setTab((t === 'quick' ? 'scripts' : t) as TabValue)} />
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
