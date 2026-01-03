import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  connectionId: string;
}

// Generate OAuth signature for Twitter API
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const hmacSha1 = createHmac("sha1", signingKey);
  const signature = hmacSha1.update(signatureBaseString).digest("base64");
  return signature;
}

// Generate OAuth header for Twitter API
function generateOAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): string {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    consumerSecret,
    accessTokenSecret
  );

  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const entries = Object.entries(signedOAuthParams).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    "OAuth " +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ")
  );
}

// Get current user from Twitter API
async function getTwitterUser(
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<{ id: string; name: string; username: string; profile_image_url?: string }> {
  const url = "https://api.x.com/2/users/me?user.fields=profile_image_url";
  const method = "GET";

  const oauthHeader = generateOAuthHeader(
    method,
    url.split('?')[0], // Base URL without query params for signature
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret
  );

  console.log("Fetching Twitter user info...");

  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: oauthHeader,
    },
  });

  const responseText = await response.text();
  console.log("Twitter API Response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.status} - ${responseText}`);
  }

  const result = JSON.parse(responseText);
  return result.data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: TestRequest = await req.json();
    const { connectionId } = body;

    if (!connectionId) {
      throw new Error('connectionId is required');
    }

    console.log(`Testing Twitter connection ${connectionId}`);

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    if (connection.platform !== 'twitter') {
      throw new Error('Invalid platform for this endpoint');
    }

    // Get credentials
    const accessToken = connection.access_token;
    const accessTokenSecret = connection.refresh_token;
    const consumerKey = connection.consumer_key || Deno.env.get('TWITTER_CONSUMER_KEY');
    const consumerSecret = connection.consumer_secret || Deno.env.get('TWITTER_CONSUMER_SECRET');

    if (!consumerKey || !consumerSecret) {
      throw new Error('Twitter app credentials not configured');
    }

    if (!accessToken || !accessTokenSecret) {
      throw new Error('Twitter user credentials not found');
    }

    // Test by fetching user info
    const twitterUser = await getTwitterUser(
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret
    );

    console.log('Twitter user verified:', twitterUser);

    // Update connection with verified user info
    const { error: updateError } = await supabase
      .from('social_connections')
      .update({
        platform_user_id: twitterUser.id,
        platform_username: twitterUser.username,
        platform_display_name: twitterUser.name,
        platform_avatar_url: twitterUser.profile_image_url?.replace('_normal', '_400x400'),
        last_verified_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error('Failed to update connection:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: twitterUser.id,
          username: twitterUser.username,
          displayName: twitterUser.name,
          avatarUrl: twitterUser.profile_image_url?.replace('_normal', '_400x400'),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test Twitter connection error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});