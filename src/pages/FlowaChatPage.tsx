import { TopicAIChatbot } from '@/components/topic/TopicAIChatbot';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';

export default function FlowaChatPage() {
  const { templates } = useBrandTemplates();
  const defaultBrand = templates?.find(t => t.is_default) || templates?.[0];

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full">
      <TopicAIChatbot
        brandTemplateId={defaultBrand?.id}
        onNavigate={() => {}}
        mode="standalone"
        isExpanded
        className="h-full"
      />
    </div>
  );
}
