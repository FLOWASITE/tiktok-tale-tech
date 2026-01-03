import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectRequest {
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
  organizationId: string;
  redirectUri: string;
  // For Twitter OAuth 1.0a - manual token input (simpler approach)
  accessToken?: string;
  accessTokenSecret?: string;
  username?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: ConnectRequest = await req.json();
    const { platform, organizationId, accessToken, accessTokenSecret, username } = body;

    if (!platform || !organizationId) {
      throw new Error('platform and organizationId are required');
    }

    console.log(`Connecting ${platform} for organization ${organizationId}`);

    // Verify user is member of organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      throw new Error('Not a member of this organization');
    }

    // For Twitter - using manual token approach (user provides their own API tokens)
    if (platform === 'twitter') {
      if (!accessToken || !accessTokenSecret) {
        // Return instructions for getting Twitter tokens
        return new Response(
          JSON.stringify({
            success: true,
            requiresManualSetup: true,
            instructions: {
              steps: [
                '1. Truy cập developer.twitter.com và tạo App',
                '2. Trong App Settings, chọn "Read and Write" permissions',
                '3. Trong Keys and Tokens, tạo Access Token and Secret',
                '4. Copy các giá trị và nhập vào form bên dưới',
              ],
              fields: [
                { key: 'accessToken', label: 'Access Token', required: true },
                { key: 'accessTokenSecret', label: 'Access Token Secret', required: true },
                { key: 'username', label: 'Twitter Username (không có @)', required: false },
              ],
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Save Twitter connection with provided tokens
      const { data: existingConnection } = await supabase
        .from('social_connections')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('platform', 'twitter')
        .maybeSingle();

      const connectionData = {
        organization_id: organizationId,
        user_id: user.id,
        platform: 'twitter',
        platform_username: username || null,
        access_token: accessToken,
        refresh_token: accessTokenSecret, // Store token secret in refresh_token field
        is_active: true,
        connected_at: new Date().toISOString(),
        scopes: ['tweet.read', 'tweet.write', 'users.read'],
        metadata: { manual_setup: true },
      };

      let connection;
      if (existingConnection) {
        // Update existing connection
        const { data, error } = await supabase
          .from('social_connections')
          .update(connectionData)
          .eq('id', existingConnection.id)
          .select()
          .single();
        
        if (error) throw error;
        connection = data;
      } else {
        // Create new connection
        const { data, error } = await supabase
          .from('social_connections')
          .insert(connectionData)
          .select()
          .single();
        
        if (error) throw error;
        connection = data;
      }

      console.log('Twitter connection saved:', connection.id);

      return new Response(
        JSON.stringify({
          success: true,
          connection: {
            id: connection.id,
            platform: connection.platform,
            username: connection.platform_username,
            isActive: connection.is_active,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other platforms (Facebook, Instagram, LinkedIn, TikTok) - OAuth flow
    // These will be implemented in Phase 2 and 3
    return new Response(
      JSON.stringify({
        success: false,
        error: `Platform ${platform} is not yet supported. Coming soon!`,
        supportedPlatforms: ['twitter'],
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Connect Social error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
