export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brand_templates: {
        Row: {
          allow_emoji: boolean | null
          brand_guideline: string
          brand_name: string
          brand_positioning: string | null
          channel_overrides: Json | null
          compliance_rules: string[] | null
          created_at: string
          forbidden_words: string[] | null
          formality_level: string | null
          id: string
          include_logo: boolean
          industry: string[] | null
          is_default: boolean
          language_style: string[] | null
          logo_url: string | null
          name: string
          preferred_words: string[] | null
          primary_color: string | null
          tone_of_voice: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allow_emoji?: boolean | null
          brand_guideline: string
          brand_name: string
          brand_positioning?: string | null
          channel_overrides?: Json | null
          compliance_rules?: string[] | null
          created_at?: string
          forbidden_words?: string[] | null
          formality_level?: string | null
          id?: string
          include_logo?: boolean
          industry?: string[] | null
          is_default?: boolean
          language_style?: string[] | null
          logo_url?: string | null
          name: string
          preferred_words?: string[] | null
          primary_color?: string | null
          tone_of_voice?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allow_emoji?: boolean | null
          brand_guideline?: string
          brand_name?: string
          brand_positioning?: string | null
          channel_overrides?: Json | null
          compliance_rules?: string[] | null
          created_at?: string
          forbidden_words?: string[] | null
          formality_level?: string | null
          id?: string
          include_logo?: boolean
          industry?: string[] | null
          is_default?: boolean
          language_style?: string[] | null
          logo_url?: string | null
          name?: string
          preferred_words?: string[] | null
          primary_color?: string | null
          tone_of_voice?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      carousels: {
        Row: {
          ai_tool: Database["public"]["Enums"]["carousel_ai_tool"]
          brand_guideline: string | null
          brand_name: string
          caption_suggestion: string | null
          created_at: string
          cta_suggestion: string | null
          generated_images: Json | null
          id: string
          include_logo: boolean
          platform: Database["public"]["Enums"]["carousel_platform"]
          slide_count: number
          slides_content: Json
          title: string
          topic: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_tool?: Database["public"]["Enums"]["carousel_ai_tool"]
          brand_guideline?: string | null
          brand_name?: string
          caption_suggestion?: string | null
          created_at?: string
          cta_suggestion?: string | null
          generated_images?: Json | null
          id?: string
          include_logo?: boolean
          platform?: Database["public"]["Enums"]["carousel_platform"]
          slide_count?: number
          slides_content?: Json
          title: string
          topic: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_tool?: Database["public"]["Enums"]["carousel_ai_tool"]
          brand_guideline?: string | null
          brand_name?: string
          caption_suggestion?: string | null
          created_at?: string
          cta_suggestion?: string | null
          generated_images?: Json | null
          id?: string
          include_logo?: boolean
          platform?: Database["public"]["Enums"]["carousel_platform"]
          slide_count?: number
          slides_content?: Json
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      multi_channel_contents: {
        Row: {
          brand_guideline: string | null
          brand_name: string
          brand_template_id: string | null
          channel_images: Json | null
          content_goal: string
          created_at: string
          email_content: string | null
          facebook_content: string | null
          google_maps_content: string | null
          id: string
          industry: string | null
          instagram_content: string | null
          linkedin_content: string | null
          primary_color: string | null
          selected_channels: string[]
          status: string | null
          tags: string[] | null
          telegram_content: string | null
          title: string
          topic: string
          twitter_content: string | null
          updated_at: string
          user_id: string | null
          website_content: string | null
          youtube_content: string | null
          zalo_oa_content: string | null
        }
        Insert: {
          brand_guideline?: string | null
          brand_name: string
          brand_template_id?: string | null
          channel_images?: Json | null
          content_goal: string
          created_at?: string
          email_content?: string | null
          facebook_content?: string | null
          google_maps_content?: string | null
          id?: string
          industry?: string | null
          instagram_content?: string | null
          linkedin_content?: string | null
          primary_color?: string | null
          selected_channels: string[]
          status?: string | null
          tags?: string[] | null
          telegram_content?: string | null
          title: string
          topic: string
          twitter_content?: string | null
          updated_at?: string
          user_id?: string | null
          website_content?: string | null
          youtube_content?: string | null
          zalo_oa_content?: string | null
        }
        Update: {
          brand_guideline?: string | null
          brand_name?: string
          brand_template_id?: string | null
          channel_images?: Json | null
          content_goal?: string
          created_at?: string
          email_content?: string | null
          facebook_content?: string | null
          google_maps_content?: string | null
          id?: string
          industry?: string | null
          instagram_content?: string | null
          linkedin_content?: string | null
          primary_color?: string | null
          selected_channels?: string[]
          status?: string | null
          tags?: string[] | null
          telegram_content?: string | null
          title?: string
          topic?: string
          twitter_content?: string | null
          updated_at?: string
          user_id?: string | null
          website_content?: string | null
          youtube_content?: string | null
          zalo_oa_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multi_channel_contents_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          monthly_ai_edits: number
          monthly_carousels: number
          monthly_images: number
          monthly_multichannel: number
          monthly_scripts: number
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_monthly: number
          price_yearly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          monthly_ai_edits?: number
          monthly_carousels?: number
          monthly_images?: number
          monthly_multichannel?: number
          monthly_scripts?: number
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          monthly_ai_edits?: number
          monthly_carousels?: number
          monthly_images?: number
          monthly_multichannel?: number
          monthly_scripts?: number
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          character_type: string
          content: string
          created_at: string
          duration: number
          id: string
          title: string
          topic: string
          updated_at: string
          user_id: string | null
          video_type: string
        }
        Insert: {
          character_type?: string
          content: string
          created_at?: string
          duration?: number
          id?: string
          title: string
          topic: string
          updated_at?: string
          user_id?: string | null
          video_type?: string
        }
        Update: {
          character_type?: string
          content?: string
          created_at?: string
          duration?: number
          id?: string
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
          video_type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          metadata: Json | null
          payment_provider: string | null
          payment_reference: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          status: Database["public"]["Enums"]["subscription_status"]
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          payment_reference?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          payment_reference?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          reference_id: string | null
          usage_type: Database["public"]["Enums"]["usage_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          usage_type: Database["public"]["Enums"]["usage_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          usage_type?: Database["public"]["Enums"]["usage_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_use_feature: {
        Args: {
          _usage_type: Database["public"]["Enums"]["usage_type"]
          _user_id: string
        }
        Returns: boolean
      }
      get_user_usage: {
        Args: {
          _usage_type: Database["public"]["Enums"]["usage_type"]
          _user_id: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "pro" | "admin"
      carousel_ai_tool: "ideogram" | "midjourney" | "dalle" | "leonardo"
      carousel_platform: "facebook" | "tiktok"
      plan_type: "free" | "starter" | "pro" | "enterprise"
      subscription_status:
        | "active"
        | "cancelled"
        | "expired"
        | "pending"
        | "trial"
      usage_type:
        | "script"
        | "carousel"
        | "multichannel"
        | "image_generation"
        | "ai_edit"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "pro", "admin"],
      carousel_ai_tool: ["ideogram", "midjourney", "dalle", "leonardo"],
      carousel_platform: ["facebook", "tiktok"],
      plan_type: ["free", "starter", "pro", "enterprise"],
      subscription_status: [
        "active",
        "cancelled",
        "expired",
        "pending",
        "trial",
      ],
      usage_type: [
        "script",
        "carousel",
        "multichannel",
        "image_generation",
        "ai_edit",
      ],
    },
  },
} as const
