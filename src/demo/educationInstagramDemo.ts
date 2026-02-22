/**
 * Education + Instagram Feed Demo
 *
 * End-to-end vertical slice demo.
 * Call `runEducationInstagramDemo()` from the browser console.
 */

import { suggestImageStylesV3, type SuggestionInputV3 } from '@/lib/imageSuggestionEngine';
import { generateImagePrompt, type PromptContext } from '@/lib/imagePromptGenerator';
import { recordFeedback, adjustWeights, getFeedbackStats, resetFeedback } from '@/lib/feedbackEngine';
import { resetAdjustedScores, type ImageStyle } from '@/config/visualScoringConfig';

export function runEducationInstagramDemo(): void {
  console.log('='.repeat(60));
  console.log('🎯 Visual Engine V3 – Education + Instagram Feed Demo');
  console.log('='.repeat(60));

  // Reset state
  resetFeedback();
  resetAdjustedScores();

  // Step 1: Input context
  const input: SuggestionInputV3 = {
    contentGoal: 'education',
    contentAngle: 'educational',
    contentRole: 'sprout',
    channel: 'instagram_feed',
    industry: 'service',
    hookMessage: '5 cách giảm stress cho dân văn phòng',
  };

  console.log('\n📋 Step 1 – Input Context:');
  console.table(input);

  // Step 2: Get suggestions
  const suggestions = suggestImageStylesV3(input);
  console.log('\n🏆 Step 2 – Top 5 Suggestions:');
  suggestions.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.score}] ${s.style} — ${s.reason}`);
    console.log(`     Type: ${s.suggestedType} | Typography: ${s.typography} | Match: ${s.matchPercentage}%`);
  });

  // Step 3: Generate prompt for top suggestion
  const topSuggestion = suggestions[0];
  const promptContext: PromptContext = {
    topic: '5 cách giảm stress cho dân văn phòng',
    brandTone: 'friendly, professional, approachable',
    channel: 'instagram',
    contentRole: 'sprout',
    hookMessage: '5 cách giảm stress cho dân văn phòng',
    industry: 'service',
  };

  const prompt = generateImagePrompt(topSuggestion, promptContext);
  console.log('\n🎨 Step 3 – Generated Prompt (for top suggestion):');
  console.log(prompt);

  // Step 4: Simulate 10 feedback entries
  console.log('\n📝 Step 4 – Simulating 10 feedback entries...');
  const feedbackData: Array<{ style: ImageStyle; rating: number }> = [
    { style: 'photorealistic', rating: 5 },
    { style: 'photorealistic', rating: 4 },
    { style: 'photorealistic', rating: 5 },
    { style: 'flat_design', rating: 4 },
    { style: 'flat_design', rating: 3 },
    { style: 'minimalist', rating: 3 },
    { style: 'minimalist', rating: 4 },
    { style: 'illustration', rating: 2 },
    { style: 'cinematic', rating: 3 },
    { style: 'abstract', rating: 1 },
  ];

  feedbackData.forEach((fb, i) => {
    recordFeedback(`demo_${i}`, fb.style, fb.rating, 'demo feedback');
  });

  const stats = getFeedbackStats();
  console.log('  Feedback stats:', stats);

  // Step 5: Adjust weights
  console.log('\n⚙️ Step 5 – Adjusting weights based on feedback...');
  const adjustResult = adjustWeights();
  console.log('  Adjustment applied:', adjustResult.adjustmentApplied);
  console.log('  Adjusted scores (changed styles):');
  for (const style of ['photorealistic', 'flat_design', 'minimalist', 'illustration', 'abstract'] as ImageStyle[]) {
    console.log(`    ${style}: ${adjustResult.adjustedScores[style]}`);
  }

  // Step 6: Re-run suggestions
  const newSuggestions = suggestImageStylesV3(input);
  console.log('\n🔄 Step 6 – Re-ranked suggestions after feedback:');
  newSuggestions.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.score}] ${s.style} — Match: ${s.matchPercentage}%`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ Demo complete!');
  console.log('='.repeat(60));
}

// Export to window for console access
if (typeof window !== 'undefined') {
  (window as any).runEducationInstagramDemo = runEducationInstagramDemo;
}
