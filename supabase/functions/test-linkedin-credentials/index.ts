import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'test-linkedin-credentials' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY');
    
    const supabase = getServiceClient();
    
    const { platform, useStoredCredentials, clientId, clientSecret } = await req.json();
    
    let finalClientId = clientId;
    let finalClientSecret = clientSecret;
    
    // Get credentials from database if using stored credentials
    if (useStoredCredentials) {
      const { data: settings, error: settingsError } = await supabase
        .from('social_platform_settings')
        .select('*')
        .eq('platform', 'linkedin')
        .single();
      
      if (settingsError || !settings) {
        return new Response(
          JSON.stringify({ success: false, error: 'LinkedIn credentials not found in settings' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // Decrypt credentials
      if (encryptionKey && settings.consumer_key && settings.consumer_secret) {
        try {
          const keyData = new TextEncoder().encode(encryptionKey.slice(0, 32).padEnd(32, '0'));
          const key = await crypto.subtle.importKey(
            'raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']
          );
          
          // Decrypt Client ID
          const keyParts = settings.consumer_key.split(':');
          if (keyParts.length === 2) {
            const keyIv = Uint8Array.from(atob(keyParts[0]), c => c.charCodeAt(0));
            const keyEncrypted = Uint8Array.from(atob(keyParts[1]), c => c.charCodeAt(0));
            const keyDecrypted = await crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: keyIv }, key, keyEncrypted
            );
            finalClientId = new TextDecoder().decode(keyDecrypted);
          }
          
          // Decrypt Client Secret
          const secretParts = settings.consumer_secret.split(':');
          if (secretParts.length === 2) {
            const secretIv = Uint8Array.from(atob(secretParts[0]), c => c.charCodeAt(0));
            const secretEncrypted = Uint8Array.from(atob(secretParts[1]), c => c.charCodeAt(0));
            const secretDecrypted = await crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: secretIv }, key, secretEncrypted
            );
            finalClientSecret = new TextDecoder().decode(secretDecrypted);
          }
        } catch (decryptError) {
          console.error('Decryption error:', decryptError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to decrypt credentials' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
      } else {
        // Use unencrypted values if no encryption key
        finalClientId = settings.consumer_key;
        finalClientSecret = settings.consumer_secret;
      }
    }
    
    // Validate credentials format
    if (!finalClientId || !finalClientSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing LinkedIn Client ID or Client Secret' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // LinkedIn Client ID format validation
    // LinkedIn Client IDs are typically alphanumeric, 12-16 characters
    const clientIdPattern = /^[a-zA-Z0-9]{10,20}$/;
    if (!clientIdPattern.test(finalClientId)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid LinkedIn Client ID format. Client ID should be 10-20 alphanumeric characters.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // LinkedIn Client Secret format validation  
    // LinkedIn Client Secrets are typically 16 alphanumeric characters
    const clientSecretPattern = /^[a-zA-Z0-9]{12,24}$/;
    if (!clientSecretPattern.test(finalClientSecret)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid LinkedIn Client Secret format. Client Secret should be 12-24 alphanumeric characters.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Note: LinkedIn does not provide an app-only token endpoint like Facebook/Twitter
    // We can only validate format here. Full validation happens during OAuth flow.
    // Attempting to verify by making a request would require user authentication.
    
    console.log('LinkedIn credentials format validated successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'LinkedIn credentials format validated. Full verification will occur during OAuth authentication.',
        note: 'LinkedIn API requires user authentication to fully verify app credentials.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Error testing LinkedIn credentials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}));
