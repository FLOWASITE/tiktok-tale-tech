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
        }
        Insert: {
          allow_emoji?: boolean | null
          brand_guideline: string
          brand_name: string
          brand_positioning?: string | null
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
        }
        Update: {
          allow_emoji?: boolean | null
          brand_guideline?: string
          brand_name?: string
          brand_positioning?: string | null
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
        }
        Relationships: []
      }
      multi_channel_contents: {
        Row: {
          brand_guideline: string | null
          brand_name: string
          brand_template_id: string | null
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
          title: string
          topic: string
          twitter_content: string | null
          updated_at: string
          website_content: string | null
          youtube_content: string | null
          zalo_oa_content: string | null
        }
        Insert: {
          brand_guideline?: string | null
          brand_name: string
          brand_template_id?: string | null
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
          title: string
          topic: string
          twitter_content?: string | null
          updated_at?: string
          website_content?: string | null
          youtube_content?: string | null
          zalo_oa_content?: string | null
        }
        Update: {
          brand_guideline?: string | null
          brand_name?: string
          brand_template_id?: string | null
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
          title?: string
          topic?: string
          twitter_content?: string | null
          updated_at?: string
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
          video_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      carousel_ai_tool: "ideogram" | "midjourney" | "dalle" | "leonardo"
      carousel_platform: "facebook" | "tiktok"
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
      carousel_ai_tool: ["ideogram", "midjourney", "dalle", "leonardo"],
      carousel_platform: ["facebook", "tiktok"],
    },
  },
} as const
