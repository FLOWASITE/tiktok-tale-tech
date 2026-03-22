import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  connectionId: string;
  content: string;
  locationName?: string; // Format: locations/{locationId}
  mediaUrl?: string;
  callToAction?: {
    actionType: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL';
    url?: string;
  };
  eventInfo?: {
    title: string;
    startDate: string; // ISO date
    endDate: string;
  };
  offerInfo?: {
    couponCode?: string;
    termsConditions?: string;
  };
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

    const body: PublishRequest = await req.json();
    const { connectionId, content, locationName, mediaUrl, callToAction, eventInfo, offerInfo } = body;

    if (!connectionId || !content) {
      throw new Error('connectionId and content are required');
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

    if (!connection.is_active) {
      throw new Error('Connection is not active');
    }

    // Decrypt access token
    const accessToken = decrypt(connection.access_token, encryptionKey);
    if (!accessToken) {
      throw new Error('Failed to decrypt access token');
    }

    // Check if token is expired and try refresh
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      throw new Error('Token expired. Please reconnect Google Business Profile.');
    }

    // Determine which location to post to
    let targetLocation = locationName;
    if (!targetLocation && connection.metadata?.locations?.length > 0) {
      targetLocation = connection.metadata.locations[0].name;
    }

    if (!targetLocation) {
      throw new Error('No location found. Please reconnect with a business location.');
    }

    console.log(`Publishing to Google Business: ${connection.platform_username}, location: ${targetLocation}`);

    // Build the local post object
    const localPost: any = {
      languageCode: 'vi',
      summary: content,
      topicType: offerInfo ? 'OFFER' : eventInfo ? 'EVENT' : 'STANDARD',
    };

    // Add call to action if provided
    if (callToAction) {
      localPost.callToAction = {
        actionType: callToAction.actionType,
        url: callToAction.url,
      };
    }

    // Add event info if provided
    if (eventInfo) {
      const startDate = new Date(eventInfo.startDate);
      const endDate = new Date(eventInfo.endDate);
      
      localPost.event = {
        title: eventInfo.title,
        schedule: {
          startDate: {
            year: startDate.getFullYear(),
            month: startDate.getMonth() + 1,
            day: startDate.getDate(),
          },
          endDate: {
            year: endDate.getFullYear(),
            month: endDate.getMonth() + 1,
            day: endDate.getDate(),
          },
        },
      };
    }

    // Add offer info if provided
    if (offerInfo) {
      localPost.offer = {
        couponCode: offerInfo.couponCode,
        termsConditions: offerInfo.termsConditions,
      };
    }

    // Add media if provided
    if (mediaUrl) {
      localPost.media = [
        {
          mediaFormat: 'PHOTO',
          sourceUrl: mediaUrl,
        },
      ];
    }

    // Create the local post
    const postResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${targetLocation}/localPosts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(localPost),
      }
    );

    const result = await postResponse.json();
    console.log('Google Business publish result:', result);

    if (result.error) {
      throw new Error(result.error.message || 'Failed to publish to Google Business');
    }

    return new Response(
      JSON.stringify({
        success: true,
        platform: 'google_maps',
        postId: result.name,
        postUrl: result.searchUrl,
        message: 'Đã đăng bài thành công lên Google Business Profile',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Publish Google Business error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
