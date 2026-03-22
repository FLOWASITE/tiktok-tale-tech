import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheck {
  status: 'ok' | 'error';
  latencyMs: number;
  error?: string;
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    ai: HealthCheck;
  };
  version: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from('organizations').select('id').limit(1);
    
    if (error) throw error;
    
    return {
      status: 'ok',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkAI(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      return {
        status: 'ok',
        latencyMs: Date.now() - start,
      };
    }

    // Quick ping to Lovable AI Gateway - just check if API key is valid format
    // We don't want to actually call AI for health check (too slow/expensive)
    const isValidFormat = lovableApiKey.length > 20;
    
    return {
      status: isValidFormat ? 'ok' : 'error',
      latencyMs: Date.now() - start,
      error: isValidFormat ? undefined : 'Invalid API key format',
    };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

Deno.Deno.serve(withPerf({ functionName: 'health-check' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const [database, ai] = await Promise.all([
      checkDatabase(),
      checkAI(),
    ]);

    const allOk = database.status === 'ok' && ai.status === 'ok';
    const allFailed = database.status === 'error' && ai.status === 'error';

    const result: HealthCheckResult = {
      status: allOk ? 'healthy' : allFailed ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database,
        ai,
      },
      version: '1.0.0',
    };

    const httpStatus = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

    return new Response(JSON.stringify(result, null, 2), {
      status: httpStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}));
