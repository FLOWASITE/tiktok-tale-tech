import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnrichRequest {
  mode: 'enrich_global' | 'create_jurisdiction' | 'all'
  jurisdictions?: string[] // e.g., ['US', 'SG']
  batchSize?: number
  startFrom?: number
}

const JURISDICTION_CONTEXT: Record<string, { name: string; language: string; context: string }> = {
  VN: {
    name: 'Vietnam',
    language: 'Vietnamese',
    context: 'Vietnamese market with regulations from Ministry of Industry and Trade, State Bank of Vietnam, Ministry of Health, etc.'
  },
  US: {
    name: 'United States',
    language: 'English',
    context: 'US market with regulations from FTC, FDA, SEC, FCC, EPA, and state-level requirements.'
  },
  SG: {
    name: 'Singapore',
    language: 'English',
    context: 'Singapore market with regulations from MAS, PDPC, HSA, IMDA, and other statutory boards.'
  },
  TH: {
    name: 'Thailand',
    language: 'Thai',
    context: 'Thailand market with regulations from Bank of Thailand, FDA Thailand, SEC Thailand.'
  }
}

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured')

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_completion_tokens: 4000
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

function parseJsonFromAI(text: string): any {
  // Extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim()
  
  try {
    return JSON.parse(jsonStr)
  } catch {
    console.error('Failed to parse AI response:', jsonStr.substring(0, 500))
    return null
  }
}

async function enrichGlobalPack(
  supabase: any,
  pack: any,
  nameVi: string,
  categoryCode: string
): Promise<any> {
  const systemPrompt = `You are an expert in industry compliance, marketing regulations, and content governance for Vietnamese market (primary) with global perspective.
Generate comprehensive compliance rules, claim restrictions, and risk guidelines for the given industry.
Output MUST be valid JSON only, no explanation.`

  const prompt = `Generate compliance data for industry: "${nameVi}" (code: ${pack.industry_code}, category: ${categoryCode})

Return JSON with this exact structure:
{
  "global_compliance_rules": [
    {"rule": "Specific compliance rule in Vietnamese", "severity": "critical|high|medium|low", "category": "category_name"}
  ],
  "global_claim_restrictions": [
    {"claim": "Restricted claim phrase", "alternative": "Compliant alternative", "reason": "Why this is restricted"}
  ],
  "global_argument_patterns": {
    "valid_patterns": ["Pattern with [placeholder] for compliant claims"],
    "forbidden_patterns": ["Pattern to avoid"]
  },
  "risk_guidelines": {
    "high_risk_keywords": ["keyword1", "keyword2"],
    "scoring_weights": {
      "forbidden_term": 30,
      "claim_violation": 25,
      "compliance_breach": 20,
      "tone_mismatch": 10,
      "pattern_violation": 15
    },
    "risk_thresholds": {"low": 0, "medium": 30, "high": 60, "blocked": 80}
  },
  "global_brand_voice": {
    "tone_of_voice": ["tone1", "tone2", "tone3"],
    "language_style": ["style1", "style2"],
    "formality_level": "casual|semi_formal|professional|formal",
    "allow_emoji": true/false,
    "cta_policy": "aggressive|soft|educational"
  }
}

Generate 5-10 compliance rules and 8-15 claim restrictions relevant to this industry.
All text should be in Vietnamese.`

  try {
    const aiResponse = await callAI(prompt, systemPrompt)
    const enrichedData = parseJsonFromAI(aiResponse)
    
    if (!enrichedData) {
      return { success: false, error: 'Failed to parse AI response' }
    }

    // Update the global pack
    const { error } = await supabase
      .from('industry_global_packs')
      .update({
        global_compliance_rules: enrichedData.global_compliance_rules || [],
        global_claim_restrictions: enrichedData.global_claim_restrictions || [],
        global_argument_patterns: enrichedData.global_argument_patterns || {},
        risk_guidelines: enrichedData.risk_guidelines || {},
        global_brand_voice: enrichedData.global_brand_voice || pack.global_brand_voice,
        updated_at: new Date().toISOString()
      })
      .eq('id', pack.id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: enrichedData }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

async function createJurisdictionProfile(
  supabase: any,
  pack: any,
  nameVi: string,
  jurisdictionCode: string
): Promise<any> {
  const jurisdiction = JURISDICTION_CONTEXT[jurisdictionCode]
  if (!jurisdiction) {
    return { success: false, error: `Unknown jurisdiction: ${jurisdictionCode}` }
  }

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('industry_jurisdiction_profiles')
    .select('id')
    .eq('global_pack_id', pack.id)
    .eq('jurisdiction_code', jurisdictionCode)
    .single()

  if (existing) {
    return { success: false, error: 'Profile already exists', skipped: true }
  }

  const systemPrompt = `You are an expert in ${jurisdiction.name} industry regulations and compliance.
Generate jurisdiction-specific compliance profile for the given industry.
Output MUST be valid JSON only, no explanation.
All content should be in ${jurisdiction.language}.`

  const prompt = `Generate ${jurisdiction.name} jurisdiction profile for industry: "${nameVi}" (code: ${pack.industry_code})

Context: ${jurisdiction.context}

Return JSON with this structure for resolved_rules:
{
  "names": {"en": "English name", "${jurisdictionCode.toLowerCase()}": "Local name if applicable"},
  "industry_code": "${pack.industry_code}",
  "jurisdiction_code": "${jurisdictionCode}",
  "target_audience": "${pack.target_audience || 'B2B'}",
  "brand_voice": {
    "tone_of_voice": ["professional", "trustworthy"],
    "language_style": ["clear", "compliant"],
    "formality_level": "professional",
    "allow_emoji": false,
    "cta_policy": "soft"
  },
  "terminology": {
    "preferred_terms": ["term1", "term2"],
    "forbidden_terms": ["avoid1", "avoid2"],
    "forbidden_words_local": ["local_word1"]
  },
  "compliance_rules": [
    {"rule": "Specific ${jurisdiction.name} regulation", "severity": "critical|high|medium", "category": "category", "regulation_ref": "Law/Act reference if applicable"}
  ],
  "claim_restrictions": [
    {"claim": "Restricted claim", "alternative": "Compliant alternative"}
  ],
  "argument_patterns": {
    "valid_patterns": ["Compliant pattern with [placeholder]"],
    "forbidden_patterns": ["Avoid this pattern"]
  },
  "key_regulations": [
    {"name": "Regulation Name", "code": "REG-CODE", "effective_date": "YYYY-MM-DD", "summary": "Brief summary", "url": "https://..."}
  ],
  "industry_trends": [
    {"trend": "Industry trend description", "impact": "How it affects content", "timeframe": "2024-2025"}
  ],
  "risk_guidelines": {
    "high_risk_keywords": ["keyword1", "keyword2"],
    "scoring_weights": {"forbidden_term": 30, "claim_violation": 25, "compliance_breach": 20, "tone_mismatch": 10, "pattern_violation": 15},
    "risk_thresholds": {"low": 0, "medium": 30, "high": 60, "blocked": 80}
  },
  "system_rules": ["Additional system-level rule"],
  "related_industries": [],
  "disclaimer": "Standard disclaimer for ${jurisdiction.name}"
}

Generate comprehensive, jurisdiction-specific compliance data.
Include 3-5 key regulations with references if known.
Include 2-3 industry trends relevant to ${jurisdiction.name} market.`

  try {
    const aiResponse = await callAI(prompt, systemPrompt)
    const resolvedRules = parseJsonFromAI(aiResponse)
    
    if (!resolvedRules) {
      return { success: false, error: 'Failed to parse AI response' }
    }

    // Ensure required fields
    resolvedRules.jurisdiction_code = jurisdictionCode
    resolvedRules.industry_code = pack.industry_code

    // Insert the profile
    const { error } = await supabase
      .from('industry_jurisdiction_profiles')
      .insert({
        global_pack_id: pack.id,
        jurisdiction_code: jurisdictionCode,
        resolved_rules: resolvedRules,
        validity_status: 'valid',
        disclaimer: resolvedRules.disclaimer || `Information is for reference only. Please verify with official ${jurisdiction.name} sources.`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: resolvedRules }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

Deno.serve(withPerf({ functionName: 'enrich-industry-profiles', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: EnrichRequest & { skipExisting?: boolean } = await req.json().catch(() => ({ mode: 'all' }))
    const { 
      mode = 'all', 
      jurisdictions = ['US', 'SG'], 
      batchSize = 5, 
      startFrom = 0,
      skipExisting = true 
    } = body

    // Get packs to process
    const { data: allPacks, error: packError } = await supabase
      .from('industry_global_packs')
      .select(`
        id,
        industry_code,
        industry_level,
        target_audience,
        global_brand_voice,
        global_compliance_rules,
        global_claim_restrictions,
        category_id,
        industry_categories!inner(code, label),
        industry_pack_translations!inner(name, language_code)
      `)
      .eq('is_active', true)
      .order('industry_code')

    if (packError) throw packError

    // Filter packs that need enrichment (empty or null compliance rules)
    let filteredPacks = allPacks || []
    if (skipExisting && (mode === 'enrich_global' || mode === 'all')) {
      filteredPacks = filteredPacks.filter(pack => {
        const rules = pack.global_compliance_rules
        return !rules || (Array.isArray(rules) && rules.length === 0)
      })
    }

    // Apply pagination on filtered results
    const packs = filteredPacks.slice(startFrom, startFrom + batchSize)

    console.log(`Processing ${packs.length} packs from index ${startFrom} (${filteredPacks.length} total missing)`)

    const results = {
      mode,
      processed: 0,
      enriched: 0,
      profilesCreated: 0,
      errors: [] as { industry_code: string; error: string }[],
      details: [] as any[]
    }

    // Process packs in parallel (max 3 concurrent)
    const processPack = async (pack: any) => {
      const nameVi = (pack.industry_pack_translations as any[])?.find((t: any) => t.language_code === 'vi')?.name || pack.industry_code
      const categoryData = pack.industry_categories as any
      const categoryCode = categoryData?.code || 'unknown'
      const packResults = { processed: 1, enriched: 0, profilesCreated: 0, errors: [] as any[], details: [] as any[] }

      // Enrich global pack if needed
      if (mode === 'enrich_global' || mode === 'all') {
        const isEmpty = !pack.global_compliance_rules || 
          (Array.isArray(pack.global_compliance_rules) && pack.global_compliance_rules.length === 0)

        if (isEmpty) {
          console.log(`Enriching: ${pack.industry_code}`)
          const enrichResult = await enrichGlobalPack(supabase, pack, nameVi, categoryCode)
          
          if (enrichResult.success) {
            packResults.enriched++
            packResults.details.push({ 
              industry_code: pack.industry_code, 
              action: 'enriched',
              rules_count: enrichResult.data?.global_compliance_rules?.length || 0
            })
          } else {
            packResults.errors.push({ industry_code: pack.industry_code, error: enrichResult.error })
          }
        }
      }

      // Create jurisdiction profiles in parallel
      if (mode === 'create_jurisdiction' || mode === 'all') {
        const profilePromises = jurisdictions.map(async (jurisdictionCode) => {
          console.log(`Creating ${jurisdictionCode} profile for: ${pack.industry_code}`)
          const profileResult = await createJurisdictionProfile(supabase, pack, nameVi, jurisdictionCode)
          
          if (profileResult.success) {
            return { success: true, detail: {
              industry_code: pack.industry_code,
              action: `created_${jurisdictionCode}_profile`,
              regulations: profileResult.data?.key_regulations?.length || 0
            }}
          } else if (!profileResult.skipped) {
            return { success: false, error: { 
              industry_code: pack.industry_code, 
              error: `${jurisdictionCode}: ${profileResult.error}` 
            }}
          }
          return { success: false, skipped: true }
        })

        const profileResults = await Promise.all(profilePromises)
        for (const pr of profileResults) {
          if (pr.success) {
            packResults.profilesCreated++
            packResults.details.push(pr.detail)
          } else if (!pr.skipped && pr.error) {
            packResults.errors.push(pr.error)
          }
        }
      }

      return packResults
    }

    // Process in chunks of 3 for parallelism
    const chunkSize = 3
    for (let i = 0; i < (packs?.length || 0); i += chunkSize) {
      const chunk = packs!.slice(i, i + chunkSize)
      const chunkResults = await Promise.all(chunk.map(processPack))
      
      for (const r of chunkResults) {
        results.processed += r.processed
        results.enriched += r.enriched
        results.profilesCreated += r.profilesCreated
        results.errors.push(...r.errors)
        results.details.push(...r.details)
      }

      // Small delay between chunks to avoid rate limits
      if (i + chunkSize < (packs?.length || 0)) {
        await new Promise(r => setTimeout(r, 200))
      }
    }

    // Get counts for response
    const { count: totalPacks } = await supabase
      .from('industry_global_packs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { count: missingCompliance } = await supabase
      .from('industry_global_packs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .or('global_compliance_rules.is.null,global_compliance_rules.eq.[]')

    const { data: profileCounts } = await supabase
      .from('industry_jurisdiction_profiles')
      .select('jurisdiction_code')

    const jurisdictionStats: Record<string, number> = {}
    profileCounts?.forEach((p: any) => {
      jurisdictionStats[p.jurisdiction_code] = (jurisdictionStats[p.jurisdiction_code] || 0) + 1
    })

    return new Response(JSON.stringify({
      ...results,
      totalPacks,
      missingCompliance,
      jurisdictionStats,
      nextBatch: (packs?.length || 0) >= batchSize ? startFrom + batchSize : null
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
