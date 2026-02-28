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
      activities: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          tenant_id: string
          timestamp: string | null
          title: string
          type: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
          timestamp?: string | null
          title: string
          type: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
          timestamp?: string | null
          title?: string
          type?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          action: string | null
          confidence: number | null
          created_at: string | null
          description: string | null
          id: string
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          action?: string | null
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          tenant_id: string
          title: string
          type: string
        }
        Update: {
          action?: string | null
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          completion_tokens: number | null
          created_at: string | null
          feature: string
          id: string
          model: string
          prompt_tokens: number | null
          request_context: string | null
          tenant_id: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string | null
          feature: string
          id?: string
          model?: string
          prompt_tokens?: number | null
          request_context?: string | null
          tenant_id?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string | null
          feature?: string
          id?: string
          model?: string
          prompt_tokens?: number | null
          request_context?: string | null
          tenant_id?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      approval_log: {
        Row: {
          action: string
          by_user_id: string
          by_user_name: string | null
          by_user_type: string | null
          created_at: string | null
          from_status: string | null
          id: string
          notes: string | null
          post_id: string
          stage: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          by_user_id: string
          by_user_name?: string | null
          by_user_type?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          post_id: string
          stage?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          by_user_id?: string
          by_user_name?: string | null
          by_user_type?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          post_id?: string
          stage?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_log_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "deliverable_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          client_count: number | null
          created_at: string | null
          id: string
          location: string | null
          manager: string | null
          name: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          client_count?: number | null
          created_at?: string | null
          id?: string
          location?: string | null
          manager?: string | null
          name: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          client_count?: number | null
          created_at?: string | null
          id?: string
          location?: string | null
          manager?: string | null
          name?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_items: {
        Row: {
          client_id: string
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          item_type: string
          name: string
          notes: string | null
          sort_order: number | null
          tenant_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          item_type?: string
          name: string
          notes?: string | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          item_type?: string
          name?: string
          notes?: string | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          budget: number | null
          client_id: string
          created_at: string | null
          creative_ready: boolean | null
          duration: string | null
          end_date: string | null
          goal: string | null
          id: string
          name: string
          platform: string
          spent: number | null
          start_date: string | null
          status: string | null
          target_audience: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          client_id: string
          created_at?: string | null
          creative_ready?: boolean | null
          duration?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          platform: string
          spent?: number | null
          start_date?: string | null
          status?: string | null
          target_audience?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          client_id?: string
          created_at?: string | null
          creative_ready?: boolean | null
          duration?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          platform?: string
          spent?: number | null
          start_date?: string | null
          status?: string | null
          target_audience?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      canned_responses: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          creator_profile_id: string
          id: string
          is_favorite: boolean | null
          shortcut: string | null
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          creator_profile_id: string
          id?: string
          is_favorite?: boolean | null
          shortcut?: string | null
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          creator_profile_id?: string
          id?: string
          is_favorite?: boolean | null
          shortcut?: string | null
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canned_responses_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "canned_responses_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canned_responses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      change_log: {
        Row: {
          changed_by: string | null
          created_at: string | null
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          section: string
          tenant_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          section: string
          tenant_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          section?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "change_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          added_at: string | null
          added_by: string | null
          channel_id: string
          created_at: string | null
          id: string
          is_muted: boolean | null
          joined_at: string | null
          notification_pref: string | null
          role: string | null
          role_in_channel: string | null
          user_avatar: string | null
          user_id: string
          user_name: string | null
          user_profile_id: string | null
          user_role: string | null
          workspace_member_id: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          channel_id: string
          created_at?: string | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          notification_pref?: string | null
          role?: string | null
          role_in_channel?: string | null
          user_avatar?: string | null
          user_id: string
          user_name?: string | null
          user_profile_id?: string | null
          user_role?: string | null
          workspace_member_id?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          channel_id?: string
          created_at?: string | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          notification_pref?: string | null
          role?: string | null
          role_in_channel?: string | null
          user_avatar?: string | null
          user_id?: string
          user_name?: string | null
          user_profile_id?: string | null
          user_role?: string | null
          workspace_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "channel_members_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          channel_type: string | null
          created_at: string | null
          created_by: string | null
          created_by_id: string | null
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          is_default: boolean | null
          is_hidden: boolean | null
          is_muted: boolean | null
          is_private: boolean | null
          last_message: string | null
          last_message_time: string | null
          member_count: number | null
          name: string
          pinned_message_ids: string[] | null
          sort_order: number | null
          tenant_id: string | null
          type: string | null
          unread_count: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          channel_type?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_default?: boolean | null
          is_hidden?: boolean | null
          is_muted?: boolean | null
          is_private?: boolean | null
          last_message?: string | null
          last_message_time?: string | null
          member_count?: number | null
          name: string
          pinned_message_ids?: string[] | null
          sort_order?: number | null
          tenant_id?: string | null
          type?: string | null
          unread_count?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          channel_type?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_default?: boolean | null
          is_hidden?: boolean | null
          is_muted?: boolean | null
          is_private?: boolean | null
          last_message?: string | null
          last_message_time?: string | null
          member_count?: number | null
          name?: string
          pinned_message_ids?: string[] | null
          sort_order?: number | null
          tenant_id?: string | null
          type?: string | null
          unread_count?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_2fa_settings: {
        Row: {
          backup_codes: string[] | null
          client_id: string
          created_at: string
          email: string | null
          enabled: boolean
          id: string
          last_verified_at: string | null
          method: string | null
          phone_number: string | null
          setup_completed_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          backup_codes?: string[] | null
          client_id: string
          created_at?: string
          email?: string | null
          enabled?: boolean
          id?: string
          last_verified_at?: string | null
          method?: string | null
          phone_number?: string | null
          setup_completed_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          backup_codes?: string[] | null
          client_id?: string
          created_at?: string
          email?: string | null
          enabled?: boolean
          id?: string
          last_verified_at?: string | null
          method?: string | null
          phone_number?: string | null
          setup_completed_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_activity_log: {
        Row: {
          action: string
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          sub_user_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          sub_user_id?: string | null
          tenant_id?: string
        }
        Update: {
          action?: string
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          sub_user_id?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      client_analytics_snapshots: {
        Row: {
          approved_deliverables: number | null
          avg_rating: number | null
          boost_clicks: number | null
          boost_impressions: number | null
          boost_spend: number | null
          client_id: string
          created_at: string
          id: string
          month_year: string
          revision_count: number | null
          total_deliverables: number | null
          total_spend: number | null
        }
        Insert: {
          approved_deliverables?: number | null
          avg_rating?: number | null
          boost_clicks?: number | null
          boost_impressions?: number | null
          boost_spend?: number | null
          client_id: string
          created_at?: string
          id?: string
          month_year: string
          revision_count?: number | null
          total_deliverables?: number | null
          total_spend?: number | null
        }
        Update: {
          approved_deliverables?: number | null
          avg_rating?: number | null
          boost_clicks?: number | null
          boost_impressions?: number | null
          boost_spend?: number | null
          client_id?: string
          created_at?: string
          id?: string
          month_year?: string
          revision_count?: number | null
          total_deliverables?: number | null
          total_spend?: number | null
        }
        Relationships: []
      }
      client_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          client_id: string
          created_at: string | null
          id: string
          notes: string | null
          role_type: string
          status: string | null
          team_member_id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          role_type: string
          status?: string | null
          team_member_id: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          role_type?: string
          status?: string | null
          team_member_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "client_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["team_member_id"]
          },
          {
            foreignKeyName: "client_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "client_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_auto_payments: {
        Row: {
          auto_pay_invoices: boolean | null
          auto_renew_package: boolean | null
          auto_topup_amount: number | null
          auto_topup_enabled: boolean | null
          auto_topup_threshold: number | null
          client_id: string
          created_at: string
          enabled: boolean
          id: string
          last_auto_payment_at: string | null
          min_wallet_balance: number | null
          payment_details: Json | null
          payment_method: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_pay_invoices?: boolean | null
          auto_renew_package?: boolean | null
          auto_topup_amount?: number | null
          auto_topup_enabled?: boolean | null
          auto_topup_threshold?: number | null
          client_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_auto_payment_at?: string | null
          min_wallet_balance?: number | null
          payment_details?: Json | null
          payment_method?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          auto_pay_invoices?: boolean | null
          auto_renew_package?: boolean | null
          auto_topup_amount?: number | null
          auto_topup_enabled?: boolean | null
          auto_topup_threshold?: number | null
          client_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_auto_payment_at?: string | null
          min_wallet_balance?: number | null
          payment_details?: Json | null
          payment_method?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_export_logs: {
        Row: {
          client_id: string
          created_at: string
          export_type: string
          file_name: string | null
          id: string
          record_count: number | null
          tenant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          export_type: string
          file_name?: string | null
          id?: string
          record_count?: number | null
          tenant_id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          export_type?: string
          file_name?: string | null
          id?: string
          record_count?: number | null
          tenant_id?: string
        }
        Relationships: []
      }
      client_notification_preferences: {
        Row: {
          billing_alerts: boolean | null
          client_id: string
          created_at: string
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          message_alerts: boolean | null
          package_renewal_alerts: boolean | null
          push_notifications: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_notifications: boolean | null
          task_updates: boolean | null
          updated_at: string
        }
        Insert: {
          billing_alerts?: boolean | null
          client_id: string
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          message_alerts?: boolean | null
          package_renewal_alerts?: boolean | null
          push_notifications?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_notifications?: boolean | null
          task_updates?: boolean | null
          updated_at?: string
        }
        Update: {
          billing_alerts?: boolean | null
          client_id?: string
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          message_alerts?: boolean | null
          package_renewal_alerts?: boolean | null
          push_notifications?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_notifications?: boolean | null
          task_updates?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      client_package_features: {
        Row: {
          auto_deduction: boolean | null
          client_package_id: string
          deliverable_type: string
          icon: string | null
          id: string
          label: string
          total_allocated: number | null
          unit_label: string | null
          warning_threshold: number | null
        }
        Insert: {
          auto_deduction?: boolean | null
          client_package_id: string
          deliverable_type: string
          icon?: string | null
          id?: string
          label: string
          total_allocated?: number | null
          unit_label?: string | null
          warning_threshold?: number | null
        }
        Update: {
          auto_deduction?: boolean | null
          client_package_id?: string
          deliverable_type?: string
          icon?: string | null
          id?: string
          label?: string
          total_allocated?: number | null
          unit_label?: string | null
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_package_features_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      client_packages: {
        Row: {
          client_id: string
          created_at: string | null
          custom_monthly_fee: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          package_id: string
          renewal_date: string | null
          start_date: string
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          custom_monthly_fee?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          package_id: string
          renewal_date?: string | null
          start_date: string
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          custom_monthly_fee?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          package_id?: string
          renewal_date?: string | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      client_performance: {
        Row: {
          ad_spend_this_month: number | null
          client_id: string
          created_at: string | null
          customer_frames_delivered: number | null
          id: string
          leads_generated: number | null
          period_end: string | null
          period_start: string | null
          posts_published: number | null
          reels_published: number | null
          review_videos_delivered: number | null
          test_ride_bookings: number | null
        }
        Insert: {
          ad_spend_this_month?: number | null
          client_id: string
          created_at?: string | null
          customer_frames_delivered?: number | null
          id?: string
          leads_generated?: number | null
          period_end?: string | null
          period_start?: string | null
          posts_published?: number | null
          reels_published?: number | null
          review_videos_delivered?: number | null
          test_ride_bookings?: number | null
        }
        Update: {
          ad_spend_this_month?: number | null
          client_id?: string
          created_at?: string | null
          customer_frames_delivered?: number | null
          id?: string
          leads_generated?: number | null
          period_end?: string | null
          period_start?: string | null
          posts_published?: number | null
          reels_published?: number | null
          review_videos_delivered?: number | null
          test_ride_bookings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_performance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_performance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_preferences: {
        Row: {
          client_id: string
          created_at: string
          currency_display: string | null
          dashboard_widgets: Json | null
          date_format: string | null
          id: string
          language: string
          tenant_id: string
          theme_mode: string
          theme_preset: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          currency_display?: string | null
          dashboard_widgets?: Json | null
          date_format?: string | null
          id?: string
          language?: string
          tenant_id?: string
          theme_mode?: string
          theme_preset?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          currency_display?: string | null
          dashboard_widgets?: Json | null
          date_format?: string | null
          id?: string
          language?: string
          tenant_id?: string
          theme_mode?: string
          theme_preset?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_shared_files: {
        Row: {
          category: string
          client_id: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_public: boolean | null
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          client_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          is_public?: boolean | null
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_public?: boolean | null
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      client_sub_users: {
        Row: {
          accepted_at: string | null
          avatar: string | null
          client_id: string
          created_at: string | null
          email: string
          id: string
          invited_at: string | null
          invited_by: string | null
          last_active_at: string | null
          name: string
          permissions: Json | null
          phone: string | null
          role: string
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          avatar?: string | null
          client_id: string
          created_at?: string | null
          email: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active_at?: string | null
          name: string
          permissions?: Json | null
          phone?: string | null
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          avatar?: string | null
          client_id?: string
          created_at?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active_at?: string | null
          name?: string
          permissions?: Json | null
          phone?: string | null
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client_wallets: {
        Row: {
          balance: number | null
          client_id: string
          currency: string | null
          id: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          client_id: string
          currency?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          client_id?: string
          currency?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_wallets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_wallets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_manager_id: string | null
          address: string | null
          boost_budget_currency: string | null
          business_hours: string | null
          business_name: string
          category: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contact_website: string | null
          created_at: string | null
          email: string | null
          health_score: number | null
          id: string
          location: string | null
          logo: string | null
          manager_name: string | null
          manager_phone: string | null
          metadata: Json | null
          monthly_boost_budget: number | null
          notes: string | null
          onboarded_at: string | null
          onboarding_notes: string | null
          owner_name: string | null
          owner_phone: string | null
          phone: string | null
          referrer_name: string | null
          social_links: Json | null
          status: string | null
          tenant_id: string
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          account_manager_id?: string | null
          address?: string | null
          boost_budget_currency?: string | null
          business_hours?: string | null
          business_name: string
          category?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          created_at?: string | null
          email?: string | null
          health_score?: number | null
          id?: string
          location?: string | null
          logo?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          metadata?: Json | null
          monthly_boost_budget?: number | null
          notes?: string | null
          onboarded_at?: string | null
          onboarding_notes?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          phone?: string | null
          referrer_name?: string | null
          social_links?: Json | null
          status?: string | null
          tenant_id: string
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          account_manager_id?: string | null
          address?: string | null
          boost_budget_currency?: string | null
          business_hours?: string | null
          business_name?: string
          category?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          created_at?: string | null
          email?: string | null
          health_score?: number | null
          id?: string
          location?: string | null
          logo?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          metadata?: Json | null
          monthly_boost_budget?: number | null
          notes?: string | null
          onboarded_at?: string | null
          onboarding_notes?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          phone?: string | null
          referrer_name?: string | null
          social_links?: Json | null
          status?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["team_member_id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_attachments: {
        Row: {
          comment_id: string
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          thumbnail_url: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          thumbnail_url?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string | null
          id: string
          layout_type: string
          tenant_id: string
          updated_at: string | null
          user_profile_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout_type?: string
          tenant_id: string
          updated_at?: string | null
          user_profile_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          layout_type?: string
          tenant_id?: string
          updated_at?: string | null
          user_profile_id?: string
          widgets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "dashboard_layouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_layouts_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "dashboard_layouts_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_metrics: {
        Row: {
          change: string | null
          change_type: string | null
          color: string | null
          icon: string | null
          id: string
          metric_key: string
          tenant_id: string
          title: string
          updated_at: string | null
          value: string
        }
        Insert: {
          change?: string | null
          change_type?: string | null
          color?: string | null
          icon?: string | null
          id?: string
          metric_key: string
          tenant_id: string
          title: string
          updated_at?: string | null
          value: string
        }
        Update: {
          change?: string | null
          change_type?: string | null
          color?: string | null
          icon?: string | null
          id?: string
          metric_key?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "dashboard_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      default_assignment_rules: {
        Row: {
          created_at: string | null
          default_roles: Json
          id: string
          industry_category: string
          min_team_size: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          default_roles?: Json
          id?: string
          industry_category: string
          min_team_size?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          default_roles?: Json
          id?: string
          industry_category?: string
          min_team_size?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "default_assignment_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "default_assignment_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_posts: {
        Row: {
          assigned_to: string | null
          channel_id: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          deliverable_type_id: string | null
          description: string | null
          due_date: string | null
          extra_revision_cost: number | null
          id: string
          is_billable: boolean | null
          max_revisions: number
          priority: string
          revision_count: number
          status: string
          tenant_id: string
          title: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          channel_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deliverable_type_id?: string | null
          description?: string | null
          due_date?: string | null
          extra_revision_cost?: number | null
          id?: string
          is_billable?: boolean | null
          max_revisions?: number
          priority?: string
          revision_count?: number
          status?: string
          tenant_id: string
          title: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          channel_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deliverable_type_id?: string | null
          description?: string | null
          due_date?: string | null
          extra_revision_cost?: number | null
          id?: string
          is_billable?: boolean | null
          max_revisions?: number
          priority?: string
          revision_count?: number
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      deliverable_ratings: {
        Row: {
          client_id: string
          created_at: string
          deliverable_id: string
          feedback: string | null
          id: string
          rating: number
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          deliverable_id: string
          feedback?: string | null
          id?: string
          rating: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          deliverable_id?: string
          feedback?: string | null
          id?: string
          rating?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deliverable_requests: {
        Row: {
          client_id: string
          created_at: string
          deliverable_type: string
          description: string | null
          id: string
          notes: string | null
          priority: string
          reference_files: string[] | null
          requested_deadline: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deliverable_type?: string
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string
          reference_files?: string[] | null
          requested_deadline?: string | null
          status?: string
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deliverable_type?: string
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string
          reference_files?: string[] | null
          requested_deadline?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      deliverable_revisions: {
        Row: {
          created_at: string
          deliverable_id: string
          id: string
          notes: string | null
          requested_by: string | null
          revision_number: number
          status: string
        }
        Insert: {
          created_at?: string
          deliverable_id: string
          id?: string
          notes?: string | null
          requested_by?: string | null
          revision_number?: number
          status?: string
        }
        Update: {
          created_at?: string
          deliverable_id?: string
          id?: string
          notes?: string | null
          requested_by?: string | null
          revision_number?: number
          status?: string
        }
        Relationships: []
      }
      deliverable_types: {
        Row: {
          created_at: string | null
          hours_per_unit: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          tenant_id: string
          type_key: string
          unit_label: string | null
        }
        Insert: {
          created_at?: string | null
          hours_per_unit?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          tenant_id: string
          type_key: string
          unit_label?: string | null
        }
        Update: {
          created_at?: string | null
          hours_per_unit?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          tenant_id?: string
          type_key?: string
          unit_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deliverable_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          assigned_to: string | null
          calendar_color: string | null
          client_id: string
          client_package_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          days_left: number | null
          deadline: string | null
          deliverable_type: string
          final_file_name: string | null
          final_file_url: string | null
          id: string
          notes: string | null
          priority: string | null
          progress: number | null
          publish_platform: string | null
          published_at: string | null
          quantity: number | null
          requested_by_client: boolean | null
          requested_deadline: string | null
          scheduled_publish_date: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          calendar_color?: string | null
          client_id: string
          client_package_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          days_left?: number | null
          deadline?: string | null
          deliverable_type: string
          final_file_name?: string | null
          final_file_url?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          progress?: number | null
          publish_platform?: string | null
          published_at?: string | null
          quantity?: number | null
          requested_by_client?: boolean | null
          requested_deadline?: string | null
          scheduled_publish_date?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          calendar_color?: string | null
          client_id?: string
          client_package_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          days_left?: number | null
          deadline?: string | null
          deliverable_type?: string
          final_file_name?: string | null
          final_file_url?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          progress?: number | null
          publish_platform?: string | null
          published_at?: string | null
          quantity?: number | null
          requested_by_client?: boolean | null
          requested_deadline?: string | null
          scheduled_publish_date?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["team_member_id"]
          },
          {
            foreignKeyName: "deliverables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "deliverables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deliverables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_users: {
        Row: {
          auth_user_id: string | null
          avatar: string | null
          client_id: string | null
          created_at: string | null
          display_name: string
          email: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          metadata: Json | null
          password_changed_at: string | null
          password_hash: string
          phone: string | null
          role: string
          session_token: string | null
          team_member_id: string | null
          tenant_id: string
          user_profile_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar?: string | null
          client_id?: string | null
          created_at?: string | null
          display_name: string
          email: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          metadata?: Json | null
          password_changed_at?: string | null
          password_hash?: string
          phone?: string | null
          role: string
          session_token?: string | null
          team_member_id?: string | null
          tenant_id: string
          user_profile_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar?: string | null
          client_id?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          metadata?: Json | null
          password_changed_at?: string | null
          password_hash?: string
          phone?: string | null
          role?: string
          session_token?: string | null
          team_member_id?: string | null
          tenant_id?: string
          user_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "demo_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_users_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_users_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["team_member_id"]
          },
          {
            foreignKeyName: "demo_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "demo_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_users_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "demo_users_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string | null
          id: string
          reply_to_id: string | null
          updated_at: string | null
          user_profile_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string | null
          id?: string
          reply_to_id?: string | null
          updated_at?: string | null
          user_profile_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string | null
          id?: string
          reply_to_id?: string | null
          updated_at?: string | null
          user_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_messages_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "draft_messages_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string | null
          id: string
          message: string
          resolved: boolean | null
          severity: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          resolved?: boolean | null
          severity?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          resolved?: boolean | null
          severity?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          quantity: number | null
          total: number | null
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          quantity?: number | null
          total?: number | null
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number | null
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string | null
          currency: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string | null
          notes: string | null
          paid_at: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ledger_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_collections: {
        Row: {
          collected_at: string | null
          collection_name: string | null
          collector_profile_id: string
          id: string
          message_id: string
        }
        Insert: {
          collected_at?: string | null
          collection_name?: string | null
          collector_profile_id: string
          id?: string
          message_id: string
        }
        Update: {
          collected_at?: string | null
          collection_name?: string | null
          collector_profile_id?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_collections_collector_profile_id_fkey"
            columns: ["collector_profile_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "message_collections_collector_profile_id_fkey"
            columns: ["collector_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_collections_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_files: {
        Row: {
          channel_id: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          message_id: string
          name: string
          size: string | null
          thumbnail: string | null
          thumbnail_url: string | null
          type: string | null
          url: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_id: string
          name: string
          size?: string | null
          thumbnail?: string | null
          thumbnail_url?: string | null
          type?: string | null
          url?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_id?: string
          name?: string
          size?: string | null
          thumbnail?: string | null
          thumbnail_url?: string | null
          type?: string | null
          url?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          count: number | null
          emoji: string
          id: string
          message_id: string
          user_ids: string[] | null
        }
        Insert: {
          count?: number | null
          emoji: string
          id?: string
          message_id: string
          user_ids?: string[] | null
        }
        Update: {
          count?: number | null
          emoji?: string
          id?: string
          message_id?: string
          user_ids?: string[] | null
        }
        Relationships: []
      }
      message_read_receipts: {
        Row: {
          channel_id: string
          id: string
          message_id: string
          read_at: string | null
          reader_profile_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          message_id: string
          read_at?: string | null
          reader_profile_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          message_id?: string
          read_at?: string | null
          reader_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_read_receipts_reader_profile_id_fkey"
            columns: ["reader_profile_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "message_read_receipts_reader_profile_id_fkey"
            columns: ["reader_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          boost_tag: Json | null
          channel_id: string
          content: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_for_everyone: boolean | null
          deliverable_tag: Json | null
          edited_at: string | null
          forwarded_from_channel: string | null
          forwarded_from_id: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_pinned: boolean | null
          is_system_message: boolean | null
          is_thread_starter: boolean | null
          message_type: string | null
          original_content: string | null
          reply_count: number | null
          reply_to_content: string | null
          reply_to_id: string | null
          reply_to_sender: string | null
          search_vector: unknown
          sender_avatar: string | null
          sender_id: string | null
          sender_name: string | null
          sender_role: string | null
          status: string | null
          thread_count: number | null
          thread_parent_id: string | null
          voice_duration: number | null
          voice_url: string | null
        }
        Insert: {
          boost_tag?: Json | null
          channel_id: string
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_for_everyone?: boolean | null
          deliverable_tag?: Json | null
          edited_at?: string | null
          forwarded_from_channel?: string | null
          forwarded_from_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          is_system_message?: boolean | null
          is_thread_starter?: boolean | null
          message_type?: string | null
          original_content?: string | null
          reply_count?: number | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          search_vector?: unknown
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_role?: string | null
          status?: string | null
          thread_count?: number | null
          thread_parent_id?: string | null
          voice_duration?: number | null
          voice_url?: string | null
        }
        Update: {
          boost_tag?: Json | null
          channel_id?: string
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_for_everyone?: boolean | null
          deliverable_tag?: Json | null
          edited_at?: string | null
          forwarded_from_channel?: string | null
          forwarded_from_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          is_system_message?: boolean | null
          is_thread_starter?: boolean | null
          message_type?: string | null
          original_content?: string | null
          reply_count?: number | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          search_vector?: unknown
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_role?: string | null
          status?: string | null
          thread_count?: number | null
          thread_parent_id?: string | null
          voice_duration?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_parent_id_fkey"
            columns: ["thread_parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          categories: Json
          created_at: string | null
          dnd_enabled: boolean | null
          dnd_end_time: string | null
          dnd_start_time: string | null
          email_enabled: boolean | null
          email_frequency: string | null
          id: string
          push_enabled: boolean | null
          tenant_id: string
          updated_at: string | null
          user_profile_id: string
        }
        Insert: {
          categories?: Json
          created_at?: string | null
          dnd_enabled?: boolean | null
          dnd_end_time?: string | null
          dnd_start_time?: string | null
          email_enabled?: boolean | null
          email_frequency?: string | null
          id?: string
          push_enabled?: boolean | null
          tenant_id: string
          updated_at?: string | null
          user_profile_id: string
        }
        Update: {
          categories?: Json
          created_at?: string | null
          dnd_enabled?: boolean | null
          dnd_end_time?: string | null
          dnd_start_time?: string | null
          email_enabled?: boolean | null
          email_frequency?: string | null
          id?: string
          push_enabled?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          user_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notification_preferences_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_type: string | null
          action_url: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          message: string | null
          metadata: Json | null
          priority: string | null
          read: boolean | null
          related_client_id: string | null
          target_client_id: string | null
          target_user_id: string | null
          tenant_id: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          action_type?: string | null
          action_url?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          related_client_id?: string | null
          target_client_id?: string | null
          target_user_id?: string | null
          tenant_id: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string | null
          action_url?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          related_client_id?: string | null
          target_client_id?: string | null
          target_user_id?: string | null
          tenant_id?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "notifications_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      package_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: []
      }
      package_change_requests: {
        Row: {
          admin_notes: string | null
          client_id: string
          created_at: string
          current_package_id: string | null
          id: string
          notes: string | null
          request_type: string
          requested_package_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          client_id: string
          created_at?: string
          current_package_id?: string | null
          id?: string
          notes?: string | null
          request_type?: string
          requested_package_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          client_id?: string
          created_at?: string
          current_package_id?: string | null
          id?: string
          notes?: string | null
          request_type?: string
          requested_package_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      package_deliverables: {
        Row: {
          created_at: string | null
          deliverable_type: string
          description: string | null
          id: string
          package_id: string
          quantity: number | null
        }
        Insert: {
          created_at?: string | null
          deliverable_type: string
          description?: string | null
          id?: string
          package_id: string
          quantity?: number | null
        }
        Update: {
          created_at?: string | null
          deliverable_type?: string
          description?: string | null
          id?: string
          package_id?: string
          quantity?: number | null
        }
        Relationships: []
      }
      package_features: {
        Row: {
          auto_deduction: boolean | null
          deliverable_type: string
          icon: string | null
          id: string
          label: string
          package_id: string
          total_allocated: number | null
          unit_label: string | null
          warning_threshold: number | null
        }
        Insert: {
          auto_deduction?: boolean | null
          deliverable_type: string
          icon?: string | null
          id?: string
          label: string
          package_id: string
          total_allocated?: number | null
          unit_label?: string | null
          warning_threshold?: number | null
        }
        Update: {
          auto_deduction?: boolean | null
          deliverable_type?: string
          icon?: string | null
          id?: string
          label?: string
          package_id?: string
          total_allocated?: number | null
          unit_label?: string | null
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "package_features_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_usage: {
        Row: {
          allocated: number | null
          client_package_id: string
          deliverable_type: string
          depleted_at: string | null
          id: string
          tenant_id: string | null
          total: number
          updated_at: string | null
          used: number | null
          warning_triggered: boolean | null
        }
        Insert: {
          allocated?: number | null
          client_package_id: string
          deliverable_type: string
          depleted_at?: string | null
          id?: string
          tenant_id?: string | null
          total: number
          updated_at?: string | null
          used?: number | null
          warning_triggered?: boolean | null
        }
        Update: {
          allocated?: number | null
          client_package_id?: string
          deliverable_type?: string
          depleted_at?: string | null
          id?: string
          tenant_id?: string | null
          total?: number
          updated_at?: string | null
          used?: number | null
          warning_triggered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "package_usage_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          category: string | null
          correction_limit: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          features: string[] | null
          id: string
          is_active: boolean | null
          monthly_fee: number | null
          name: string
          plan_type: string
          platform_count: number | null
          recommended: boolean | null
          tenant_id: string
          tier: string
        }
        Insert: {
          category?: string | null
          correction_limit?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number | null
          name: string
          plan_type: string
          platform_count?: number | null
          recommended?: boolean | null
          tenant_id: string
          tier: string
        }
        Update: {
          category?: string | null
          correction_limit?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number | null
          name?: string
          plan_type?: string
          platform_count?: number | null
          recommended?: boolean | null
          tenant_id?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_read: boolean | null
          can_update: boolean | null
          id: string
          module: string
          role_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          id?: string
          module: string
          role_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          id?: string
          module?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_messages: {
        Row: {
          channel_id: string
          id: string
          message_id: string
          pinned_at: string | null
          pinned_by: string | null
        }
        Insert: {
          channel_id: string
          id?: string
          message_id: string
          pinned_at?: string | null
          pinned_by?: string | null
        }
        Update: {
          channel_id?: string
          id?: string
          message_id?: string
          pinned_at?: string | null
          pinned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      post_annotations: {
        Row: {
          annotation_type: string | null
          color: string | null
          comment_id: string | null
          created_at: string | null
          created_by: string | null
          height: number | null
          id: string
          label: string | null
          post_id: string
          version_id: string | null
          width: number | null
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          annotation_type?: string | null
          color?: string | null
          comment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          height?: number | null
          id?: string
          label?: string | null
          post_id: string
          version_id?: string | null
          width?: number | null
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          annotation_type?: string | null
          color?: string | null
          comment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          height?: number | null
          id?: string
          label?: string | null
          post_id?: string
          version_id?: string | null
          width?: number | null
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_annotations_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_annotations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "deliverable_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_annotations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "post_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_avatar: string | null
          author_id: string
          author_name: string | null
          author_type: string
          content: string | null
          created_at: string | null
          id: string
          is_resolved: boolean | null
          is_revision_request: boolean | null
          parent_comment_id: string | null
          post_id: string
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string | null
          voice_duration: number | null
          voice_url: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_id: string
          author_name?: string | null
          author_type?: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          is_revision_request?: boolean | null
          parent_comment_id?: string | null
          post_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          voice_duration?: number | null
          voice_url?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_id?: string
          author_name?: string | null
          author_type?: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          is_revision_request?: boolean | null
          parent_comment_id?: string | null
          post_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          voice_duration?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "deliverable_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string
          user_id: string
          user_name: string | null
          user_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
          user_name?: string | null
          user_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
          user_name?: string | null
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "deliverable_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_versions: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          notes: string | null
          post_id: string
          thumbnail_url: string | null
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          post_id: string
          thumbnail_url?: string | null
          uploaded_by?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          post_id?: string
          thumbnail_url?: string | null
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_versions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "deliverable_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team: {
        Row: {
          avatar: string | null
          id: string
          name: string
          project_id: string
          team_member_id: string | null
        }
        Insert: {
          avatar?: string | null
          id?: string
          name: string
          project_id: string
          team_member_id?: string | null
        }
        Update: {
          avatar?: string | null
          id?: string
          name?: string
          project_id?: string
          team_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["team_member_id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          client_logo: string | null
          client_name: string | null
          created_at: string | null
          days_left: number | null
          deadline: string | null
          id: string
          progress: number | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          client_logo?: string | null
          client_name?: string | null
          created_at?: string | null
          days_left?: number | null
          deadline?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          client_logo?: string | null
          client_name?: string | null
          created_at?: string | null
          days_left?: number | null
          deadline?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_actions: {
        Row: {
          action_label: string
          action_name: string
          action_type: string | null
          color_accent: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          icon: string
          id: string
          is_active: boolean | null
          linked_service_type: string | null
          linked_url: string | null
          role_access: Json | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          action_label: string
          action_name: string
          action_type?: string | null
          color_accent?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          icon: string
          id?: string
          is_active?: boolean | null
          linked_service_type?: string | null
          linked_url?: string | null
          role_access?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          action_label?: string
          action_name?: string
          action_type?: string | null
          color_accent?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          icon?: string
          id?: string
          is_active?: boolean | null
          linked_service_type?: string | null
          linked_url?: string | null
          role_access?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "quick_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_chart_data: {
        Row: {
          day: string
          expenses: number | null
          id: string
          recorded_at: string | null
          revenue: number | null
          tenant_id: string
        }
        Insert: {
          day: string
          expenses?: number | null
          id?: string
          recorded_at?: string | null
          revenue?: number | null
          tenant_id: string
        }
        Update: {
          day?: string
          expenses?: number | null
          id?: string
          recorded_at?: string | null
          revenue?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_chart_data_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "revenue_chart_data_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          tenant_id: string
          user_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          tenant_id: string
          user_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          tenant_id?: string
          user_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_messages: {
        Row: {
          id: string
          message_id: string
          saved_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          saved_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          saved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "service_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_replies: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          message: string
          sender_id: string | null
          sender_name: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          message: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          message?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          config: Json
          id: string
          section: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config?: Json
          id?: string
          section: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config?: Json
          id?: string
          section?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "system_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_teams: {
        Row: {
          id: string
          team_id: string
          team_member_id: string
        }
        Insert: {
          id?: string
          team_id: string
          team_member_id: string
        }
        Update: {
          id?: string
          team_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_teams_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_teams_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["team_member_id"]
          },
        ]
      }
      team_members: {
        Row: {
          active_deliverables: number | null
          assigned_clients: string[] | null
          assigned_packages: string[] | null
          avatar: string | null
          avg_delivery_time: string | null
          bio: string | null
          boost_campaigns: number | null
          client_rating: number | null
          created_at: string | null
          current_load: number | null
          email: string | null
          hourly_rate: number | null
          id: string
          join_date: string | null
          name: string
          phone: string | null
          primary_role: string
          revision_count: number | null
          secondary_roles: string[] | null
          status: string | null
          tasks_completed_this_month: number | null
          tenant_id: string
          user_profile_id: string | null
          work_capacity_hours: number | null
        }
        Insert: {
          active_deliverables?: number | null
          assigned_clients?: string[] | null
          assigned_packages?: string[] | null
          avatar?: string | null
          avg_delivery_time?: string | null
          bio?: string | null
          boost_campaigns?: number | null
          client_rating?: number | null
          created_at?: string | null
          current_load?: number | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          join_date?: string | null
          name: string
          phone?: string | null
          primary_role: string
          revision_count?: number | null
          secondary_roles?: string[] | null
          status?: string | null
          tasks_completed_this_month?: number | null
          tenant_id: string
          user_profile_id?: string | null
          work_capacity_hours?: number | null
        }
        Update: {
          active_deliverables?: number | null
          assigned_clients?: string[] | null
          assigned_packages?: string[] | null
          avatar?: string | null
          avg_delivery_time?: string | null
          bio?: string | null
          boost_campaigns?: number | null
          client_rating?: number | null
          created_at?: string | null
          current_load?: number | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          join_date?: string | null
          name?: string
          phone?: string | null
          primary_role?: string
          revision_count?: number | null
          secondary_roles?: string[] | null
          status?: string | null
          tasks_completed_this_month?: number | null
          tenant_id?: string
          user_profile_id?: string | null
          work_capacity_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "team_members_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          active_tasks: number | null
          auto_redistribute: boolean | null
          category: string
          color: string | null
          created_at: string | null
          cross_team_allowed: boolean | null
          description: string | null
          efficiency_score: number | null
          icon: string | null
          id: string
          lead_name: string | null
          max_workload_percent: number | null
          name: string
          overload_warning_percent: number | null
          overloaded_members: number | null
          tenant_id: string
          total_members: number | null
        }
        Insert: {
          active_tasks?: number | null
          auto_redistribute?: boolean | null
          category: string
          color?: string | null
          created_at?: string | null
          cross_team_allowed?: boolean | null
          description?: string | null
          efficiency_score?: number | null
          icon?: string | null
          id?: string
          lead_name?: string | null
          max_workload_percent?: number | null
          name: string
          overload_warning_percent?: number | null
          overloaded_members?: number | null
          tenant_id: string
          total_members?: number | null
        }
        Update: {
          active_tasks?: number | null
          auto_redistribute?: boolean | null
          category?: string
          color?: string | null
          created_at?: string | null
          cross_team_allowed?: boolean | null
          description?: string | null
          efficiency_score?: number | null
          icon?: string | null
          id?: string
          lead_name?: string | null
          max_workload_percent?: number | null
          name?: string
          overload_warning_percent?: number | null
          overloaded_members?: number | null
          tenant_id?: string
          total_members?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          brand_color: string | null
          created_at: string | null
          id: string
          invoice_footer: string | null
          legal_info: string | null
          logo: string | null
          name: string
          payment_methods: string[] | null
          slug: string
          status: string | null
          tax_info: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          created_at?: string | null
          id?: string
          invoice_footer?: string | null
          legal_info?: string | null
          logo?: string | null
          name: string
          payment_methods?: string[] | null
          slug: string
          status?: string | null
          tax_info?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          created_at?: string | null
          id?: string
          invoice_footer?: string | null
          legal_info?: string | null
          logo?: string | null
          name?: string
          payment_methods?: string[] | null
          slug?: string
          status?: string | null
          tax_info?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      thread_messages: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          message_id: string
          thread_parent_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          message_id: string
          thread_parent_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          message_id?: string
          thread_parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_messages_thread_parent_id_fkey"
            columns: ["thread_parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          channel_id: string
          expires_at: string | null
          id: string
          started_at: string | null
          user_profile_id: string
          workspace_id: string
        }
        Insert: {
          channel_id: string
          expires_at?: string | null
          id?: string
          started_at?: string | null
          user_profile_id: string
          workspace_id: string
        }
        Update: {
          channel_id?: string
          expires_at?: string | null
          id?: string
          started_at?: string | null
          user_profile_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "typing_indicators_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_deduction_events: {
        Row: {
          client_package_id: string
          confirmed_by: string | null
          created_at: string | null
          deliverable_id: string | null
          deliverable_name: string | null
          deliverable_type: string
          id: string
          quantity: number | null
          status: string | null
        }
        Insert: {
          client_package_id: string
          confirmed_by?: string | null
          created_at?: string | null
          deliverable_id?: string | null
          deliverable_name?: string | null
          deliverable_type: string
          id?: string
          quantity?: number | null
          status?: string | null
        }
        Update: {
          client_package_id?: string
          confirmed_by?: string | null
          created_at?: string | null
          deliverable_id?: string | null
          deliverable_name?: string | null
          deliverable_type?: string
          id?: string
          quantity?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_deduction_events_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_deduction_events_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      user_appearance_settings: {
        Row: {
          accent_color: string | null
          active_preset: string
          background_color: string | null
          created_at: string | null
          custom_config: Json | null
          dashboard_layout: string | null
          font_size: string | null
          id: string
          primary_color: string | null
          secondary_color: string | null
          sidebar_collapsed: boolean | null
          tenant_id: string
          theme_mode: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          active_preset?: string
          background_color?: string | null
          created_at?: string | null
          custom_config?: Json | null
          dashboard_layout?: string | null
          font_size?: string | null
          id?: string
          primary_color?: string | null
          secondary_color?: string | null
          sidebar_collapsed?: boolean | null
          tenant_id?: string
          theme_mode?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string | null
          active_preset?: string
          background_color?: string | null
          created_at?: string | null
          custom_config?: Json | null
          dashboard_layout?: string | null
          font_size?: string | null
          id?: string
          primary_color?: string | null
          secondary_color?: string | null
          sidebar_collapsed?: boolean | null
          tenant_id?: string
          theme_mode?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_dashboard_layouts: {
        Row: {
          created_at: string | null
          id: string
          layout: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          layout?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          display_name: string
          email: string
          expires_at: string | null
          id: string
          invitation_token: string
          invited_by: string | null
          metadata: Json | null
          role: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          display_name: string
          email: string
          expires_at?: string | null
          id?: string
          invitation_token?: string
          invited_by?: string | null
          metadata?: Json | null
          role: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          expires_at?: string | null
          id?: string
          invitation_token?: string
          invited_by?: string | null
          metadata?: Json | null
          role?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          auth_user_id: string | null
          avatar: string | null
          branch_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          ip_restricted: boolean | null
          last_login: string | null
          phone: string | null
          status: string | null
          tenant_id: string
          two_factor_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar?: string | null
          branch_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          ip_restricted?: boolean | null
          last_login?: string | null
          phone?: string | null
          status?: string | null
          tenant_id: string
          two_factor_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar?: string | null
          branch_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          ip_restricted?: boolean | null
          last_login?: string | null
          phone?: string | null
          status?: string | null
          tenant_id?: string
          two_factor_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          category: string
          created_at: string | null
          id: string
          settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          id: string
          skill_level: number | null
          skill_name: string
          team_member_id: string
        }
        Insert: {
          id?: string
          skill_level?: number | null
          skill_name: string
          team_member_id: string
        }
        Update: {
          id?: string
          skill_level?: number | null
          skill_name?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "user_auth_view"
            referencedColumns: ["team_member_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          client_id: string | null
          client_wallet_id: string
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          type: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          client_id?: string | null
          client_wallet_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          client_id?: string | null
          client_wallet_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_client_wallet_id_fkey"
            columns: ["client_wallet_id"]
            isOneToOne: false
            referencedRelation: "client_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          avatar: string | null
          created_at: string | null
          id: string
          name: string
          role: string | null
          status: string | null
          user_profile_id: string | null
          workspace_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          id?: string
          name: string
          role?: string | null
          status?: string | null
          user_profile_id?: string | null
          workspace_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          id?: string
          name?: string
          role?: string | null
          status?: string | null
          user_profile_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          client_id: string | null
          client_logo: string | null
          client_name: string | null
          created_at: string | null
          description: string | null
          health_score: number | null
          id: string
          last_message: string | null
          last_message_time: string | null
          name: string | null
          package_usage: number | null
          pinned: boolean | null
          status: string | null
          tenant_id: string
          type: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          client_logo?: string | null
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          health_score?: number | null
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          name?: string | null
          package_usage?: number | null
          pinned?: boolean | null
          status?: string | null
          tenant_id: string
          type?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          client_logo?: string | null
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          health_score?: number | null
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          name?: string | null
          package_usage?: number | null
          pinned?: boolean | null
          status?: string | null
          tenant_id?: string
          type?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "workspaces_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "workspaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      client_usage_summary: {
        Row: {
          business_name: string | null
          client_id: string | null
          completed: number | null
          in_progress: number | null
          pending: number | null
          tenant_id: string | null
          total_deliverables: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_summary: {
        Row: {
          active_campaigns: number | null
          tenant_id: string | null
          total_clients: number | null
          total_deliverables: number | null
          total_messages: number | null
          total_wallet_balance: number | null
        }
        Insert: {
          active_campaigns?: never
          tenant_id?: string | null
          total_clients?: never
          total_deliverables?: never
          total_messages?: never
          total_wallet_balance?: never
        }
        Update: {
          active_campaigns?: never
          tenant_id?: string | null
          total_clients?: never
          total_deliverables?: never
          total_messages?: never
          total_wallet_balance?: never
        }
        Relationships: []
      }
      user_auth_view: {
        Row: {
          auth_id: string | null
          avatar: string | null
          client_id: string | null
          demo_user_id: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          is_active: boolean | null
          metadata: Json | null
          phone: string | null
          primary_role: string | null
          profile_id: string | null
          profile_status: string | null
          role: string | null
          team_member_id: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_usage_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "demo_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "system_health_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_realtime_status: {
        Args: never
        Returns: {
          has_replica_identity: boolean
          in_publication: boolean
          status: string
          table_name: string
        }[]
      }
      check_usage_before_deduction: {
        Args: {
          p_client_package_id: string
          p_deliverable_type: string
          p_quantity?: number
        }
        Returns: {
          can_deduct: boolean
          current_total: number
          current_used: number
          message: string
          remaining: number
          warning_active: boolean
        }[]
      }
      clean_expired_typing_indicators: { Args: never; Returns: undefined }
      create_demo_session: { Args: { p_user_id: string }; Returns: string }
      forward_message_with_attachments: {
        Args: {
          p_original_channel_name: string
          p_original_message_id: string
          p_sender_avatar: string
          p_sender_id: string
          p_sender_name: string
          p_sender_role: string
          p_target_channel_id: string
        }
        Returns: string
      }
      get_client_portal_data:
        | { Args: { p_client_id: string }; Returns: Json }
        | { Args: { p_client_id: string; p_tenant_id: string }; Returns: Json }
      get_package_usage_with_overrides: {
        Args: { p_client_package_id: string }
        Returns: {
          allocated: number
          auto_deduction: boolean
          client_package_id: string
          deliverable_type: string
          depleted_at: string
          icon: string
          id: string
          label: string
          remaining: number
          source: string
          total: number
          unit_label: string
          usage_percent: number
          used: number
          warning_threshold: number
          warning_triggered: boolean
        }[]
      }
      get_table_counts: { Args: { p_tenant_id?: string }; Returns: Json }
      get_thread_reply_count: {
        Args: { p_parent_message_id: string }
        Returns: number
      }
      get_user_role: { Args: never; Returns: string }
      get_user_system_health: { Args: { p_tenant_id?: string }; Returns: Json }
      get_user_tenant_id: { Args: never; Returns: string }
      increment_team_member_count: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      mark_channel_as_read: {
        Args: { p_channel_id: string; p_reader_profile_id: string }
        Returns: undefined
      }
      refresh_dashboard_metrics: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      repair_user_links: {
        Args: { p_tenant_id?: string }
        Returns: {
          action_taken: string
          demo_user_id: string
        }[]
      }
      validate_channel_access: {
        Args: { p_channel_id: string; p_user_profile_id: string }
        Returns: boolean
      }
      validate_demo_session: {
        Args: { p_token: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
