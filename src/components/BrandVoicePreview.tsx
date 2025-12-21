import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Sparkles } from 'lucide-react';

interface BrandVoicePreviewProps {
  brandName: string;
  positioning?: string;
  toneOfVoice?: string[];
  formalityLevel?: string;
  languageStyle?: string[];
  allowEmoji?: boolean;
  preferredWords?: string[];
  forbiddenWords?: string[];
}

const formalityLabels: Record<string, string> = {
  formal: 'Trang trọng',
  semi_formal: 'Bán trang trọng',
  casual: 'Thân mật',
  friendly: 'Gần gũi',
};

const toneLabels: Record<string, string> = {
  professional: 'Chuyên nghiệp',
  friendly: 'Thân thiện',
  authoritative: 'Uy tín',
  playful: 'Vui vẻ',
  empathetic: 'Đồng cảm',
  inspirational: 'Truyền cảm hứng',
  educational: 'Giáo dục',
  conversational: 'Trò chuyện',
};

export function BrandVoicePreview({
  brandName,
  positioning,
  toneOfVoice = [],
  formalityLevel = 'semi_formal',
  languageStyle = [],
  allowEmoji = true,
  preferredWords = [],
  forbiddenWords = [],
}: BrandVoicePreviewProps) {
  // Generate a sample preview based on the voice settings
  const generatePreview = () => {
    const name = brandName || 'Thương hiệu';
    const emoji = allowEmoji ? '✨' : '';
    
    let greeting = '';
    let style = '';
    let closing = '';
    
    // Determine greeting based on formality
    switch (formalityLevel) {
      case 'formal':
        greeting = `Kính chào Quý khách,`;
        closing = `Trân trọng,\n${name}`;
        break;
      case 'semi_formal':
        greeting = `Xin chào bạn,`;
        closing = `Thân ái,\n${name}`;
        break;
      case 'casual':
        greeting = `Hey bạn ơi! ${emoji}`;
        closing = `Cheers,\n${name} ${emoji}`;
        break;
      case 'friendly':
        greeting = `Chào bạn! ${emoji}`;
        closing = `Hẹn gặp lại bạn nhé!\n${name} ${emoji}`;
        break;
      default:
        greeting = `Xin chào,`;
        closing = `${name}`;
    }
    
    // Determine content style based on tone
    if (toneOfVoice.includes('professional')) {
      style = 'Chúng tôi cam kết mang đến giải pháp tối ưu nhất cho doanh nghiệp của bạn.';
    } else if (toneOfVoice.includes('friendly')) {
      style = 'Mình rất vui được đồng hành cùng bạn trong hành trình này!';
    } else if (toneOfVoice.includes('inspirational')) {
      style = 'Hãy cùng biến ước mơ thành hiện thực - mọi thứ đều có thể!';
    } else if (toneOfVoice.includes('educational')) {
      style = 'Hãy khám phá những kiến thức hữu ích giúp bạn phát triển mỗi ngày.';
    } else if (toneOfVoice.includes('playful')) {
      style = `Cùng vui chơi và khám phá những điều thú vị nào! ${allowEmoji ? '🎉' : ''}`;
    } else {
      style = 'Chúng tôi luôn sẵn sàng hỗ trợ bạn.';
    }
    
    return { greeting, style, closing };
  };
  
  const preview = generatePreview();
  const hasTone = toneOfVoice.length > 0;
  const hasLanguageStyle = languageStyle.length > 0;
  
  return (
    <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Xem trước Brand Voice
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Preview
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sample content preview */}
        <div className="bg-background rounded-lg p-4 text-sm space-y-2 border">
          <p className="text-foreground font-medium">{preview.greeting}</p>
          <p className="text-muted-foreground">{preview.style}</p>
          <p className="text-foreground text-xs mt-3 whitespace-pre-line">{preview.closing}</p>
        </div>
        
        {/* Voice characteristics summary */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Đặc điểm giọng nói:</p>
          <div className="flex flex-wrap gap-1.5">
            {formalityLevel && (
              <Badge variant="outline" className="text-xs">
                📋 {formalityLabels[formalityLevel] || formalityLevel}
              </Badge>
            )}
            {hasTone && toneOfVoice.slice(0, 3).map((tone) => (
              <Badge key={tone} variant="outline" className="text-xs">
                🎤 {toneLabels[tone] || tone}
              </Badge>
            ))}
            {toneOfVoice.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{toneOfVoice.length - 3}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {allowEmoji ? '😊 Có emoji' : '🚫 Không emoji'}
            </Badge>
          </div>
        </div>
        
        {/* Preferred/Forbidden words preview */}
        {(preferredWords.length > 0 || forbiddenWords.length > 0) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {preferredWords.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1">✅ Từ nên dùng:</p>
                <p className="text-green-600 dark:text-green-400 truncate">
                  {preferredWords.slice(0, 3).join(', ')}
                  {preferredWords.length > 3 && '...'}
                </p>
              </div>
            )}
            {forbiddenWords.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1">❌ Từ không dùng:</p>
                <p className="text-red-600 dark:text-red-400 truncate">
                  {forbiddenWords.slice(0, 3).join(', ')}
                  {forbiddenWords.length > 3 && '...'}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Positioning preview */}
        {positioning && (
          <div className="text-xs">
            <p className="text-muted-foreground mb-1">🎯 Định vị:</p>
            <p className="text-foreground italic line-clamp-2">"{positioning}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
