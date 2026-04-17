import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScriptForm } from '@/components/ScriptForm';
import { ScriptViewer } from '@/components/ScriptViewer';
import { useScripts } from '@/hooks/useScripts';
import { useTopicContentLinks } from '@/hooks/useTopicContentLinks';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Script } from '@/types/script';

interface LocationState {
  prefillTopic?: string;
  topicHistoryId?: string;
}

export default function ScriptNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillData = location.state as LocationState | null;
  const { generating, generateScript, updateScript } = useScripts();
  const { createLink } = useTopicContentLinks({ enabled: false });

  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const handleGenerateScript = async (formData: Parameters<typeof generateScript>[0]) => {
    const topicHistoryId = prefillData?.topicHistoryId;
    const newScript = await generateScript(formData);
    if (newScript) {
      if (topicHistoryId) {
        try {
          await createLink(topicHistoryId, newScript.id, 'script', newScript.title, newScript.status || 'draft');
        } catch (error) {
          console.error('Failed to create topic-content link:', error);
        }
      }
      setSelectedScript(newScript);
      setViewerOpen(true);
    }
  };

  const handleScriptUpdate = (updatedScript: Script) => {
    updateScript(updatedScript);
    setSelectedScript(updatedScript);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/scripts')}
        className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Button>

      {/* Form */}
      <ScriptForm
        onSubmit={handleGenerateScript}
        isLoading={generating}
        initialTopic={prefillData?.prefillTopic}
        topicHistoryId={prefillData?.topicHistoryId}
      />

      {/* Script viewer dialog */}
      <ScriptViewer
        script={selectedScript}
        open={viewerOpen}
        onOpenChange={(open) => {
          setViewerOpen(open);
          if (!open) navigate('/scripts');
        }}
        onScriptUpdate={handleScriptUpdate}
      />
    </div>
  );
}
