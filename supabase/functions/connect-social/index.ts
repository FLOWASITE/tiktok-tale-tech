import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectRequest {
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'threads' | 'youtube';
  organizationId?: string;
  brandTemplateId?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  consumerKey?: string;
  consumerSecret?: string;
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
    const { platform, organizationId, brandTemplateId, accessToken, accessTokenSecret, consumerKey, consumerSecret, username } = body;

    if (!platform) {
      throw new Error('platform is required');
    }

    if (!brandTemplateId && !organizationId) {
      throw new Error('brandTemplateId or organizationId is required');
    }

    console.log(`Connecting ${platform} for brand ${brandTemplateId || 'N/A'}, org ${organizationId || 'N/A'}`);

    // If brandTemplateId provided, verify user has access to the brand
    if (brandTemplateId) {
      const { data: brand, error: brandError } = await supabase
        .from('brand_templates')
        .select('id, organization_id, user_id')
        .eq('id', brandTemplateId)
        .single();

      if (brandError || !brand) {
        throw new Error('Brand not found');
      }

      // Check if user owns the brand or is member of the org
      if (brand.user_id !== user.id) {
        if (brand.organization_id) {
          const { data: membership, error: memberError } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', brand.organization_id)
            .eq('user_id', user.id)
            .single();

          if (memberError || !membership) {
            throw new Error('Not authorized to access this brand');
          }
        } else {
          throw new Error('Not authorized to access this brand');
        }
      }
    } else if (organizationId) {
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
    }

    // For Twitter - using manual token approach
    if (platform === 'twitter') {
      if (!accessToken || !accessTokenSecret || !consumerKey || !consumerSecret) {
        // Return instructions for getting Twitter tokens
        return new Response(
          JSON.stringify({
            success: true,
            requiresManualSetup: true,
            instructions: {
              steps: [
                '1. Truy cập developer.twitter.com và tạo App',
                '2. Trong App Settings, chọn "Read and Write" permissions',
                '3. Copy API Key và API Secret',
                '4. Trong Keys and Tokens, tạo Access Token and Secret',
                '5. Copy các giá trị và nhập vào form',
              ],
              fields: [
                { key: 'consumerKey', label: 'API Key (Consumer Key)', required: true },
                { key: 'consumerSecret', label: 'API Secret (Consumer Secret)', required: true },
                { key: 'accessToken', label: 'Access Token', required: true },
                { key: 'accessTokenSecret', label: 'Access Token Secret', required: true },
              ],
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for existing connection
      let query = supabase
        .from('social_connections')
        .select('id')
        .eq('platform', 'twitter');

      if (brandTemplateId) {
        query = query.eq('brand_template_id', brandTemplateId);
      } else {
        query = query.eq('organization_id', organizationId);
      }

      const { data: existingConnection } = await query.maybeSingle();

      const connectionData = {
        organization_id: organizationId || null,
        brand_template_id: brandTemplateId || null,
        user_id: user.id,
        platform: 'twitter',
        platform_username: username || null,
        access_token: accessToken,
        refresh_token: accessTokenSecret,
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        is_active: true,
        connected_at: new Date().toISOString(),
        scopes: ['tweet.read', 'tweet.write', 'users.read'],
        metadata: { manual_setup: true },
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

    // For other platforms - not yet supported
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