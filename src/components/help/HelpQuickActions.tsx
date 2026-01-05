import { motion } from 'framer-motion';
import { 
  Palette, 
  FileText, 
  MessageSquare, 
  Calendar, 
  Video, 
  Image,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getQuickActions, HELP_FAQS, HelpFeature } from '@/data/help-knowledge-base';

interface HelpQuickActionsProps {
  currentRoute: string;
  onSelect: (question: string) => void;
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'create-brand': <Palette className="h-4 w-4" />,
  'create-content': <FileText className="h-4 w-4" />,
  'ai-chatbot': <MessageSquare className="h-4 w-4" />,
  'view-calendar': <Calendar className="h-4 w-4" />,
  'manage-scripts': <Video className="h-4 w-4" />,
  'carousel-design': <Image className="h-4 w-4" />,
};

export function HelpQuickActions({ currentRoute, onSelect }: HelpQuickActionsProps) {
  const quickFeatures = getQuickActions(currentRoute);
  const popularFaqs = HELP_FAQS.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
    >
      {/* Feature Quick Actions */}
      {quickFeatures.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Hành động nhanh
          </p>
          <div className="grid grid-cols-1 gap-2">
            {quickFeatures.map((feature) => (
              <Button
                key={feature.id}
                variant="outline"
                size="sm"
                className="justify-start h-auto py-2 px-3 text-left"
                onClick={() => onSelect(`Hướng dẫn ${feature.title.toLowerCase()}`)}
              >
                <span className="mr-2 text-primary">
                  {FEATURE_ICONS[feature.id] || <HelpCircle className="h-4 w-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{feature.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {feature.description}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Popular Questions */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Câu hỏi thường gặp
        </p>
        <div className="space-y-1">
          {popularFaqs.map((faq, idx) => (
            <Button
              key={idx}
              variant="ghost"
              size="sm"
              className="w-full justify-start h-auto py-2 px-3 text-left text-sm"
              onClick={() => onSelect(faq.question)}
            >
              <HelpCircle className="h-3 w-3 mr-2 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{faq.question}</span>
            </Button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
