export interface ProgressStepConfig {
  id: string;
  label: string;
  baseDuration: number;
  channelScaling?: number; // Additional ms per extra channel
}

// Step IDs that match backend SSE events
export type ProgressStepId = 
  | 'init' 
  | 'personas' 
  | 'industry' 
  | 'prompt' 
  | 'ai' 
  | 'retry' 
  | 'fallback'
  | 'critique' 
  | 'finalize' 
  | 'complete';

// Durations aligned with backend reality (~40-60s total, including retries)
export const GENERATION_STEPS: ProgressStepConfig[] = [
  { id: 'init', label: 'Khởi tạo...', baseDuration: 500 },
  { id: 'personas', label: 'Phân tích personas & sản phẩm', baseDuration: 1200 },
  { id: 'industry', label: 'Tải dữ liệu ngành', baseDuration: 1000 },
  { id: 'prompt', label: 'Xây dựng prompt AI', baseDuration: 800 },
  { id: 'ai', label: 'AI đang tạo nội dung', baseDuration: 25000, channelScaling: 5000 },
  { id: 'retry', label: 'Retry nếu cần...', baseDuration: 8000 },
  { id: 'critique', label: 'Đánh giá chất lượng', baseDuration: 6000 },
  { id: 'finalize', label: 'Lưu và hoàn thiện', baseDuration: 3000 },
  { id: 'complete', label: 'Hoàn thành!', baseDuration: 500 },
];

// Map step ID to progress percentage
export const STEP_PROGRESS_MAP: Record<ProgressStepId, number> = {
  init: 0,
  personas: 15,
  industry: 25,
  prompt: 35,
  ai: 50,
  retry: 65,
  fallback: 55,
  critique: 75,
  finalize: 90,
  complete: 100,
};

export function calculateStepDurations(channelCount: number) {
  return GENERATION_STEPS.map(step => ({
    ...step,
    duration: step.baseDuration + (step.channelScaling || 0) * Math.max(0, channelCount - 1)
  }));
}

export function calculateTotalDuration(channelCount: number) {
  return calculateStepDurations(channelCount).reduce((sum, s) => sum + s.duration, 0);
}

// Progress cap to avoid "stuck at 100%" feeling
export const PROGRESS_CAP_PERCENT = 95;
