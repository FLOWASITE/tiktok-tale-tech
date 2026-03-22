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

Deno.serve(withPerf({ functionName: 'test-google-business-connection' }, async (req) => {
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
      .eq('platform', 'google_maps')
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    // Decrypt access token
    const accessToken = decrypt(connection.access_token, encryptionKey);
    if (!accessToken) {
      throw new Error('Failed to decrypt access token');
    }

    // Check if token is expired
    const isExpired = connection.token_expires_at && new Date(connection.token_expires_at) < new Date();

    if (isExpired) {
      // Token expired - try to refresh
      console.log('Token expired, attempting refresh');
      
      // Call refresh function
      const refreshResponse = await fetch(`${supabaseUrl}/functions/v1/refresh-google-business-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });
      
      const refreshResult = await refreshResponse.json();
      
      if (!refreshResult.success) {
        return new Response(
          JSON.stringify({
            success: false,
            valid: false,
            error: 'Token expired and refresh failed',
            needs_reauth: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Testing Google Business connection: ${connectionId}`);

    // Test the token by fetching accounts
    const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const accountsData = await accountsResponse.json();
    console.log('Google Business accounts:', accountsData);

    if (accountsData.error) {
      // Token is invalid
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: { 
            ...connection.metadata, 
            needs_reauth: true, 
            test_error: accountsData.error.message || 'Invalid token' 
          },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: accountsData.error.message || 'Invalid token',
          needs_reauth: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Token is valid - update metadata with latest info
    let locations: any[] = [];
    let accountName = connection.platform_username;
    let accountId = connection.platform_user_id;

    if (accountsData.accounts && accountsData.accounts.length > 0) {
      const primaryAccount = accountsData.accounts[0];
      accountName = primaryAccount.accountName || primaryAccount.name || accountName;
      accountId = primaryAccount.name || accountId;

      // Try to get locations
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

    const updatedMetadata = {
      ...connection.metadata,
      account_name: accountName,
      account_id: accountId,
      locations: locations,
      last_tested: new Date().toISOString(),
      needs_reauth: false,
    };

    await supabase
      .from('social_connections')
      .update({
        is_active: true,
        platform_username: accountName,
        platform_user_id: accountId,
        metadata: updatedMetadata,
      })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        accountInfo: {
          name: accountName,
          accountId: accountId,
          locations: locations,
        },
        expiresAt: connection.token_expires_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Test Google Business connection error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
