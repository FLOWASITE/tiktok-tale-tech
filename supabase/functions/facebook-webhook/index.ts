import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'facebook-webhook' }, async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ============ GET: Facebook Webhook Verification ============
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('FACEBOOK_WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Facebook webhook verification successful');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    console.error('Facebook webhook verification failed:', { mode, tokenMatch: token === verifyToken });
    return new Response('Forbidden', { status: 403 });
  }

  // ============ POST: Receive Webhook Events ============
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('Facebook webhook received:', JSON.stringify(body).substring(0, 500));

      if (body.object !== 'page') {
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      for (const entry of body.entry || []) {
        const pageId = entry.id;

        // Find connection for this page
        const { data: connection } = await supabase
          .from('social_connections')
          .select('id, organization_id, brand_template_id')
          .eq('platform', 'facebook')
          .eq('platform_user_id', pageId)
          .eq('is_active', true)
          .maybeSingle();

        if (!connection) {
          console.log('No active connection found for page:', pageId);
          continue;
        }

        for (const change of entry.changes || []) {
          if (change.field !== 'feed') continue;

          const value = change.value;
          if (!value) continue;

          // Determine event type
          let eventType: string;
          switch (value.item) {
            case 'comment':
              eventType = 'comment';
              break;
            case 'reaction':
              eventType = 'reaction';
              break;
            case 'share':
              eventType = 'share';
              break;
            case 'like':
              eventType = 'reaction';
              break;
            default:
              eventType = value.verb || value.item || 'unknown';
          }

          // Build a unique event ID to avoid duplicates
          const facebookEventId = `${pageId}_${value.post_id || entry.id}_${value.comment_id || value.reaction_type || ''}_${value.sender_id || ''}_${entry.time || Date.now()}`;

          const engagementData = {
            organization_id: connection.organization_id,
            brand_template_id: connection.brand_template_id,
            connection_id: connection.id,
            platform: 'facebook',
            post_id: value.post_id || `${pageId}_${entry.id}`,
            event_type: eventType,
            event_data: value,
            sender_id: value.sender_id?.toString() || value.from?.id || null,
            sender_name: value.sender_name || value.from?.name || null,
            facebook_event_id: facebookEventId,
          };

          const { error } = await supabase
            .from('social_post_engagements')
            .upsert(engagementData, { onConflict: 'facebook_event_id' });

          if (error) {
            console.error('Error saving engagement:', error.message);
          } else {
            console.log(`Saved ${eventType} engagement for post ${engagementData.post_id}`);
          }
        }

        // Also handle messaging-style entries (e.g., standalone reactions)
        for (const messaging of entry.messaging || []) {
          // Future: handle direct messages if needed
          console.log('Messaging event received (not processed):', messaging);
        }
      }

      // Facebook requires 200 response within 20s
      return new Response('EVENT_RECEIVED', { status: 200, headers: corsHeaders });
    } catch (error) {
      console.error('Webhook processing error:', error);
      // Still return 200 to prevent Facebook from retrying
      return new Response('EVENT_RECEIVED', { status: 200, headers: corsHeaders });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
}));
