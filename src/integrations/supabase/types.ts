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
      ai_response_cache: {
        Row: {
          brand_template_id: string | null
          brand_voice_version: string | null
          cache_key: string
          cache_scope: string
          created_at: string
          expires_at: string
          function_name: string
          hit_count: number
          id: string
          industry_memory_version: string | null
          input_hash: string
          last_hit_at: string | null
          organization_id: string | null
          response_data: Json
          response_schema_version: string
        }
        Insert: {
          brand_template_id?: string | null
          brand_voice_version?: string | null
          cache_key: string
          cache_scope?: string
          created_at?: string
          expires_at: string
          function_name: string
          hit_count?: number
          id?: string
          industry_memory_version?: string | null
          input_hash: string
          last_hit_at?: string | null
          organization_id?: string | null
          response_data: Json
          response_schema_version?: string
        }
        Update: {
          brand_template_id?: string | null
          brand_voice_version?: string | null
          cache_key?: string
          cache_scope?: string
          created_at?: string
          expires_at?: string
          function_name?: string
          hit_count?: number
          id?: string
          industry_memory_version?: string | null
          input_hash?: string
          last_hit_at?: string | null
          organization_id?: string | null
          response_data?: Json
          response_schema_version?: string
        }
        Relationships: []
      }
      approval_assignments: {
        Row: {
          approver_id: string
          created_at: string | null
          created_by: string | null
          creator_id: string
          id: string
          organization_id: string
        }
        Insert: {
          approver_id: string
          created_at?: string | null
          created_by?: string | null
          creator_id: string
          id?: string
          organization_id: string
        }
        Update: {
          approver_id?: string
          created_at?: string | null
          created_by?: string | null
          creator_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_logs: {
        Row: {
          action: string
          content_id: string
          created_at: string
          id: string
          industry_memory_snapshot: Json | null
          notes: string | null
          organization_id: string | null
          performed_by: string
        }
        Insert: {
          action: string
          content_id: string
          created_at?: string
          id?: string
          industry_memory_snapshot?: Json | null
          notes?: string | null
          organization_id?: string | null
          performed_by: string
        }
        Update: {
          action?: string
          content_id?: string
          created_at?: string
          id?: string
          industry_memory_snapshot?: Json | null
          notes?: string | null
          organization_id?: string | null
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_logs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "multi_channel_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_templates: {
        Row: {
          allow_emoji: boolean | null
          brand_guideline: string
          brand_name: string
          brand_positioning: string | null
          channel_overrides: Json | null
          compliance_rules: string[] | null
          content_pillars: Json | null
          country_code: string | null
          created_at: string
          forbidden_words: string[] | null
          formality_level: string | null
          id: string
          include_logo: boolean
          industry: string[] | null
          industry_template_id: string | null
          is_default: boolean
          language_style: string[] | null
          logo_url: string | null
          name: string
          organization_id: string | null
          preferred_words: string[] | null
          primary_color: string | null
          sample_texts: Json | null
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
          content_pillars?: Json | null
          country_code?: string | null
          created_at?: string
          forbidden_words?: string[] | null
          formality_level?: string | null
          id?: string
          include_logo?: boolean
          industry?: string[] | null
          industry_template_id?: string | null
          is_default?: boolean
          language_style?: string[] | null
          logo_url?: string | null
          name: string
          organization_id?: string | null
          preferred_words?: string[] | null
          primary_color?: string | null
          sample_texts?: Json | null
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
          content_pillars?: Json | null
          country_code?: string | null
          created_at?: string
          forbidden_words?: string[] | null
          formality_level?: string | null
          id?: string
          include_logo?: boolean
          industry?: string[] | null
          industry_template_id?: string | null
          is_default?: boolean
          language_style?: string[] | null
          logo_url?: string | null
          name?: string
          organization_id?: string | null
          preferred_words?: string[] | null
          primary_color?: string | null
          sample_texts?: Json | null
          tone_of_voice?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_templates_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_memory_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_templates_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_voice_variants: {
        Row: {
          allow_emoji: boolean | null
          brand_positioning: string | null
          brand_template_id: string
          content_count: number | null
          created_at: string | null
          forbidden_words: string[] | null
          formality_level: string | null
          id: string
          is_control: boolean | null
          language_style: string[] | null
          name: string
          organization_id: string | null
          preferred_words: string[] | null
          sample_text: string | null
          sample_texts: Json | null
          tone_of_voice: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allow_emoji?: boolean | null
          brand_positioning?: string | null
          brand_template_id: string
          content_count?: number | null
          created_at?: string | null
          forbidden_words?: string[] | null
          formality_level?: string | null
          id?: string
          is_control?: boolean | null
          language_style?: string[] | null
          name: string
          organization_id?: string | null
          preferred_words?: string[] | null
          sample_text?: string | null
          sample_texts?: Json | null
          tone_of_voice?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allow_emoji?: boolean | null
          brand_positioning?: string | null
          brand_template_id?: string
          content_count?: number | null
          created_at?: string | null
          forbidden_words?: string[] | null
          formality_level?: string | null
          id?: string
          is_control?: boolean | null
          language_style?: string[] | null
          name?: string
          organization_id?: string | null
          preferred_words?: string[] | null
          sample_text?: string | null
          sample_texts?: Json | null
          tone_of_voice?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_voice_variants_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_voice_variants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          industry_template_id: string | null
          industry_template_version: string | null
          organization_id: string | null
          platform: Database["public"]["Enums"]["carousel_platform"]
          slide_count: number
          slides_content: Json
          status: string | null
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
          industry_template_id?: string | null
          industry_template_version?: string | null
          organization_id?: string | null
          platform?: Database["public"]["Enums"]["carousel_platform"]
          slide_count?: number
          slides_content?: Json
          status?: string | null
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
          industry_template_id?: string | null
          industry_template_version?: string | null
          organization_id?: string | null
          platform?: Database["public"]["Enums"]["carousel_platform"]
          slide_count?: number
          slides_content?: Json
          status?: string | null
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carousels_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_memory_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousels_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_edited: boolean | null
          organization_id: string
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          organization_id: string
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          organization_id?: string
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assignments: {
        Row: {
          assigned_by: string
          assigned_to: string
          channel: string
          completed_at: string | null
          content_id: string
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          channel: string
          completed_at?: string | null
          content_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          channel?: string
          completed_at?: string | null
          content_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_publishing_logs: {
        Row: {
          action: string
          channel: string
          content_id: string | null
          created_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          organization_id: string | null
          performed_at: string | null
          performed_by: string | null
          schedule_id: string | null
        }
        Insert: {
          action: string
          channel: string
          content_id?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          performed_at?: string | null
          performed_by?: string | null
          schedule_id?: string | null
        }
        Update: {
          action?: string
          channel?: string
          content_id?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          performed_at?: string | null
          performed_by?: string | null
          schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_publishing_logs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "multi_channel_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_publishing_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_publishing_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "content_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      content_schedules: {
        Row: {
          channel: string
          content_id: string
          created_at: string | null
          created_by: string | null
          external_post_id: string | null
          id: string
          notes: string | null
          organization_id: string | null
          publish_error: string | null
          publish_status: string | null
          published_at: string | null
          scheduled_at: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          channel: string
          content_id: string
          created_at?: string | null
          created_by?: string | null
          external_post_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          publish_error?: string | null
          publish_status?: string | null
          published_at?: string | null
          scheduled_at: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: string
          content_id?: string
          created_at?: string | null
          created_by?: string | null
          external_post_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          publish_error?: string | null
          publish_status?: string | null
          published_at?: string | null
          scheduled_at?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_schedules_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "multi_channel_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          default_language: string
          flag_emoji: string | null
          id: string
          is_active: boolean
          name: string
          native_name: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_language?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean
          name: string
          native_name?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_language?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean
          name?: string
          native_name?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_personas: {
        Row: {
          age_range: string | null
          avatar_emoji: string | null
          brand_template_id: string | null
          buying_triggers: string[] | null
          created_at: string | null
          desires: string[] | null
          gender: string | null
          id: string
          income_level: string | null
          information_sources: string[] | null
          interests: string[] | null
          is_primary: boolean | null
          location: string | null
          name: string
          objections: string[] | null
          occupation: string | null
          organization_id: string | null
          pain_points: string[] | null
          preferred_channels: string[] | null
          typical_funnel_stage: string | null
          updated_at: string | null
          user_id: string | null
          values: string[] | null
        }
        Insert: {
          age_range?: string | null
          avatar_emoji?: string | null
          brand_template_id?: string | null
          buying_triggers?: string[] | null
          created_at?: string | null
          desires?: string[] | null
          gender?: string | null
          id?: string
          income_level?: string | null
          information_sources?: string[] | null
          interests?: string[] | null
          is_primary?: boolean | null
          location?: string | null
          name: string
          objections?: string[] | null
          occupation?: string | null
          organization_id?: string | null
          pain_points?: string[] | null
          preferred_channels?: string[] | null
          typical_funnel_stage?: string | null
          updated_at?: string | null
          user_id?: string | null
          values?: string[] | null
        }
        Update: {
          age_range?: string | null
          avatar_emoji?: string | null
          brand_template_id?: string | null
          buying_triggers?: string[] | null
          created_at?: string | null
          desires?: string[] | null
          gender?: string | null
          id?: string
          income_level?: string | null
          information_sources?: string[] | null
          interests?: string[] | null
          is_primary?: boolean | null
          location?: string | null
          name?: string
          objections?: string[] | null
          occupation?: string | null
          organization_id?: string | null
          pain_points?: string[] | null
          preferred_channels?: string[] | null
          typical_funnel_stage?: string | null
          updated_at?: string | null
          user_id?: string | null
          values?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_personas_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_personas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hook_templates: {
        Row: {
          compatible_formality: string[] | null
          compatible_tones: string[] | null
          created_at: string | null
          duration_fit: string[] | null
          engagement_level: string | null
          framework: string
          id: string
          industries: string[] | null
          is_active: boolean | null
          name: string
          opening_line: string
          platforms: string[] | null
          psychology_reason: string | null
          sort_order: number | null
          text_overlay: string | null
          updated_at: string | null
          visual_direction: string | null
        }
        Insert: {
          compatible_formality?: string[] | null
          compatible_tones?: string[] | null
          created_at?: string | null
          duration_fit?: string[] | null
          engagement_level?: string | null
          framework: string
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          name: string
          opening_line: string
          platforms?: string[] | null
          psychology_reason?: string | null
          sort_order?: number | null
          text_overlay?: string | null
          updated_at?: string | null
          visual_direction?: string | null
        }
        Update: {
          compatible_formality?: string[] | null
          compatible_tones?: string[] | null
          created_at?: string | null
          duration_fit?: string[] | null
          engagement_level?: string | null
          framework?: string
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          name?: string
          opening_line?: string
          platforms?: string[] | null
          psychology_reason?: string | null
          sort_order?: number | null
          text_overlay?: string | null
          updated_at?: string | null
          visual_direction?: string | null
        }
        Relationships: []
      }
      industry_categories: {
        Row: {
          code: string
          color: string | null
          created_at: string
          icon_name: string
          id: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          icon_name: string
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      industry_category_translations: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          language_code: string
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          language_code: string
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          language_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "industry_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_memory_versions: {
        Row: {
          brand_voice: Json | null
          change_notes: string | null
          changed_by: string | null
          claim_restrictions: Json | null
          compliance_rules: Json | null
          created_at: string | null
          forbidden_terms: string[] | null
          id: string
          industry_template_id: string
          version: string
        }
        Insert: {
          brand_voice?: Json | null
          change_notes?: string | null
          changed_by?: string | null
          claim_restrictions?: Json | null
          compliance_rules?: Json | null
          created_at?: string | null
          forbidden_terms?: string[] | null
          id?: string
          industry_template_id: string
          version: string
        }
        Update: {
          brand_voice?: Json | null
          change_notes?: string | null
          changed_by?: string | null
          claim_restrictions?: Json | null
          compliance_rules?: Json | null
          created_at?: string | null
          forbidden_terms?: string[] | null
          id?: string
          industry_template_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_memory_versions_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_memory_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_memory_versions_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_template_translations: {
        Row: {
          brand_positioning: string | null
          created_at: string
          forbidden_words: string[] | null
          id: string
          industry_template_id: string
          language_code: string
          name: string
          preferred_words: string[] | null
          short_name: string | null
          updated_at: string
        }
        Insert: {
          brand_positioning?: string | null
          created_at?: string
          forbidden_words?: string[] | null
          id?: string
          industry_template_id: string
          language_code: string
          name: string
          preferred_words?: string[] | null
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          brand_positioning?: string | null
          created_at?: string
          forbidden_words?: string[] | null
          id?: string
          industry_template_id?: string
          language_code?: string
          name?: string
          preferred_words?: string[] | null
          short_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_template_translations_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_memory_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_template_translations_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_templates: {
        Row: {
          argument_patterns: Json | null
          brand_voice: Json
          category_id: string | null
          channel_settings: Json | null
          claim_restrictions: Json | null
          code: string
          compliance_rules: Json | null
          country_id: string
          created_at: string
          created_by: string | null
          forbidden_terms: string[] | null
          id: string
          is_active: boolean
          metadata: Json | null
          published_at: string | null
          published_by: string | null
          seasonal_events: Json | null
          sort_order: number
          status: Database["public"]["Enums"]["industry_pack_status"]
          system_rules: Json | null
          target_audience: string
          updated_at: string
          updated_by: string | null
          version: string | null
        }
        Insert: {
          argument_patterns?: Json | null
          brand_voice?: Json
          category_id?: string | null
          channel_settings?: Json | null
          claim_restrictions?: Json | null
          code: string
          compliance_rules?: Json | null
          country_id: string
          created_at?: string
          created_by?: string | null
          forbidden_terms?: string[] | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          published_at?: string | null
          published_by?: string | null
          seasonal_events?: Json | null
          sort_order?: number
          status?: Database["public"]["Enums"]["industry_pack_status"]
          system_rules?: Json | null
          target_audience?: string
          updated_at?: string
          updated_by?: string | null
          version?: string | null
        }
        Update: {
          argument_patterns?: Json | null
          brand_voice?: Json
          category_id?: string | null
          channel_settings?: Json | null
          claim_restrictions?: Json | null
          code?: string
          compliance_rules?: Json | null
          country_id?: string
          created_at?: string
          created_by?: string | null
          forbidden_terms?: string[] | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          published_at?: string | null
          published_by?: string | null
          seasonal_events?: Json | null
          sort_order?: number
          status?: Database["public"]["Enums"]["industry_pack_status"]
          system_rules?: Json | null
          target_audience?: string
          updated_at?: string
          updated_by?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "industry_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_templates_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_templates_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "industry_memory_packs"
            referencedColumns: ["country_id"]
          },
        ]
      }
      multi_channel_contents: {
        Row: {
          brand_guideline: string | null
          brand_name: string
          brand_template_id: string | null
          brand_voice_variant_id: string | null
          channel_images: Json | null
          channel_statuses: Json | null
          content_calendar_color: string | null
          content_goal: string
          created_at: string
          deadline: string | null
          email_content: string | null
          facebook_content: string | null
          google_maps_content: string | null
          id: string
          industry: string | null
          industry_template_version: string | null
          instagram_content: string | null
          linkedin_content: string | null
          organization_id: string | null
          primary_color: string | null
          priority: string | null
          selected_channels: string[]
          status: string | null
          tags: string[] | null
          telegram_content: string | null
          threads_content: string | null
          tiktok_content: string | null
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
          brand_voice_variant_id?: string | null
          channel_images?: Json | null
          channel_statuses?: Json | null
          content_calendar_color?: string | null
          content_goal: string
          created_at?: string
          deadline?: string | null
          email_content?: string | null
          facebook_content?: string | null
          google_maps_content?: string | null
          id?: string
          industry?: string | null
          industry_template_version?: string | null
          instagram_content?: string | null
          linkedin_content?: string | null
          organization_id?: string | null
          primary_color?: string | null
          priority?: string | null
          selected_channels: string[]
          status?: string | null
          tags?: string[] | null
          telegram_content?: string | null
          threads_content?: string | null
          tiktok_content?: string | null
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
          brand_voice_variant_id?: string | null
          channel_images?: Json | null
          channel_statuses?: Json | null
          content_calendar_color?: string | null
          content_goal?: string
          created_at?: string
          deadline?: string | null
          email_content?: string | null
          facebook_content?: string | null
          google_maps_content?: string | null
          id?: string
          industry?: string | null
          industry_template_version?: string | null
          instagram_content?: string | null
          linkedin_content?: string | null
          organization_id?: string | null
          primary_color?: string | null
          priority?: string | null
          selected_channels?: string[]
          status?: string | null
          tags?: string[] | null
          telegram_content?: string | null
          threads_content?: string | null
          tiktok_content?: string | null
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
          {
            foreignKeyName: "multi_channel_contents_brand_voice_variant_id_fkey"
            columns: ["brand_voice_variant_id"]
            isOneToOne: false
            referencedRelation: "brand_voice_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multi_channel_contents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          organization_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          organization_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          organization_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          approver_roles: string[] | null
          auto_submit_review: boolean | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          primary_color: string | null
          skip_approval: boolean | null
          slug: string
          updated_at: string
          use_specific_approvers: boolean | null
        }
        Insert: {
          approver_roles?: string[] | null
          auto_submit_review?: boolean | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          primary_color?: string | null
          skip_approval?: boolean | null
          slug: string
          updated_at?: string
          use_specific_approvers?: boolean | null
        }
        Update: {
          approver_roles?: string[] | null
          auto_submit_review?: boolean | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          primary_color?: string | null
          skip_approval?: boolean | null
          slug?: string
          updated_at?: string
          use_specific_approvers?: boolean | null
        }
        Relationships: []
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
      prompt_analytics: {
        Row: {
          brand_template_id: string | null
          content_id: string | null
          context_richness_score: number | null
          created_at: string | null
          edit_percentage: number | null
          execution_time_ms: number | null
          function_name: string
          id: string
          learning_data_score: number | null
          model_used: string | null
          organization_id: string | null
          output_accepted: boolean | null
          performance_score: number | null
          token_count: number | null
          user_edited: boolean | null
        }
        Insert: {
          brand_template_id?: string | null
          content_id?: string | null
          context_richness_score?: number | null
          created_at?: string | null
          edit_percentage?: number | null
          execution_time_ms?: number | null
          function_name: string
          id?: string
          learning_data_score?: number | null
          model_used?: string | null
          organization_id?: string | null
          output_accepted?: boolean | null
          performance_score?: number | null
          token_count?: number | null
          user_edited?: boolean | null
        }
        Update: {
          brand_template_id?: string | null
          content_id?: string | null
          context_richness_score?: number | null
          created_at?: string | null
          edit_percentage?: number | null
          execution_time_ms?: number | null
          function_name?: string
          id?: string
          learning_data_score?: number | null
          model_used?: string | null
          organization_id?: string | null
          output_accepted?: boolean | null
          performance_score?: number | null
          token_count?: number | null
          user_edited?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_analytics_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          brand_template_id: string | null
          character_type: string
          content: string
          created_at: string
          dialogue_style: string | null
          duration: number
          id: string
          industry_template_id: string | null
          industry_template_version: string | null
          organization_id: string | null
          script_purpose: string
          status: string | null
          title: string
          topic: string
          updated_at: string
          user_id: string | null
          video_type: string
          voice_region: string | null
        }
        Insert: {
          brand_template_id?: string | null
          character_type?: string
          content: string
          created_at?: string
          dialogue_style?: string | null
          duration?: number
          id?: string
          industry_template_id?: string | null
          industry_template_version?: string | null
          organization_id?: string | null
          script_purpose?: string
          status?: string | null
          title: string
          topic: string
          updated_at?: string
          user_id?: string | null
          video_type?: string
          voice_region?: string | null
        }
        Update: {
          brand_template_id?: string | null
          character_type?: string
          content?: string
          created_at?: string
          dialogue_style?: string | null
          duration?: number
          id?: string
          industry_template_id?: string | null
          industry_template_version?: string | null
          organization_id?: string | null
          script_purpose?: string
          status?: string | null
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
          video_type?: string
          voice_region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_memory_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboards: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          scenes: Json
          script_id: string | null
          style_notes: string | null
          title: string
          total_duration: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          scenes?: Json
          script_id?: string | null
          style_notes?: string | null
          title: string
          total_duration?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          scenes?: Json
          script_id?: string | null
          style_notes?: string | null
          title?: string
          total_duration?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storyboards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyboards_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
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
      topic_history: {
        Row: {
          actual_engagement: Json | null
          brand_template_id: string | null
          category: string
          content_goal: string
          content_id: string | null
          content_type: string | null
          created_at: string | null
          feedback: string | null
          feedback_note: string | null
          format: string
          id: string
          is_favorite: boolean | null
          organization_id: string | null
          performance_score: number | null
          pillar: string | null
          published_at: string | null
          reasoning: string | null
          related_keywords: string[] | null
          scores: Json | null
          topic: string
          usage_status: string | null
          used_at: string | null
          user_id: string | null
          was_used: boolean | null
        }
        Insert: {
          actual_engagement?: Json | null
          brand_template_id?: string | null
          category: string
          content_goal: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          feedback?: string | null
          feedback_note?: string | null
          format: string
          id?: string
          is_favorite?: boolean | null
          organization_id?: string | null
          performance_score?: number | null
          pillar?: string | null
          published_at?: string | null
          reasoning?: string | null
          related_keywords?: string[] | null
          scores?: Json | null
          topic: string
          usage_status?: string | null
          used_at?: string | null
          user_id?: string | null
          was_used?: boolean | null
        }
        Update: {
          actual_engagement?: Json | null
          brand_template_id?: string | null
          category?: string
          content_goal?: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          feedback?: string | null
          feedback_note?: string | null
          format?: string
          id?: string
          is_favorite?: boolean | null
          organization_id?: string | null
          performance_score?: number | null
          pillar?: string | null
          published_at?: string | null
          reasoning?: string | null
          related_keywords?: string[] | null
          scores?: Json | null
          topic?: string
          usage_status?: string | null
          used_at?: string | null
          user_id?: string | null
          was_used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_history_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      user_saved_hooks: {
        Row: {
          brand_template_id: string | null
          collection_name: string | null
          created_at: string | null
          customized_opening_line: string | null
          framework: string
          hook_template_id: string | null
          id: string
          is_favorite: boolean | null
          notes: string | null
          organization_id: string | null
          original_opening_line: string
          text_overlay: string | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
          visual_direction: string | null
        }
        Insert: {
          brand_template_id?: string | null
          collection_name?: string | null
          created_at?: string | null
          customized_opening_line?: string | null
          framework: string
          hook_template_id?: string | null
          id?: string
          is_favorite?: boolean | null
          notes?: string | null
          organization_id?: string | null
          original_opening_line: string
          text_overlay?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          visual_direction?: string | null
        }
        Update: {
          brand_template_id?: string | null
          collection_name?: string | null
          created_at?: string | null
          customized_opening_line?: string | null
          framework?: string
          hook_template_id?: string | null
          id?: string
          is_favorite?: boolean | null
          notes?: string | null
          organization_id?: string | null
          original_opening_line?: string
          text_overlay?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          visual_direction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_hooks_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_hooks_hook_template_id_fkey"
            columns: ["hook_template_id"]
            isOneToOne: false
            referencedRelation: "hook_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      industry_memory_packs: {
        Row: {
          category_code: string | null
          category_color: string | null
          category_icon: string | null
          category_name: string | null
          claim_restrictions_count: number | null
          code: string | null
          compliance_rules_count: number | null
          country_code: string | null
          country_id: string | null
          country_name: string | null
          created_at: string | null
          flag_emoji: string | null
          forbidden_terms_count: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          published_at: string | null
          published_by: string | null
          short_name: string | null
          status: Database["public"]["Enums"]["industry_pack_status"] | null
          target_audience: string | null
          updated_at: string | null
          version: string | null
          version_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_use_feature: {
        Args: {
          _usage_type: Database["public"]["Enums"]["usage_type"]
          _user_id: string
        }
        Returns: boolean
      }
      cleanup_expired_cache: { Args: never; Returns: number }
      get_cache_stats: {
        Args: { p_organization_id?: string }
        Returns: {
          avg_hit_count: number
          cache_scope: string
          function_name: string
          newest_entry: string
          oldest_entry: string
          total_entries: number
          total_hits: number
        }[]
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_usage: {
        Args: {
          _usage_type: Database["public"]["Enums"]["usage_type"]
          _user_id: string
        }
        Returns: number
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cache_hit: { Args: { p_cache_key: string }; Returns: undefined }
      increment_industry_version: {
        Args: { current_version: string }
        Returns: string
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "pro" | "admin"
      carousel_ai_tool: "ideogram" | "midjourney" | "dalle" | "leonardo"
      carousel_platform: "facebook" | "tiktok"
      industry_pack_status: "draft" | "stable" | "deprecated"
      org_role: "owner" | "admin" | "member" | "viewer"
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
      industry_pack_status: ["draft", "stable", "deprecated"],
      org_role: ["owner", "admin", "member", "viewer"],
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
