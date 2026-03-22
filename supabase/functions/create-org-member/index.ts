import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateMemberRequest {
  email: string;
  password: string;
  fullName?: string;
  organizationId: string;
  role: "admin" | "member" | "viewer";
}

Deno.serve(withPerf({ functionName: 'create-org-member' }, async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header to verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing authorization header");
    }

    // Verify the caller using the admin client with the user's token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !caller) {
      console.error("Auth error:", callerError);
      throw new Error("Unauthorized");
    }

    const callerId = caller.id;

    const { email, password, fullName, organizationId, role }: CreateMemberRequest = await req.json();

    console.log(`Creating member: ${email} for organization: ${organizationId}`);

    // Verify caller is admin of the organization
    const { data: callerMembership, error: membershipError } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", callerId)
      .single();

    if (membershipError || !callerMembership) {
      throw new Error("You are not a member of this organization");
    }

    if (callerMembership.role !== "owner" && callerMembership.role !== "admin") {
      throw new Error("Only owners and admins can add members");
    }

    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    let userId: string;

    if (existingProfile) {
      // User exists, check if already a member
      const { data: existingMember } = await supabaseAdmin
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", existingProfile.id)
        .single();

      if (existingMember) {
        throw new Error("Người dùng đã là thành viên của tổ chức");
      }

      userId = existingProfile.id;
      console.log(`User already exists with id: ${userId}`);
    } else {
      // Create new user with admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName || email.split("@")[0],
          skip_default_org: true, // Prevent trigger from creating a default workspace
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw new Error(`Không thể tạo tài khoản: ${createError.message}`);
      }

      userId = newUser.user.id;
      console.log(`Created new user with id: ${userId}`);
    }

    // Add user to organization
    const { error: addMemberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role: role,
        invited_by: callerId,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      });

    if (addMemberError) {
      console.error("Error adding member:", addMemberError);
      throw new Error(`Không thể thêm thành viên: ${addMemberError.message}`);
    }

    console.log(`Successfully added member ${email} to organization`);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        isNewUser: !existingProfile,
        message: existingProfile
          ? "Đã thêm thành viên hiện có vào tổ chức"
          : "Đã tạo tài khoản mới và thêm vào tổ chức",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-org-member:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}));
