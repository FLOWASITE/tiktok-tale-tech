import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordCriteria {
  label: string;
  met: boolean;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { strength, criteria, strengthLabel, strengthColor } = useMemo(() => {
    const criteriaList: PasswordCriteria[] = [
      { label: '≥6 ký tự', met: password.length >= 6 },
      { label: 'Chữ hoa', met: /[A-Z]/.test(password) },
      { label: 'Chữ thường', met: /[a-z]/.test(password) },
      { label: 'Số', met: /[0-9]/.test(password) },
      { label: 'Ký tự đặc biệt', met: /[^A-Za-z0-9]/.test(password) },
    ];

    const metCount = criteriaList.filter(c => c.met).length;
    
    let label: string;
    let color: string;
    
    if (metCount <= 1) {
      label = 'Yếu';
      color = 'bg-destructive';
    } else if (metCount <= 2) {
      label = 'Trung bình';
      color = 'bg-orange-500';
    } else if (metCount <= 3) {
      label = 'Khá';
      color = 'bg-yellow-500';
    } else if (metCount <= 4) {
      label = 'Mạnh';
      color = 'bg-emerald-500';
    } else {
      label = 'Rất mạnh';
      color = 'bg-emerald-600';
    }

    return {
      strength: metCount,
      criteria: criteriaList,
      strengthLabel: label,
      strengthColor: color,
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2 pt-1">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5 flex-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                level <= strength ? strengthColor : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <span className={`text-[10px] font-semibold whitespace-nowrap ${
          strength <= 1 ? 'text-destructive' : 
          strength <= 2 ? 'text-orange-500' : 
          strength <= 3 ? 'text-yellow-500' : 
          'text-emerald-500'
        }`}>
          {strengthLabel}
        </span>
      </div>

      {/* Compact criteria */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {criteria.map((item) => (
          <span
            key={item.label}
            className={`inline-flex items-center gap-1 text-[10px] transition-colors duration-200 ${
              item.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/60'
            }`}
          >
            {item.met ? (
              <Check className="h-2.5 w-2.5" />
            ) : (
              <X className="h-2.5 w-2.5" />
            )}
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
