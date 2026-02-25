// ============================================
// Compliance Node
// Rule-based pre-check — no LLM call needed
// ============================================

import { GraphState } from "../graph-state.ts";
import { preCheckComplianceV2 } from "../../compliance/compliance-precheck-v2.ts";

interface ComplianceNodeContext {
  supabase: any;
  organizationId?: string;
  brandTemplateId?: string;
  industry?: string;
  complianceRules?: string[];
}

export function createComplianceNode(ctx: ComplianceNodeContext) {
  return async function complianceNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[ComplianceNode] Starting');

    const topic = state.bestTopic || state.userMessage;

    try {
      // Try to load resolved rules from brand template's industry
      let resolvedRules: any = null;

      if (ctx.brandTemplateId) {
        const { data } = await ctx.supabase
          .from('brand_templates')
          .select('industry_template_id')
          .eq('id', ctx.brandTemplateId)
          .single();

        if (data?.industry_template_id) {
          const { data: jurisdictions } = await ctx.supabase
            .from('industry_jurisdiction_profiles')
            .select('resolved_rules')
            .eq('industry_template_id', data.industry_template_id)
            .limit(1);

          if (jurisdictions?.length > 0 && jurisdictions[0].resolved_rules) {
            resolvedRules = jurisdictions[0].resolved_rules;
          }
        }
      }

      if (!resolvedRules) {
        console.log('[ComplianceNode] No resolved rules found, skipping');
        return { complianceResult: { passed: true, issues: [], riskLevel: 'low', riskScore: 0 } };
      }

      const result = preCheckComplianceV2(topic, resolvedRules);
      console.log(`[ComplianceNode] Complete. Risk: ${result.riskLevel}, Issues: ${result.issues.length}`);

      return { complianceResult: result };
    } catch (err) {
      console.warn('[ComplianceNode] Error:', err);
      return { complianceResult: { passed: true, issues: [], riskLevel: 'low', riskScore: 0, error: String(err) } };
    }
  };
}
