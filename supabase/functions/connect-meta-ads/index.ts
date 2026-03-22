import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_GRAPH_API = 'https://graph.facebook.com/v19.0';

interface ConnectRequest {
  action?: 'connect' | 'verify' | 'select_account';
  appId?: string;
  appSecret?: string;
  accessToken?: string;
  adAccountId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  connectionId?: string;
}

Deno.Deno.serve(withPerf({ functionName: 'connect-meta-ads' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ConnectRequest = await req.json();
    const action = body.action || 'connect';

    console.log(`[connect-meta-ads] Action: ${action}, User: ${user.id}`);

    // Handle verify action
    if (action === 'verify' && body.connectionId) {
      return await handleVerify(supabase, body.connectionId);
    }

    // Handle select_account action (after user selects an ad account)
    if (action === 'select_account' && body.adAccountId && body.connectionId) {
      return await handleSelectAccount(supabase, body);
    }

    // Handle initial connect
    if (!body.appId || !body.appSecret || !body.accessToken) {
      return new Response(
        JSON.stringify({ error: 'Thiếu thông tin: App ID, App Secret và Access Token là bắt buộc' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.organizationId && !body.brandTemplateId) {
      return new Response(
        JSON.stringify({ error: 'Cần có organizationId hoặc brandTemplateId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Exchange for long-lived token
    console.log('[connect-meta-ads] Exchanging for long-lived token...');
    const longLivedToken = await exchangeForLongLivedToken(
      body.appId,
      body.appSecret,
      body.accessToken
    );

    if (!longLivedToken) {
      return new Response(
        JSON.stringify({ error: 'Không thể exchange token. Vui lòng kiểm tra credentials.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[connect-meta-ads] Token exchanged successfully');

    // Step 2: Verify permissions
    const permissions = await verifyPermissions(longLivedToken);
    console.log('[connect-meta-ads] Permissions:', permissions);

    if (!permissions.includes('ads_read')) {
      return new Response(
        JSON.stringify({ 
          error: 'Thiếu quyền ads_read. Vui lòng cấp quyền cho App trong Facebook Business Settings.',
          requiredPermissions: ['ads_read'],
          currentPermissions: permissions,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Fetch ad accounts
    const adAccounts = await fetchAdAccounts(longLivedToken);
    console.log(`[connect-meta-ads] Found ${adAccounts.length} ad accounts`);

    if (adAccounts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Không tìm thấy Ad Account nào. Vui lòng kiểm tra quyền truy cập.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If adAccountId is provided, save directly
    if (body.adAccountId) {
      const selectedAccount = adAccounts.find(a => a.id === body.adAccountId || a.account_id === body.adAccountId);
      if (!selectedAccount) {
        return new Response(
          JSON.stringify({ error: 'Ad Account không hợp lệ' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const connection = await saveConnection(supabase, {
        userId: user.id,
        organizationId: body.organizationId,
        brandTemplateId: body.brandTemplateId,
        appId: body.appId,
        accessToken: longLivedToken,
        adAccount: selectedAccount,
      });

      return new Response(
        JSON.stringify({ success: true, connection }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If only 1 account, auto-select
    if (adAccounts.length === 1) {
      const connection = await saveConnection(supabase, {
        userId: user.id,
        organizationId: body.organizationId,
        brandTemplateId: body.brandTemplateId,
        appId: body.appId,
        accessToken: longLivedToken,
        adAccount: adAccounts[0],
      });

      return new Response(
        JSON.stringify({ success: true, connection }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Multiple accounts - need user to select
    // Save temporary connection without ad_account_id
    const { data: tempConnection, error: insertError } = await supabase
      .from('social_connections')
      .insert({
        user_id: user.id,
        organization_id: body.organizationId || null,
        brand_template_id: body.brandTemplateId || null,
        platform: 'facebook',
        connection_type: 'meta_ads',
        app_id: body.appId,
        access_token: longLivedToken,
        is_active: false, // Not active until account is selected
      })
      .select()
      .single();

    if (insertError) {
      console.error('[connect-meta-ads] Error saving temp connection:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        needsAccountSelection: true,
        connectionId: tempConnection.id,
        adAccounts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[connect-meta-ads] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

async function exchangeForLongLivedToken(appId: string, appSecret: string, shortToken: string): Promise<string | null> {
  try {
    const url = new URL(`${META_GRAPH_API}/oauth/access_token`);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('fb_exchange_token', shortToken);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      console.error('[connect-meta-ads] Token exchange error:', data.error);
      return null;
    }

    return data.access_token;
  } catch (error) {
    console.error('[connect-meta-ads] Token exchange error:', error);
    return null;
  }
}

async function verifyPermissions(accessToken: string): Promise<string[]> {
  try {
    const url = `${META_GRAPH_API}/me/permissions?access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('[connect-meta-ads] Permissions error:', data.error);
      return [];
    }

    return data.data
      .filter((p: any) => p.status === 'granted')
      .map((p: any) => p.permission);
  } catch (error) {
    console.error('[connect-meta-ads] Permissions error:', error);
    return [];
  }
}

async function fetchAdAccounts(accessToken: string): Promise<any[]> {
  try {
    const url = `${META_GRAPH_API}/me/adaccounts?fields=id,account_id,name,currency,account_status,business_name,amount_spent,balance&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('[connect-meta-ads] Ad accounts error:', data.error);
      return [];
    }

    return data.data || [];
  } catch (error) {
    console.error('[connect-meta-ads] Ad accounts error:', error);
    return [];
  }
}

async function saveConnection(supabase: any, params: {
  userId: string;
  organizationId?: string;
  brandTemplateId?: string;
  appId: string;
  accessToken: string;
  adAccount: any;
}) {
  const { data, error } = await supabase
    .from('social_connections')
    .insert({
      user_id: params.userId,
      organization_id: params.organizationId || null,
      brand_template_id: params.brandTemplateId || null,
      platform: 'facebook',
      connection_type: 'meta_ads',
      app_id: params.appId,
      access_token: params.accessToken,
      ad_account_id: params.adAccount.id,
      ad_account_name: params.adAccount.name,
      business_id: params.adAccount.business_name || null,
      platform_user_id: params.adAccount.account_id,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[connect-meta-ads] Error saving connection:', error);
    throw error;
  }

  return data;
}

async function handleVerify(supabase: any, connectionId: string) {
  const { data: connection, error } = await supabase
    .from('social_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Connection not found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = `${META_GRAPH_API}/me?access_token=${connection.access_token}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return new Response(
        JSON.stringify({ valid: false, error: data.error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true, userId: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSelectAccount(supabase: any, body: ConnectRequest) {
  const { data: connection, error: fetchError } = await supabase
    .from('social_connections')
    .select('*')
    .eq('id', body.connectionId)
    .single();

  if (fetchError || !connection) {
    return new Response(
      JSON.stringify({ error: 'Connection not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch ad accounts again to get details
  const adAccounts = await fetchAdAccounts(connection.access_token);
  const selectedAccount = adAccounts.find(a => a.id === body.adAccountId || a.account_id === body.adAccountId);

  if (!selectedAccount) {
    return new Response(
      JSON.stringify({ error: 'Ad Account không hợp lệ' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: updatedConnection, error: updateError } = await supabase
    .from('social_connections')
    .update({
      ad_account_id: selectedAccount.id,
      ad_account_name: selectedAccount.name,
      business_id: selectedAccount.business_name || null,
      platform_user_id: selectedAccount.account_id,
      is_active: true,
    })
    .eq('id', body.connectionId)
    .select()
    .single();

  if (updateError) {
    return new Response(
      JSON.stringify({ error: updateError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, connection: updatedConnection }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
