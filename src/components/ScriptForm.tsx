import { ScriptFormStepper } from '@/components/script/ScriptFormStepper';
import { ScriptFormData, Script } from '@/types/script';

interface ScriptFormProps {
  onSubmit: (data: ScriptFormData) => Promise<void>;
  isLoading: boolean;
  initialTopic?: string;
  topicHistoryId?: string;
  generatedScript?: Script | null;
}

export function ScriptForm({ onSubmit, isLoading, initialTopic, topicHistoryId, generatedScript }: ScriptFormProps) {
  return (
    <ScriptFormStepper
      onSubmit={onSubmit}
      isLoading={isLoading}
      initialTopic={initialTopic}
      topicHistoryId={topicHistoryId}
      generatedScript={generatedScript}
    />
  );
}
