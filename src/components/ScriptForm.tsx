import { ScriptFormStepper } from '@/components/script/ScriptFormStepper';
import { ScriptFormData } from '@/types/script';

interface ScriptFormProps {
  onSubmit: (data: ScriptFormData) => Promise<void>;
  isLoading: boolean;
  initialTopic?: string;
  topicHistoryId?: string;
}

export function ScriptForm({ onSubmit, isLoading, initialTopic, topicHistoryId }: ScriptFormProps) {
  return (
    <ScriptFormStepper onSubmit={onSubmit} isLoading={isLoading} initialTopic={initialTopic} topicHistoryId={topicHistoryId} />
  );
}
