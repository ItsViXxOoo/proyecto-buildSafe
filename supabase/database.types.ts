export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      build_compatibility_results: {
        Row: {
          build_id: string
          checked_at: string
          id: string
          message: string
          rule_id: string | null
          severity: string
        }
        Insert: {
          build_id: string
          checked_at?: string
          id?: string
          message: string
          rule_id?: string | null
          severity: string
        }
        Update: {
          build_id?: string
          checked_at?: string
          id?: string
          message?: string
          rule_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_compatibility_results_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
        ]
      }
      build_components: {
        Row: {
          build_id: string
          component_id: string
          component_type_id: string
          created_at: string
          id: string
          price_snapshot: number | null
          quantity: number
        }
        Insert: {
          build_id: string
          component_id: string
          component_type_id: string
          created_at?: string
          id?: string
          price_snapshot?: number | null
          quantity?: number
        }
        Update: {
          build_id?: string
          component_id?: string
          component_type_id?: string
          created_at?: string
          id?: string
          price_snapshot?: number | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "build_components_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_components_component_type_id_fkey"
            columns: ["component_type_id"]
            isOneToOne: false
            referencedRelation: "component_types"
            referencedColumns: ["id"]
          },
        ]
      }
      builds: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "builds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compatibility_rules: {
        Row: {
          attribute_a: string
          attribute_b: string | null
          created_at: string
          id: string
          is_active: boolean
          message: string
          operator: string
          severity: string
          type_a: string
          type_b: string | null
          value: Json | null
        }
        Insert: {
          attribute_a: string
          attribute_b?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          operator: string
          severity?: string
          type_a: string
          type_b?: string | null
          value?: Json | null
        }
        Update: {
          attribute_a?: string
          attribute_b?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          operator?: string
          severity?: string
          type_a?: string
          type_b?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "compatibility_rules_type_a_fkey"
            columns: ["type_a"]
            isOneToOne: false
            referencedRelation: "component_types"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "compatibility_rules_type_b_fkey"
            columns: ["type_b"]
            isOneToOne: false
            referencedRelation: "component_types"
            referencedColumns: ["slug"]
          },
        ]
      }
      component_types: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      components: {
        Row: {
          brand: string | null
          capacity_gb: number | null
          chipset: string | null
          cooler_height_mm: number | null
          created_at: string
          current_price: number | null
          form_factor: string | null
          gpu_len_mm: number | null
          id: string
          image_url: string | null
          interface: string | null
          is_active: boolean
          max_cooler_height_mm: number | null
          max_gpu_len_mm: number | null
          name: string
          price_currency: string
          psu_watts: number | null
          ram_type: string | null
          search_vector: unknown
          socket: string | null
          specs: Json | null
          speed_mts: number | null
          supported_form_factors: string[] | null
          tdp_w: number | null
          type_id: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          capacity_gb?: number | null
          chipset?: string | null
          cooler_height_mm?: number | null
          created_at?: string
          current_price?: number | null
          form_factor?: string | null
          gpu_len_mm?: number | null
          id?: string
          image_url?: string | null
          interface?: string | null
          is_active?: boolean
          max_cooler_height_mm?: number | null
          max_gpu_len_mm?: number | null
          name: string
          price_currency?: string
          psu_watts?: number | null
          ram_type?: string | null
          search_vector?: unknown
          socket?: string | null
          specs?: Json | null
          speed_mts?: number | null
          supported_form_factors?: string[] | null
          tdp_w?: number | null
          type_id: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          capacity_gb?: number | null
          chipset?: string | null
          cooler_height_mm?: number | null
          created_at?: string
          current_price?: number | null
          form_factor?: string | null
          gpu_len_mm?: number | null
          id?: string
          image_url?: string | null
          interface?: string | null
          is_active?: boolean
          max_cooler_height_mm?: number | null
          max_gpu_len_mm?: number | null
          name?: string
          price_currency?: string
          psu_watts?: number | null
          ram_type?: string | null
          search_vector?: unknown
          socket?: string | null
          specs?: Json | null
          speed_mts?: number | null
          supported_form_factors?: string[] | null
          tdp_w?: number | null
          type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "components_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "component_types"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          component_id: string
          currency: string
          id: string
          price: number
          recorded_at: string
          source: string | null
        }
        Insert: {
          component_id: string
          currency?: string
          id?: string
          price: number
          recorded_at?: string
          source?: string | null
        }
        Update: {
          component_id?: string
          currency?: string
          id?: string
          price?: number
          recorded_at?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          created_at: string
          full_name: string | null
          id: string
          preferences: Json
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          preferences?: Json
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          preferences?: Json
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_build_compatibility: {
        Args: { p_build_id: string }
        Returns: {
          message: string
          rule_id: string
          severity: string
        }[]
      }
      is_build_owner: { Args: { p_build_id: string }; Returns: boolean }
      is_build_visible: { Args: { p_build_id: string }; Returns: boolean }
      save_build_compatibility_results: {
        Args: { p_build_id: string }
        Returns: {
          build_id: string
          checked_at: string
          id: string
          message: string
          rule_id: string | null
          severity: string
        }[]
        SetofOptions: {
          from: "*"
          to: "build_compatibility_results"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      user_role: "user" | "admin" | "mod"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">]

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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    | keyof DatabaseWithoutInternals["public"]["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DatabaseWithoutInternals["public"]["Enums"]
    ? DatabaseWithoutInternals["public"]["Enums"][DefaultSchemaEnumNameOrOptions]
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
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["user", "admin", "mod"],
    },
  },
} as const
