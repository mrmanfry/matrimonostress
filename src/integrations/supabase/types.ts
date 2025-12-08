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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      checklist_tasks: {
        Row: {
          assigned_to: string | null
          blocked_by_task_id: string | null
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_system_generated: boolean | null
          linked_payment_id: string | null
          notes: string | null
          priority: string | null
          status: string | null
          title: string
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          assigned_to?: string | null
          blocked_by_task_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_system_generated?: boolean | null
          linked_payment_id?: string | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          assigned_to?: string | null
          blocked_by_task_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_system_generated?: boolean | null
          linked_payment_id?: string | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_tasks_blocked_by_task_id_fkey"
            columns: ["blocked_by_task_id"]
            isOneToOne: false
            referencedRelation: "checklist_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_linked_payment_id_fkey"
            columns: ["linked_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_matches_temp: {
        Row: {
          confidence_score: number | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          expires_at: string
          guest_id: string
          id: string
          status: string
          user_id: string
          wedding_id: string
        }
        Insert: {
          confidence_score?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          expires_at?: string
          guest_id: string
          id?: string
          status?: string
          user_id: string
          wedding_id: string
        }
        Update: {
          confidence_score?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          expires_at?: string
          guest_id?: string
          id?: string
          status?: string
          user_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_matches_temp_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_items: {
        Row: {
          amount_is_tax_inclusive: boolean | null
          calculation_mode: string | null
          category_id: string | null
          created_at: string
          description: string
          estimated_amount: number | null
          expense_type: string | null
          fixed_amount: number | null
          id: string
          planned_adults: number | null
          planned_children: number | null
          planned_staff: number | null
          tax_rate: number | null
          total_amount: number | null
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          amount_is_tax_inclusive?: boolean | null
          calculation_mode?: string | null
          category_id?: string | null
          created_at?: string
          description: string
          estimated_amount?: number | null
          expense_type?: string | null
          fixed_amount?: number | null
          id?: string
          planned_adults?: number | null
          planned_children?: number | null
          planned_staff?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          amount_is_tax_inclusive?: boolean | null
          calculation_mode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          estimated_amount?: number | null
          expense_type?: string | null
          fixed_amount?: number | null
          id?: string
          planned_adults?: number | null
          planned_children?: number | null
          planned_staff?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_line_items: {
        Row: {
          created_at: string
          description: string
          discount_percentage: number | null
          expense_item_id: string
          id: string
          order_index: number | null
          quantity_fixed: number | null
          quantity_limit: number | null
          quantity_range: string | null
          quantity_type: string
          tax_rate: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          discount_percentage?: number | null
          expense_item_id: string
          id?: string
          order_index?: number | null
          quantity_fixed?: number | null
          quantity_limit?: number | null
          quantity_range?: string | null
          quantity_type: string
          tax_rate?: number | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          discount_percentage?: number | null
          expense_item_id?: string
          id?: string
          order_index?: number | null
          quantity_fixed?: number | null
          quantity_limit?: number | null
          quantity_range?: string | null
          quantity_type?: string
          tax_rate?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_line_items_expense_item_id_fkey"
            columns: ["expense_item_id"]
            isOneToOne: false
            referencedRelation: "expense_items"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_contributors: {
        Row: {
          contribution_target: number | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          type: string
          user_id: string | null
          wedding_id: string
        }
        Insert: {
          contribution_target?: number | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          type: string
          user_id?: string | null
          wedding_id: string
        }
        Update: {
          contribution_target?: number | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          type?: string
          user_id?: string | null
          wedding_id?: string
        }
        Relationships: []
      }
      guest_conflicts: {
        Row: {
          created_at: string
          guest_id_1: string
          guest_id_2: string
          id: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          guest_id_1: string
          guest_id_2: string
          id?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          guest_id_1?: string
          guest_id_2?: string
          id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_conflicts_guest_id_1_fkey"
            columns: ["guest_id_1"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_conflicts_guest_id_2_fkey"
            columns: ["guest_id_2"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_groups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          adults_count: number | null
          children_count: number | null
          created_at: string
          dietary_restrictions: string | null
          first_name: string
          group_id: string | null
          id: string
          is_child: boolean
          is_staff: boolean | null
          last_name: string
          menu_choice: string | null
          notes: string | null
          party_id: string | null
          phone: string | null
          rsvp_invitation_sent: string | null
          rsvp_send_status: Database["public"]["Enums"]["send_status_enum"]
          rsvp_status: string | null
          unique_rsvp_token: string | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          adults_count?: number | null
          children_count?: number | null
          created_at?: string
          dietary_restrictions?: string | null
          first_name: string
          group_id?: string | null
          id?: string
          is_child?: boolean
          is_staff?: boolean | null
          last_name: string
          menu_choice?: string | null
          notes?: string | null
          party_id?: string | null
          phone?: string | null
          rsvp_invitation_sent?: string | null
          rsvp_send_status?: Database["public"]["Enums"]["send_status_enum"]
          rsvp_status?: string | null
          unique_rsvp_token?: string | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          adults_count?: number | null
          children_count?: number | null
          created_at?: string
          dietary_restrictions?: string | null
          first_name?: string
          group_id?: string | null
          id?: string
          is_child?: boolean
          is_staff?: boolean | null
          last_name?: string
          menu_choice?: string | null
          notes?: string | null
          party_id?: string | null
          phone?: string | null
          rsvp_invitation_sent?: string | null
          rsvp_send_status?: Database["public"]["Enums"]["send_status_enum"]
          rsvp_status?: string | null
          unique_rsvp_token?: string | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "guest_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "invite_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_parties: {
        Row: {
          confirmed_by_guest_id: string | null
          created_at: string
          id: string
          last_rsvp_log_id: string | null
          party_name: string
          rsvp_status: Database["public"]["Enums"]["rsvp_status_enum"]
          updated_at: string
          wedding_id: string
        }
        Insert: {
          confirmed_by_guest_id?: string | null
          created_at?: string
          id?: string
          last_rsvp_log_id?: string | null
          party_name: string
          rsvp_status?: Database["public"]["Enums"]["rsvp_status_enum"]
          updated_at?: string
          wedding_id: string
        }
        Update: {
          confirmed_by_guest_id?: string | null
          created_at?: string
          id?: string
          last_rsvp_log_id?: string | null
          party_name?: string
          rsvp_status?: Database["public"]["Enums"]["rsvp_status_enum"]
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_last_rsvp_log"
            columns: ["last_rsvp_log_id"]
            isOneToOne: false
            referencedRelation: "rsvp_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_parties_confirmed_by_guest_id_fkey"
            columns: ["confirmed_by_guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_parties_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          contributor_id: string
          created_at: string
          id: string
          payment_id: string
          percentage: number | null
        }
        Insert: {
          amount: number
          contributor_id: string
          created_at?: string
          id?: string
          payment_id: string
          percentage?: number | null
        }
        Update: {
          amount?: number
          contributor_id?: string
          created_at?: string
          id?: string
          payment_id?: string
          percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "financial_contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          amount_type: string | null
          balance_base: string | null
          created_at: string
          days_before_wedding: number | null
          description: string
          due_date: string
          due_date_type: string | null
          expense_item_id: string
          id: string
          paid_by: string | null
          paid_on_date: string | null
          percentage_base: string | null
          percentage_value: number | null
          recalculate_on_actual: boolean | null
          status: string
          tax_inclusive: boolean
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          amount_type?: string | null
          balance_base?: string | null
          created_at?: string
          days_before_wedding?: number | null
          description: string
          due_date: string
          due_date_type?: string | null
          expense_item_id: string
          id?: string
          paid_by?: string | null
          paid_on_date?: string | null
          percentage_base?: string | null
          percentage_value?: number | null
          recalculate_on_actual?: boolean | null
          status?: string
          tax_inclusive?: boolean
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_type?: string | null
          balance_base?: string | null
          created_at?: string
          days_before_wedding?: number | null
          description?: string
          due_date?: string
          due_date_type?: string | null
          expense_item_id?: string
          id?: string
          paid_by?: string | null
          paid_on_date?: string | null
          percentage_base?: string | null
          percentage_value?: number | null
          recalculate_on_actual?: boolean | null
          status?: string
          tax_inclusive?: boolean
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_expense_item_id_fkey"
            columns: ["expense_item_id"]
            isOneToOne: false
            referencedRelation: "expense_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          wedding_role: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
          wedding_role?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          wedding_role?: string | null
        }
        Relationships: []
      }
      progress_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          show_checklist: boolean
          show_countdown: boolean
          show_timeline: boolean
          show_vendors: boolean
          token: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          show_checklist?: boolean
          show_countdown?: boolean
          show_timeline?: boolean
          show_vendors?: boolean
          token: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          show_checklist?: boolean
          show_countdown?: boolean
          show_timeline?: boolean
          show_vendors?: boolean
          token?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_tokens_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_log: {
        Row: {
          created_at: string
          guest_id_actor: string
          id: string
          party_id: string
          payload: Json
          timestamp: string
        }
        Insert: {
          created_at?: string
          guest_id_actor: string
          id?: string
          party_id: string
          payload: Json
          timestamp?: string
        }
        Update: {
          created_at?: string
          guest_id_actor?: string
          id?: string
          party_id?: string
          payload?: Json
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_log_guest_id_actor_fkey"
            columns: ["guest_id_actor"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_log_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "invite_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean
          user_id: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used?: boolean
          user_id: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          user_id?: string
          wedding_id?: string
        }
        Relationships: []
      }
      table_assignments: {
        Row: {
          created_at: string
          guest_id: string
          id: string
          table_id: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          id?: string
          table_id: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_assignments_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: true
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_assignments_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          name: string
          position_x: number
          position_y: number
          updated_at: string
          wedding_id: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          name: string
          position_x?: number
          position_y?: number
          updated_at?: string
          wedding_id: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          position_x?: number
          position_y?: number
          updated_at?: string
          wedding_id?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string | null
          order_index: number
          time: string
          title: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          order_index?: number
          time: string
          title: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          order_index?: number
          time?: string
          title?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: []
      }
      timeline_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          token: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          wedding_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_communications: {
        Row: {
          channel: string
          created_at: string | null
          id: string
          message_content: string
          outcome: string | null
          sender_user_id: string
          task_id: string | null
          tone: string | null
          vendor_id: string
          wedding_id: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          id?: string
          message_content: string
          outcome?: string | null
          sender_user_id: string
          task_id?: string | null
          tone?: string | null
          vendor_id: string
          wedding_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: string
          message_content?: string
          outcome?: string | null
          sender_user_id?: string
          task_id?: string | null
          tone?: string | null
          vendor_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_communications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "checklist_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_communications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_communications_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_contracts: {
        Row: {
          ai_analysis: Json | null
          analyzed_at: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          updated_at: string | null
          vendor_id: string
          wedding_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          analyzed_at?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          updated_at?: string | null
          vendor_id: string
          wedding_id: string
        }
        Update: {
          ai_analysis?: Json | null
          analyzed_at?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          updated_at?: string | null
          vendor_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_contracts_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category_id: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          iban: string | null
          id: string
          indirizzo_sede_legale: string | null
          intestatario_conto: string | null
          name: string
          notes: string | null
          partita_iva_cf: string | null
          phone: string | null
          ragione_sociale: string | null
          status: string | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          category_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          indirizzo_sede_legale?: string | null
          intestatario_conto?: string | null
          name: string
          notes?: string | null
          partita_iva_cf?: string | null
          phone?: string | null
          ragione_sociale?: string | null
          status?: string | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          category_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          indirizzo_sede_legale?: string | null
          intestatario_conto?: string | null
          name?: string
          notes?: string | null
          partita_iva_cf?: string | null
          phone?: string | null
          ragione_sociale?: string | null
          status?: string | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          wedding_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string | null
          wedding_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_invitations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      weddings: {
        Row: {
          access_code: string | null
          calculation_mode: string | null
          created_at: string
          created_by: string
          id: string
          partner1_name: string
          partner2_name: string
          target_adults: number | null
          target_children: number | null
          target_staff: number | null
          total_budget: number | null
          updated_at: string
          wedding_date: string
        }
        Insert: {
          access_code?: string | null
          calculation_mode?: string | null
          created_at?: string
          created_by: string
          id?: string
          partner1_name: string
          partner2_name: string
          target_adults?: number | null
          target_children?: number | null
          target_staff?: number | null
          total_budget?: number | null
          updated_at?: string
          wedding_date: string
        }
        Update: {
          access_code?: string | null
          calculation_mode?: string | null
          created_at?: string
          created_by?: string
          id?: string
          partner1_name?: string
          partner2_name?: string
          target_adults?: number | null
          target_children?: number | null
          target_staff?: number | null
          total_budget?: number | null
          updated_at?: string
          wedding_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_sync_tokens: { Args: never; Returns: undefined }
      generate_progress_token: { Args: never; Returns: string }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_wedding_role: {
        Args: { _user_id: string; _wedding_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_wedding_access: {
        Args: { _user_id: string; _wedding_id: string }
        Returns: boolean
      }
      has_wedding_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
          _wedding_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "co_planner" | "manager" | "guest"
      rsvp_status_enum: "In attesa" | "Confermato" | "Rifiutato"
      send_status_enum: "Non Inviato" | "Inviato" | "Fallito"
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
      app_role: ["co_planner", "manager", "guest"],
      rsvp_status_enum: ["In attesa", "Confermato", "Rifiutato"],
      send_status_enum: ["Non Inviato", "Inviato", "Fallito"],
    },
  },
} as const
