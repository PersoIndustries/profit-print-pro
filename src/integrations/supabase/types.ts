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
      catalog_items: {
        Row: {
          additional_notes: string | null
          created_at: string
          id: string
          image_url: string | null
          long_description: string | null
          name: string
          project_id: string
          pvp_price: number
          reference_code: string
          sizes: Json
          technical_specs: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_notes?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          long_description?: string | null
          name: string
          project_id: string
          pvp_price: number
          reference_code: string
          sizes?: Json
          technical_specs?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_notes?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          long_description?: string | null
          name?: string
          project_id?: string
          pvp_price?: number
          reference_code?: string
          sizes?: Json
          technical_specs?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      catalog_product_sections: {
        Row: {
          catalog_project_id: string
          created_at: string | null
          id: string
          position: number
          title: string
          updated_at: string | null
        }
        Insert: {
          catalog_project_id: string
          created_at?: string | null
          id?: string
          position?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          catalog_project_id?: string
          created_at?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_product_sections_catalog_project_id_fkey"
            columns: ["catalog_project_id"]
            isOneToOne: false
            referencedRelation: "catalog_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_products: {
        Row: {
          catalog_product_section_id: string | null
          catalog_project_id: string
          created_at: string | null
          dimensions: string | null
          id: string
          name: string
          position: number
          price: number
          reference_code: string
          updated_at: string | null
        }
        Insert: {
          catalog_product_section_id?: string | null
          catalog_project_id: string
          created_at?: string | null
          dimensions?: string | null
          id?: string
          name: string
          position?: number
          price: number
          reference_code: string
          updated_at?: string | null
        }
        Update: {
          catalog_product_section_id?: string | null
          catalog_project_id?: string
          created_at?: string | null
          dimensions?: string | null
          id?: string
          name?: string
          position?: number
          price?: number
          reference_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_catalog_product_section_id_fkey"
            columns: ["catalog_product_section_id"]
            isOneToOne: false
            referencedRelation: "catalog_product_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_products_catalog_project_id_fkey"
            columns: ["catalog_project_id"]
            isOneToOne: false
            referencedRelation: "catalog_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_projects: {
        Row: {
          catalog_id: string
          catalog_section_id: string | null
          colors: Json | null
          created_at: string | null
          creator: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          position: number
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          catalog_id: string
          catalog_section_id?: string | null
          colors?: Json | null
          created_at?: string | null
          creator?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          position?: number
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          catalog_id?: string
          catalog_section_id?: string | null
          colors?: Json | null
          created_at?: string | null
          creator?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          position?: number
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_projects_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_projects_catalog_section_id_fkey"
            columns: ["catalog_section_id"]
            isOneToOne: false
            referencedRelation: "catalog_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_sections: {
        Row: {
          catalog_id: string
          created_at: string | null
          display_type: string
          id: string
          position: number
          title: string
          updated_at: string | null
        }
        Insert: {
          catalog_id: string
          created_at?: string | null
          display_type?: string
          id?: string
          position?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          catalog_id?: string
          created_at?: string | null
          display_type?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_sections_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "catalogs"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogs: {
        Row: {
          brand_logo_url: string | null
          cover_background_url: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          season: string | null
          show_logo_on_cover: boolean
          show_powered_by: boolean
          show_text_on_cover: boolean
          theme: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_logo_url?: string | null
          cover_background_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          season?: string | null
          show_logo_on_cover?: boolean
          show_powered_by?: boolean
          show_text_on_cover?: boolean
          theme?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_logo_url?: string | null
          cover_background_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          season?: string | null
          show_logo_on_cover?: boolean
          show_powered_by?: boolean
          show_text_on_cover?: boolean
          theme?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      creator_code_uses: {
        Row: {
          applied_at: string
          commission_amount: number | null
          commission_paid: boolean
          commission_paid_at: string | null
          creator_code_id: string
          creator_commission_percentage: number
          discount_percentage: number | null
          id: string
          tier_granted: Database["public"]["Enums"]["subscription_tier"]
          trial_days_granted: number
          user_id: string
        }
        Insert: {
          applied_at?: string
          commission_amount?: number | null
          commission_paid?: boolean
          commission_paid_at?: string | null
          creator_code_id: string
          creator_commission_percentage: number
          discount_percentage?: number | null
          id?: string
          tier_granted: Database["public"]["Enums"]["subscription_tier"]
          trial_days_granted?: number
          user_id: string
        }
        Update: {
          applied_at?: string
          commission_amount?: number | null
          commission_paid?: boolean
          commission_paid_at?: string | null
          creator_code_id?: string
          creator_commission_percentage?: number
          discount_percentage?: number | null
          id?: string
          tier_granted?: Database["public"]["Enums"]["subscription_tier"]
          trial_days_granted?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_code_uses_creator_code_id_fkey"
            columns: ["creator_code_id"]
            isOneToOne: false
            referencedRelation: "creator_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          creator_commission_percentage: number
          creator_user_id: string
          current_uses: number
          description: string | null
          discount_percentage: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          tier_granted: Database["public"]["Enums"]["subscription_tier"]
          trial_days: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          creator_commission_percentage?: number
          creator_user_id: string
          current_uses?: number
          description?: string | null
          discount_percentage?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tier_granted?: Database["public"]["Enums"]["subscription_tier"]
          trial_days?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          creator_commission_percentage?: number
          creator_user_id?: string
          current_uses?: number
          description?: string | null
          discount_percentage?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tier_granted?: Database["public"]["Enums"]["subscription_tier"]
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          calculated_at: string | null
          cancellations: number | null
          created_at: string | null
          deleted_accounts: number | null
          downgrades: number | null
          id: string
          materials_created: number | null
          metric_date: string
          new_subscriptions_free: number | null
          new_subscriptions_tier_1: number | null
          new_subscriptions_tier_2: number | null
          new_users: number | null
          new_users_free: number | null
          new_users_tier_1: number | null
          new_users_tier_2: number | null
          orders_created: number | null
          prints_created: number | null
          projects_created: number | null
          revenue: number | null
          updated_at: string | null
        }
        Insert: {
          calculated_at?: string | null
          cancellations?: number | null
          created_at?: string | null
          deleted_accounts?: number | null
          downgrades?: number | null
          id?: string
          materials_created?: number | null
          metric_date: string
          new_subscriptions_free?: number | null
          new_subscriptions_tier_1?: number | null
          new_subscriptions_tier_2?: number | null
          new_users?: number | null
          new_users_free?: number | null
          new_users_tier_1?: number | null
          new_users_tier_2?: number | null
          orders_created?: number | null
          prints_created?: number | null
          projects_created?: number | null
          revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          calculated_at?: string | null
          cancellations?: number | null
          created_at?: string | null
          deleted_accounts?: number | null
          downgrades?: number | null
          id?: string
          materials_created?: number | null
          metric_date?: string
          new_subscriptions_free?: number | null
          new_subscriptions_tier_1?: number | null
          new_subscriptions_tier_2?: number | null
          new_users?: number | null
          new_users_free?: number | null
          new_users_tier_1?: number | null
          new_users_tier_2?: number | null
          orders_created?: number | null
          prints_created?: number | null
          projects_created?: number | null
          revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          created_at: string
          id: string
          location: string | null
          material_id: string
          min_stock_alert: number | null
          notes: string | null
          quantity_grams: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          material_id: string
          min_stock_alert?: number | null
          notes?: string | null
          quantity_grams?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          material_id?: string
          min_stock_alert?: number | null
          notes?: string | null
          quantity_grams?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          material_id: string
          movement_type: string
          notes: string | null
          quantity_grams: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          movement_type: string
          notes?: string | null
          quantity_grams: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          movement_type?: string
          notes?: string | null
          quantity_grams?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_material"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          billing_period: string | null
          created_at: string | null
          currency: string | null
          id: string
          invoice_number: string
          issued_date: string | null
          notes: string | null
          paid_date: string | null
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_invoice_id: string | null
          stripe_invoice_pdf_url: string | null
          stripe_payment_intent_id: string | null
          stripe_receipt_url: string | null
          subscription_id: string | null
          tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          billing_period?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_number: string
          issued_date?: string | null
          notes?: string | null
          paid_date?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_invoice_id?: string | null
          stripe_invoice_pdf_url?: string | null
          stripe_payment_intent_id?: string | null
          stripe_receipt_url?: string | null
          subscription_id?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          billing_period?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string | null
          notes?: string | null
          paid_date?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_invoice_id?: string | null
          stripe_invoice_pdf_url?: string | null
          stripe_payment_intent_id?: string | null
          stripe_receipt_url?: string | null
          subscription_id?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      material_acquisitions: {
        Row: {
          created_at: string
          id: string
          material_id: string
          notes: string | null
          purchase_date: string
          quantity_grams: number
          supplier: string | null
          total_price: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          notes?: string | null
          purchase_date?: string
          quantity_grams: number
          supplier?: string | null
          total_price: number
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          notes?: string | null
          purchase_date?: string
          quantity_grams?: number
          supplier?: string | null
          total_price?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_acquisitions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          color: string | null
          created_at: string | null
          display_mode: string | null
          id: string
          is_favorite: boolean | null
          name: string
          price_per_kg: number
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_mode?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          price_per_kg: number
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_mode?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          price_per_kg?: number
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          material_notifications: boolean
          order_notifications: boolean
          project_notifications: boolean
          push_enabled: boolean
          subscription_notifications: boolean
          system_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          material_notifications?: boolean
          order_notifications?: boolean
          project_notifications?: boolean
          push_enabled?: boolean
          subscription_notifications?: boolean
          system_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          material_notifications?: boolean
          order_notifications?: boolean
          project_notifications?: boolean
          push_enabled?: boolean
          subscription_notifications?: boolean
          system_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          project_id: string
          quantity: number
          status: string
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          project_id: string
          quantity?: number
          status?: string
          total_price: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          project_id?: string
          quantity?: number
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          order_date: string | null
          order_number: string
          project_id: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number: string
          project_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string
          project_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      print_materials: {
        Row: {
          created_at: string
          id: string
          material_cost: number
          material_id: string
          print_id: string
          weight_grams: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_cost: number
          material_id: string
          print_id: string
          weight_grams: number
        }
        Update: {
          created_at?: string
          id?: string
          material_cost?: number
          material_id?: string
          print_id?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "print_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_materials_print_id_fkey"
            columns: ["print_id"]
            isOneToOne: false
            referencedRelation: "prints"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          brand: string
          created_at: string
          id: string
          model: string
          notes: string | null
          updated_at: string
          usage_hours: number
          user_id: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          model: string
          notes?: string | null
          updated_at?: string
          usage_hours?: number
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          model?: string
          notes?: string | null
          updated_at?: string
          usage_hours?: number
          user_id?: string
        }
        Relationships: []
      }
      prints: {
        Row: {
          created_at: string
          id: string
          material_used_grams: number
          name: string
          notes: string | null
          order_id: string | null
          print_date: string
          print_time_hours: number
          print_type: string
          project_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_used_grams?: number
          name: string
          notes?: string | null
          order_id?: string | null
          print_date?: string
          print_time_hours?: number
          print_type: string
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_used_grams?: number
          name?: string
          notes?: string | null
          order_id?: string | null
          print_date?: string
          print_time_hours?: number
          print_type?: string
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prints_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          billing_period: string
          created_at: string | null
          currency: string | null
          current_uses: number | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          name: string
          price_amount_cents: number
          product_type: string
          start_date: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          tier: string
          updated_at: string | null
        }
        Insert: {
          billing_period: string
          created_at?: string | null
          currency?: string | null
          current_uses?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name: string
          price_amount_cents?: number
          product_type: string
          start_date?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier: string
          updated_at?: string | null
        }
        Update: {
          billing_period?: string
          created_at?: string | null
          currency?: string | null
          current_uses?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name?: string
          price_amount_cents?: number
          product_type?: string
          start_date?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          brand_logo_url: string | null
          company_name: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          email: string
          full_name: string | null
          id: string
          scheduled_deletion_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          brand_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email: string
          full_name?: string | null
          id: string
          scheduled_deletion_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          brand_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string
          full_name?: string | null
          id?: string
          scheduled_deletion_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_materials: {
        Row: {
          created_at: string | null
          id: string
          material_cost: number
          material_id: string
          project_id: string
          weight_grams: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_cost: number
          material_id: string
          project_id: string
          weight_grams: number
        }
        Update: {
          created_at?: string | null
          id?: string
          material_cost?: number
          material_id?: string
          project_id?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          electricity_cost: number | null
          id: string
          image_url: string | null
          labor_cost: number | null
          material_cost: number | null
          material_id: string | null
          name: string
          notes: string | null
          print_time_hours: number
          profit_margin: number | null
          tags: Json | null
          total_price: number | null
          updated_at: string | null
          user_id: string
          weight_grams: number
        }
        Insert: {
          created_at?: string | null
          electricity_cost?: number | null
          id?: string
          image_url?: string | null
          labor_cost?: number | null
          material_cost?: number | null
          material_id?: string | null
          name: string
          notes?: string | null
          print_time_hours: number
          profit_margin?: number | null
          tags?: Json | null
          total_price?: number | null
          updated_at?: string | null
          user_id: string
          weight_grams: number
        }
        Update: {
          created_at?: string | null
          electricity_cost?: number | null
          id?: string
          image_url?: string | null
          labor_cost?: number | null
          material_cost?: number | null
          material_id?: string | null
          name?: string
          notes?: string | null
          print_time_hours?: number
          profit_margin?: number | null
          tags?: Json | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_id: string | null
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string | null
          description: string | null
          has_demonstrable_issue: boolean | null
          has_not_exceeded_limits: boolean | null
          id: string
          invoice_id: string | null
          is_current_month: boolean | null
          is_within_time_limit: boolean | null
          processed_at: string | null
          reason: string
          refund_type: string
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string | null
          description?: string | null
          has_demonstrable_issue?: boolean | null
          has_not_exceeded_limits?: boolean | null
          id?: string
          invoice_id?: string | null
          is_current_month?: boolean | null
          is_within_time_limit?: boolean | null
          processed_at?: string | null
          reason: string
          refund_type: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          has_demonstrable_issue?: boolean | null
          has_not_exceeded_limits?: boolean | null
          id?: string
          invoice_id?: string | null
          is_current_month?: boolean | null
          is_within_time_limit?: boolean | null
          processed_at?: string | null
          reason?: string
          refund_type?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list: {
        Row: {
          created_at: string
          estimated_price: number | null
          id: string
          is_completed: boolean
          name: string
          notes: string | null
          quantity: string | null
          shopping_list_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_price?: number | null
          id?: string
          is_completed?: boolean
          name: string
          notes?: string | null
          quantity?: string | null
          shopping_list_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_price?: number | null
          id?: string
          is_completed?: boolean
          name?: string
          notes?: string | null
          quantity?: string | null
          shopping_list_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_changes: {
        Row: {
          admin_id: string | null
          change_type: string
          created_at: string | null
          id: string
          new_tier: Database["public"]["Enums"]["subscription_tier"] | null
          notes: string | null
          previous_tier: Database["public"]["Enums"]["subscription_tier"] | null
          reason: string | null
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          change_type: string
          created_at?: string | null
          id?: string
          new_tier?: Database["public"]["Enums"]["subscription_tier"] | null
          notes?: string | null
          previous_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          reason?: string | null
          user_id: string
        }
        Update: {
          admin_id?: string | null
          change_type?: string
          created_at?: string | null
          id?: string
          new_tier?: Database["public"]["Enums"]["subscription_tier"] | null
          notes?: string | null
          previous_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_limits: {
        Row: {
          created_at: string
          id: string
          materials: number
          metrics_history: number
          monthly_orders: number
          projects: number
          shopping_lists: number
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          materials?: number
          metrics_history?: number
          monthly_orders?: number
          projects?: number
          shopping_lists?: number
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          materials?: number
          metrics_history?: number
          monthly_orders?: number
          projects?: number
          shopping_lists?: number
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      subscription_limits_history: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          id: string
          new_materials: number | null
          new_metrics_history: number | null
          new_monthly_orders: number | null
          new_projects: number | null
          new_shopping_lists: number | null
          notes: string | null
          old_materials: number | null
          old_metrics_history: number | null
          old_monthly_orders: number | null
          old_projects: number | null
          old_shopping_lists: number | null
          tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_materials?: number | null
          new_metrics_history?: number | null
          new_monthly_orders?: number | null
          new_projects?: number | null
          new_shopping_lists?: number | null
          notes?: string | null
          old_materials?: number | null
          old_metrics_history?: number | null
          old_monthly_orders?: number | null
          old_projects?: number | null
          old_shopping_lists?: number | null
          tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_materials?: number | null
          new_metrics_history?: number | null
          new_monthly_orders?: number | null
          new_projects?: number | null
          new_shopping_lists?: number | null
          notes?: string | null
          old_materials?: number | null
          old_metrics_history?: number | null
          old_monthly_orders?: number | null
          old_projects?: number | null
          old_shopping_lists?: number | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          read_at: string | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          read_at?: string | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          read_at?: string | null
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          closed_at: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          status: string
          ticket_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          status?: string
          ticket_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          status?: string
          ticket_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tier_features: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          free_tier: boolean
          id: string
          tier_1: boolean
          tier_2: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          free_tier?: boolean
          id?: string
          tier_1?: boolean
          tier_2?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          free_tier?: boolean
          id?: string
          tier_1?: boolean
          tier_2?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_activity_summary: {
        Row: {
          activity_date: string
          created_at: string
          first_activity: string | null
          id: string
          last_activity: string | null
          materials_created: number
          orders_created: number
          prints_created: number
          projects_created: number
          session_count: number
          total_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date: string
          created_at?: string
          first_activity?: string | null
          id?: string
          last_activity?: string | null
          materials_created?: number
          orders_created?: number
          prints_created?: number
          projects_created?: number
          session_count?: number
          total_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          created_at?: string
          first_activity?: string | null
          id?: string
          last_activity?: string | null
          materials_created?: number
          orders_created?: number
          prints_created?: number
          projects_created?: number
          session_count?: number
          total_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_promo_codes: {
        Row: {
          applied_at: string
          id: string
          promo_code_id: string
          tier_granted: Database["public"]["Enums"]["subscription_tier"]
          user_id: string
        }
        Insert: {
          applied_at?: string
          id?: string
          promo_code_id: string
          tier_granted: Database["public"]["Enums"]["subscription_tier"]
          user_id: string
        }
        Update: {
          applied_at?: string
          id?: string
          promo_code_id?: string
          tier_granted?: Database["public"]["Enums"]["subscription_tier"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_promo_codes_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_period: string | null
          created_at: string | null
          downgrade_date: string | null
          expires_at: string | null
          grace_period_end: string | null
          id: string
          is_paid_subscription: boolean | null
          is_read_only: boolean | null
          last_payment_date: string | null
          next_billing_date: string | null
          previous_tier: Database["public"]["Enums"]["subscription_tier"] | null
          price_paid: number | null
          starts_at: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_period?: string | null
          created_at?: string | null
          downgrade_date?: string | null
          expires_at?: string | null
          grace_period_end?: string | null
          id?: string
          is_paid_subscription?: boolean | null
          is_read_only?: boolean | null
          last_payment_date?: string | null
          next_billing_date?: string | null
          previous_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          price_paid?: number | null
          starts_at?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_period?: string | null
          created_at?: string | null
          downgrade_date?: string | null
          expires_at?: string | null
          grace_period_end?: string | null
          id?: string
          is_paid_subscription?: boolean | null
          is_read_only?: boolean | null
          last_payment_date?: string | null
          next_billing_date?: string | null
          previous_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          price_paid?: number | null
          starts_at?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      creator_earnings: {
        Row: {
          code: string | null
          creator_email: string | null
          creator_name: string | null
          creator_user_id: string | null
          paid_commission: number | null
          pending_commission: number | null
          total_commission: number | null
          total_uses: number | null
        }
        Relationships: []
      }
      recent_user_activity: {
        Row: {
          avg_minutes_per_day: number | null
          email: string | null
          first_activity_date: string | null
          full_name: string | null
          last_activity_date: string | null
          total_materials: number | null
          total_minutes: number | null
          total_orders: number | null
          total_prints: number | null
          total_projects: number | null
          total_sessions: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_creator_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      apply_promo_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_daily_metrics: { Args: { p_date?: string }; Returns: Json }
      calculate_daily_metrics_range: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      check_subscription_limit: {
        Args: { _resource_type: string; _user_id: string }
        Returns: boolean
      }
      cleanup_old_activity_summaries: { Args: never; Returns: number }
      create_refund_request: {
        Args: {
          p_amount: number
          p_description: string
          p_invoice_id: string
          p_reason: string
          p_refund_type: string
          p_user_id: string
        }
        Returns: Json
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_subscription_limits: {
        Args: { _tier: Database["public"]["Enums"]["subscription_tier"] }
        Returns: {
          materials: number
          metrics_history: number
          monthly_orders: number
          projects: number
          shopping_lists: number
        }[]
      }
      get_unread_support_messages_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_tier: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_tier"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      mark_support_messages_as_read: {
        Args: { p_ticket_id: string; p_user_id: string }
        Returns: undefined
      }
      permanently_delete_expired_users: { Args: never; Returns: Json }
      restore_deleted_user: { Args: { p_user_id: string }; Returns: Json }
      schedule_user_deletion: {
        Args: { p_deleted_by: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      upsert_daily_activity: {
        Args: {
          p_activity_date: string
          p_materials_created?: number
          p_orders_created?: number
          p_prints_created?: number
          p_projects_created?: number
          p_session_minutes?: number
          p_user_id: string
        }
        Returns: undefined
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      validate_refund_request: {
        Args: { p_invoice_id: string; p_refund_type: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      subscription_tier: "free" | "tier_1" | "tier_2"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      app_role: ["admin", "user"],
      subscription_tier: ["free", "tier_1", "tier_2"],
    },
  },
} as const
