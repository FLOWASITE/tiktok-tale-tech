import { Sparkles, PencilLine, ArrowRight, Globe, Facebook } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onPickManual: () => void;
  onPickImport: () => void;
}

export function BrandCreateStartChooser({ onPickManual, onPickImport }: Props) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Bắt đầu tạo Brand</h2>
        <p className="text-sm text-muted-foreground">
          Chọn cách tạo Brand Template phù hợp với bạn. Bạn có thể chỉnh sửa lại tất cả thông tin sau.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
        <ChoiceCard
          icon={<PencilLine className="w-5 h-5" />}
          title="Tạo thủ công"
          subtitle="Tự nhập từng bước"
          description="Bắt đầu từ trang trắng — chọn ngành rồi điền tên, tone, persona, kênh… theo từng bước."
          bullets={['Chọn Industry Pack có sẵn', 'Toàn quyền kiểm soát nội dung', 'Khuyên dùng nếu brand đã rõ định vị']}
          ctaLabel="Bắt đầu thủ công"
          onClick={onPickManual}
          accent="muted"
        />

        <ChoiceCard
          icon={<Sparkles className="w-5 h-5" />}
          title="Import & tự động fill"
          subtitle="AI phân tích Website / Fanpage"
          description="Dán URL website hoặc chọn Facebook Page — AI sẽ đọc nội dung công khai để tự điền tên, tagline, tone, content pillars."
          bullets={[
            <span key="g" className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> Website (Firecrawl + AI)</span>,
            <span key="f" className="inline-flex items-center gap-1"><Facebook className="w-3 h-3" /> Facebook Fanpage đã kết nối</span>,
            'Tiết kiệm 80% thời gian setup',
          ]}
          ctaLabel="Import tự động"
          onClick={onPickImport}
          accent="primary"
          recommended
        />
      </div>
    </div>
  );
}

interface ChoiceCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  bullets: React.ReactNode[];
  ctaLabel: string;
  onClick: () => void;
  accent: 'primary' | 'muted';
  recommended?: boolean;
}

function ChoiceCard({
  icon,
  title,
  subtitle,
  description,
  bullets,
  ctaLabel,
  onClick,
  accent,
  recommended,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative text-left rounded-xl border bg-card p-5 transition-all',
        'hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        accent === 'primary' && 'border-primary/30',
      )}
    >
      {recommended && (
        <span className="absolute -top-2 right-4 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-primary text-primary-foreground px-2 py-0.5">
          Khuyên dùng
        </span>
      )}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            accent === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground/70',
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{description}</p>

      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="mt-1 w-1 h-1 rounded-full bg-current opacity-60 shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div
        className={cn(
          'mt-4 inline-flex items-center gap-1 text-sm font-medium',
          accent === 'primary' ? 'text-primary' : 'text-foreground/80',
        )}
      >
        {ctaLabel}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
