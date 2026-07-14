// Generated from the Drill Deck Supabase project (avygkafazentnxtdlaoh)
// after M6/M7 (standard accounts + teams + visibility). Regenerate after
// migrations: Supabase MCP generate_typescript_types.
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
      diagrams: {
        Row: {
          drill_id: string
          id: string
          scene: Json
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          drill_id: string
          id?: string
          scene: Json
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          drill_id?: string
          id?: string
          scene?: Json
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagrams_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagrams_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_categories: {
        Row: {
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      drill_category_links: {
        Row: {
          category_id: string
          drill_id: string
        }
        Insert: {
          category_id: string
          drill_id: string
        }
        Update: {
          category_id?: string
          drill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_category_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "drill_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drill_category_links_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_equipment: {
        Row: {
          drill_id: string
          equipment_id: string
        }
        Insert: {
          drill_id: string
          equipment_id: string
        }
        Update: {
          drill_id?: string
          equipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_equipment_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drill_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_skill_focuses: {
        Row: {
          drill_id: string
          skill_focus_id: string
        }
        Insert: {
          drill_id: string
          skill_focus_id: string
        }
        Update: {
          drill_id?: string
          skill_focus_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_skill_focuses_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drill_skill_focuses_skill_focus_id_fkey"
            columns: ["skill_focus_id"]
            isOneToOne: false
            referencedRelation: "skill_focuses"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_teams: {
        Row: {
          drill_id: string
          team_id: string
        }
        Insert: {
          drill_id: string
          team_id: string
        }
        Update: {
          drill_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_teams_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drill_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      drills: {
        Row: {
          archived_at: string | null
          category_id: string
          coaching_points: string
          created_at: string
          created_by: string
          description: string
          duration_minutes: number
          id: string
          intensity: string
          level: string
          max_players: number
          min_players: number
          name: string
          setup_instructions: string
          space_needed: string
          updated_at: string
          updated_by: string | null
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          category_id: string
          coaching_points?: string
          created_at?: string
          created_by: string
          description?: string
          duration_minutes?: number
          id?: string
          intensity?: string
          level?: string
          max_players?: number
          min_players?: number
          name: string
          setup_instructions?: string
          space_needed?: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string
          coaching_points?: string
          created_at?: string
          created_by?: string
          description?: string
          duration_minutes?: number
          id?: string
          intensity?: string
          level?: string
          max_players?: number
          min_players?: number
          name?: string
          setup_instructions?: string
          space_needed?: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "drills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "drill_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drills_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_types: {
        Row: {
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      health_check: {
        Row: {
          id: number
          note: string
          updated_at: string
        }
        Insert: {
          id: number
          note: string
          updated_at?: string
        }
        Update: {
          id?: number
          note?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      progression_groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          team_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          team_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progression_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_groups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      progression_items: {
        Row: {
          drill_id: string
          group_id: string
          position: number
        }
        Insert: {
          drill_id: string
          group_id: string
          position?: number
        }
        Update: {
          drill_id?: string
          group_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "progression_items_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "progression_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          note: string
          rating: number
          session_item_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          note?: string
          rating: number
          session_item_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          note?: string
          rating?: number
          session_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_session_item_id_fkey"
            columns: ["session_item_id"]
            isOneToOne: false
            referencedRelation: "session_items"
            referencedColumns: ["id"]
          },
        ]
      }
      session_items: {
        Row: {
          drill_id: string
          duration_minutes: number
          id: string
          phase: string | null
          session_id: string
          sort_order: number
        }
        Insert: {
          drill_id: string
          duration_minutes?: number
          id?: string
          phase?: string | null
          session_id: string
          sort_order?: number
        }
        Update: {
          drill_id?: string
          duration_minutes?: number
          id?: string
          phase?: string | null
          session_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_items_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string
          session_date: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string
          session_date?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string
          session_date?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_focuses: {
        Row: {
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      team_coaches: {
        Row: {
          profile_id: string
          role: string
          team_id: string
        }
        Insert: {
          profile_id: string
          role?: string
          team_id: string
        }
        Update: {
          profile_id?: string
          role?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_coaches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_coaches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invite_code: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_drill: { Args: { d: string }; Returns: boolean }
      can_edit_progression_group: { Args: { g: string }; Returns: boolean }
      can_edit_session: { Args: { s: string }; Returns: boolean }
      can_view_drill: { Args: { d: string }; Returns: boolean }
      can_view_progression_group: { Args: { g: string }; Returns: boolean }
      create_team: { Args: { team_name: string }; Returns: string }
      get_drill_rating_stats: {
        Args: never
        Returns: {
          avg_rating: number
          drill_id: string
          review_count: number
          team_count: number
        }[]
      }
      is_team_admin: { Args: { t: string }; Returns: boolean }
      is_team_coach: { Args: { t: string }; Returns: boolean }
      join_team_by_code: { Args: { code: string }; Returns: string }
      regenerate_team_code: { Args: { t: string }; Returns: string }
      set_drill_categories: {
        Args: { d: string; category_ids: string[] }
        Returns: undefined
      }
      set_drill_sharing: {
        Args: { d: string; team_ids: string[]; vis: string }
        Returns: undefined
      }
      set_drill_tags: {
        Args: { d: string; equipment_ids: string[]; skill_ids: string[] }
        Returns: undefined
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
