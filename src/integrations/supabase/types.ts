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
      ad_copies: {
        Row: {
          audience_brief: string | null
          brand_template_id: string | null
          campaign_id: string | null
          created_at: string | null
          funnel_stage: Database["public"]["Enums"]["ad_funnel_stage"] | null
          id: string
          industry_template_id: string | null
          industry_template_version: string | null
          landing_url: string | null
          objective: Database["public"]["Enums"]["ad_objective"]
          organization_id: string | null
          persona_id: string | null
          platform: Database["public"]["Enums"]["ad_platform"]
          product_id: string | null
          saved_audience_id: string | null
          sequence_stage_id: string | null
          status: string | null
          title: string
          topic: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          audience_brief?: string | null
          brand_template_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          funnel_stage?: Database["public"]["Enums"]["ad_funnel_stage"] | null
          id?: string
          industry_template_id?: string | null
          industry_template_version?: string | null
          landing_url?: string | null
          objective?: Database["public"]["Enums"]["ad_objective"]
          organization_id?: string | null
          persona_id?: string | null
          platform?: Database["public"]["Enums"]["ad_platform"]
          product_id?: string | null
          saved_audience_id?: string | null
          sequence_stage_id?: string | null
          status?: string | null
          title: string
          topic: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          audience_brief?: string | null
          brand_template_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          funnel_stage?: Database["public"]["Enums"]["ad_funnel_stage"] | null
          id?: string
          industry_template_id?: string | null
          industry_template_version?: string | null
          landing_url?: string | null
          objective?: Database["public"]["Enums"]["ad_objective"]
          organization_id?: string | null
          persona_id?: string | null
          platform?: Database["public"]["Enums"]["ad_platform"]
          product_id?: string | null
          saved_audience_id?: string | null
          sequence_stage_id?: string | null
          status?: string | null
          title?: string
          topic?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_copies_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copies_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copies_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_memory_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copies_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copies_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "customer_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "brand_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copies_saved_audience_id_fkey"
            columns: ["saved_audience_id"]
            isOneToOne: false
            referencedRelation: "saved_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copies_sequence_stage_id_fkey"
            columns: ["sequence_stage_id"]
            isOneToOne: false
            referencedRelation: "ad_sequence_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_copy_ab_results: {
        Row: {
          ab_test_id: string
          clicks: number | null
          conversion_rate: number | null
          conversions: number | null
          cpc: number | null
          ctr: number | null
          id: string
          impressions: number | null
          logged_at: string
          spend: number | null
          updated_at: string | null
          variation_id: string
        }
        Insert: {
          ab_test_id: string
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cpc?: number | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          logged_at?: string
          spend?: number | null
          updated_at?: string | null
          variation_id: string
        }
        Update: {
          ab_test_id?: string
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cpc?: number | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          logged_at?: string
          spend?: number | null
          updated_at?: string | null
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_copy_ab_results_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "ad_copy_ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copy_ab_results_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "ad_copy_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_copy_ab_tests: {
        Row: {
          ad_copy_id: string
          confidence_threshold: number | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          hypothesis: string | null
          id: string
          metrics_to_track: string[] | null
          name: string
          organization_id: string
          start_date: string | null
          status: string | null
          test_variable: string
          updated_at: string | null
          variation_ids: string[]
          winner_variation_id: string | null
        }
        Insert: {
          ad_copy_id: string
          confidence_threshold?: number | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          hypothesis?: string | null
          id?: string
          metrics_to_track?: string[] | null
          name: string
          organization_id: string
          start_date?: string | null
          status?: string | null
          test_variable?: string
          updated_at?: string | null
          variation_ids: string[]
          winner_variation_id?: string | null
        }
        Update: {
          ad_copy_id?: string
          confidence_threshold?: number | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          hypothesis?: string | null
          id?: string
          metrics_to_track?: string[] | null
          name?: string
          organization_id?: string
          start_date?: string | null
          status?: string | null
          test_variable?: string
          updated_at?: string | null
          variation_ids?: string[]
          winner_variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_copy_ab_tests_ad_copy_id_fkey"
            columns: ["ad_copy_id"]
            isOneToOne: false
            referencedRelation: "ad_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copy_ab_tests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copy_ab_tests_winner_variation_id_fkey"
            columns: ["winner_variation_id"]
            isOneToOne: false
            referencedRelation: "ad_copy_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_copy_ai_insights: {
        Row: {
          action_impact_estimate: number | null
          ad_copy_id: string | null
          created_at: string | null
          description: string
          id: string
          insight_type: string
          is_dismissed: boolean | null
          metrics_context: Json | null
          organization_id: string
          severity: string | null
          suggested_action: string | null
          title: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          action_impact_estimate?: number | null
          ad_copy_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          insight_type: string
          is_dismissed?: boolean | null
          metrics_context?: Json | null
          organization_id: string
          severity?: string | null
          suggested_action?: string | null
          title: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          action_impact_estimate?: number | null
          ad_copy_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          insight_type?: string
          is_dismissed?: boolean | null
          metrics_context?: Json | null
          organization_id?: string
          severity?: string | null
          suggested_action?: string | null
          title?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_copy_ai_insights_ad_copy_id_fkey"
            columns: ["ad_copy_id"]
            isOneToOne: false
            referencedRelation: "ad_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copy_ai_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_copy_analytics_snapshots: {
        Row: {
          active_ad_copies: number | null
          avg_conversion_rate: number | null
          avg_cpc: number | null
          avg_cpm: number | null
          avg_ctr: number | null
          created_at: string | null
          id: string
          objective_breakdown: Json | null
          organization_id: string
          overall_roas: number | null
          platform_breakdown: Json | null
          snapshot_date: string
          top_performers: Json | null
          total_ad_copies: number | null
          total_clicks: number | null
          total_conversions: number | null
          total_impressions: number | null
          total_revenue: number | null
          total_spend: number | null
        }
        Insert: {
          active_ad_copies?: number | null
          avg_conversion_rate?: number | null
          avg_cpc?: number | null
          avg_cpm?: number | null
          avg_ctr?: number | null
          created_at?: string | null
          id?: string
          objective_breakdown?: Json | null
          organization_id: string
          overall_roas?: number | null
          platform_breakdown?: Json | null
          snapshot_date: string
          top_performers?: Json | null
          total_ad_copies?: number | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_impressions?: number | null
          total_revenue?: number | null
          total_spend?: number | null
        }
        Update: {
          active_ad_copies?: number | null
          avg_conversion_rate?: number | null
          avg_cpc?: number | null
          avg_cpm?: number | null
          avg_ctr?: number | null
          created_at?: string | null
          id?: string
          objective_breakdown?: Json | null
          organization_id?: string
          overall_roas?: number | null
          platform_breakdown?: Json | null
          snapshot_date?: string
          top_performers?: Json | null
          total_ad_copies?: number | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_impressions?: number | null
          total_revenue?: number | null
          total_spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_copy_analytics_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_copy_benchmarks: {
        Row: {
          avg_conversion_rate: number | null
          avg_cpc: number | null
          avg_cpm: number | null
          avg_ctr: number | null
          avg_roas: number | null
          created_at: string | null
          data_source: string | null
          id: string
          industry: string | null
          objective: string | null
          period_end: string | null
          period_start: string | null
          platform: string
          sample_count: number | null
          updated_at: string | null
        }
        Insert: {
          avg_conversion_rate?: number | null
          avg_cpc?: number | null
          avg_cpm?: number | null
          avg_ctr?: number | null
          avg_roas?: number | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          industry?: string | null
          objective?: string | null
          period_end?: string | null
          period_start?: string | null
          platform: string
          sample_count?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_conversion_rate?: number | null
          avg_cpc?: number | null
          avg_cpm?: number | null
          avg_ctr?: number | null
          avg_roas?: number | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          industry?: string | null
          objective?: string | null
          period_end?: string | null
          period_start?: string | null
          platform?: string
          sample_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ad_copy_creative_scores: {
        Row: {
          clarity_score: number | null
          cta_score: number | null
          emotional_appeal_score: number | null
          grade: string | null
          headline_score: number | null
          id: string
          model_version: string | null
          optimization_priority: string | null
          organization_id: string | null
          overall_score: number | null
          primary_text_score: number | null
          relevance_score: number | null
          score_breakdown: Json | null
          scored_at: string | null
          strengths: string[] | null
          urgency_score: number | null
          variation_id: string
          weaknesses: string[] | null
        }
        Insert: {
          clarity_score?: number | null
          cta_score?: number | null
          emotional_appeal_score?: number | null
          grade?: string | null
          headline_score?: number | null
          id?: string
          model_version?: string | null
          optimization_priority?: string | null
          organization_id?: string | null
          overall_score?: number | null
          primary_text_score?: number | null
          relevance_score?: number | null
          score_breakdown?: Json | null
          scored_at?: string | null
          strengths?: string[] | null
          urgency_score?: number | null
          variation_id: string
          weaknesses?: string[] | null
        }
        Update: {
          clarity_score?: number | null
          cta_score?: number | null
          emotional_appeal_score?: number | null
          grade?: string | null
          headline_score?: number | null
          id?: string
          model_version?: string | null
          optimization_priority?: string | null
          organization_id?: string | null
          overall_score?: number | null
          primary_text_score?: number | null
          relevance_score?: number | null
          score_breakdown?: Json | null
          scored_at?: string | null
          strengths?: string[] | null
          urgency_score?: number | null
          variation_id?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_copy_creative_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copy_creative_scores_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "ad_copy_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_copy_optimization_suggestions: {
        Row: {
          applied_at: string | null
          confidence: string | null
          created_at: string | null
          field: string
          id: string
          improvement_metric: string | null
          organization_id: string | null
          original_text: string | null
          predicted_improvement: number | null
          reason: string
          status: string | null
          suggested_text: string
          technique: string | null
          variation_id: string
        }
        Insert: {
          applied_at?: string | null
          confidence?: string | null
          created_at?: string | null
          field: string
          id?: string
          improvement_metric?: string | null
          organization_id?: string | null
          original_text?: string | null
          predicted_improvement?: number | null
          reason: string
          status?: string | null
          suggested_text: string
          technique?: string | null
          variation_id: string
        }
        Update: {
          applied_at?: string | null
          confidence?: string | null
          created_at?: string | null
          field?: string
          id?: string
          improvement_metric?: string | null
          organization_id?: string | null
          original_text?: string | null
          predicted_improvement?: number | null
          reason?: string
          status?: string | null
          suggested_text?: string
          technique?: string | null
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_copy_optimization_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copy_optimization_suggestions_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "ad_copy_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_copy_performance: {
        Row: {
          ad_copy_id: string
          clicks: number | null
          comments: number | null
          conversion_rate: number | null
          conversion_value: number | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          data_source: string | null
          engagement_rate: number | null
          external_ad_id: string | null
          id: string
          impressions: number | null
          leads: number | null
          likes: number | null
          logged_at: string
          notes: string | null
          organization_id: string | null
          raw_api_response: Json | null
          reach: number | null
          roas: number | null
          saves: number | null
          shares: number | null
          spend: number | null
          sync_config_id: string | null
          synced_at: string | null
          updated_at: string | null
          variation_id: string | null
        }
        Insert: {
          ad_copy_id: string
          clicks?: number | null
          comments?: number | null
          conversion_rate?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          data_source?: string | null
          engagement_rate?: number | null
          external_ad_id?: string | null
          id?: string
          impressions?: number | null
          leads?: number | null
          likes?: number | null
          logged_at: string
          notes?: string | null
          organization_id?: string | null
          raw_api_response?: Json | null
          reach?: number | null
          roas?: number | null
          saves?: number | null
          shares?: number | null
          spend?: number | null
          sync_config_id?: string | null
          synced_at?: string | null
          updated_at?: string | null
          variation_id?: string | null
        }
        Update: {
          ad_copy_id?: string
          clicks?: number | null
          comments?: number | null
          conversion_rate?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          data_source?: string | null
          engagement_rate?: number | null
          external_ad_id?: string | null
          id?: string
          impressions?: number | null
          leads?: number | null
          likes?: number | null
          logged_at?: string
          notes?: string | null
          organization_id?: string | null
          raw_api_response?: Json | null
          reach?: number | null
          roas?: number | null
          saves?: number | null
          shares?: number | null
          spend?: number | null
          sync_config_id?: string | null
          synced_at?: string | null
          updated_at?: string | null
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_copy_performance_ad_copy_id_fkey"
            columns: ["ad_copy_id"]
            isOneToOne: false
            referencedRelation: "ad_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copy_performance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copy_performance_sync_config_id_fkey"
            columns: ["sync_config_id"]
            isOneToOne: false
            referencedRelation: "ad_sync_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copy_performance_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "ad_copy_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_copy_prediction_history: {
        Row: {
          accuracy_score: number | null
          actual_conversion_rate: number | null
          actual_cpc: number | null
          actual_cpm: number | null
          actual_ctr: number | null
          actual_roas: number | null
          confidence_score: number | null
          id: string
          organization_id: string | null
          predicted_at: string | null
          predicted_conversion_rate: number | null
          predicted_cpc: number | null
          predicted_cpm: number | null
          predicted_ctr: number | null
          predicted_roas: number | null
          prediction_factors: Json | null
          validated_at: string | null
          variation_id: string
        }
        Insert: {
          accuracy_score?: number | null
          actual_conversion_rate?: number | null
          actual_cpc?: number | null
          actual_cpm?: number | null
          actual_ctr?: number | null
          actual_roas?: number | null
          confidence_score?: number | null
          id?: string
          organization_id?: string | null
          predicted_at?: string | null
          predicted_conversion_rate?: number | null
          predicted_cpc?: number | null
          predicted_cpm?: number | null
          predicted_ctr?: number | null
          predicted_roas?: number | null
          prediction_factors?: Json | null
          validated_at?: string | null
          variation_id: string
        }
        Update: {
          accuracy_score?: number | null
          actual_conversion_rate?: number | null
          actual_cpc?: number | null
          actual_cpm?: number | null
          actual_ctr?: number | null
          actual_roas?: number | null
          confidence_score?: number | null
          id?: string
          organization_id?: string | null
          predicted_at?: string | null
          predicted_conversion_rate?: number | null
          predicted_cpc?: number | null
          predicted_cpm?: number | null
          predicted_ctr?: number | null
          predicted_roas?: number | null
          prediction_factors?: Json | null
          validated_at?: string | null
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_copy_prediction_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_copy_prediction_history_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "ad_copy_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_copy_variations: {
        Row: {
          ad_copy_id: string
          char_counts: Json | null
          created_at: string | null
          cta_button: string | null
          description: string | null
          descriptions: Json | null
          headline: string | null
          headlines: Json | null
          id: string
          is_approved: boolean | null
          policy_warnings: Json | null
          primary_text: string | null
          variation_label: string
        }
        Insert: {
          ad_copy_id: string
          char_counts?: Json | null
          created_at?: string | null
          cta_button?: string | null
          description?: string | null
          descriptions?: Json | null
          headline?: string | null
          headlines?: Json | null
          id?: string
          is_approved?: boolean | null
          policy_warnings?: Json | null
          primary_text?: string | null
          variation_label?: string
        }
        Update: {
          ad_copy_id?: string
          char_counts?: Json | null
          created_at?: string | null
          cta_button?: string | null
          description?: string | null
          descriptions?: Json | null
          headline?: string | null
          headlines?: Json | null
          id?: string
          is_approved?: boolean | null
          policy_warnings?: Json | null
          primary_text?: string | null
          variation_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_copy_variations_ad_copy_id_fkey"
            columns: ["ad_copy_id"]
            isOneToOne: false
            referencedRelation: "ad_copies"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_sequence_stage_copies: {
        Row: {
          ad_copy_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          sort_order: number | null
          stage_id: string
        }
        Insert: {
          ad_copy_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          sort_order?: number | null
          stage_id: string
        }
        Update: {
          ad_copy_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          sort_order?: number | null
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_sequence_stage_copies_ad_copy_id_fkey"
            columns: ["ad_copy_id"]
            isOneToOne: false
            referencedRelation: "ad_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_sequence_stage_copies_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "ad_sequence_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_sequence_stages: {
        Row: {
          audience_adjustments: Json | null
          budget_percentage: number | null
          created_at: string | null
          delay_days: number | null
          duration_days: number | null
          id: string
          notes: string | null
          sequence_id: string
          stage_label: string | null
          stage_name: string
          stage_order: number
        }
        Insert: {
          audience_adjustments?: Json | null
          budget_percentage?: number | null
          created_at?: string | null
          delay_days?: number | null
          duration_days?: number | null
          id?: string
          notes?: string | null
          sequence_id: string
          stage_label?: string | null
          stage_name: string
          stage_order: number
        }
        Update: {
          audience_adjustments?: Json | null
          budget_percentage?: number | null
          created_at?: string | null
          delay_days?: number | null
          duration_days?: number | null
          id?: string
          notes?: string | null
          sequence_id?: string
          stage_label?: string | null
          stage_name?: string
          stage_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_sequence_stages_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "ad_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_sequences: {
        Row: {
          brand_template_id: string | null
          campaign_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          sequence_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          brand_template_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          sequence_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_template_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          sequence_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_sequences_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_swipe_files: {
        Row: {
          competitor_name: string | null
          created_at: string | null
          created_by: string | null
          cta_button: string | null
          description: string | null
          headline: string | null
          id: string
          industry: string | null
          is_favorite: boolean | null
          notes: string | null
          objective: string | null
          organization_id: string
          performance_tier: string | null
          platform: string
          primary_text: string | null
          screenshot_url: string | null
          source_type: string
          source_url: string | null
          tags: string[] | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          competitor_name?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_button?: string | null
          description?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          is_favorite?: boolean | null
          notes?: string | null
          objective?: string | null
          organization_id: string
          performance_tier?: string | null
          platform: string
          primary_text?: string | null
          screenshot_url?: string | null
          source_type: string
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          competitor_name?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_button?: string | null
          description?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          is_favorite?: boolean | null
          notes?: string | null
          objective?: string | null
          organization_id?: string
          performance_tier?: string | null
          platform?: string
          primary_text?: string | null
          screenshot_url?: string | null
          source_type?: string
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_swipe_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_sync_configs: {
        Row: {
          ad_copy_id: string
          connection_id: string | null
          created_at: string | null
          external_ad_id: string
          external_ad_name: string | null
          external_adset_id: string | null
          external_campaign_id: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          next_sync_at: string | null
          organization_id: string | null
          sync_enabled: boolean | null
          sync_frequency: string | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          ad_copy_id: string
          connection_id?: string | null
          created_at?: string | null
          external_ad_id: string
          external_ad_name?: string | null
          external_adset_id?: string | null
          external_campaign_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          next_sync_at?: string | null
          organization_id?: string | null
          sync_enabled?: boolean | null
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_copy_id?: string
          connection_id?: string | null
          created_at?: string | null
          external_ad_id?: string
          external_ad_name?: string | null
          external_adset_id?: string | null
          external_campaign_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          next_sync_at?: string | null
          organization_id?: string | null
          sync_enabled?: boolean | null
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_sync_configs_ad_copy_id_fkey"
            columns: ["ad_copy_id"]
            isOneToOne: false
            referencedRelation: "ad_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_sync_configs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_sync_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      agent_blackboard: {
        Row: {
          agent_name: string
          created_at: string | null
          data_key: string
          data_value: Json
          id: string
          session_id: string
          ttl_seconds: number | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          data_key: string
          data_value: Json
          id?: string
          session_id: string
          ttl_seconds?: number | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          data_key?: string
          data_value?: Json
          id?: string
          session_id?: string
          ttl_seconds?: number | null
        }
        Relationships: []
      }
      agent_execution_logs: {
        Row: {
          agent_name: string
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_summary: string | null
          model_used: string | null
          output_summary: string | null
          retry_count: number | null
          session_id: string
          status: string
          token_usage: Json | null
          tools_used: string[] | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_summary?: string | null
          model_used?: string | null
          output_summary?: string | null
          retry_count?: number | null
          session_id: string
          status?: string
          token_usage?: Json | null
          tools_used?: string[] | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_summary?: string | null
          model_used?: string | null
          output_summary?: string | null
          retry_count?: number | null
          session_id?: string
          status?: string
          token_usage?: Json | null
          tools_used?: string[] | null
        }
        Relationships: []
      }
      ai_channel_model_configs: {
        Row: {
          allow_user_override: boolean | null
          channel: string
          cost_priority: string | null
          created_at: string | null
          hook_intensity: string | null
          id: string
          is_enabled: boolean | null
          max_tokens: number | null
          model_override: string | null
          organization_id: string | null
          preferred_hook_types: string[] | null
          priority: number | null
          prompt_style: string | null
          quality_mode_default: string | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          allow_user_override?: boolean | null
          channel: string
          cost_priority?: string | null
          created_at?: string | null
          hook_intensity?: string | null
          id?: string
          is_enabled?: boolean | null
          max_tokens?: number | null
          model_override?: string | null
          organization_id?: string | null
          preferred_hook_types?: string[] | null
          priority?: number | null
          prompt_style?: string | null
          quality_mode_default?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_user_override?: boolean | null
          channel?: string
          cost_priority?: string | null
          created_at?: string | null
          hook_intensity?: string | null
          id?: string
          is_enabled?: boolean | null
          max_tokens?: number | null
          model_override?: string | null
          organization_id?: string | null
          preferred_hook_types?: string[] | null
          priority?: number | null
          prompt_style?: string | null
          quality_mode_default?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_channel_model_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_function_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          label: string
          organization_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          label: string
          organization_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          label?: string
          organization_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_function_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_function_configs: {
        Row: {
          cache_ttl_hours: number | null
          created_at: string | null
          custom_system_prompt: string | null
          function_name: string
          id: string
          is_enabled: boolean | null
          max_tokens: number | null
          model_override: string | null
          organization_id: string | null
          parameters: Json | null
          priority_level: string | null
          provider_config_id: string | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          cache_ttl_hours?: number | null
          created_at?: string | null
          custom_system_prompt?: string | null
          function_name: string
          id?: string
          is_enabled?: boolean | null
          max_tokens?: number | null
          model_override?: string | null
          organization_id?: string | null
          parameters?: Json | null
          priority_level?: string | null
          provider_config_id?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          cache_ttl_hours?: number | null
          created_at?: string | null
          custom_system_prompt?: string | null
          function_name?: string
          id?: string
          is_enabled?: boolean | null
          max_tokens?: number | null
          model_override?: string | null
          organization_id?: string | null
          parameters?: Json | null
          priority_level?: string | null
          provider_config_id?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_function_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_function_configs_provider_config_id_fkey"
            columns: ["provider_config_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_metrics: {
        Row: {
          ab_test_id: string | null
          ab_test_variant: string | null
          action_type: string | null
          ai_call_duration_ms: number | null
          brand_template_id: string | null
          cache_hit: boolean | null
          channel_durations: Json | null
          channels: string[] | null
          content_id: string | null
          context_fetch_duration_ms: number | null
          context_richness_score: number | null
          context_sources: string[] | null
          created_at: string
          error_message: string | null
          error_type: string | null
          estimated_cost_usd: number | null
          exit_reason: string | null
          fallback_model: string | null
          function_name: string
          had_error: boolean | null
          id: string
          input_tokens_estimated: number | null
          models_used: Json | null
          organization_id: string | null
          output_tokens_estimated: number | null
          parent_span_id: string | null
          prompt_id: string | null
          prompt_version: number | null
          quality_mode: string | null
          retry_count: number | null
          span_id: string | null
          tools_executed: string[] | null
          total_duration_ms: number
          total_turns: number | null
          trace_id: string
          used_fallback: boolean | null
          user_id: string | null
        }
        Insert: {
          ab_test_id?: string | null
          ab_test_variant?: string | null
          action_type?: string | null
          ai_call_duration_ms?: number | null
          brand_template_id?: string | null
          cache_hit?: boolean | null
          channel_durations?: Json | null
          channels?: string[] | null
          content_id?: string | null
          context_fetch_duration_ms?: number | null
          context_richness_score?: number | null
          context_sources?: string[] | null
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          estimated_cost_usd?: number | null
          exit_reason?: string | null
          fallback_model?: string | null
          function_name: string
          had_error?: boolean | null
          id?: string
          input_tokens_estimated?: number | null
          models_used?: Json | null
          organization_id?: string | null
          output_tokens_estimated?: number | null
          parent_span_id?: string | null
          prompt_id?: string | null
          prompt_version?: number | null
          quality_mode?: string | null
          retry_count?: number | null
          span_id?: string | null
          tools_executed?: string[] | null
          total_duration_ms: number
          total_turns?: number | null
          trace_id: string
          used_fallback?: boolean | null
          user_id?: string | null
        }
        Update: {
          ab_test_id?: string | null
          ab_test_variant?: string | null
          action_type?: string | null
          ai_call_duration_ms?: number | null
          brand_template_id?: string | null
          cache_hit?: boolean | null
          channel_durations?: Json | null
          channels?: string[] | null
          content_id?: string | null
          context_fetch_duration_ms?: number | null
          context_richness_score?: number | null
          context_sources?: string[] | null
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          estimated_cost_usd?: number | null
          exit_reason?: string | null
          fallback_model?: string | null
          function_name?: string
          had_error?: boolean | null
          id?: string
          input_tokens_estimated?: number | null
          models_used?: Json | null
          organization_id?: string | null
          output_tokens_estimated?: number | null
          parent_span_id?: string | null
          prompt_id?: string | null
          prompt_version?: number | null
          quality_mode?: string | null
          retry_count?: number | null
          span_id?: string | null
          tools_executed?: string[] | null
          total_duration_ms?: number
          total_turns?: number | null
          trace_id?: string
          used_fallback?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_metrics_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_metrics_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_metrics_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_ab_tests: {
        Row: {
          completed_at: string | null
          confidence_level: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          function_name: string
          id: string
          min_sample_size: number | null
          name: string
          organization_id: string | null
          prompt_key: string
          start_date: string | null
          status: string | null
          updated_at: string | null
          variant_a_avg_score: number | null
          variant_a_avg_time_ms: number | null
          variant_a_id: string | null
          variant_a_impressions: number | null
          variant_a_weight: number | null
          variant_b_avg_score: number | null
          variant_b_avg_time_ms: number | null
          variant_b_id: string | null
          variant_b_impressions: number | null
          winner_variant: string | null
        }
        Insert: {
          completed_at?: string | null
          confidence_level?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          function_name: string
          id?: string
          min_sample_size?: number | null
          name: string
          organization_id?: string | null
          prompt_key: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          variant_a_avg_score?: number | null
          variant_a_avg_time_ms?: number | null
          variant_a_id?: string | null
          variant_a_impressions?: number | null
          variant_a_weight?: number | null
          variant_b_avg_score?: number | null
          variant_b_avg_time_ms?: number | null
          variant_b_id?: string | null
          variant_b_impressions?: number | null
          winner_variant?: string | null
        }
        Update: {
          completed_at?: string | null
          confidence_level?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          function_name?: string
          id?: string
          min_sample_size?: number | null
          name?: string
          organization_id?: string | null
          prompt_key?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          variant_a_avg_score?: number | null
          variant_a_avg_time_ms?: number | null
          variant_a_id?: string | null
          variant_a_impressions?: number | null
          variant_a_weight?: number | null
          variant_b_avg_score?: number | null
          variant_b_avg_time_ms?: number | null
          variant_b_id?: string | null
          variant_b_impressions?: number | null
          winner_variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_ab_tests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompt_ab_tests_variant_a_id_fkey"
            columns: ["variant_a_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompt_ab_tests_variant_b_id_fkey"
            columns: ["variant_b_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_history: {
        Row: {
          avg_generation_time_ms: number | null
          avg_quality_score: number | null
          change_reason: string | null
          change_type: string | null
          changed_by: string | null
          content: string
          created_at: string | null
          id: string
          organization_id: string | null
          prompt_id: string | null
          usage_count: number | null
          variables: Json | null
          version: number
        }
        Insert: {
          avg_generation_time_ms?: number | null
          avg_quality_score?: number | null
          change_reason?: string | null
          change_type?: string | null
          changed_by?: string | null
          content: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          prompt_id?: string | null
          usage_count?: number | null
          variables?: Json | null
          version: number
        }
        Update: {
          avg_generation_time_ms?: number | null
          avg_quality_score?: number | null
          change_reason?: string | null
          change_type?: string | null
          changed_by?: string | null
          content?: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          prompt_id?: string | null
          usage_count?: number | null
          variables?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompt_history_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          category_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          description: string | null
          function_name: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string | null
          prompt_key: string
          prompt_type: string
          tags: string[] | null
          updated_at: string | null
          variables: Json | null
          version: number
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          function_name: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          organization_id?: string | null
          prompt_key: string
          prompt_type: string
          tags?: string[] | null
          updated_at?: string | null
          variables?: Json | null
          version?: number
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          function_name?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string | null
          prompt_key?: string
          prompt_type?: string
          tags?: string[] | null
          updated_at?: string | null
          variables?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ai_function_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_configs: {
        Row: {
          api_key_secret_name: string | null
          base_url: string | null
          config: Json | null
          created_at: string | null
          default_model: string | null
          display_name: string
          encrypted_api_key: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          provider_type: string
          updated_at: string | null
        }
        Insert: {
          api_key_secret_name?: string | null
          base_url?: string | null
          config?: Json | null
          created_at?: string | null
          default_model?: string | null
          display_name: string
          encrypted_api_key?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          provider_type: string
          updated_at?: string | null
        }
        Update: {
          api_key_secret_name?: string | null
          base_url?: string | null
          config?: Json | null
          created_at?: string | null
          default_model?: string | null
          display_name?: string
          encrypted_api_key?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          provider_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      batch_processing_jobs: {
        Row: {
          completed_at: string | null
          config: Json | null
          created_at: string
          created_by: string | null
          current_item_id: string | null
          current_item_name: string | null
          error_log: Json | null
          estimated_completion: string | null
          failed_items: number
          id: string
          job_type: string
          organization_id: string | null
          processed_items: number
          progress: number
          started_at: string | null
          status: string
          total_items: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          current_item_id?: string | null
          current_item_name?: string | null
          error_log?: Json | null
          estimated_completion?: string | null
          failed_items?: number
          id?: string
          job_type: string
          organization_id?: string | null
          processed_items?: number
          progress?: number
          started_at?: string | null
          status?: string
          total_items?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          current_item_id?: string | null
          current_item_name?: string | null
          error_log?: Json | null
          estimated_completion?: string | null
          failed_items?: number
          id?: string
          job_type?: string
          organization_id?: string | null
          processed_items?: number
          progress?: number
          started_at?: string | null
          status?: string
          total_items?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_processing_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comments: {
        Row: {
          author_email: string
          author_name: string
          content: string
          created_at: string
          id: string
          is_approved: boolean | null
          post_slug: string
        }
        Insert: {
          author_email: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          post_slug: string
        }
        Update: {
          author_email?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          post_slug?: string
        }
        Relationships: []
      }
      blog_reactions: {
        Row: {
          created_at: string
          id: string
          post_slug: string
          reaction_type: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_slug: string
          reaction_type?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_slug?: string
          reaction_type?: string
          visitor_id?: string
        }
        Relationships: []
      }
      brand_channel_optimizations: {
        Row: {
          brand_template_id: string
          channel: string
          cost_priority: string | null
          created_at: string | null
          hook_intensity: string | null
          id: string
          max_tokens_override: number | null
          preferred_hook_types: string[] | null
          prompt_style: string | null
          quality_mode: string | null
          updated_at: string | null
        }
        Insert: {
          brand_template_id: string
          channel: string
          cost_priority?: string | null
          created_at?: string | null
          hook_intensity?: string | null
          id?: string
          max_tokens_override?: number | null
          preferred_hook_types?: string[] | null
          prompt_style?: string | null
          quality_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_template_id?: string
          channel?: string
          cost_priority?: string | null
          created_at?: string | null
          hook_intensity?: string | null
          id?: string
          max_tokens_override?: number | null
          preferred_hook_types?: string[] | null
          prompt_style?: string | null
          quality_mode?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_channel_optimizations_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_memory: {
        Row: {
          brand_template_id: string | null
          confidence: number | null
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          last_used_at: string | null
          memory_type: string
          organization_id: string | null
          source: string | null
          updated_at: string | null
          used_count: number | null
        }
        Insert: {
          brand_template_id?: string | null
          confidence?: number | null
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          last_used_at?: string | null
          memory_type: string
          organization_id?: string | null
          source?: string | null
          updated_at?: string | null
          used_count?: number | null
        }
        Update: {
          brand_template_id?: string | null
          confidence?: number | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          last_used_at?: string | null
          memory_type?: string
          organization_id?: string | null
          source?: string | null
          updated_at?: string | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_memory_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_memory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_preferences_learned: {
        Row: {
          brand_template_id: string
          channel: string
          confidence_score: number
          created_at: string
          id: string
          last_edit_at: string | null
          preference_key: string
          preference_value: Json
          sample_count: number
          updated_at: string
        }
        Insert: {
          brand_template_id: string
          channel: string
          confidence_score?: number
          created_at?: string
          id?: string
          last_edit_at?: string | null
          preference_key: string
          preference_value: Json
          sample_count?: number
          updated_at?: string
        }
        Update: {
          brand_template_id?: string
          channel?: string
          confidence_score?: number
          created_at?: string
          id?: string
          last_edit_at?: string | null
          preference_key?: string
          preference_value?: Json
          sample_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_preferences_learned_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_products: {
        Row: {
          benefits: string[] | null
          best_channels: string[] | null
          brand_template_id: string
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          keywords: string[] | null
          name: string
          organization_id: string | null
          pain_points_solved: string[] | null
          price_display: string | null
          sku: string | null
          sort_order: number | null
          suggested_content_angles: string[] | null
          target_audience: string | null
          unique_selling_points: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          benefits?: string[] | null
          best_channels?: string[] | null
          brand_template_id: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          keywords?: string[] | null
          name: string
          organization_id?: string | null
          pain_points_solved?: string[] | null
          price_display?: string | null
          sku?: string | null
          sort_order?: number | null
          suggested_content_angles?: string[] | null
          target_audience?: string | null
          unique_selling_points?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          benefits?: string[] | null
          best_channels?: string[] | null
          brand_template_id?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          keywords?: string[] | null
          name?: string
          organization_id?: string | null
          pain_points_solved?: string[] | null
          price_display?: string | null
          sku?: string | null
          sort_order?: number | null
          suggested_content_angles?: string[] | null
          target_audience?: string | null
          unique_selling_points?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_products_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_products_organization_id_fkey"
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
          brand_hashtags: string[] | null
          brand_name: string
          brand_positioning: string | null
          channel_overrides: Json | null
          competitive_advantages: string[] | null
          compliance_rules: string[] | null
          content_pillars: Json | null
          country_code: string | null
          created_at: string
          cta_templates: string[] | null
          deleted_at: string | null
          deleted_by: string | null
          emoji_policy: string | null
          evergreen_themes: string[] | null
          footer_info: Json | null
          forbidden_words: string[] | null
          formality_level: string | null
          global_pack_id: string | null
          id: string
          image_style: string | null
          include_logo: boolean
          industry: string[] | null
          industry_template_id: string | null
          is_default: boolean
          jurisdiction_code: string | null
          language_style: string[] | null
          logo_url: string | null
          main_competitors: string[] | null
          market_segment: string | null
          mission: string | null
          name: string
          organization_id: string | null
          preferred_words: string[] | null
          primary_channels: string[] | null
          primary_color: string | null
          sample_texts: Json | null
          secondary_colors: string[] | null
          sentence_style: string | null
          signature_phrases: string[] | null
          tagline: string | null
          target_age_range: string | null
          target_gender: string | null
          target_locations: string[] | null
          tone_of_voice: string[] | null
          unique_value_proposition: string | null
          updated_at: string
          user_id: string | null
          version: number
          vision: string | null
        }
        Insert: {
          allow_emoji?: boolean | null
          brand_guideline: string
          brand_hashtags?: string[] | null
          brand_name: string
          brand_positioning?: string | null
          channel_overrides?: Json | null
          competitive_advantages?: string[] | null
          compliance_rules?: string[] | null
          content_pillars?: Json | null
          country_code?: string | null
          created_at?: string
          cta_templates?: string[] | null
          deleted_at?: string | null
          deleted_by?: string | null
          emoji_policy?: string | null
          evergreen_themes?: string[] | null
          footer_info?: Json | null
          forbidden_words?: string[] | null
          formality_level?: string | null
          global_pack_id?: string | null
          id?: string
          image_style?: string | null
          include_logo?: boolean
          industry?: string[] | null
          industry_template_id?: string | null
          is_default?: boolean
          jurisdiction_code?: string | null
          language_style?: string[] | null
          logo_url?: string | null
          main_competitors?: string[] | null
          market_segment?: string | null
          mission?: string | null
          name: string
          organization_id?: string | null
          preferred_words?: string[] | null
          primary_channels?: string[] | null
          primary_color?: string | null
          sample_texts?: Json | null
          secondary_colors?: string[] | null
          sentence_style?: string | null
          signature_phrases?: string[] | null
          tagline?: string | null
          target_age_range?: string | null
          target_gender?: string | null
          target_locations?: string[] | null
          tone_of_voice?: string[] | null
          unique_value_proposition?: string | null
          updated_at?: string
          user_id?: string | null
          version?: number
          vision?: string | null
        }
        Update: {
          allow_emoji?: boolean | null
          brand_guideline?: string
          brand_hashtags?: string[] | null
          brand_name?: string
          brand_positioning?: string | null
          channel_overrides?: Json | null
          competitive_advantages?: string[] | null
          compliance_rules?: string[] | null
          content_pillars?: Json | null
          country_code?: string | null
          created_at?: string
          cta_templates?: string[] | null
          deleted_at?: string | null
          deleted_by?: string | null
          emoji_policy?: string | null
          evergreen_themes?: string[] | null
          footer_info?: Json | null
          forbidden_words?: string[] | null
          formality_level?: string | null
          global_pack_id?: string | null
          id?: string
          image_style?: string | null
          include_logo?: boolean
          industry?: string[] | null
          industry_template_id?: string | null
          is_default?: boolean
          jurisdiction_code?: string | null
          language_style?: string[] | null
          logo_url?: string | null
          main_competitors?: string[] | null
          market_segment?: string | null
          mission?: string | null
          name?: string
          organization_id?: string | null
          preferred_words?: string[] | null
          primary_channels?: string[] | null
          primary_color?: string | null
          sample_texts?: Json | null
          secondary_colors?: string[] | null
          sentence_style?: string | null
          signature_phrases?: string[] | null
          tagline?: string | null
          target_age_range?: string | null
          target_gender?: string | null
          target_locations?: string[] | null
          tone_of_voice?: string[] | null
          unique_value_proposition?: string | null
          updated_at?: string
          user_id?: string | null
          version?: number
          vision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_templates_global_pack_id_fkey"
            columns: ["global_pack_id"]
            isOneToOne: false
            referencedRelation: "industry_global_packs"
            referencedColumns: ["id"]
          },
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
      campaign_contents: {
        Row: {
          campaign_id: string
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          notes: string | null
          planned_publish_date: string | null
          sort_order: number | null
        }
        Insert: {
          campaign_id: string
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          notes?: string | null
          planned_publish_date?: string | null
          sort_order?: number | null
        }
        Update: {
          campaign_id?: string
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          planned_publish_date?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_kpi_logs: {
        Row: {
          campaign_id: string
          created_at: string | null
          created_by: string | null
          id: string
          logged_at: string
          metrics: Json
          notes: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          logged_at: string
          metrics?: Json
          notes?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          logged_at?: string
          metrics?: Json
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_kpi_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_milestones: {
        Row: {
          campaign_id: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          sort_order: number | null
          status: string
          title: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          sort_order?: number | null
          status?: string
          title: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          sort_order?: number | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_milestones_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_notification_logs: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          notification_key: string
          notification_type: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          notification_key: string
          notification_type: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          notification_key?: string
          notification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_notification_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brand_template_id: string | null
          budget_currency: string | null
          budget_spent: number | null
          budget_total: number | null
          campaign_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          goals: Json | null
          id: string
          name: string
          organization_id: string
          start_date: string
          status: string
          tags: string[] | null
          target_channels: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          brand_template_id?: string | null
          budget_currency?: string | null
          budget_spent?: number | null
          budget_total?: number | null
          campaign_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          goals?: Json | null
          id?: string
          name: string
          organization_id: string
          start_date: string
          status?: string
          tags?: string[] | null
          target_channels?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_template_id?: string | null
          budget_currency?: string | null
          budget_spent?: number | null
          budget_total?: number | null
          campaign_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          goals?: Json | null
          id?: string
          name?: string
          organization_id?: string
          start_date?: string
          status?: string
          tags?: string[] | null
          target_channels?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      carousel_images: {
        Row: {
          carousel_id: string
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
          is_selected: boolean | null
          organization_id: string | null
          prompt: string | null
          slide_number: number
          version: number
        }
        Insert: {
          carousel_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
          is_selected?: boolean | null
          organization_id?: string | null
          prompt?: string | null
          slide_number: number
          version?: number
        }
        Update: {
          carousel_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
          is_selected?: boolean | null
          organization_id?: string | null
          prompt?: string | null
          slide_number?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "carousel_images_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "carousels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousel_images_organization_id_fkey"
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
          campaign_id: string | null
          caption_suggestion: string | null
          created_at: string
          critique_details: Json | null
          critique_score: number | null
          cta_suggestion: string | null
          generated_images: Json | null
          id: string
          include_logo: boolean
          industry_template_id: string | null
          industry_template_version: string | null
          needs_manual_review: boolean | null
          organization_id: string | null
          platform: Database["public"]["Enums"]["carousel_platform"]
          refinement_count: number | null
          slide_count: number
          slides_content: Json
          status: string | null
          title: string
          topic: string
          updated_at: string
          user_id: string | null
          was_refined: boolean | null
        }
        Insert: {
          ai_tool?: Database["public"]["Enums"]["carousel_ai_tool"]
          brand_guideline?: string | null
          brand_name?: string
          campaign_id?: string | null
          caption_suggestion?: string | null
          created_at?: string
          critique_details?: Json | null
          critique_score?: number | null
          cta_suggestion?: string | null
          generated_images?: Json | null
          id?: string
          include_logo?: boolean
          industry_template_id?: string | null
          industry_template_version?: string | null
          needs_manual_review?: boolean | null
          organization_id?: string | null
          platform?: Database["public"]["Enums"]["carousel_platform"]
          refinement_count?: number | null
          slide_count?: number
          slides_content?: Json
          status?: string | null
          title: string
          topic: string
          updated_at?: string
          user_id?: string | null
          was_refined?: boolean | null
        }
        Update: {
          ai_tool?: Database["public"]["Enums"]["carousel_ai_tool"]
          brand_guideline?: string | null
          brand_name?: string
          campaign_id?: string | null
          caption_suggestion?: string | null
          created_at?: string
          critique_details?: Json | null
          critique_score?: number | null
          cta_suggestion?: string | null
          generated_images?: Json | null
          id?: string
          include_logo?: boolean
          industry_template_id?: string | null
          industry_template_version?: string | null
          needs_manual_review?: boolean | null
          organization_id?: string | null
          platform?: Database["public"]["Enums"]["carousel_platform"]
          refinement_count?: number | null
          slide_count?: number
          slides_content?: Json
          status?: string | null
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
          was_refined?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "carousels_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
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
      channel_image_history: {
        Row: {
          aspect_ratio: string | null
          channel: string
          content_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
          is_selected: boolean | null
          last_accessed_at: string | null
          organization_id: string | null
          prompt: string | null
          version: number
        }
        Insert: {
          aspect_ratio?: string | null
          channel: string
          content_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
          is_selected?: boolean | null
          last_accessed_at?: string | null
          organization_id?: string | null
          prompt?: string | null
          version?: number
        }
        Update: {
          aspect_ratio?: string | null
          channel?: string
          content_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
          is_selected?: boolean | null
          last_accessed_at?: string | null
          organization_id?: string | null
          prompt?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_image_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "multi_channel_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_image_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          brand_template_id: string | null
          content_goal: string | null
          created_at: string | null
          embeddings_indexed_at: string | null
          id: string
          is_archived: boolean | null
          last_message_at: string | null
          message_count: number | null
          metadata: Json | null
          organization_id: string | null
          session_learnings: Json | null
          summary: string | null
          title: string | null
          updated_at: string | null
          user_corrections: Json | null
          user_id: string
        }
        Insert: {
          brand_template_id?: string | null
          content_goal?: string | null
          created_at?: string | null
          embeddings_indexed_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          organization_id?: string | null
          session_learnings?: Json | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          user_corrections?: Json | null
          user_id: string
        }
        Update: {
          brand_template_id?: string | null
          content_goal?: string | null
          created_at?: string | null
          embeddings_indexed_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          organization_id?: string | null
          session_learnings?: Json | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          user_corrections?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_feedback: {
        Row: {
          brand_template_id: string | null
          conversation_id: string | null
          created_at: string
          feedback_type: string
          id: string
          message_content: string | null
          message_id: string
          organization_id: string | null
          user_id: string
          user_message: string | null
        }
        Insert: {
          brand_template_id?: string | null
          conversation_id?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          message_content?: string | null
          message_id: string
          organization_id?: string | null
          user_id: string
          user_message?: string | null
        }
        Update: {
          brand_template_id?: string | null
          conversation_id?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          message_content?: string | null
          message_id?: string
          organization_id?: string | null
          user_id?: string
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_feedback_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_feedback_organization_id_fkey"
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
      circuit_breaker_events: {
        Row: {
          created_at: string
          failure_count: number
          failure_rate: number | null
          id: string
          instance_id: string | null
          model: string
          provider: string
          tripped_at: string
        }
        Insert: {
          created_at?: string
          failure_count?: number
          failure_rate?: number | null
          id?: string
          instance_id?: string | null
          model: string
          provider: string
          tripped_at?: string
        }
        Update: {
          created_at?: string
          failure_count?: number
          failure_rate?: number | null
          id?: string
          instance_id?: string | null
          model?: string
          provider?: string
          tripped_at?: string
        }
        Relationships: []
      }
      competitor_profiles: {
        Row: {
          competitor_name: string
          created_at: string | null
          created_by: string | null
          facebook_page_id: string | null
          id: string
          industry: string | null
          instagram_handle: string | null
          is_active: boolean | null
          notes: string | null
          organization_id: string
          tiktok_handle: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          competitor_name: string
          created_at?: string | null
          created_by?: string | null
          facebook_page_id?: string | null
          id?: string
          industry?: string | null
          instagram_handle?: string | null
          is_active?: boolean | null
          notes?: string | null
          organization_id: string
          tiktok_handle?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          competitor_name?: string
          created_at?: string | null
          created_by?: string | null
          facebook_page_id?: string | null
          id?: string
          industry?: string | null
          instagram_handle?: string | null
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string
          tiktok_handle?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      content_embeddings: {
        Row: {
          brand_template_id: string | null
          chunk_index: number | null
          content_id: string
          content_text: string
          content_type: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          node_name: string | null
          organization_id: string | null
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          brand_template_id?: string | null
          chunk_index?: number | null
          content_id: string
          content_text: string
          content_type: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          node_name?: string | null
          organization_id?: string | null
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_template_id?: string | null
          chunk_index?: number | null
          content_id?: string
          content_text?: string
          content_type?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          node_name?: string | null
          organization_id?: string | null
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_embeddings_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_embeddings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_feedback: {
        Row: {
          comment: string | null
          conversation_id: string | null
          created_at: string | null
          feedback_type: string
          governor_score: number | null
          id: string
          message_id: string | null
          organization_id: string | null
          tags: string[] | null
          trace_id: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string | null
          feedback_type: string
          governor_score?: number | null
          id?: string
          message_id?: string | null
          organization_id?: string | null
          tags?: string[] | null
          trace_id?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string | null
          feedback_type?: string
          governor_score?: number | null
          id?: string
          message_id?: string | null
          organization_id?: string | null
          tags?: string[] | null
          trace_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_learnings: {
        Row: {
          brand_template_id: string | null
          channel: string
          content_id: string | null
          content_type: string
          created_at: string
          edit_diff: Json | null
          edit_type: string
          edited_snippet: string | null
          id: string
          organization_id: string | null
          original_snippet: string | null
          user_id: string | null
        }
        Insert: {
          brand_template_id?: string | null
          channel: string
          content_id?: string | null
          content_type?: string
          created_at?: string
          edit_diff?: Json | null
          edit_type: string
          edited_snippet?: string | null
          id?: string
          organization_id?: string | null
          original_snippet?: string | null
          user_id?: string | null
        }
        Update: {
          brand_template_id?: string | null
          channel?: string
          content_id?: string | null
          content_type?: string
          created_at?: string
          edit_diff?: Json | null
          edit_type?: string
          edited_snippet?: string | null
          id?: string
          organization_id?: string | null
          original_snippet?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_learnings_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_learnings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      content_style_patterns: {
        Row: {
          brand_template_id: string | null
          confidence_score: number | null
          content_type: string
          created_at: string | null
          edit_type: string | null
          examples: Json | null
          id: string
          last_seen_at: string | null
          occurrence_count: number | null
          organization_id: string | null
          original_pattern: string | null
          pattern_category: string
          updated_at: string | null
          user_id: string
          user_pattern: string | null
        }
        Insert: {
          brand_template_id?: string | null
          confidence_score?: number | null
          content_type: string
          created_at?: string | null
          edit_type?: string | null
          examples?: Json | null
          id?: string
          last_seen_at?: string | null
          occurrence_count?: number | null
          organization_id?: string | null
          original_pattern?: string | null
          pattern_category: string
          updated_at?: string | null
          user_id: string
          user_pattern?: string | null
        }
        Update: {
          brand_template_id?: string | null
          confidence_score?: number | null
          content_type?: string
          created_at?: string | null
          edit_type?: string | null
          examples?: Json | null
          id?: string
          last_seen_at?: string | null
          occurrence_count?: number | null
          organization_id?: string | null
          original_pattern?: string | null
          pattern_category?: string
          updated_at?: string | null
          user_id?: string
          user_pattern?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_style_patterns_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_style_patterns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_embeddings: {
        Row: {
          brand_template_id: string | null
          content_text: string
          conversation_id: string
          created_at: string | null
          embedding: string | null
          embedding_type: string
          id: string
          message_id: string | null
          metadata: Json | null
          organization_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_template_id?: string | null
          content_text: string
          conversation_id: string
          created_at?: string | null
          embedding?: string | null
          embedding_type: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_template_id?: string | null
          content_text?: string
          conversation_id?: string
          created_at?: string | null
          embedding?: string | null
          embedding_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_embeddings_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_embeddings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_embeddings_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_embeddings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      core_contents: {
        Row: {
          ai_model_used: string | null
          brand_template_id: string | null
          content: string
          content_angle: string | null
          content_goal: string
          content_role: string | null
          created_at: string
          generation_metadata: Json | null
          id: string
          key_messages: Json | null
          organization_id: string | null
          outline: Json | null
          quality_score: number | null
          source_topic_history_id: string | null
          source_type: string
          status: string | null
          target_audience: string | null
          title: string
          topic: string
          updated_at: string
          user_id: string | null
          word_count: number | null
        }
        Insert: {
          ai_model_used?: string | null
          brand_template_id?: string | null
          content: string
          content_angle?: string | null
          content_goal?: string
          content_role?: string | null
          created_at?: string
          generation_metadata?: Json | null
          id?: string
          key_messages?: Json | null
          organization_id?: string | null
          outline?: Json | null
          quality_score?: number | null
          source_topic_history_id?: string | null
          source_type?: string
          status?: string | null
          target_audience?: string | null
          title: string
          topic: string
          updated_at?: string
          user_id?: string | null
          word_count?: number | null
        }
        Update: {
          ai_model_used?: string | null
          brand_template_id?: string | null
          content?: string
          content_angle?: string | null
          content_goal?: string
          content_role?: string | null
          created_at?: string
          generation_metadata?: Json | null
          id?: string
          key_messages?: Json | null
          organization_id?: string | null
          outline?: Json | null
          quality_score?: number | null
          source_topic_history_id?: string | null
          source_type?: string
          status?: string | null
          target_audience?: string | null
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "core_contents_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_contents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_contents_source_topic_history_id_fkey"
            columns: ["source_topic_history_id"]
            isOneToOne: false
            referencedRelation: "topic_history"
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
      curated_events: {
        Row: {
          country_code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          industries: string[] | null
          is_active: boolean | null
          name: string
          organization_id: string | null
          priority: number | null
          suggested_angles: string[] | null
          suggested_topics: string[] | null
          updated_at: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          priority?: number | null
          suggested_angles?: string[] | null
          suggested_topics?: string[] | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          priority?: number | null
          suggested_angles?: string[] | null
          suggested_topics?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curated_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_news: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          industries: string[] | null
          is_active: boolean | null
          news_date: string | null
          organization_id: string | null
          relevance_score: number | null
          source_url: string | null
          suggested_angles: string[] | null
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          news_date?: string | null
          organization_id?: string | null
          relevance_score?: number | null
          source_url?: string | null
          suggested_angles?: string[] | null
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          news_date?: string | null
          organization_id?: string | null
          relevance_score?: number | null
          source_url?: string | null
          suggested_angles?: string[] | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "curated_news_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_personas: {
        Row: {
          age_range: string | null
          avatar_emoji: string | null
          avatar_url: string | null
          brand_template_id: string | null
          buying_motivation: string[] | null
          buying_triggers: string[] | null
          color_theme: string | null
          communication_style: string | null
          confidence_level: string | null
          content_preferences: Json | null
          country_variants: Json | null
          created_at: string | null
          data_source: string | null
          desires: string[] | null
          device_usage: string | null
          education_level: string | null
          family_status: string | null
          gender: string | null
          id: string
          income_level: string | null
          information_sources: string[] | null
          interests: string[] | null
          is_customized: boolean | null
          is_primary: boolean | null
          journey_map: Json | null
          last_researched_date: string | null
          location: string | null
          name: string
          objections: string[] | null
          occupation: string | null
          organization_id: string | null
          pain_points: string[] | null
          persona_prompt_hints: string | null
          preferred_channels: string[] | null
          priority_score: number | null
          response_tone_hints: string[] | null
          segment_size: number | null
          source_industry_persona_id: string | null
          tech_savviness: string | null
          typical_funnel_stage: string | null
          updated_at: string | null
          user_id: string | null
          values: string[] | null
        }
        Insert: {
          age_range?: string | null
          avatar_emoji?: string | null
          avatar_url?: string | null
          brand_template_id?: string | null
          buying_motivation?: string[] | null
          buying_triggers?: string[] | null
          color_theme?: string | null
          communication_style?: string | null
          confidence_level?: string | null
          content_preferences?: Json | null
          country_variants?: Json | null
          created_at?: string | null
          data_source?: string | null
          desires?: string[] | null
          device_usage?: string | null
          education_level?: string | null
          family_status?: string | null
          gender?: string | null
          id?: string
          income_level?: string | null
          information_sources?: string[] | null
          interests?: string[] | null
          is_customized?: boolean | null
          is_primary?: boolean | null
          journey_map?: Json | null
          last_researched_date?: string | null
          location?: string | null
          name: string
          objections?: string[] | null
          occupation?: string | null
          organization_id?: string | null
          pain_points?: string[] | null
          persona_prompt_hints?: string | null
          preferred_channels?: string[] | null
          priority_score?: number | null
          response_tone_hints?: string[] | null
          segment_size?: number | null
          source_industry_persona_id?: string | null
          tech_savviness?: string | null
          typical_funnel_stage?: string | null
          updated_at?: string | null
          user_id?: string | null
          values?: string[] | null
        }
        Update: {
          age_range?: string | null
          avatar_emoji?: string | null
          avatar_url?: string | null
          brand_template_id?: string | null
          buying_motivation?: string[] | null
          buying_triggers?: string[] | null
          color_theme?: string | null
          communication_style?: string | null
          confidence_level?: string | null
          content_preferences?: Json | null
          country_variants?: Json | null
          created_at?: string | null
          data_source?: string | null
          desires?: string[] | null
          device_usage?: string | null
          education_level?: string | null
          family_status?: string | null
          gender?: string | null
          id?: string
          income_level?: string | null
          information_sources?: string[] | null
          interests?: string[] | null
          is_customized?: boolean | null
          is_primary?: boolean | null
          journey_map?: Json | null
          last_researched_date?: string | null
          location?: string | null
          name?: string
          objections?: string[] | null
          occupation?: string | null
          organization_id?: string | null
          pain_points?: string[] | null
          persona_prompt_hints?: string | null
          preferred_channels?: string[] | null
          priority_score?: number | null
          response_tone_hints?: string[] | null
          segment_size?: number | null
          source_industry_persona_id?: string | null
          tech_savviness?: string | null
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
          {
            foreignKeyName: "customer_personas_source_industry_persona_id_fkey"
            columns: ["source_industry_persona_id"]
            isOneToOne: false
            referencedRelation: "industry_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_ignore_list: {
        Row: {
          id: string
          ignored_at: string | null
          ignored_by: string | null
          node_id_1: string
          node_id_2: string
          reason: string | null
        }
        Insert: {
          id?: string
          ignored_at?: string | null
          ignored_by?: string | null
          node_id_1: string
          node_id_2: string
          reason?: string | null
        }
        Update: {
          id?: string
          ignored_at?: string | null
          ignored_by?: string | null
          node_id_1?: string
          node_id_2?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_ignore_list_node_id_1_fkey"
            columns: ["node_id_1"]
            isOneToOne: false
            referencedRelation: "industry_knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_ignore_list_node_id_2_fkey"
            columns: ["node_id_2"]
            isOneToOne: false
            referencedRelation: "industry_knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_signals: {
        Row: {
          accepted: boolean | null
          brand_id: string | null
          channel: string
          created_at: string | null
          edited_background: boolean | null
          edited_text: boolean | null
          id: string
          image_style: string | null
          prompt_mode: string
          regenerated: boolean | null
          switched_mode: boolean | null
          time_to_accept_ms: number | null
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          brand_id?: string | null
          channel: string
          created_at?: string | null
          edited_background?: boolean | null
          edited_text?: boolean | null
          id?: string
          image_style?: string | null
          prompt_mode: string
          regenerated?: boolean | null
          switched_mode?: boolean | null
          time_to_accept_ms?: number | null
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          brand_id?: string | null
          channel?: string
          created_at?: string | null
          edited_background?: boolean | null
          edited_text?: boolean | null
          id?: string
          image_style?: string | null
          prompt_mode?: string
          regenerated?: boolean | null
          switched_mode?: boolean | null
          time_to_accept_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_signals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: string | null
          error_message: string | null
          expires_at: string | null
          id: string
          input_params: Json
          organization_id: string | null
          progress: number | null
          progress_message: string | null
          result_id: string | null
          result_type: string | null
          retry_count: number | null
          started_at: string | null
          status: string
          task_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          input_params?: Json
          organization_id?: string | null
          progress?: number | null
          progress_message?: string | null
          result_id?: string | null
          result_type?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          task_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          input_params?: Json
          organization_id?: string | null
          progress?: number | null
          progress_message?: string | null
          result_id?: string | null
          result_type?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          task_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          embedding: string | null
          id: string
          is_published: boolean | null
          keywords: string[] | null
          organization_id: string | null
          priority: number | null
          route_context: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          id?: string
          is_published?: boolean | null
          keywords?: string[] | null
          organization_id?: string | null
          priority?: number | null
          route_context?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          id?: string
          is_published?: boolean | null
          keywords?: string[] | null
          organization_id?: string | null
          priority?: number | null
          route_context?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_organization_id_fkey"
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
          label: string | null
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
          label?: string | null
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
          label?: string | null
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
      industry_global_packs: {
        Row: {
          category_id: string | null
          created_at: string | null
          global_argument_patterns: Json | null
          global_brand_voice: Json | null
          global_claim_restrictions: Json | null
          global_compliance_rules: Json | null
          global_system_rules: Json | null
          global_terminology: Json | null
          id: string
          industry_code: string
          industry_level: string | null
          is_active: boolean | null
          parent_pack_id: string | null
          related_industries: string[] | null
          risk_guidelines: Json | null
          sort_order: number | null
          target_audience: string | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          global_argument_patterns?: Json | null
          global_brand_voice?: Json | null
          global_claim_restrictions?: Json | null
          global_compliance_rules?: Json | null
          global_system_rules?: Json | null
          global_terminology?: Json | null
          id?: string
          industry_code: string
          industry_level?: string | null
          is_active?: boolean | null
          parent_pack_id?: string | null
          related_industries?: string[] | null
          risk_guidelines?: Json | null
          sort_order?: number | null
          target_audience?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          global_argument_patterns?: Json | null
          global_brand_voice?: Json | null
          global_claim_restrictions?: Json | null
          global_compliance_rules?: Json | null
          global_system_rules?: Json | null
          global_terminology?: Json | null
          id?: string
          industry_code?: string
          industry_level?: string | null
          is_active?: boolean | null
          parent_pack_id?: string | null
          related_industries?: string[] | null
          risk_guidelines?: Json | null
          sort_order?: number | null
          target_audience?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_global_packs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "industry_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_global_packs_parent_pack_id_fkey"
            columns: ["parent_pack_id"]
            isOneToOne: false
            referencedRelation: "industry_global_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_glossary: {
        Row: {
          abbreviation: string | null
          category: string
          created_at: string
          created_by: string | null
          id: string
          industry_template_id: string
          is_active: boolean
          is_preferred: boolean
          related_terms: string[] | null
          sort_order: number
          term: string
          updated_at: string
          usage_context: string | null
        }
        Insert: {
          abbreviation?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          industry_template_id: string
          is_active?: boolean
          is_preferred?: boolean
          related_terms?: string[] | null
          sort_order?: number
          term: string
          updated_at?: string
          usage_context?: string | null
        }
        Update: {
          abbreviation?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          industry_template_id?: string
          is_active?: boolean
          is_preferred?: boolean
          related_terms?: string[] | null
          sort_order?: number
          term?: string
          updated_at?: string
          usage_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_glossary_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_memory_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_glossary_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_glossary_translations: {
        Row: {
          created_at: string
          definition: string
          example_usage: string | null
          glossary_id: string
          id: string
          language_code: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          definition: string
          example_usage?: string | null
          glossary_id: string
          id?: string
          language_code?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          definition?: string
          example_usage?: string | null
          glossary_id?: string
          id?: string
          language_code?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_glossary_translations_glossary_id_fkey"
            columns: ["glossary_id"]
            isOneToOne: false
            referencedRelation: "industry_glossary"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_jurisdiction_profiles: {
        Row: {
          created_at: string | null
          disclaimer: string | null
          global_pack_id: string | null
          id: string
          jurisdiction_code: string
          last_verified_date: string | null
          resolved_rules: Json
          updated_at: string | null
          validity_status: string | null
        }
        Insert: {
          created_at?: string | null
          disclaimer?: string | null
          global_pack_id?: string | null
          id?: string
          jurisdiction_code: string
          last_verified_date?: string | null
          resolved_rules?: Json
          updated_at?: string | null
          validity_status?: string | null
        }
        Update: {
          created_at?: string | null
          disclaimer?: string | null
          global_pack_id?: string | null
          id?: string
          jurisdiction_code?: string
          last_verified_date?: string | null
          resolved_rules?: Json
          updated_at?: string | null
          validity_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_jurisdiction_profiles_global_pack_id_fkey"
            columns: ["global_pack_id"]
            isOneToOne: false
            referencedRelation: "industry_global_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_knowledge_edges: {
        Row: {
          created_at: string | null
          created_by: string | null
          edge_type: string
          id: string
          is_bidirectional: boolean | null
          properties: Json | null
          source_node_id: string
          target_node_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          edge_type: string
          id?: string
          is_bidirectional?: boolean | null
          properties?: Json | null
          source_node_id: string
          target_node_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          edge_type?: string
          id?: string
          is_bidirectional?: boolean | null
          properties?: Json | null
          source_node_id?: string
          target_node_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_knowledge_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "industry_knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_knowledge_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "industry_knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_knowledge_nodes: {
        Row: {
          content_hash: string | null
          content_quality_score: number | null
          created_at: string | null
          description: Json | null
          display_name: Json
          document_type: string | null
          document_url: string | null
          effective_date: string | null
          embedding: string | null
          extracted_data: Json | null
          full_text: string | null
          global_pack_id: string | null
          id: string
          is_active: boolean | null
          last_verified_at: string | null
          node_key: string
          node_type: string
          parse_status: string | null
          parsed_structure: Json | null
          properties: Json | null
          quality_breakdown: Json | null
          source_id: string | null
          source_url: string | null
          updated_at: string | null
        }
        Insert: {
          content_hash?: string | null
          content_quality_score?: number | null
          created_at?: string | null
          description?: Json | null
          display_name?: Json
          document_type?: string | null
          document_url?: string | null
          effective_date?: string | null
          embedding?: string | null
          extracted_data?: Json | null
          full_text?: string | null
          global_pack_id?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          node_key: string
          node_type: string
          parse_status?: string | null
          parsed_structure?: Json | null
          properties?: Json | null
          quality_breakdown?: Json | null
          source_id?: string | null
          source_url?: string | null
          updated_at?: string | null
        }
        Update: {
          content_hash?: string | null
          content_quality_score?: number | null
          created_at?: string | null
          description?: Json | null
          display_name?: Json
          document_type?: string | null
          document_url?: string | null
          effective_date?: string | null
          embedding?: string | null
          extracted_data?: Json | null
          full_text?: string | null
          global_pack_id?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          node_key?: string
          node_type?: string
          parse_status?: string | null
          parsed_structure?: Json | null
          properties?: Json | null
          quality_breakdown?: Json | null
          source_id?: string | null
          source_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_knowledge_nodes_global_pack_id_fkey"
            columns: ["global_pack_id"]
            isOneToOne: false
            referencedRelation: "industry_global_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_knowledge_nodes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "regulation_sources"
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
      industry_pack_translations: {
        Row: {
          created_at: string | null
          forbidden_terms: string[] | null
          global_pack_id: string | null
          glossary: Json | null
          id: string
          language_code: string
          name: string
          preferred_terms: string[] | null
          short_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          forbidden_terms?: string[] | null
          global_pack_id?: string | null
          glossary?: Json | null
          id?: string
          language_code: string
          name: string
          preferred_terms?: string[] | null
          short_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          forbidden_terms?: string[] | null
          global_pack_id?: string | null
          glossary?: Json | null
          id?: string
          language_code?: string
          name?: string
          preferred_terms?: string[] | null
          short_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_pack_translations_global_pack_id_fkey"
            columns: ["global_pack_id"]
            isOneToOne: false
            referencedRelation: "industry_global_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_persona_translations: {
        Row: {
          created_at: string | null
          desires: string[] | null
          id: string
          industry_persona_id: string
          language_code: string
          name: string
          objections: string[] | null
          occupation: string | null
          pain_points: string[] | null
          persona_prompt_hints: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          desires?: string[] | null
          id?: string
          industry_persona_id: string
          language_code?: string
          name: string
          objections?: string[] | null
          occupation?: string | null
          pain_points?: string[] | null
          persona_prompt_hints?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          desires?: string[] | null
          id?: string
          industry_persona_id?: string
          language_code?: string
          name?: string
          objections?: string[] | null
          occupation?: string | null
          pain_points?: string[] | null
          persona_prompt_hints?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_persona_translations_industry_persona_id_fkey"
            columns: ["industry_persona_id"]
            isOneToOne: false
            referencedRelation: "industry_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_persona_translations_v2: {
        Row: {
          created_at: string
          description: string | null
          goals: string[] | null
          id: string
          language_code: string
          lifestyle: string | null
          name: string
          objections: string[] | null
          pain_points: string[] | null
          persona_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          goals?: string[] | null
          id?: string
          language_code?: string
          lifestyle?: string | null
          name: string
          objections?: string[] | null
          pain_points?: string[] | null
          persona_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          goals?: string[] | null
          id?: string
          language_code?: string
          lifestyle?: string | null
          name?: string
          objections?: string[] | null
          pain_points?: string[] | null
          persona_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_persona_translations_v2_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "industry_personas_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_personas: {
        Row: {
          age_range: string | null
          avatar_emoji: string | null
          avatar_url: string | null
          buying_motivation: string[] | null
          buying_triggers: string[] | null
          color_theme: string | null
          communication_style: string | null
          confidence_level: string | null
          content_preferences: Json | null
          country_variants: Json | null
          created_at: string | null
          created_by: string | null
          data_source: string | null
          desires: string[] | null
          device_usage: string | null
          education_level: string | null
          family_status: string | null
          gender: string | null
          id: string
          income_level: string | null
          industry_template_id: string
          information_sources: string[] | null
          interests: string[] | null
          is_active: boolean | null
          journey_map: Json | null
          last_researched_date: string | null
          location: string | null
          name: string
          objections: string[] | null
          occupation: string | null
          pain_points: string[] | null
          persona_prompt_hints: string | null
          preferred_channels: string[] | null
          priority_score: number | null
          response_tone_hints: string[] | null
          segment_size: number | null
          sort_order: number | null
          tech_savviness: string | null
          typical_funnel_stage: string | null
          updated_at: string | null
          values: string[] | null
        }
        Insert: {
          age_range?: string | null
          avatar_emoji?: string | null
          avatar_url?: string | null
          buying_motivation?: string[] | null
          buying_triggers?: string[] | null
          color_theme?: string | null
          communication_style?: string | null
          confidence_level?: string | null
          content_preferences?: Json | null
          country_variants?: Json | null
          created_at?: string | null
          created_by?: string | null
          data_source?: string | null
          desires?: string[] | null
          device_usage?: string | null
          education_level?: string | null
          family_status?: string | null
          gender?: string | null
          id?: string
          income_level?: string | null
          industry_template_id: string
          information_sources?: string[] | null
          interests?: string[] | null
          is_active?: boolean | null
          journey_map?: Json | null
          last_researched_date?: string | null
          location?: string | null
          name: string
          objections?: string[] | null
          occupation?: string | null
          pain_points?: string[] | null
          persona_prompt_hints?: string | null
          preferred_channels?: string[] | null
          priority_score?: number | null
          response_tone_hints?: string[] | null
          segment_size?: number | null
          sort_order?: number | null
          tech_savviness?: string | null
          typical_funnel_stage?: string | null
          updated_at?: string | null
          values?: string[] | null
        }
        Update: {
          age_range?: string | null
          avatar_emoji?: string | null
          avatar_url?: string | null
          buying_motivation?: string[] | null
          buying_triggers?: string[] | null
          color_theme?: string | null
          communication_style?: string | null
          confidence_level?: string | null
          content_preferences?: Json | null
          country_variants?: Json | null
          created_at?: string | null
          created_by?: string | null
          data_source?: string | null
          desires?: string[] | null
          device_usage?: string | null
          education_level?: string | null
          family_status?: string | null
          gender?: string | null
          id?: string
          income_level?: string | null
          industry_template_id?: string
          information_sources?: string[] | null
          interests?: string[] | null
          is_active?: boolean | null
          journey_map?: Json | null
          last_researched_date?: string | null
          location?: string | null
          name?: string
          objections?: string[] | null
          occupation?: string | null
          pain_points?: string[] | null
          persona_prompt_hints?: string | null
          preferred_channels?: string[] | null
          priority_score?: number | null
          response_tone_hints?: string[] | null
          segment_size?: number | null
          sort_order?: number | null
          tech_savviness?: string | null
          typical_funnel_stage?: string | null
          updated_at?: string | null
          values?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_personas_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_memory_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_personas_industry_template_id_fkey"
            columns: ["industry_template_id"]
            isOneToOne: false
            referencedRelation: "industry_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_personas_v2: {
        Row: {
          age_range: string | null
          avatar_url: string | null
          buying_motivation: string[] | null
          communication_style: string | null
          content_consumption: string[] | null
          content_preferences: Json | null
          country_variants: Json | null
          created_at: string
          created_by: string | null
          decision_factors: string[] | null
          description: string | null
          device_usage: Json | null
          education_level: string | null
          family_status: string | null
          gender: string | null
          global_pack_id: string
          goals: string[] | null
          id: string
          income_level: string | null
          interests: string[] | null
          is_active: boolean | null
          journey_stages: Json | null
          lifestyle: string | null
          location_type: string | null
          name: string
          objections: string[] | null
          occupation: string | null
          pain_points: string[] | null
          personality_traits: string[] | null
          preferred_channels: string[] | null
          price_sensitivity: string | null
          purchase_frequency: string | null
          response_tone_hints: string[] | null
          social_platforms: string[] | null
          sort_order: number | null
          tech_savviness: string | null
          updated_at: string
          values: string[] | null
        }
        Insert: {
          age_range?: string | null
          avatar_url?: string | null
          buying_motivation?: string[] | null
          communication_style?: string | null
          content_consumption?: string[] | null
          content_preferences?: Json | null
          country_variants?: Json | null
          created_at?: string
          created_by?: string | null
          decision_factors?: string[] | null
          description?: string | null
          device_usage?: Json | null
          education_level?: string | null
          family_status?: string | null
          gender?: string | null
          global_pack_id: string
          goals?: string[] | null
          id?: string
          income_level?: string | null
          interests?: string[] | null
          is_active?: boolean | null
          journey_stages?: Json | null
          lifestyle?: string | null
          location_type?: string | null
          name: string
          objections?: string[] | null
          occupation?: string | null
          pain_points?: string[] | null
          personality_traits?: string[] | null
          preferred_channels?: string[] | null
          price_sensitivity?: string | null
          purchase_frequency?: string | null
          response_tone_hints?: string[] | null
          social_platforms?: string[] | null
          sort_order?: number | null
          tech_savviness?: string | null
          updated_at?: string
          values?: string[] | null
        }
        Update: {
          age_range?: string | null
          avatar_url?: string | null
          buying_motivation?: string[] | null
          communication_style?: string | null
          content_consumption?: string[] | null
          content_preferences?: Json | null
          country_variants?: Json | null
          created_at?: string
          created_by?: string | null
          decision_factors?: string[] | null
          description?: string | null
          device_usage?: Json | null
          education_level?: string | null
          family_status?: string | null
          gender?: string | null
          global_pack_id?: string
          goals?: string[] | null
          id?: string
          income_level?: string | null
          interests?: string[] | null
          is_active?: boolean | null
          journey_stages?: Json | null
          lifestyle?: string | null
          location_type?: string | null
          name?: string
          objections?: string[] | null
          occupation?: string | null
          pain_points?: string[] | null
          personality_traits?: string[] | null
          preferred_channels?: string[] | null
          price_sensitivity?: string | null
          purchase_frequency?: string | null
          response_tone_hints?: string[] | null
          social_platforms?: string[] | null
          sort_order?: number | null
          tech_savviness?: string | null
          updated_at?: string
          values?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_personas_v2_global_pack_id_fkey"
            columns: ["global_pack_id"]
            isOneToOne: false
            referencedRelation: "industry_global_packs"
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
          deleted_at: string | null
          deleted_by: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
      insight_analytics: {
        Row: {
          action_href: string | null
          action_type: string
          created_at: string | null
          id: string
          insight_id: string
          insight_type: string
          organization_id: string | null
          time_spent_ms: number | null
          user_id: string
        }
        Insert: {
          action_href?: string | null
          action_type: string
          created_at?: string | null
          id?: string
          insight_id: string
          insight_type: string
          organization_id?: string | null
          time_spent_ms?: number | null
          user_id: string
        }
        Update: {
          action_href?: string | null
          action_type?: string
          created_at?: string | null
          id?: string
          insight_id?: string
          insight_type?: string
          organization_id?: string | null
          time_spent_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_stage_messaging: {
        Row: {
          avoid_messages: string[] | null
          benefits_highlight: string[] | null
          content_types: string[] | null
          created_at: string | null
          cta_template: string | null
          emotional_tone: string | null
          headline: string | null
          hook: string | null
          id: string
          journey_stage: string
          key_message: string | null
          mapping_id: string
          objection_response: string | null
          organization_id: string | null
          pain_points_focus: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avoid_messages?: string[] | null
          benefits_highlight?: string[] | null
          content_types?: string[] | null
          created_at?: string | null
          cta_template?: string | null
          emotional_tone?: string | null
          headline?: string | null
          hook?: string | null
          id?: string
          journey_stage: string
          key_message?: string | null
          mapping_id: string
          objection_response?: string | null
          organization_id?: string | null
          pain_points_focus?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avoid_messages?: string[] | null
          benefits_highlight?: string[] | null
          content_types?: string[] | null
          created_at?: string | null
          cta_template?: string | null
          emotional_tone?: string | null
          headline?: string | null
          hook?: string | null
          id?: string
          journey_stage?: string
          key_message?: string | null
          mapping_id?: string
          objection_response?: string | null
          organization_id?: string | null
          pain_points_focus?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_stage_messaging_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "product_persona_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_graph_analytics: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          id: string
          organization_id: string | null
          query_params: Json | null
          query_type: string
          result_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          organization_id?: string | null
          query_params?: Json | null
          query_type: string
          result_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          organization_id?: string | null
          query_params?: Json | null
          query_type?: string
          result_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_graph_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_graph_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          expires_at: string
          hit_count: number | null
          id: string
          start_node_id: string | null
          traversal_result: Json
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          expires_at: string
          hit_count?: number | null
          id?: string
          start_node_id?: string | null
          traversal_result: Json
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          start_node_id?: string | null
          traversal_result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_graph_cache_start_node_id_fkey"
            columns: ["start_node_id"]
            isOneToOne: false
            referencedRelation: "industry_knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_adjustment_dismissals: {
        Row: {
          campaign_id: string
          created_at: string
          dismissed_at: string
          dismissed_until: string
          id: string
          metric: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          dismissed_at?: string
          dismissed_until: string
          id?: string
          metric: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          dismissed_at?: string
          dismissed_until?: string
          id?: string
          metric?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_adjustment_dismissals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_calendar: {
        Row: {
          country_code: string | null
          created_at: string | null
          end_date: string | null
          event_name: string
          event_name_vi: string | null
          event_type: string
          id: string
          industries: string[] | null
          is_active: boolean | null
          start_date: string
          suggested_keywords: string[] | null
          suggested_themes: string[] | null
          urgency_level: number | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          end_date?: string | null
          event_name: string
          event_name_vi?: string | null
          event_type: string
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          start_date: string
          suggested_keywords?: string[] | null
          suggested_themes?: string[] | null
          urgency_level?: number | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          end_date?: string | null
          event_name?: string
          event_name_vi?: string | null
          event_type?: string
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          start_date?: string
          suggested_keywords?: string[] | null
          suggested_themes?: string[] | null
          urgency_level?: number | null
        }
        Relationships: []
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
          content_role: string | null
          core_content_id: string | null
          created_at: string
          critique_details: Json | null
          critique_score: number | null
          deadline: string | null
          email_content: string | null
          facebook_content: string | null
          global_hook: Json | null
          google_maps_content: string | null
          hook_evaluations: Json | null
          id: string
          industry: string | null
          industry_template_version: string | null
          instagram_content: string | null
          linkedin_content: string | null
          needs_manual_review: boolean | null
          organization_id: string | null
          primary_color: string | null
          priority: string | null
          refinement_count: number | null
          selected_channels: string[]
          selected_hooks: Json | null
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
          was_refined: boolean | null
          website_content: string | null
          website_seo_data: Json | null
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
          content_role?: string | null
          core_content_id?: string | null
          created_at?: string
          critique_details?: Json | null
          critique_score?: number | null
          deadline?: string | null
          email_content?: string | null
          facebook_content?: string | null
          global_hook?: Json | null
          google_maps_content?: string | null
          hook_evaluations?: Json | null
          id?: string
          industry?: string | null
          industry_template_version?: string | null
          instagram_content?: string | null
          linkedin_content?: string | null
          needs_manual_review?: boolean | null
          organization_id?: string | null
          primary_color?: string | null
          priority?: string | null
          refinement_count?: number | null
          selected_channels: string[]
          selected_hooks?: Json | null
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
          was_refined?: boolean | null
          website_content?: string | null
          website_seo_data?: Json | null
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
          content_role?: string | null
          core_content_id?: string | null
          created_at?: string
          critique_details?: Json | null
          critique_score?: number | null
          deadline?: string | null
          email_content?: string | null
          facebook_content?: string | null
          global_hook?: Json | null
          google_maps_content?: string | null
          hook_evaluations?: Json | null
          id?: string
          industry?: string | null
          industry_template_version?: string | null
          instagram_content?: string | null
          linkedin_content?: string | null
          needs_manual_review?: boolean | null
          organization_id?: string | null
          primary_color?: string | null
          priority?: string | null
          refinement_count?: number | null
          selected_channels?: string[]
          selected_hooks?: Json | null
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
          was_refined?: boolean | null
          website_content?: string | null
          website_seo_data?: Json | null
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
            foreignKeyName: "multi_channel_contents_core_content_id_fkey"
            columns: ["core_content_id"]
            isOneToOne: false
            referencedRelation: "core_contents"
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
          monthly_brands: number
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
          monthly_brands?: number
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
          monthly_brands?: number
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
      planned_content_items: {
        Row: {
          ai_confidence: number | null
          category: string | null
          channels: string[] | null
          content_id: string | null
          content_type: string | null
          created_at: string | null
          format: string
          id: string
          is_user_modified: boolean | null
          original_suggestion: Json | null
          pillar: string | null
          priority: string | null
          reasoning: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          session_id: string
          sort_order: number | null
          status: string | null
          topic: string
          updated_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          category?: string | null
          channels?: string[] | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          format: string
          id?: string
          is_user_modified?: boolean | null
          original_suggestion?: Json | null
          pillar?: string | null
          priority?: string | null
          reasoning?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          session_id: string
          sort_order?: number | null
          status?: string | null
          topic: string
          updated_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          category?: string | null
          channels?: string[] | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          format?: string
          id?: string
          is_user_modified?: boolean | null
          original_suggestion?: Json | null
          pillar?: string | null
          priority?: string | null
          reasoning?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          session_id?: string
          sort_order?: number | null
          status?: string | null
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planned_content_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "planning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_sessions: {
        Row: {
          ai_suggestions: Json | null
          brand_template_id: string | null
          constraints: Json | null
          conversation_id: string | null
          created_at: string | null
          current_plan: Json | null
          finalized_at: string | null
          goal: string | null
          id: string
          organization_id: string | null
          plan_versions: Json | null
          session_type: string
          status: string
          target_channels: string[] | null
          timeframe_end: string | null
          timeframe_start: string | null
          title: string | null
          total_content_pieces: number | null
          total_topics: number | null
          updated_at: string | null
          user_feedback_history: Json | null
          user_id: string
        }
        Insert: {
          ai_suggestions?: Json | null
          brand_template_id?: string | null
          constraints?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          current_plan?: Json | null
          finalized_at?: string | null
          goal?: string | null
          id?: string
          organization_id?: string | null
          plan_versions?: Json | null
          session_type?: string
          status?: string
          target_channels?: string[] | null
          timeframe_end?: string | null
          timeframe_start?: string | null
          title?: string | null
          total_content_pieces?: number | null
          total_topics?: number | null
          updated_at?: string | null
          user_feedback_history?: Json | null
          user_id: string
        }
        Update: {
          ai_suggestions?: Json | null
          brand_template_id?: string | null
          constraints?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          current_plan?: Json | null
          finalized_at?: string | null
          goal?: string | null
          id?: string
          organization_id?: string | null
          plan_versions?: Json | null
          session_type?: string
          status?: string
          target_channels?: string[] | null
          timeframe_end?: string | null
          timeframe_start?: string | null
          title?: string | null
          total_content_pieces?: number | null
          total_topics?: number | null
          updated_at?: string | null
          user_feedback_history?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_sessions_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_persona_mappings: {
        Row: {
          avoid_topics: string[] | null
          brand_template_id: string
          created_at: string | null
          custom_pitch: string | null
          id: string
          is_primary_product: boolean | null
          key_benefits: string[] | null
          objection_handlers: string[] | null
          organization_id: string | null
          persona_id: string
          preferred_content_angles: string[] | null
          product_id: string
          relevance_score: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avoid_topics?: string[] | null
          brand_template_id: string
          created_at?: string | null
          custom_pitch?: string | null
          id?: string
          is_primary_product?: boolean | null
          key_benefits?: string[] | null
          objection_handlers?: string[] | null
          organization_id?: string | null
          persona_id: string
          preferred_content_angles?: string[] | null
          product_id: string
          relevance_score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avoid_topics?: string[] | null
          brand_template_id?: string
          created_at?: string | null
          custom_pitch?: string | null
          id?: string
          is_primary_product?: boolean | null
          key_benefits?: string[] | null
          objection_handlers?: string[] | null
          organization_id?: string | null
          persona_id?: string
          preferred_content_angles?: string[] | null
          product_id?: string
          relevance_score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_persona_mappings_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_persona_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_persona_mappings_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "customer_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_persona_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "brand_products"
            referencedColumns: ["id"]
          },
        ]
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
      publish_attempts: {
        Row: {
          attempted_at: string | null
          channel: string
          completed_at: string | null
          connection_id: string | null
          content_id: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          external_post_id: string | null
          external_post_url: string | null
          id: string
          organization_id: string | null
          platform: string
          request_payload: Json | null
          response_payload: Json | null
          retry_count: number | null
          schedule_id: string | null
          status: string | null
        }
        Insert: {
          attempted_at?: string | null
          channel: string
          completed_at?: string | null
          connection_id?: string | null
          content_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          id?: string
          organization_id?: string | null
          platform: string
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          schedule_id?: string | null
          status?: string | null
        }
        Update: {
          attempted_at?: string | null
          channel?: string
          completed_at?: string | null
          connection_id?: string | null
          content_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          id?: string
          organization_id?: string | null
          platform?: string
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          schedule_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publish_attempts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_attempts_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "multi_channel_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_attempts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "content_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      regulation_crawl_history: {
        Row: {
          changes_detected: number | null
          crawl_completed_at: string | null
          crawl_data: Json | null
          crawl_started_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          new_regulations: number | null
          results_count: number | null
          source_id: string | null
          status: string | null
          updated_regulations: number | null
        }
        Insert: {
          changes_detected?: number | null
          crawl_completed_at?: string | null
          crawl_data?: Json | null
          crawl_started_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          new_regulations?: number | null
          results_count?: number | null
          source_id?: string | null
          status?: string | null
          updated_regulations?: number | null
        }
        Update: {
          changes_detected?: number | null
          crawl_completed_at?: string | null
          crawl_data?: Json | null
          crawl_started_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          new_regulations?: number | null
          results_count?: number | null
          source_id?: string | null
          status?: string | null
          updated_regulations?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "regulation_crawl_history_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "regulation_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      regulation_propagation_log: {
        Row: {
          affected_pack_id: string | null
          affected_rules: Json | null
          ai_confidence_score: number | null
          change_summary: string | null
          change_type: string
          created_at: string | null
          document_diff: Json | null
          id: string
          impact_analysis: Json | null
          priority: string | null
          propagated_at: string | null
          propagation_status: string | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_node_id: string | null
        }
        Insert: {
          affected_pack_id?: string | null
          affected_rules?: Json | null
          ai_confidence_score?: number | null
          change_summary?: string | null
          change_type: string
          created_at?: string | null
          document_diff?: Json | null
          id?: string
          impact_analysis?: Json | null
          priority?: string | null
          propagated_at?: string | null
          propagation_status?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_node_id?: string | null
        }
        Update: {
          affected_pack_id?: string | null
          affected_rules?: Json | null
          ai_confidence_score?: number | null
          change_summary?: string | null
          change_type?: string
          created_at?: string | null
          document_diff?: Json | null
          id?: string
          impact_analysis?: Json | null
          priority?: string | null
          propagated_at?: string | null
          propagation_status?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_node_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulation_propagation_log_affected_pack_id_fkey"
            columns: ["affected_pack_id"]
            isOneToOne: false
            referencedRelation: "industry_global_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_propagation_log_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "industry_knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      regulation_sources: {
        Row: {
          category: string
          crawl_frequency: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          jurisdiction: string
          last_crawled_at: string | null
          next_crawl_at: string | null
          properties: Json | null
          search_query: string | null
          source_name: string
          source_url: string
          target_industry_category_ids: string[] | null
          target_industry_pack_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          crawl_frequency?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction: string
          last_crawled_at?: string | null
          next_crawl_at?: string | null
          properties?: Json | null
          search_query?: string | null
          source_name: string
          source_url: string
          target_industry_category_ids?: string[] | null
          target_industry_pack_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          crawl_frequency?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction?: string
          last_crawled_at?: string | null
          next_crawl_at?: string | null
          properties?: Json | null
          search_query?: string | null
          source_name?: string
          source_url?: string
          target_industry_category_ids?: string[] | null
          target_industry_pack_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      regulation_versions: {
        Row: {
          changed_articles: string[] | null
          content_hash: string
          content_quality_score: number | null
          created_at: string
          diff_summary: string | null
          effective_date: string | null
          full_text: string
          id: string
          node_id: string
          previous_version_id: string | null
          version_number: number
        }
        Insert: {
          changed_articles?: string[] | null
          content_hash: string
          content_quality_score?: number | null
          created_at?: string
          diff_summary?: string | null
          effective_date?: string | null
          full_text: string
          id?: string
          node_id: string
          previous_version_id?: string | null
          version_number?: number
        }
        Update: {
          changed_articles?: string[] | null
          content_hash?: string
          content_quality_score?: number | null
          created_at?: string
          diff_summary?: string | null
          effective_date?: string | null
          full_text?: string
          id?: string
          node_id?: string
          previous_version_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "regulation_versions_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "industry_knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_versions_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "regulation_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_chat_analytics: {
        Row: {
          assistant_message_count: number | null
          conversion_action: string | null
          converted: boolean | null
          created_at: string
          cta_clicked: string[] | null
          detected_intent: string | null
          ended_at: string | null
          id: string
          intent_confidence: number | null
          message_count: number | null
          objections: string[] | null
          objections_handled: boolean | null
          overall_sentiment: string | null
          page_url: string | null
          questions_asked: string[] | null
          referrer: string | null
          sentiment_score: number | null
          session_id: string
          started_at: string
          thumbs_down_count: number | null
          thumbs_up_count: number | null
          topics_discussed: string[] | null
          updated_at: string
          user_agent: string | null
          user_message_count: number | null
          visitor_id: string | null
        }
        Insert: {
          assistant_message_count?: number | null
          conversion_action?: string | null
          converted?: boolean | null
          created_at?: string
          cta_clicked?: string[] | null
          detected_intent?: string | null
          ended_at?: string | null
          id?: string
          intent_confidence?: number | null
          message_count?: number | null
          objections?: string[] | null
          objections_handled?: boolean | null
          overall_sentiment?: string | null
          page_url?: string | null
          questions_asked?: string[] | null
          referrer?: string | null
          sentiment_score?: number | null
          session_id: string
          started_at?: string
          thumbs_down_count?: number | null
          thumbs_up_count?: number | null
          topics_discussed?: string[] | null
          updated_at?: string
          user_agent?: string | null
          user_message_count?: number | null
          visitor_id?: string | null
        }
        Update: {
          assistant_message_count?: number | null
          conversion_action?: string | null
          converted?: boolean | null
          created_at?: string
          cta_clicked?: string[] | null
          detected_intent?: string | null
          ended_at?: string | null
          id?: string
          intent_confidence?: number | null
          message_count?: number | null
          objections?: string[] | null
          objections_handled?: boolean | null
          overall_sentiment?: string | null
          page_url?: string | null
          questions_asked?: string[] | null
          referrer?: string | null
          sentiment_score?: number | null
          session_id?: string
          started_at?: string
          thumbs_down_count?: number | null
          thumbs_up_count?: number | null
          topics_discussed?: string[] | null
          updated_at?: string
          user_agent?: string | null
          user_message_count?: number | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      sales_chat_leads: {
        Row: {
          conversation_summary: string | null
          created_at: string | null
          email: string | null
          handoff_platform: string | null
          handoff_requested: boolean | null
          id: string
          interest_level: string | null
          interested_features: string[] | null
          name: string | null
          notes: string | null
          phone: string | null
          session_id: string
          source_url: string | null
          status: string | null
          updated_at: string | null
          visitor_id: string
        }
        Insert: {
          conversation_summary?: string | null
          created_at?: string | null
          email?: string | null
          handoff_platform?: string | null
          handoff_requested?: boolean | null
          id?: string
          interest_level?: string | null
          interested_features?: string[] | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          session_id: string
          source_url?: string | null
          status?: string | null
          updated_at?: string | null
          visitor_id: string
        }
        Update: {
          conversation_summary?: string | null
          created_at?: string | null
          email?: string | null
          handoff_platform?: string | null
          handoff_requested?: boolean | null
          id?: string
          interest_level?: string | null
          interested_features?: string[] | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          session_id?: string
          source_url?: string | null
          status?: string | null
          updated_at?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      sales_chat_messages_log: {
        Row: {
          content: string
          created_at: string
          id: string
          intent_category: string | null
          reactions: string[] | null
          role: string
          sentiment: string | null
          session_id: string
          topic: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          intent_category?: string | null
          reactions?: string[] | null
          role: string
          sentiment?: string | null
          session_id: string
          topic?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          intent_category?: string | null
          reactions?: string[] | null
          role?: string
          sentiment?: string | null
          session_id?: string
          topic?: string | null
        }
        Relationships: []
      }
      saved_audiences: {
        Row: {
          age_max: number | null
          age_min: number | null
          behaviors: string[] | null
          brand_template_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          device_types: string[] | null
          education_levels: string[] | null
          estimated_reach_max: number | null
          estimated_reach_min: number | null
          exclude_behaviors: string[] | null
          exclude_interests: string[] | null
          genders: string[] | null
          id: string
          income_levels: string[] | null
          interests: string[] | null
          is_favorite: boolean | null
          languages: string[] | null
          last_reach_check: string | null
          life_events: string[] | null
          locations: string[] | null
          lookalike_percentage: number | null
          lookalike_source: string | null
          name: string
          organization_id: string
          relationship_statuses: string[] | null
          source_persona_id: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          behaviors?: string[] | null
          brand_template_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          device_types?: string[] | null
          education_levels?: string[] | null
          estimated_reach_max?: number | null
          estimated_reach_min?: number | null
          exclude_behaviors?: string[] | null
          exclude_interests?: string[] | null
          genders?: string[] | null
          id?: string
          income_levels?: string[] | null
          interests?: string[] | null
          is_favorite?: boolean | null
          languages?: string[] | null
          last_reach_check?: string | null
          life_events?: string[] | null
          locations?: string[] | null
          lookalike_percentage?: number | null
          lookalike_source?: string | null
          name: string
          organization_id: string
          relationship_statuses?: string[] | null
          source_persona_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          behaviors?: string[] | null
          brand_template_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          device_types?: string[] | null
          education_levels?: string[] | null
          estimated_reach_max?: number | null
          estimated_reach_min?: number | null
          exclude_behaviors?: string[] | null
          exclude_interests?: string[] | null
          genders?: string[] | null
          id?: string
          income_levels?: string[] | null
          interests?: string[] | null
          is_favorite?: boolean | null
          languages?: string[] | null
          last_reach_check?: string | null
          life_events?: string[] | null
          locations?: string[] | null
          lookalike_percentage?: number | null
          lookalike_source?: string | null
          name?: string
          organization_id?: string
          relationship_statuses?: string[] | null
          source_persona_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_audiences_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_audiences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_audiences_source_persona_id_fkey"
            columns: ["source_persona_id"]
            isOneToOne: false
            referencedRelation: "customer_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      script_approvals: {
        Row: {
          id: string
          notes: string | null
          organization_id: string | null
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewer_id: string | null
          script_id: string
          status: Database["public"]["Enums"]["script_status"] | null
          version_at_request: number
        }
        Insert: {
          id?: string
          notes?: string | null
          organization_id?: string | null
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          script_id: string
          status?: Database["public"]["Enums"]["script_status"] | null
          version_at_request: number
        }
        Update: {
          id?: string
          notes?: string | null
          organization_id?: string | null
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          script_id?: string
          status?: Database["public"]["Enums"]["script_status"] | null
          version_at_request?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_approvals_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_versions: {
        Row: {
          analysis_cache: Json | null
          change_summary: string | null
          character_type: string | null
          content: string
          created_at: string
          created_by: string
          duration: number | null
          id: string
          script_id: string
          storyboard: Json | null
          topic: string | null
          version: number
          video_type: string | null
        }
        Insert: {
          analysis_cache?: Json | null
          change_summary?: string | null
          character_type?: string | null
          content: string
          created_at?: string
          created_by: string
          duration?: number | null
          id?: string
          script_id: string
          storyboard?: Json | null
          topic?: string | null
          version: number
          video_type?: string | null
        }
        Update: {
          analysis_cache?: Json | null
          change_summary?: string | null
          character_type?: string | null
          content?: string
          created_at?: string
          created_by?: string
          duration?: number | null
          id?: string
          script_id?: string
          storyboard?: Json | null
          topic?: string | null
          version?: number
          video_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "script_versions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          analysis_cache: Json | null
          analyzed_at: string | null
          approved_at: string | null
          approved_by: string | null
          brand_template_id: string | null
          brand_voice_variant_id: string | null
          campaign_id: string | null
          character_type: string
          content: string
          created_at: string
          critique_details: Json | null
          critique_score: number | null
          dialogue_style: string | null
          duration: number
          id: string
          industry_template_id: string | null
          industry_template_version: string | null
          needs_manual_review: boolean | null
          organization_id: string | null
          refinement_count: number | null
          rejection_reason: string | null
          script_purpose: string
          shared_with_org: boolean | null
          status: string | null
          title: string
          topic: string
          updated_at: string
          user_id: string | null
          version: number | null
          video_type: string
          voice_region: string | null
          was_refined: boolean | null
        }
        Insert: {
          analysis_cache?: Json | null
          analyzed_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          brand_template_id?: string | null
          brand_voice_variant_id?: string | null
          campaign_id?: string | null
          character_type?: string
          content: string
          created_at?: string
          critique_details?: Json | null
          critique_score?: number | null
          dialogue_style?: string | null
          duration?: number
          id?: string
          industry_template_id?: string | null
          industry_template_version?: string | null
          needs_manual_review?: boolean | null
          organization_id?: string | null
          refinement_count?: number | null
          rejection_reason?: string | null
          script_purpose?: string
          shared_with_org?: boolean | null
          status?: string | null
          title: string
          topic: string
          updated_at?: string
          user_id?: string | null
          version?: number | null
          video_type?: string
          voice_region?: string | null
          was_refined?: boolean | null
        }
        Update: {
          analysis_cache?: Json | null
          analyzed_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          brand_template_id?: string | null
          brand_voice_variant_id?: string | null
          campaign_id?: string | null
          character_type?: string
          content?: string
          created_at?: string
          critique_details?: Json | null
          critique_score?: number | null
          dialogue_style?: string | null
          duration?: number
          id?: string
          industry_template_id?: string | null
          industry_template_version?: string | null
          needs_manual_review?: boolean | null
          organization_id?: string | null
          refinement_count?: number | null
          rejection_reason?: string | null
          script_purpose?: string
          shared_with_org?: boolean | null
          status?: string | null
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
          version?: number | null
          video_type?: string
          voice_region?: string | null
          was_refined?: boolean | null
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
            foreignKeyName: "scripts_brand_voice_variant_id_fkey"
            columns: ["brand_voice_variant_id"]
            isOneToOne: false
            referencedRelation: "brand_voice_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          flagged_patterns: string[] | null
          id: string
          organization_id: string | null
          original_length: number | null
          risk_level: string
          user_id: string | null
          was_truncated: boolean | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type?: string
          flagged_patterns?: string[] | null
          id?: string
          organization_id?: string | null
          original_length?: number | null
          risk_level?: string
          user_id?: string | null
          was_truncated?: boolean | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          flagged_patterns?: string[] | null
          id?: string
          organization_id?: string | null
          original_length?: number | null
          risk_level?: string
          user_id?: string | null
          was_truncated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          access_token: string
          ad_account_id: string | null
          ad_account_name: string | null
          app_id: string | null
          brand_template_id: string | null
          business_id: string | null
          connected_at: string | null
          connection_type: string | null
          consumer_key: string | null
          consumer_secret: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_used_at: string | null
          last_verified_at: string | null
          metadata: Json | null
          organization_id: string | null
          page_id: string | null
          page_name: string | null
          platform: string
          platform_avatar_url: string | null
          platform_display_name: string | null
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          ad_account_id?: string | null
          ad_account_name?: string | null
          app_id?: string | null
          brand_template_id?: string | null
          business_id?: string | null
          connected_at?: string | null
          connection_type?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_used_at?: string | null
          last_verified_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          page_id?: string | null
          page_name?: string | null
          platform: string
          platform_avatar_url?: string | null
          platform_display_name?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          ad_account_id?: string | null
          ad_account_name?: string | null
          app_id?: string | null
          brand_template_id?: string | null
          business_id?: string | null
          connected_at?: string | null
          connection_type?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_used_at?: string | null
          last_verified_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          page_id?: string | null
          page_name?: string | null
          platform?: string
          platform_avatar_url?: string | null
          platform_display_name?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_platform_settings: {
        Row: {
          app_name: string | null
          consumer_key: string | null
          consumer_secret: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          platform: string
          updated_at: string | null
        }
        Insert: {
          app_name?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          updated_at?: string | null
        }
        Update: {
          app_name?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          updated_at?: string | null
        }
        Relationships: []
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
          organization_id: string
          payment_provider: string | null
          payment_reference: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          status: Database["public"]["Enums"]["subscription_status"]
          trial_end: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          organization_id: string
          payment_provider?: string | null
          payment_reference?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_content_links: {
        Row: {
          content_id: string
          content_status: string | null
          content_title: string | null
          content_type: string
          created_at: string
          id: string
          organization_id: string | null
          topic_history_id: string
          user_id: string | null
        }
        Insert: {
          content_id: string
          content_status?: string | null
          content_title?: string | null
          content_type: string
          created_at?: string
          id?: string
          organization_id?: string | null
          topic_history_id: string
          user_id?: string | null
        }
        Update: {
          content_id?: string
          content_status?: string | null
          content_title?: string | null
          content_type?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          topic_history_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_content_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_content_links_topic_history_id_fkey"
            columns: ["topic_history_id"]
            isOneToOne: false
            referencedRelation: "topic_history"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_history: {
        Row: {
          actual_engagement: Json | null
          brand_template_id: string | null
          campaign_id: string | null
          category: string
          content_goal: string
          content_id: string | null
          content_type: string | null
          created_at: string | null
          feedback: string | null
          feedback_details: Json | null
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
          campaign_id?: string | null
          category: string
          content_goal: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          feedback?: string | null
          feedback_details?: Json | null
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
          campaign_id?: string | null
          category?: string
          content_goal?: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          feedback?: string | null
          feedback_details?: Json | null
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
            foreignKeyName: "topic_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
      trending_topics: {
        Row: {
          brand_template_id: string | null
          category: string | null
          competition_level: string | null
          created_at: string | null
          engagement_potential: number | null
          expires_at: string | null
          id: string
          organization_id: string | null
          peak_prediction: string | null
          peak_status: string | null
          related_keywords: string[] | null
          source: string | null
          source_url: string | null
          suggested_angles: string[] | null
          topic: string
          updated_at: string | null
          velocity_score: number | null
        }
        Insert: {
          brand_template_id?: string | null
          category?: string | null
          competition_level?: string | null
          created_at?: string | null
          engagement_potential?: number | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          peak_prediction?: string | null
          peak_status?: string | null
          related_keywords?: string[] | null
          source?: string | null
          source_url?: string | null
          suggested_angles?: string[] | null
          topic: string
          updated_at?: string | null
          velocity_score?: number | null
        }
        Update: {
          brand_template_id?: string | null
          category?: string | null
          competition_level?: string | null
          created_at?: string | null
          engagement_potential?: number | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          peak_prediction?: string | null
          peak_status?: string | null
          related_keywords?: string[] | null
          source?: string | null
          source_url?: string | null
          suggested_angles?: string[] | null
          topic?: string
          updated_at?: string | null
          velocity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trending_topics_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trending_topics_organization_id_fkey"
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
          organization_id: string | null
          reference_id: string | null
          usage_type: Database["public"]["Enums"]["usage_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          reference_id?: string | null
          usage_type: Database["public"]["Enums"]["usage_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          reference_id?: string | null
          usage_type?: Database["public"]["Enums"]["usage_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          auto_save_drafts: boolean | null
          avg_edit_percentage: number | null
          concepts_mastered: string[] | null
          content_length_preference: string | null
          created_at: string | null
          disliked_categories: string[] | null
          emoji_frequency: string | null
          explanation_depth: string | null
          id: string
          inferred_preferences: Json | null
          last_active_at: string | null
          organization_id: string | null
          peak_activity_hours: number[] | null
          preferred_categories: string[] | null
          preferred_formats: string[] | null
          preferred_tone: string | null
          skill_level: string | null
          suggestion_count_preference: number | null
          topics_generated_count: number | null
          topics_used_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_save_drafts?: boolean | null
          avg_edit_percentage?: number | null
          concepts_mastered?: string[] | null
          content_length_preference?: string | null
          created_at?: string | null
          disliked_categories?: string[] | null
          emoji_frequency?: string | null
          explanation_depth?: string | null
          id?: string
          inferred_preferences?: Json | null
          last_active_at?: string | null
          organization_id?: string | null
          peak_activity_hours?: number[] | null
          preferred_categories?: string[] | null
          preferred_formats?: string[] | null
          preferred_tone?: string | null
          skill_level?: string | null
          suggestion_count_preference?: number | null
          topics_generated_count?: number | null
          topics_used_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_save_drafts?: boolean | null
          avg_edit_percentage?: number | null
          concepts_mastered?: string[] | null
          content_length_preference?: string | null
          created_at?: string | null
          disliked_categories?: string[] | null
          emoji_frequency?: string | null
          explanation_depth?: string | null
          id?: string
          inferred_preferences?: Json | null
          last_active_at?: string | null
          organization_id?: string | null
          peak_activity_hours?: number[] | null
          preferred_categories?: string[] | null
          preferred_formats?: string[] | null
          preferred_tone?: string | null
          skill_level?: string | null
          suggestion_count_preference?: number | null
          topics_generated_count?: number | null
          topics_used_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      video_generations: {
        Row: {
          aspect_ratio: string | null
          completed_at: string | null
          cost_estimate: number | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          generation_time_ms: number | null
          id: string
          model_used: string | null
          organization_id: string | null
          progress: number | null
          prompt: string
          provider: Database["public"]["Enums"]["video_provider"]
          resolution: string | null
          scene_number: number | null
          script_id: string | null
          starting_frame_url: string | null
          status: Database["public"]["Enums"]["video_generation_status"] | null
          storyboard_id: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          model_used?: string | null
          organization_id?: string | null
          progress?: number | null
          prompt: string
          provider?: Database["public"]["Enums"]["video_provider"]
          resolution?: string | null
          scene_number?: number | null
          script_id?: string | null
          starting_frame_url?: string | null
          status?: Database["public"]["Enums"]["video_generation_status"] | null
          storyboard_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          model_used?: string | null
          organization_id?: string | null
          progress?: number | null
          prompt?: string
          provider?: Database["public"]["Enums"]["video_provider"]
          resolution?: string | null
          scene_number?: number | null
          script_id?: string | null
          starting_frame_url?: string | null
          status?: Database["public"]["Enums"]["video_generation_status"] | null
          storyboard_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_generations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_generations_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      web_search_analytics: {
        Row: {
          cache_hit: boolean | null
          created_at: string | null
          error: string | null
          fallback_used: boolean | null
          id: string
          industry: string | null
          latency_ms: number | null
          organization_id: string | null
          query: string
          result_count: number | null
          results_used: number | null
          search_type: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean | null
          created_at?: string | null
          error?: string | null
          fallback_used?: boolean | null
          id?: string
          industry?: string | null
          latency_ms?: number | null
          organization_id?: string | null
          query: string
          result_count?: number | null
          results_used?: number | null
          search_type?: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean | null
          created_at?: string | null
          error?: string | null
          fallback_used?: boolean | null
          id?: string
          industry?: string | null
          latency_ms?: number | null
          organization_id?: string | null
          query?: string
          result_count?: number | null
          results_used?: number | null
          search_type?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      web_search_cache: {
        Row: {
          cache_key: string
          citations: string[] | null
          created_at: string | null
          expires_at: string
          hit_count: number | null
          id: string
          industry: string | null
          query: string
          results: Json
          search_type: string
          source: string
          updated_at: string | null
        }
        Insert: {
          cache_key: string
          citations?: string[] | null
          created_at?: string | null
          expires_at: string
          hit_count?: number | null
          id?: string
          industry?: string | null
          query: string
          results?: Json
          search_type?: string
          source: string
          updated_at?: string | null
        }
        Update: {
          cache_key?: string
          citations?: string[] | null
          created_at?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          industry?: string | null
          query?: string
          results?: Json
          search_type?: string
          source?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workflow_checkpoints: {
        Row: {
          created_at: string
          graph_state: Json
          id: string
          node_name: string
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          graph_state: Json
          id?: string
          node_name: string
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          graph_state?: Json
          id?: string
          node_name?: string
          session_id?: string
          status?: string
        }
        Relationships: []
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
      v_cache_and_revision: {
        Row: {
          cache_hit_rate: number | null
          cache_hits: number | null
          cache_misses: number | null
          circuit_breaker_trips: number | null
          day: string | null
          fallback_rate: number | null
          revision_count: number | null
          revision_rate: number | null
        }
        Relationships: []
      }
      v_daily_metrics: {
        Row: {
          avg_cost_usd: number | null
          day: string | null
          error_count: number | null
          error_rate: number | null
          p50_ms: number | null
          p95_ms: number | null
          p99_ms: number | null
          total_cost_usd: number | null
          total_requests: number | null
        }
        Relationships: []
      }
      v_node_performance: {
        Row: {
          avg_cost_usd: number | null
          avg_duration_ms: number | null
          error_rate: number | null
          fast_path_ratio: number | null
          function_name: string | null
          p95_duration_ms: number | null
          total_calls: number | null
        }
        Relationships: []
      }
      v_social_platform_settings_safe: {
        Row: {
          app_name: string | null
          created_at: string | null
          created_by: string | null
          has_credentials: boolean | null
          id: string | null
          is_active: boolean | null
          platform: string | null
          updated_at: string | null
        }
        Insert: {
          app_name?: string | null
          created_at?: string | null
          created_by?: string | null
          has_credentials?: never
          id?: string | null
          is_active?: boolean | null
          platform?: string | null
          updated_at?: string | null
        }
        Update: {
          app_name?: string | null
          created_at?: string | null
          created_by?: string | null
          has_credentials?: never
          id?: string | null
          is_active?: boolean | null
          platform?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aggregate_content_learnings: {
        Args: { p_brand_template_id: string }
        Returns: undefined
      }
      calculate_next_crawl_at: {
        Args: { frequency: string; last_crawled?: string }
        Returns: string
      }
      calculate_next_sync_at: { Args: { frequency: string }; Returns: string }
      can_use_feature: {
        Args: {
          _org_id: string
          _usage_type: Database["public"]["Enums"]["usage_type"]
        }
        Returns: boolean
      }
      cleanup_expired_cache: { Args: never; Returns: number }
      cleanup_expired_generation_tasks: { Args: never; Returns: number }
      cleanup_knowledge_graph_cache: { Args: never; Returns: number }
      cleanup_old_checkpoints: { Args: never; Returns: number }
      cleanup_web_search_cache: { Args: never; Returns: number }
      extract_doc_year: { Args: { doc_name: string }; Returns: string }
      find_duplicate_regulations: {
        Args: { max_results?: number; similarity_threshold?: number }
        Returns: {
          match_type: string
          name_1: string
          name_2: string
          node_id_1: string
          node_id_2: string
          quality_1: number
          quality_2: number
          similarity: number
        }[]
      }
      find_node_duplicates: {
        Args: {
          max_results?: number
          similarity_threshold?: number
          target_node_id: string
        }
        Returns: {
          duplicate_name: string
          duplicate_node_id: string
          duplicate_quality: number
          match_type: string
          similarity: number
        }[]
      }
      get_batch_processing_stats: {
        Args: never
        Returns: {
          completed_today: number
          failed_today: number
          job_type: string
          pending_count: number
          running_count: number
        }[]
      }
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
      get_connected_nodes: {
        Args: {
          p_direction?: string
          p_edge_types?: string[]
          p_node_id: string
        }
        Returns: {
          direction: string
          display_name: Json
          edge_type: string
          edge_weight: number
          node_id: string
          node_key: string
          node_type: string
        }[]
      }
      get_content_quality_stats: {
        Args: never
        Returns: {
          node_count: number
          percentage: number
          quality_level: string
        }[]
      }
      get_detailed_quality_stats: { Args: never; Returns: Json }
      get_graph_health_summary: {
        Args: never
        Returns: {
          metric_name: string
          metric_value: number
          status: string
        }[]
      }
      get_industry_regulations: {
        Args: { p_global_pack_id: string; p_include_inherited?: boolean }
        Returns: {
          is_inherited: boolean
          regulation_key: string
          regulation_name: Json
          regulation_node_id: string
          regulation_properties: Json
          relationship_type: string
        }[]
      }
      get_org_plan_type: { Args: { _org_id: string }; Returns: string }
      get_org_usage: {
        Args: {
          _org_id: string
          _usage_type: Database["public"]["Enums"]["usage_type"]
        }
        Returns: number
      }
      get_orphan_nodes: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          display_name: Json
          node_id: string
          node_key: string
          node_type: string
        }[]
      }
      get_regulation_embedding_stats: {
        Args: never
        Returns: {
          embedding_percentage: number
          missing_embedding: number
          total_regulations: number
          with_embedding: number
        }[]
      }
      get_related_industries: {
        Args: {
          p_global_pack_id: string
          p_limit?: number
          p_min_weight?: number
        }
        Returns: {
          industry_code: string
          industry_name: Json
          industry_pack_id: string
          relationship_type: string
          relationship_weight: number
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
      get_web_search_cache_stats: {
        Args: never
        Returns: {
          avg_hit_count: number
          cache_size_estimate: number
          search_type: string
          total_entries: number
          total_hits: number
        }[]
      }
      has_org_role:
        | {
            Args: {
              _org_id: string
              _role: Database["public"]["Enums"]["org_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: { _org_id: string; _role: string; _user_id: string }
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
      levenshtein_similarity: {
        Args: { text1: string; text2: string }
        Returns: number
      }
      log_knowledge_graph_query: {
        Args: {
          p_duration_ms?: number
          p_organization_id?: string
          p_query_params?: Json
          p_query_type: string
          p_result_count?: number
        }
        Returns: string
      }
      match_blackboard_context: {
        Args: {
          match_brand_id?: string
          match_count?: number
          match_node_types?: string[]
          match_session_id?: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          brand_template_id: string
          content_text: string
          content_type: string
          created_at: string
          id: string
          metadata: Json
          node_name: string
          priority_score: number
          session_id: string
          similarity: number
        }[]
      }
      merge_duplicate_nodes: {
        Args: {
          p_keep_node_id: string
          p_performed_by?: string
          p_remove_node_ids: string[]
        }
        Returns: Json
      }
      normalize_vn_text: { Args: { input_text: string }; Returns: string }
      search_brand_memory: {
        Args: {
          match_brand_template_id: string
          match_count?: number
          match_threshold?: number
          match_types?: string[]
          query_embedding: string
        }
        Returns: {
          confidence: number
          content: string
          id: string
          memory_type: string
          similarity: number
          source: string
          used_count: number
        }[]
      }
      search_conversation_embeddings: {
        Args: {
          exclude_conversation_id?: string
          match_brand_template_id?: string
          match_count?: number
          match_organization_id?: string
          match_threshold?: number
          match_types?: string[]
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          content_text: string
          conversation_id: string
          created_at: string
          embedding_type: string
          id: string
          message_id: string
          metadata: Json
          similarity: number
        }[]
      }
      search_embeddings: {
        Args: {
          match_brand_template_id?: string
          match_content_types?: string[]
          match_count?: number
          match_organization_id: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content_id: string
          content_text: string
          content_type: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      search_help_articles: {
        Args: {
          match_category?: string
          match_count?: number
          match_route?: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          keywords: string[]
          similarity: number
          title: string
        }[]
      }
      search_knowledge_nodes: {
        Args: {
          p_global_pack_id?: string
          p_limit?: number
          p_node_types?: string[]
          p_query_embedding: string
          p_threshold?: number
        }
        Returns: {
          description: Json
          display_name: Json
          global_pack_id: string
          id: string
          node_key: string
          node_type: string
          properties: Json
          similarity: number
        }[]
      }
      traverse_knowledge_graph: {
        Args: {
          p_edge_types?: string[]
          p_max_depth?: number
          p_min_weight?: number
          p_start_node_id: string
        }
        Returns: {
          depth: number
          display_name: Json
          node_id: string
          node_key: string
          node_type: string
          path: string[]
          path_weight: number
        }[]
      }
    }
    Enums: {
      ad_funnel_stage:
        | "awareness"
        | "consideration"
        | "conversion"
        | "retention"
      ad_objective:
        | "traffic"
        | "conversions"
        | "engagement"
        | "awareness"
        | "leads"
        | "app_installs"
        | "video_views"
        | "messages"
      ad_platform:
        | "meta_feed"
        | "meta_story"
        | "meta_reels"
        | "google_rsa"
        | "google_display"
        | "tiktok"
        | "zalo"
        | "linkedin"
        | "zalo_oa"
        | "zalo_message"
        | "zalo_article"
        | "facebook_feed"
        | "facebook_story"
        | "instagram_feed"
        | "instagram_story"
        | "instagram_reels"
      app_role: "user" | "pro" | "admin"
      carousel_ai_tool: "ideogram" | "midjourney" | "dalle" | "leonardo"
      carousel_platform: "facebook" | "tiktok"
      industry_pack_status: "draft" | "stable" | "deprecated"
      org_role: "owner" | "admin" | "member" | "viewer"
      plan_type: "free" | "starter" | "pro" | "enterprise"
      script_status: "draft" | "pending_approval" | "approved" | "rejected"
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
      video_generation_status: "pending" | "processing" | "completed" | "failed"
      video_provider: "lovable" | "minimax" | "runway"
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
      ad_funnel_stage: [
        "awareness",
        "consideration",
        "conversion",
        "retention",
      ],
      ad_objective: [
        "traffic",
        "conversions",
        "engagement",
        "awareness",
        "leads",
        "app_installs",
        "video_views",
        "messages",
      ],
      ad_platform: [
        "meta_feed",
        "meta_story",
        "meta_reels",
        "google_rsa",
        "google_display",
        "tiktok",
        "zalo",
        "linkedin",
        "zalo_oa",
        "zalo_message",
        "zalo_article",
        "facebook_feed",
        "facebook_story",
        "instagram_feed",
        "instagram_story",
        "instagram_reels",
      ],
      app_role: ["user", "pro", "admin"],
      carousel_ai_tool: ["ideogram", "midjourney", "dalle", "leonardo"],
      carousel_platform: ["facebook", "tiktok"],
      industry_pack_status: ["draft", "stable", "deprecated"],
      org_role: ["owner", "admin", "member", "viewer"],
      plan_type: ["free", "starter", "pro", "enterprise"],
      script_status: ["draft", "pending_approval", "approved", "rejected"],
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
      video_generation_status: ["pending", "processing", "completed", "failed"],
      video_provider: ["lovable", "minimax", "runway"],
    },
  },
} as const
