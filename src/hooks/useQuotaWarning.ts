import { useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const SESSION_KEY = 'quota_warning_shown';

export function useQuotaWarning() {
  const { currentPlanLimits, usage, subscription, isLoading } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !currentPlanLimits || !usage) return;

    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    if (alreadyShown) return;

    const metrics = [
      { key: 'scripts', label: 'Scripts', used: usage.scripts, limit: currentPlanLimits.monthly_scripts },
      { key: 'carousels', label: 'Carousels', used: usage.carousels, limit: currentPlanLimits.monthly_carousels },
      { key: 'multichannel', label: 'Đa kênh', used: usage.multichannel, limit: currentPlanLimits.monthly_multichannel },
      { key: 'images', label: 'Ảnh AI', used: usage.images, limit: currentPlanLimits.monthly_images },
    ];

    const exhausted = metrics.filter(m => m.limit !== -1 && m.used >= m.limit);
    const warning = metrics.filter(m => m.limit !== -1 && m.used >= m.limit * 0.8 && m.used < m.limit);

    if (exhausted.length > 0) {
      const names = exhausted.map(m => m.label).join(', ');
      toast.warning(`Bạn đã hết lượt ${names} tháng này`, {
        description: 'Nâng cấp gói để tiếp tục tạo nội dung.',
        duration: 8000,
        action: {
          label: 'Nâng cấp',
          onClick: () => navigate('/pricing'),
        },
      });
      sessionStorage.setItem(SESSION_KEY, 'true');
    } else if (warning.length > 0) {
      const names = warning.map(m => `${m.label} (${m.used}/${m.limit})`).join(', ');
      toast.info(`Hạn mức sắp hết: ${names}`, {
        description: 'Nâng cấp gói để không bị gián đoạn.',
        duration: 6000,
        action: {
          label: 'Xem gói',
          onClick: () => navigate('/pricing'),
        },
      });
      sessionStorage.setItem(SESSION_KEY, 'true');
    }
  }, [isLoading, currentPlanLimits, usage, subscription, navigate]);
}
