import {
  normalizeBrandVoiceSuggestion,
  normalizeFormalityLevel,
  normalizeToneOfVoice,
  type FormalityLevelValue,
  type ToneOfVoiceValue,
} from './brandVoiceNormalization';

export interface CurrentVoiceState {
  brandPositioning: string;
  toneOfVoice: string[];
  formalityLevel: string;
}

export interface PackVoiceInput {
  brandPositioning?: string | null;
  brandVoice?: {
    tone_of_voice?: unknown;
    formality_level?: unknown;
  } | null;
}

export interface ImportedSuggestionInput {
  brand_positioning?: unknown;
  tone_of_voice?: unknown;
  formality_level?: unknown;
}

export interface MergedVoiceResult {
  brandPositioning: string;
  toneOfVoice: ToneOfVoiceValue[] | string[];
  formalityLevel: FormalityLevelValue | string;
  source: {
    brandPositioning: 'imported' | 'pack' | 'state';
    toneOfVoice: 'imported' | 'pack' | 'state';
    formalityLevel: 'imported' | 'pack' | 'state';
  };
}

/**
 * Pure merge resolver: priority = imported (AI) > existing state > pack defaults.
 * Used by BrandCreate.handleIndustryTemplateSelect to ensure that picking an
 * industry pack NEVER overwrites values the user imported from website/fanpage.
 */
export function mergeBrandVoiceWithPack(
  current: CurrentVoiceState,
  imported: ImportedSuggestionInput | null | undefined,
  pack: PackVoiceInput | null | undefined,
): MergedVoiceResult {
  const importedVoice = imported ? normalizeBrandVoiceSuggestion(imported) : null;

  const hasImportedPositioning = !!(
    importedVoice?.brand_positioning && String(importedVoice.brand_positioning).trim()
  );
  const hasImportedTones =
    Array.isArray(importedVoice?.tone_of_voice) && (importedVoice!.tone_of_voice as unknown[]).length > 0;
  const hasImportedFormality = !!importedVoice?.formality_level;

  // Positioning
  let brandPositioning = current.brandPositioning;
  let positioningSource: 'imported' | 'pack' | 'state' = 'state';
  if (hasImportedPositioning) {
    brandPositioning = String(importedVoice!.brand_positioning);
    positioningSource = 'imported';
  } else if (!current.brandPositioning && pack?.brandPositioning) {
    brandPositioning = pack.brandPositioning;
    positioningSource = 'pack';
  }

  // Tone
  let toneOfVoice: string[] = current.toneOfVoice;
  let toneSource: 'imported' | 'pack' | 'state' = 'state';
  if (hasImportedTones) {
    toneOfVoice = importedVoice!.tone_of_voice as string[];
    toneSource = 'imported';
  } else if (!current.toneOfVoice || current.toneOfVoice.length === 0) {
    const packTones = normalizeToneOfVoice(pack?.brandVoice?.tone_of_voice);
    if (packTones.length > 0) {
      toneOfVoice = packTones;
      toneSource = 'pack';
    }
  }

  // Formality
  let formalityLevel: string = current.formalityLevel;
  let formalitySource: 'imported' | 'pack' | 'state' = 'state';
  if (hasImportedFormality) {
    formalityLevel = importedVoice!.formality_level as string;
    formalitySource = 'imported';
  } else if (!current.formalityLevel) {
    const packFormality = normalizeFormalityLevel(pack?.brandVoice?.formality_level);
    if (packFormality) {
      formalityLevel = packFormality;
      formalitySource = 'pack';
    }
  }

  return {
    brandPositioning,
    toneOfVoice,
    formalityLevel,
    source: {
      brandPositioning: positioningSource,
      toneOfVoice: toneSource,
      formalityLevel: formalitySource,
    },
  };
}
