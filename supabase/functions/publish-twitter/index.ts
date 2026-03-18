import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptCredential } from "../_shared/crypto.ts";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  connectionId: string;
  contentId: string;
  content: string;
  mediaUrls?: string[];
  scheduleId?: string;
}

// Get global platform credentials from social_platform_settings
async function getGlobalPlatformCredentials(
  supabase: any,
  platform: string,
): Promise<{ consumerKey: string | null; consumerSecret: string | null }> {
  try {
    const { data, error } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log(`No global settings found for ${platform}`);
      return { consumerKey: null, consumerSecret: null };
    }

    const [consumerKey, consumerSecret] = await Promise.all([
      data.consumer_key ? decryptCredential(data.consumer_key) : null,
      data.consumer_secret ? decryptCredential(data.consumer_secret) : null,
    ]);
    return { consumerKey, consumerSecret };
  } catch (error) {
    console.error('Error fetching global credentials:', error);
    return { consumerKey: null, consumerSecret: null };
  }
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

// Post tweet using Twitter API v2
async function postTweet(
  tweetText: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<{ id: string; text: string }> {
  const url = "https://api.x.com/2/tweets";
  const method = "POST";

  const oauthHeader = generateOAuthHeader(
    method,
    url,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret
  );

  console.log("Posting tweet to Twitter API...");

  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: tweetText }),
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

    const body: PublishRequest = await req.json();
    const { connectionId, contentId, content, scheduleId } = body;

    if (!connectionId || !content) {
      throw new Error('connectionId and content are required');
    }

    console.log(`Publishing to Twitter for connection ${connectionId}`);

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found or inactive');
    }

    if (connection.platform !== 'twitter') {
      throw new Error('Invalid platform for this endpoint');
    }

    // Get Twitter credentials
    const accessToken = connection.access_token;
    const accessTokenSecret = connection.refresh_token;
    
    // Credential hierarchy: connection-specific > global admin settings > ENV
    let consumerKey = connection.consumer_key;
    let consumerSecret = connection.consumer_secret;
    let credentialSource = 'brand-specific';

    if (!consumerKey || !consumerSecret) {
      // Try global admin settings
      const globalCreds = await getGlobalPlatformCredentials(supabase, 'twitter');
      
      if (globalCreds.consumerKey && globalCreds.consumerSecret) {
        consumerKey = globalCreds.consumerKey;
        consumerSecret = globalCreds.consumerSecret;
        credentialSource = 'global-admin';
      }
    }

    // Final fallback to ENV
    if (!consumerKey || !consumerSecret) {
      consumerKey = consumerKey || Deno.env.get('TWITTER_CONSUMER_KEY');
      consumerSecret = consumerSecret || Deno.env.get('TWITTER_CONSUMER_SECRET');
      if (consumerKey && consumerSecret) {
        credentialSource = 'environment';
      }
    }

    if (!consumerKey || !consumerSecret) {
      throw new Error('Twitter app credentials not configured. Please contact Admin to setup Twitter API keys.');
    }

    if (!accessToken || !accessTokenSecret) {
      throw new Error('Twitter user credentials not found in connection');
    }

    console.log(`Using ${credentialSource} consumer keys`);

    // Create publish attempt record
    const { data: attempt, error: attemptError } = await supabase
      .from('publish_attempts')
      .insert({
        schedule_id: scheduleId || null,
        content_id: contentId || null,
        connection_id: connectionId,
        organization_id: connection.organization_id,
        platform: 'twitter',
        channel: 'twitter',
        status: 'processing',
        request_payload: { text: content.substring(0, 100) + '...' },
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Failed to create publish attempt:', attemptError);
    }

    try {
      // Truncate content to Twitter's 280 character limit
      const tweetContent = content.length > 280 ? content.substring(0, 277) + '...' : content;

      // Post tweet
      const tweetResult = await postTweet(
        tweetContent,
        consumerKey,
        consumerSecret,
        accessToken,
        accessTokenSecret
      );

      console.log('Tweet posted successfully:', tweetResult);

      // Update publish attempt with success
      if (attempt) {
        await supabase
          .from('publish_attempts')
          .update({
            status: 'success',
            external_post_id: tweetResult.id,
            external_post_url: `https://twitter.com/i/web/status/${tweetResult.id}`,
            response_payload: tweetResult,
            completed_at: new Date().toISOString(),
          })
          .eq('id', attempt.id);
      }

      // Update connection last_used_at
      await supabase
        .from('social_connections')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', connectionId);

      // Update schedule if provided
      if (scheduleId) {
        await supabase
          .from('content_schedules')
          .update({
            publish_status: 'published',
            published_at: new Date().toISOString(),
            external_post_id: tweetResult.id,
          })
          .eq('id', scheduleId);
      }

      // Log publishing action
      await supabase
        .from('content_publishing_logs')
        .insert({
          content_id: contentId || null,
          schedule_id: scheduleId || null,
          organization_id: connection.organization_id,
          channel: 'twitter',
          action: 'published',
          details: {
            tweet_id: tweetResult.id,
            tweet_url: `https://twitter.com/i/web/status/${tweetResult.id}`,
          },
        });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            tweetId: tweetResult.id,
            tweetUrl: `https://twitter.com/i/web/status/${tweetResult.id}`,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (twitterError: any) {
      console.error('Twitter API error:', twitterError);

      // Update publish attempt with failure
      if (attempt) {
        await supabase
          .from('publish_attempts')
          .update({
            status: 'failed',
            error_message: twitterError.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', attempt.id);
      }

      // Update connection with last error
      await supabase
        .from('social_connections')
        .update({ last_error: twitterError.message })
        .eq('id', connectionId);

      throw twitterError;
    }
  } catch (error: any) {
    console.error('Publish Twitter error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
