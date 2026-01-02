export interface ProgressStepConfig {
  id: string;
  label: string;
  baseDuration: number;
  channelScaling?: number; // Additional ms per extra channel
}

// Durations aligned with backend reality (~15-25s total)
export const GENERATION_STEPS: ProgressStepConfig[] = [
  { id: 'brand', label: 'Tải ngữ cảnh thương hiệu', baseDuration: 1500 },
  { id: 'personas', label: 'Phân tích personas & sản phẩm', baseDuration: 1200 },
  { id: 'industry', label: 'Tải dữ liệu ngành', baseDuration: 1000 },
  { id: 'prompt', label: 'Xây dựng prompt AI', baseDuration: 800 },
  { id: 'ai', label: 'AI đang tạo nội dung', baseDuration: 6000, channelScaling: 1500 },
  { id: 'critique', label: 'Đánh giá chất lượng', baseDuration: 4000 },
  { id: 'finalize', label: 'Tối ưu và hoàn thiện', baseDuration: 5000 },
];

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
