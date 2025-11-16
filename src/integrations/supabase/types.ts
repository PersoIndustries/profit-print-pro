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
      catalog_products: {
        Row: {
          catalog_project_id: string
          created_at: string | null
          dimensions: string | null
          id: string
          name: string
          price: number
          reference_code: string
          updated_at: string | null
        }
        Insert: {
          catalog_project_id: string
          created_at?: string | null
          dimensions?: string | null
          id?: string
          name: string
          price: number
          reference_code: string
          updated_at?: string | null
        }
        Update: {
          catalog_project_id?: string
          created_at?: string | null
          dimensions?: string | null
          id?: string
          name?: string
          price?: number
          reference_code?: string
          updated_at?: string | null
        }
        Relationships: [
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
          colors: Json | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          catalog_id: string
          colors?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          catalog_id?: string
          colors?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
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
            foreignKeyName: "catalog_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
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
          subscription_id: string | null
          tier: string | null
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
          subscription_id?: string | null
          tier?: string | null
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
          subscription_id?: string | null
          tier?: string | null
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
      profiles: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
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
          expires_at: string | null
          id: string
          last_payment_date: string | null
          next_billing_date: string | null
          price_paid: number | null
          starts_at: string
          status: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_period?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_payment_date?: string | null
          next_billing_date?: string | null
          price_paid?: number | null
          starts_at?: string
          status?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_period?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_payment_date?: string | null
          next_billing_date?: string | null
          price_paid?: number | null
          starts_at?: string
          status?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_subscription_limit: {
        Args: { _resource_type: string; _user_id: string }
        Returns: boolean
      }
      generate_invoice_number: { Args: never; Returns: string }
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
    }
    Enums: {
      app_role: "admin" | "user"
      subscription_tier: "free" | "tier_1" | "tier_2"
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
      app_role: ["admin", "user"],
      subscription_tier: ["free", "tier_1", "tier_2"],
    },
  },
} as const
