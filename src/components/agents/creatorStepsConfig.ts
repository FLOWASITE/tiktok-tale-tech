// Creator Agent sub-steps by content_type
// Used for progress display in PipelineKanban

import { ContentType } from '@/types/agent';

export interface CreatorSubStep {
  id: string;
  label: string;
  icon: string; // lucide icon name
}

export const CREATOR_SUBSTEPS: Record<ContentType, CreatorSubStep[]> = {
  multichannel: [
    { id: 'core_content', label: 'Tạo nội dung gốc', icon: 'FileText' },
    { id: 'channel_expansion', label: 'Chuyển đổi đa kênh', icon: 'Share2' },
    { id: 'image_gen', label: 'Tạo ảnh song song', icon: 'Image' },
    { id: 'self_review', label: 'Tự đánh giá', icon: 'ShieldCheck' },
  ],
  carousel: [
    { id: 'slide_content', label: 'Tạo nội dung slides', icon: 'Layers' },
    { id: 'image_prompts', label: 'Tạo prompt hình ảnh', icon: 'Palette' },
    { id: 'slide_images', label: 'Tạo ảnh từng slide', icon: 'Image' },
    { id: 'self_review', label: 'Tự đánh giá', icon: 'ShieldCheck' },
  ],
  video_script: [
    { id: 'script_gen', label: 'Tạo kịch bản', icon: 'Video' },
    { id: 'scoring', label: 'Chấm điểm', icon: 'BarChart3' },
    { id: 'improvement', label: 'Cải thiện', icon: 'Sparkles' },
    { id: 'self_review', label: 'Tự đánh giá', icon: 'ShieldCheck' },
  ],
};

/** Get activity label for creator stage based on content_type */
export function getCreatorActivityLabel(contentType?: string): string {
  switch (contentType) {
    case 'multichannel':
      return 'Đang tạo nội dung đa kênh...';
    case 'carousel':
      return 'Đang tạo carousel...';
    case 'video_script':
      return 'Đang tạo kịch bản video...';
    default:
      return 'Đang sáng tạo nội dung...';
  }
}
