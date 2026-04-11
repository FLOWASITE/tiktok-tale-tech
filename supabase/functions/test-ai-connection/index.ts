import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'test-ai-connection' }, async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, apiKey } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let testResult;

    switch (provider) {
      case 'openai':
        testResult = await testOpenAI(apiKey);
        break;
      case 'anthropic':
        testResult = await testAnthropic(apiKey);
        break;
      case 'gemini':
        testResult = await testGemini(apiKey);
        break;
      case 'replicate':
        testResult = await testReplicate(apiKey);
        break;
      case 'openrouter':
        testResult = await testOpenRouter(apiKey);
        break;
      case 'kie':
        testResult = await testKie(apiKey);
        break;
      case 'poyo':
        testResult = await testPoyo(apiKey);
        break;
      case 'geminigen':
        testResult = await testGeminiGen(apiKey);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown provider: ${provider}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(testResult),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

async function testOpenAI(apiKey: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401) {
      return { success: false, error: 'API key không hợp lệ' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `OpenAI error: ${errorText}` };
    }

    const data = await response.json();
    const modelCount = data.data?.length || 0;
    return { 
      success: true, 
      message: `Kết nối thành công! Có ${modelCount} models khả dụng.` 
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Lỗi kết nối: ${errorMessage}` };
  }
}

async function testAnthropic(apiKey: string) {
  try {
    // Anthropic doesn't have a simple test endpoint, so we make a minimal request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (response.status === 401) {
      return { success: false, error: 'API key không hợp lệ' };
    }

    if (!response.ok && response.status !== 200) {
      // Check if it's just rate limiting (which means key is valid)
      if (response.status === 429) {
        return { success: true, message: 'API key hợp lệ (đang bị rate limit)' };
      }
      const errorText = await response.text();
      return { success: false, error: `Anthropic error: ${errorText}` };
    }

    return { success: true, message: 'Kết nối thành công với Anthropic!' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Lỗi kết nối: ${errorMessage}` };
  }
}

async function testGemini(apiKey: string) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'API key không hợp lệ' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Gemini error: ${errorText}` };
    }

    const data = await response.json();
    const geminiModels = data.models?.filter((m: any) => 
      m.name?.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent')
    );
    const modelCount = geminiModels?.length || 0;
    
    return { 
      success: true, 
      message: `Kết nối thành công! Có ${modelCount} Gemini models khả dụng.` 
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Lỗi kết nối: ${errorMessage}` };
  }
}

async function testReplicate(apiKey: string) {
  try {
    const response = await fetch('https://api.replicate.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401) {
      return { success: false, error: 'API token không hợp lệ' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Replicate error: ${errorText}` };
    }

    const data = await response.json();
    return { 
      success: true, 
      message: `Kết nối thành công! Account: ${data.username || 'verified'}` 
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Lỗi kết nối: ${errorMessage}` };
  }
}

async function testOpenRouter(apiKey: string) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401) {
      return { success: false, error: 'API key không hợp lệ' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `OpenRouter error: ${errorText}` };
    }

    const data = await response.json();
    const modelCount = data.data?.length || 0;
    return { 
      success: true, 
      message: `Kết nối thành công! Có ${modelCount} models khả dụng.` 
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Lỗi kết nối: ${errorMessage}` };
  }
}

async function testKie(apiKey: string) {
  try {
    const response = await fetch('https://api.kie.ai/api/v1/record-info?taskId=test', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'API key không hợp lệ' };
    }

    return { success: true, message: 'Kết nối thành công với KIE.ai!' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Lỗi kết nối: ${errorMessage}` };
  }
}

async function testPoyo(apiKey: string) {
  try {
    const response = await fetch('https://api.poyo.ai/api/generate/status/test', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'API key không hợp lệ' };
    }

    // Any other response (200, 404, etc.) means auth passed
    return { success: true, message: 'Kết nối thành công với PoYo.ai!' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Lỗi kết nối: ${errorMessage}` };
  }
}
