import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SeamlessConsistency {
  colorScore: number;
  brightnessScore: number;
  temperatureScore: number;
  overallScore: number;
  issues: string[];
  suggestion?: string;
}

export interface SeamlessValidationResult {
  consistent: boolean;
  consistency?: SeamlessConsistency;
  slides?: Array<{
    dominantColors: string[];
    brightness: number;
    temperature: string;
  }>;
}

export function useSeamlessValidation() {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<SeamlessValidationResult | null>(null);

  const validate = async (
    carouselId: string,
    slideImageUrls: string[]
  ): Promise<SeamlessValidationResult | null> => {
    if (slideImageUrls.length < 2) return null;

    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-seamless-consistency', {
        body: { carouselId, slideImageUrls },
      });

      if (error) {
        console.error('[SeamlessValidation] Error:', error);
        toast.error('Không thể kiểm tra tính liên tục thị giác');
        return null;
      }

      const validation: SeamlessValidationResult = {
        consistent: data?.consistent ?? true,
        consistency: data?.consistency,
        slides: data?.slides,
      };

      setResult(validation);

      if (validation.consistency) {
        const score = validation.consistency.overallScore;
        if (score >= 80) {
          toast.success(`Tính liên tục thị giác: ${score}/100 — Tuyệt vời!`);
        } else if (score >= 60) {
          toast.info(`Tính liên tục thị giác: ${score}/100 — Khá tốt`);
        } else {
          toast.warning(
            `Tính liên tục thị giác: ${score}/100 — Nên tạo lại một số slide`,
            { description: validation.consistency.suggestion || undefined }
          );
        }
      }

      return validation;
    } catch (err) {
      console.error('[SeamlessValidation] Unexpected error:', err);
      return null;
    } finally {
      setValidating(false);
    }
  };

  const clearResult = () => setResult(null);

  return { validating, result, validate, clearResult };
}
