import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCipheriv, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectWebsiteRequest {
  organizationId?: string;
  brandTemplateId?: string;
  websiteUrl: string;
  apiEndpoint?: string;
  apiKey?: string;
  webhookUrl?: string;
  integrationType: 'wordpress' | 'custom_api' | 'webhook' | 'manual';
  wordpressConfig?: {
    username: string;
    applicationPassword: string;
  };
}

function encrypt(text: string, key: string): string {
  const iv = randomBytes(16);
  const keyBuffer = Buffer.alloc(32);
  Buffer.from(key).copy(keyBuffer);
  const cipher = createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

Deno.serve(withPerf({ functionName: 'connect-website' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: ConnectWebsiteRequest = await req.json();
    const { 
      organizationId, 
      brandTemplateId, 
      websiteUrl, 
      apiEndpoint, 
      apiKey, 
      webhookUrl, 
      integrationType,
      wordpressConfig 
    } = body;

    if (!websiteUrl || !integrationType) {
      throw new Error('websiteUrl and integrationType are required');
    }

    if (!brandTemplateId && !organizationId) {
      throw new Error('brandTemplateId or organizationId is required');
    }

    console.log(`Connecting website: ${websiteUrl}, type: ${integrationType}`);

    // Validate WordPress config if provided
    if (integrationType === 'wordpress' && wordpressConfig) {
      // Test WordPress REST API connection
      const wpApiUrl = `${websiteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?per_page=1`;
      const authString = btoa(`${wordpressConfig.username}:${wordpressConfig.applicationPassword}`);
      
      try {
        const testResponse = await fetch(wpApiUrl, {
          headers: {
            'Authorization': `Basic ${authString}`,
          },
        });

        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          throw new Error(`WordPress API test failed: ${testResponse.status} - ${errorText}`);
        }

        console.log('WordPress API test successful');
      } catch (fetchError: any) {
        throw new Error(`Could not connect to WordPress: ${fetchError.message}`);
      }
    }

    // Check for existing connection
    let query = supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'website');

    if (brandTemplateId) {
      query = query.eq('brand_template_id', brandTemplateId);
    } else {
      query = query.eq('organization_id', organizationId);
    }

    const { data: existingConnection } = await query.maybeSingle();

    // Encrypt sensitive data
    const encryptedApiKey = apiKey ? encrypt(apiKey, encryptionKey) : null;
    const encryptedWpPassword = wordpressConfig?.applicationPassword 
      ? encrypt(wordpressConfig.applicationPassword, encryptionKey) 
      : null;

    // Extract domain for username display
    const urlObj = new URL(websiteUrl);
    const domain = urlObj.hostname;

    const connectionData = {
      organization_id: organizationId || null,
      brand_template_id: brandTemplateId || null,
      user_id: user.id,
      platform: 'website',
      platform_user_id: domain,
      platform_username: domain,
      access_token: encryptedApiKey || 'manual', // Store API key or marker
      refresh_token: encryptedWpPassword, // Store WP password if applicable
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['publish', 'read'],
      metadata: {
        website_url: websiteUrl,
        integration_type: integrationType,
        api_endpoint: apiEndpoint || null,
        webhook_url: webhookUrl || null,
        wordpress_username: wordpressConfig?.username || null,
        can_auto_publish: integrationType !== 'manual',
      },
    };

    let connection;
    if (existingConnection) {
      const { data, error } = await supabase
        .from('social_connections')
        .update(connectionData)
        .eq('id', existingConnection.id)
        .select()
        .single();
      
      if (error) throw error;
      connection = data;
    } else {
      const { data, error } = await supabase
        .from('social_connections')
        .insert(connectionData)
        .select()
        .single();
      
      if (error) throw error;
      connection = data;
    }

    console.log('Website connection saved:', connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        connection: {
          id: connection.id,
          platform: connection.platform,
          username: connection.platform_username,
          isActive: connection.is_active,
          integrationType: integrationType,
          canAutoPublish: integrationType !== 'manual',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Connect Website error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
