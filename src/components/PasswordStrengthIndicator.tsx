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
      { label: 'Ít nhất 6 ký tự', met: password.length >= 6 },
      { label: 'Chữ hoa (A-Z)', met: /[A-Z]/.test(password) },
      { label: 'Chữ thường (a-z)', met: /[a-z]/.test(password) },
      { label: 'Số (0-9)', met: /[0-9]/.test(password) },
      { label: 'Ký tự đặc biệt (!@#$...)', met: /[^A-Za-z0-9]/.test(password) },
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
    <div className="space-y-3 animate-fade-in">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Độ mạnh mật khẩu</span>
          <span className={`font-medium ${
            strength <= 1 ? 'text-destructive' : 
            strength <= 2 ? 'text-orange-500' : 
            strength <= 3 ? 'text-yellow-500' : 
            'text-emerald-500'
          }`}>
            {strengthLabel}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                level <= strength ? strengthColor : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Criteria list */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {criteria.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
              item.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
            }`}
          >
            {item.met ? (
              <Check className="h-3 w-3 flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 flex-shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
