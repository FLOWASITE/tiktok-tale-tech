import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function decrypt(encryptedText: string, key: string): string {
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedData = Buffer.from(textParts.join(':'), 'hex');
    const keyBuffer = Buffer.alloc(32);
    Buffer.from(key).copy(keyBuffer);
    const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

Deno.serve(withPerf({ functionName: 'test-website-connection' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const supabase = getServiceClient();

    const { connectionId } = await req.json();

    if (!connectionId) {
      throw new Error('connectionId is required');
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'website')
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    const integrationType = connection.metadata?.integration_type;
    const websiteUrl = connection.metadata?.website_url;

    console.log(`Testing website connection: ${connectionId}, type: ${integrationType}`);

    let testResult = { valid: true, message: '', details: {} as any };

    if (integrationType === 'wordpress') {
      // Test WordPress REST API
      const wpUsername = connection.metadata?.wordpress_username;
      const wpPassword = decrypt(connection.refresh_token, encryptionKey);
      
      if (!wpUsername || !wpPassword) {
        testResult = { 
          valid: false, 
          message: 'WordPress credentials not found', 
          details: { error: 'missing_credentials' } 
        };
      } else {
        try {
          const wpApiUrl = `${websiteUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
          const authString = btoa(`${wpUsername}:${wpPassword}`);

          const response = await fetch(wpApiUrl, {
            headers: {
              'Authorization': `Basic ${authString}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            testResult = {
              valid: true,
              message: 'WordPress connection successful',
              details: {
                username: userData.name,
                email: userData.email,
                roles: userData.roles,
                avatar: userData.avatar_urls?.['96'] || null,
              },
            };
          } else {
            const errorText = await response.text();
            testResult = {
              valid: false,
              message: `WordPress API error: ${response.status}`,
              details: { error: errorText },
            };
          }
        } catch (fetchError: any) {
          testResult = {
            valid: false,
            message: `Cannot reach WordPress: ${fetchError.message}`,
            details: { error: fetchError.message },
          };
        }
      }

    } else if (integrationType === 'custom_api') {
      // Test custom API endpoint with a HEAD/GET request
      const apiEndpoint = connection.metadata?.api_endpoint;
      const apiKey = decrypt(connection.access_token, encryptionKey);

      if (!apiEndpoint) {
        testResult = { 
          valid: false, 
          message: 'API endpoint not configured', 
          details: { error: 'missing_endpoint' } 
        };
      } else {
        try {
          const response = await fetch(apiEndpoint, {
            method: 'GET',
            headers: {
              'Authorization': apiKey ? `Bearer ${apiKey}` : '',
              'X-API-Key': apiKey || '',
            },
          });

          testResult = {
            valid: response.ok || response.status === 405, // 405 Method Not Allowed is also valid
            message: response.ok ? 'API endpoint reachable' : `API returned ${response.status}`,
            details: { status: response.status },
          };
        } catch (fetchError: any) {
          testResult = {
            valid: false,
            message: `Cannot reach API: ${fetchError.message}`,
            details: { error: fetchError.message },
          };
        }
      }

    } else if (integrationType === 'webhook') {
      // Test webhook with a ping
      const webhookUrl = connection.metadata?.webhook_url;

      if (!webhookUrl) {
        testResult = { 
          valid: false, 
          message: 'Webhook URL not configured', 
          details: { error: 'missing_webhook' } 
        };
      } else {
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: 'test',
              timestamp: new Date().toISOString(),
            }),
          });

          testResult = {
            valid: response.ok,
            message: response.ok ? 'Webhook reachable' : `Webhook returned ${response.status}`,
            details: { status: response.status },
          };
        } catch (fetchError: any) {
          testResult = {
            valid: false,
            message: `Cannot reach webhook: ${fetchError.message}`,
            details: { error: fetchError.message },
          };
        }
      }

    } else {
      // Manual - always valid
      testResult = {
        valid: true,
        message: 'Manual integration - no test required',
        details: { integration_type: 'manual' },
      };
    }

    // Update connection status
    await supabase
      .from('social_connections')
      .update({
        is_active: testResult.valid,
        metadata: {
          ...connection.metadata,
          last_tested: new Date().toISOString(),
          test_result: testResult.message,
        },
      })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({
        success: true,
        valid: testResult.valid,
        message: testResult.message,
        details: testResult.details,
        integrationType,
        websiteUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Test Website connection error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
