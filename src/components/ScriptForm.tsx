import { ScriptFormStepper } from '@/components/script/ScriptFormStepper';
import { ScriptFormData } from '@/types/script';

interface ScriptFormProps {
  onSubmit: (data: ScriptFormData) => Promise<void>;
  isLoading: boolean;
  initialTopic?: string;
}

export function ScriptForm({ onSubmit, isLoading, initialTopic }: ScriptFormProps) {
  return (
    <ScriptFormStepper onSubmit={onSubmit} isLoading={isLoading} initialTopic={initialTopic} />
  );
}
