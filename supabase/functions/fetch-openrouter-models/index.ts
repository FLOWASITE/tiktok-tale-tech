import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache for models (1 hour)
let cachedModels: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Popular/flagship models to prioritize
const POPULAR_MODELS = new Set([
  // Anthropic
  'anthropic/claude-sonnet-4-20250514',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-haiku-4.5',
  // OpenAI
  'openai/gpt-5.4',
  'openai/gpt-5.4-pro',
  'openai/gpt-5.3-codex',
  'openai/gpt-5.3-chat',
  'openai/gpt-5.2',
  'openai/gpt-5.2-codex',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-oss-120b',
  // Google
  'google/gemini-3.1-pro-preview',
  'google/gemini-3.1-flash-lite-preview',
  'google/gemini-3-flash-preview',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  // Meta
  'meta-llama/llama-3.3-70b-instruct',
  // Mistral
  'mistralai/mistral-large',
  // DeepSeek
  'deepseek/deepseek-v3.2',
  'deepseek/deepseek-chat-v3.1',
  'deepseek/deepseek-r1',
  // MoonshotAI
  'moonshotai/kimi-k2.5',
  // MiniMax
  'minimax/minimax-m2.5',
  // xAI
  'x-ai/grok-4.20-beta',
  'x-ai/grok-4.20-multi-agent-beta',
  // Z.ai
  'z-ai/glm-5',
  // Qwen
  'qwen/qwen3.5-397b-a17b',
  'qwen/qwen3.5-flash-02-23',
  'qwen/qwen3-235b-a22b-2507',
  'qwen/qwen3-coder-next',
  'qwen/qwen-2.5-72b-instruct',
  // Xiaomi
  'xiaomi/mimo-v2-flash',
  // Perplexity
  'perplexity/sonar-pro',
  // Inception
  'inception/mercury-2',
  // StepFun
  'stepfun/step-3.5-flash',
  // ByteDance
  'bytedance-seed/seed-2.0-lite',
]);

// Determine model category
function categorizeModel(model: any): string {
  const id = model.id.toLowerCase();
  const pricing = model.pricing;
  
  // Reasoning models
  if (id.includes('o1') || id.includes('reasoner') || id.includes('r1')) {
    return 'reasoning';
  }
  
  // Coding models
  if (id.includes('coder') || id.includes('codestral') || id.includes('starcoder') || id.includes('codex') || id.includes('mimo')) {
    return 'coding';
  }
  
  // Multimodal
  if (model.architecture?.modality?.includes('image')) {
    return 'multimodal';
  }
  
  // Fast/cheap models
  const promptCost = parseFloat(pricing?.prompt || '0');
  if (promptCost < 0.5) {
    return 'cheap';
  }
  
  // Fast models (based on name patterns)
  if (id.includes('flash') || id.includes('mini') || id.includes('haiku') || id.includes('nano')) {
    return 'fast';
  }
  
  // Flagship
  if (id.includes('opus') || id.includes('large') || id.includes('pro') || id.includes('turbo') || 
      id.includes('405b') || id.includes('70b') || id.includes('v3.2') || id.includes('v3.1') ||
      id.includes('glm-5') || id.includes('kimi-k2.5') || id.includes('m2.5') || promptCost > 5) {
    return 'flagship';
  }
  
  return 'fast';
}

// Extract provider name from model ID
function getProviderName(modelId: string): string {
  const providerMap: Record<string, string> = {
    'anthropic': 'Anthropic',
    'openai': 'OpenAI',
    'meta-llama': 'Meta',
    'google': 'Google',
    'mistralai': 'Mistral',
    'deepseek': 'DeepSeek',
    'qwen': 'Qwen',
    'cohere': 'Cohere',
    'perplexity': 'Perplexity',
    'x-ai': 'xAI',
    'microsoft': 'Microsoft',
    'nvidia': 'NVIDIA',
    'databricks': 'Databricks',
    'moonshotai': 'MoonshotAI',
    'minimax': 'MiniMax',
    'z-ai': 'Z.ai',
    'xiaomi': 'Xiaomi',
    'stepfun': 'StepFun',
    'arcee-ai': 'Arcee AI',
    'writer': 'Writer',
    'inception': 'Inception',
    'bytedance-seed': 'ByteDance',
  };
  
  const prefix = modelId.split('/')[0];
  return providerMap[prefix] || prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

Deno.serve(withPerf({ functionName: 'fetch-openrouter-models' }, async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check cache first
    const now = Date.now();
    if (cachedModels && (now - cacheTimestamp) < CACHE_TTL_MS) {
      console.log('Returning cached OpenRouter models');
      return new Response(JSON.stringify({
        models: cachedModels,
        fetchedAt: new Date(cacheTimestamp).toISOString(),
        cached: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get OpenRouter API key from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if OpenRouter provider is configured
    const { data: providerConfig } = await supabase
      .from('ai_provider_configs')
      .select('encrypted_api_key')
      .eq('provider_type', 'openrouter')
      .eq('is_active', true)
      .maybeSingle();

    let apiKey: string | null = null;
    
    if (providerConfig?.encrypted_api_key) {
      // Decrypt API key
      try {
        const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY');
        if (encryptionKey) {
          const encryptedData = JSON.parse(providerConfig.encrypted_api_key);
          const keyData = new TextEncoder().encode(encryptionKey);
          const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
          
          const cryptoKey = await crypto.subtle.importKey(
            'raw',
            hashBuffer,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
          );
          
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
            cryptoKey,
            new Uint8Array(encryptedData.data)
          );
          
          apiKey = new TextDecoder().decode(decrypted);
        }
      } catch (e) {
        console.error('Failed to decrypt API key:', e);
      }
    }

    // Fetch models from OpenRouter
    console.log('Fetching models from OpenRouter API...');
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const rawModels = data.data || [];

    // Process and filter models
    const processedModels = rawModels
      .filter((m: any) => {
        // Filter out deprecated, unavailable models
        if (m.id.includes(':free')) return false; // Skip free tier variants
        if (m.id.includes('extended')) return false; // Skip extended versions
        return true;
      })
      .map((m: any) => ({
        id: m.id,
        name: m.name || m.id.split('/').pop()?.replace(/-/g, ' '),
        description: m.description || '',
        provider: getProviderName(m.id),
        pricing: {
          prompt: parseFloat(m.pricing?.prompt || '0') * 1000000, // Convert to per 1M tokens
          completion: parseFloat(m.pricing?.completion || '0') * 1000000,
        },
        contextLength: m.context_length || 0,
        modality: m.architecture?.modality || 'text->text',
        topProvider: m.top_provider,
        category: categorizeModel(m),
        isPopular: POPULAR_MODELS.has(m.id),
      }))
      // Sort: popular first, then by provider, then by name
      .sort((a: any, b: any) => {
        if (a.isPopular && !b.isPopular) return -1;
        if (!a.isPopular && b.isPopular) return 1;
        if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
        return a.name.localeCompare(b.name);
      });

    // Update cache
    cachedModels = processedModels;
    cacheTimestamp = now;

    console.log(`Fetched ${processedModels.length} models from OpenRouter`);

    return new Response(JSON.stringify({
      models: processedModels,
      fetchedAt: new Date().toISOString(),
      cached: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    
    // Return cached data if available, even if stale
    if (cachedModels) {
      return new Response(JSON.stringify({
        models: cachedModels,
        fetchedAt: new Date(cacheTimestamp).toISOString(),
        cached: true,
        error: 'Using stale cache due to fetch error',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      models: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}));
