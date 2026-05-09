// Auto-generated from Supabase schema — do not edit manually.
// Regenerate with: supabase gen types typescript --project-id xinqsynjatdrfsrjgmxv

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          action_type: string
          target_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          action_type: string
          target_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          action_type?: string
          target_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      bot_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json[]
          property_id: string
          rejection_reason: string | null
          status: string
          track: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json[]
          property_id: string
          rejection_reason?: string | null
          status?: string
          track?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json[]
          property_id?: string
          rejection_reason?: string | null
          status?: string
          track?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          conversation_id: string | null
          id: string
          property_id: string
          revealed_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          property_id: string
          revealed_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          id?: string
          property_id?: string
          revealed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "bot_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          arnona: number
          category: string
          contact_hours: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          entry_date: string | null
          floor: number | null
          id: string
          location: unknown
          owner_id: string
          parking: boolean
          pets_allowed: boolean
          photos: string[]
          price: number
          rooms: number | null
          size_sqm: number | null
          status: string
          storage: boolean
          title: string
          updated_at: string
          vaad: number
        }
        Insert: {
          address: string
          arnona?: number
          category: string
          contact_hours?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          entry_date?: string | null
          floor?: number | null
          id?: string
          location?: unknown
          owner_id: string
          parking?: boolean
          pets_allowed?: boolean
          photos?: string[]
          price: number
          rooms?: number | null
          size_sqm?: number | null
          status?: string
          storage?: boolean
          title: string
          updated_at?: string
          vaad?: number
        }
        Update: {
          address?: string
          arnona?: number
          category?: string
          contact_hours?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          entry_date?: string | null
          floor?: number | null
          id?: string
          location?: unknown
          owner_id?: string
          parking?: boolean
          pets_allowed?: boolean
          photos?: string[]
          price?: number
          rooms?: number | null
          size_sqm?: number | null
          status?: string
          storage?: boolean
          title?: string
          updated_at?: string
          vaad?: number
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: number
          maintenance_mode: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          maintenance_mode?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          maintenance_mode?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      roommate_profiles: {
        Row: {
          age: number | null
          bio: string | null
          cleanliness: number | null
          created_at: string
          gender: string | null
          guests_policy: string | null
          has_pets: boolean
          id: string
          interests: string[]
          photos: string[]
          sleep_schedule: string | null
          smoking: boolean
          user_id: string
        }
        Insert: {
          age?: number | null
          bio?: string | null
          cleanliness?: number | null
          created_at?: string
          gender?: string | null
          guests_policy?: string | null
          has_pets?: boolean
          id?: string
          interests?: string[]
          photos?: string[]
          sleep_schedule?: string | null
          smoking?: boolean
          user_id: string
        }
        Update: {
          age?: number | null
          bio?: string | null
          cleanliness?: number | null
          created_at?: string
          gender?: string | null
          guests_policy?: string | null
          has_pets?: boolean
          id?: string
          interests?: string[]
          photos?: string[]
          sleep_schedule?: string | null
          smoking?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roommate_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      swipes: {
        Row: {
          direction: string
          id: string
          property_id: string
          swiped_at: string
          user_id: string
        }
        Insert: {
          direction: string
          id?: string
          property_id: string
          swiped_at?: string
          user_id: string
        }
        Update: {
          direction?: string
          id?: string
          property_id?: string
          swiped_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_banned: boolean
          name: string
          phone: string | null
          role: string
          search_preferences: Json | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_banned?: boolean
          name?: string
          phone?: string | null
          role?: string
          search_preferences?: Json | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_banned?: boolean
          name?: string
          phone?: string | null
          role?: string
          search_preferences?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      properties_in_polygon: {
        Args: { geojson: string; p_category?: string; p_status?: string }
        Returns: Database["public"]["Tables"]["properties"]["Row"][]
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ─── App-level convenience aliases ───────────────────────────────────────────

export type Property        = Database["public"]["Tables"]["properties"]["Row"]
export type PropertyInsert  = Database["public"]["Tables"]["properties"]["Insert"]
export type PropertyUpdate  = Database["public"]["Tables"]["properties"]["Update"]

export type AppUser         = Database["public"]["Tables"]["users"]["Row"]
export type AppUserInsert   = Database["public"]["Tables"]["users"]["Insert"]

export type Swipe           = Database["public"]["Tables"]["swipes"]["Row"]
export type SwipeInsert     = Database["public"]["Tables"]["swipes"]["Insert"]

export type BotConversation       = Database["public"]["Tables"]["bot_conversations"]["Row"]
export type BotConversationInsert = Database["public"]["Tables"]["bot_conversations"]["Insert"]

export type Lead            = Database["public"]["Tables"]["leads"]["Row"]
export type LeadInsert      = Database["public"]["Tables"]["leads"]["Insert"]

export type Favorite        = Database["public"]["Tables"]["favorites"]["Row"]
export type FavoriteInsert  = Database["public"]["Tables"]["favorites"]["Insert"]

export type RoommateProfile       = Database["public"]["Tables"]["roommate_profiles"]["Row"]
export type RoommateProfileInsert = Database["public"]["Tables"]["roommate_profiles"]["Insert"]

// Bot message shape stored inside bot_conversations.messages[]
export interface BotMessage {
  role:      "user" | "assistant"
  content:   string
  timestamp: string // ISO 8601
}

// Narrow role type for use throughout the app
export type UserRole = "owner" | "renter" | "both" | "admin"
export type PropertyCategory = "rental" | "sale" | "roommates"
export type PropertyStatus   = "active" | "paused" | "sold"
export type BotTrack         = "rental" | "sale" | "roommates"
export type BotStatus        = "in_progress" | "approved" | "rejected"
export type SwipeDirection   = "left" | "right"

// Yad2-style default search preferences stored as JSONB in users.search_preferences
export interface SearchPreferences {
  city?:      string   // free-text city or neighbourhood (e.g. "תל אביב")
  minPrice?:  number   // ₪
  maxPrice?:  number   // ₪
  minRooms?:  number   // 1 | 2 | 3 | 4
  parking?:   boolean
  elevator?:  boolean
  balcony?:   boolean
  renovated?: boolean
}
