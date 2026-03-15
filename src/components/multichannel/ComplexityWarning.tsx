import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { type ComplexityAnalysis } from '@/lib/contentComplexityAnalyzer';

interface ComplexityWarningProps {
  analysis: ComplexityAnalysis;
}

export function ComplexityWarning({ analysis }: ComplexityWarningProps) {
  if (analysis.score === 'simple') return null;

  const isComplex = analysis.score === 'complex';

  return (
    <Alert className={
      isComplex
        ? "border-amber-500/40 bg-amber-500/5"
        : "border-blue-500/30 bg-blue-500/5"
    }>
      {isComplex ? (
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      ) : (
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      )}
      <AlertDescription className="text-xs space-y-1">
        <p className={isComplex ? "font-medium text-amber-800 dark:text-amber-300" : "text-blue-800 dark:text-blue-300"}>
          {isComplex
            ? '⚠️ Yêu cầu có bố cục phức tạp (nhiều text blocks, cards, icon, vị trí cụ thể).'
            : 'ℹ️ Yêu cầu có một số yếu tố bố cục — kết quả AI có thể cần chỉnh sửa.'
          }
        </p>
        {isComplex && (
          <p className="text-amber-700/80 dark:text-amber-400/80">
            AI sẽ tạo ảnh minh họa tổng thể. Text tiếng Việt, bố cục chính xác và icon nhất quán có thể không đạt 100%.
          </p>
        )}
        {analysis.warnings.length > 0 && (
          <ul className="list-disc list-inside text-[11px] opacity-80 space-y-0.5 mt-1">
            {analysis.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
