import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encryption helpers
function encrypt(text: string, key: string): string {
  const iv = randomBytes(16);
  const keyBuffer = Buffer.alloc(32);
  Buffer.from(key).copy(keyBuffer);
  const cipher = createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('Google Business OAuth callback received:', { code: !!code, state: !!state, error });

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    // Decode state
    let stateData: { brandTemplateId: string | null; organizationId: string | null; userId: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch (e) {
      throw new Error('Invalid state parameter');
    }

    const { brandTemplateId, organizationId, userId } = stateData;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Google credentials from social_platform_settings
    const { data: settings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'google_maps')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      throw new Error('Google Business Profile chưa được cấu hình. Liên hệ Admin.');
    }

    const clientId = decrypt(settings.consumer_key, encryptionKey);
    const clientSecret = decrypt(settings.consumer_secret, encryptionKey);

    if (!clientId || !clientSecret) {
      throw new Error('Invalid Google credentials');
    }

    // Exchange code for access token
    const redirectUri = `${supabaseUrl}/functions/v1/google-business-oauth-callback`;
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    console.log('Google token response:', { 
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in 
    });

    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to get access token');
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;

    // Get user's Google Business accounts
    const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const accountsData = await accountsResponse.json();
    console.log('Google Business accounts:', accountsData);

    let accountName = 'Google Business';
    let accountId = '';
    let locations: any[] = [];

    if (accountsData.accounts && accountsData.accounts.length > 0) {
      const primaryAccount = accountsData.accounts[0];
      accountName = primaryAccount.accountName || primaryAccount.name || 'Google Business';
      accountId = primaryAccount.name; // Format: accounts/{accountId}

      // Get locations for this account
      try {
        const locationsResponse = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        const locationsData = await locationsResponse.json();
        if (locationsData.locations) {
          locations = locationsData.locations.map((loc: any) => ({
            name: loc.name,
            title: loc.title,
            address: loc.storefrontAddress?.addressLines?.join(', ') || '',
          }));
        }
      } catch (e) {
        console.log('Could not fetch locations:', e);
      }
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Check for existing connection
    let query = supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'google_maps');

    if (brandTemplateId) {
      query = query.eq('brand_template_id', brandTemplateId);
    } else if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: existingConnection } = await query.maybeSingle();

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(accessToken, encryptionKey);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken, encryptionKey) : null;

    const connectionData = {
      organization_id: organizationId || null,
      brand_template_id: brandTemplateId || null,
      user_id: userId,
      platform: 'google_maps',
      platform_user_id: accountId,
      platform_username: accountName,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['https://www.googleapis.com/auth/business.manage'],
      metadata: {
        account_id: accountId,
        account_name: accountName,
        locations: locations,
        uses_global_credentials: true,
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

    console.log('Google Business connection saved:', connection.id);

    // Redirect to frontend with success
    const frontendUrl = Deno.env.get('FRONTEND_URL') || supabaseUrl.replace('.supabase.co', '.lovableproject.com');
    const redirectUrl = `${frontendUrl}/auth/google-maps/callback?success=true&platform=google_maps&username=${encodeURIComponent(accountName)}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });

  } catch (error: any) {
    console.error('Google Business OAuth callback error:', error);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const frontendUrl = Deno.env.get('FRONTEND_URL') || supabaseUrl.replace('.supabase.co', '.lovableproject.com');
    const redirectUrl = `${frontendUrl}/auth/google-maps/callback?success=false&error=${encodeURIComponent(error.message)}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  }
});
