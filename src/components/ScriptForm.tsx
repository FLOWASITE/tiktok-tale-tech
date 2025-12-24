import { ScriptFormStepper } from '@/components/script/ScriptFormStepper';
import { ScriptFormData } from '@/types/script';

interface ScriptFormProps {
  onSubmit: (data: ScriptFormData) => Promise<void>;
  isLoading: boolean;
}

export function ScriptForm({ onSubmit, isLoading }: ScriptFormProps) {
  return (
    <ScriptFormStepper onSubmit={onSubmit} isLoading={isLoading} />
  );
}
