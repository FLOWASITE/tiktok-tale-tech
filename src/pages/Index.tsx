import { useState } from 'react';
import { Header } from '@/components/Header';
import { ScriptForm } from '@/components/ScriptForm';
import { ScriptCard } from '@/components/ScriptCard';
import { ScriptViewer } from '@/components/ScriptViewer';
import { useScripts } from '@/hooks/useScripts';
import { Script } from '@/types/script';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileVideo, Sparkles } from 'lucide-react';

const Index = () => {
  const { scripts, loading, generating, generateScript, deleteScript } = useScripts();
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const handleViewScript = (script: Script) => {
    setSelectedScript(script);
    setViewerOpen(true);
  };

  const handleGenerateScript = async (formData: Parameters<typeof generateScript>[0]) => {
    const newScript = await generateScript(formData);
    if (newScript) {
      setSelectedScript(newScript);
      setViewerOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="container py-8 relative">
        <div className="grid lg:grid-cols-[400px_1fr] gap-8">
          {/* Left column - Form */}
          <div className="space-y-6">
            <Card className="gradient-card border-border/50 overflow-hidden">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 rounded-lg gradient-primary">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  Tạo Kịch Bản Mới
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ScriptForm onSubmit={handleGenerateScript} isLoading={generating} />
              </CardContent>
            </Card>
          </div>

          {/* Right column - Script list */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileVideo className="w-5 h-5 text-primary" />
                Kịch Bản Đã Tạo
                <span className="text-sm font-normal text-muted-foreground">
                  ({scripts.length})
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="gradient-card border-border/50">
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/4 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-4">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 flex-1" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : scripts.length === 0 ? (
              <Card className="gradient-card border-border/50 border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <FileVideo className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Chưa có kịch bản nào
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Nhập chủ đề và nhấn "Tạo kịch bản AI" để bắt đầu
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 pr-4">
                  {scripts.map((script) => (
                    <ScriptCard
                      key={script.id}
                      script={script}
                      onView={handleViewScript}
                      onDelete={deleteScript}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </main>

      {/* Script viewer dialog */}
      <ScriptViewer
        script={selectedScript}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
};

export default Index;