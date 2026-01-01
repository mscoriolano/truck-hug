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
      alerts: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          severity: string
          timestamp: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          severity: string
          timestamp?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          severity?: string
          timestamp?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      driver_scores: {
        Row: {
          avg_consumption: number | null
          corrective_maintenances: number | null
          created_at: string
          driver_id: string
          driver_name: string
          fuel_efficiency_score: number | null
          id: string
          journey_compliance_score: number | null
          journey_violations: number | null
          maintenance_score: number | null
          period_end: string
          period_start: string
          speed_compliance_score: number | null
          speed_violations: number | null
          tire_care_score: number | null
          tire_incidents: number | null
          total_km: number | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          avg_consumption?: number | null
          corrective_maintenances?: number | null
          created_at?: string
          driver_id: string
          driver_name: string
          fuel_efficiency_score?: number | null
          id?: string
          journey_compliance_score?: number | null
          journey_violations?: number | null
          maintenance_score?: number | null
          period_end: string
          period_start: string
          speed_compliance_score?: number | null
          speed_violations?: number | null
          tire_care_score?: number | null
          tire_incidents?: number | null
          total_km?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          avg_consumption?: number | null
          corrective_maintenances?: number | null
          created_at?: string
          driver_id?: string
          driver_name?: string
          fuel_efficiency_score?: number | null
          id?: string
          journey_compliance_score?: number | null
          journey_violations?: number | null
          maintenance_score?: number | null
          period_end?: string
          period_start?: string
          speed_compliance_score?: number | null
          speed_violations?: number | null
          tire_care_score?: number | null
          tire_incidents?: number | null
          total_km?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          avatar: string | null
          created_at: string
          current_vehicle: string | null
          id: string
          journey_start: string | null
          license: string
          name: string
          phone: string
          status: string
          total_hours_today: number | null
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          current_vehicle?: string | null
          id?: string
          journey_start?: string | null
          license: string
          name: string
          phone: string
          status?: string
          total_hours_today?: number | null
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          current_vehicle?: string | null
          id?: string
          journey_start?: string | null
          license?: string
          name?: string
          phone?: string
          status?: string
          total_hours_today?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      fuel_entries: {
        Row: {
          created_at: string
          driver_id: string
          driver_name: string
          entry_date: string
          fuel_type: string
          id: string
          liters: number
          mileage: number
          notes: string | null
          price_per_liter: number
          station: string | null
          total_cost: number
          updated_at: string
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          driver_name: string
          entry_date?: string
          fuel_type?: string
          id?: string
          liters: number
          mileage: number
          notes?: string | null
          price_per_liter: number
          station?: string | null
          total_cost: number
          updated_at?: string
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          driver_name?: string
          entry_date?: string
          fuel_type?: string
          id?: string
          liters?: number
          mileage?: number
          notes?: string | null
          price_per_liter?: number
          station?: string | null
          total_cost?: number
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: []
      }
      journey_entries: {
        Row: {
          created_at: string
          driver_id: string
          driver_name: string
          id: string
          location: string | null
          mileage: number | null
          timestamp: string
          type: string
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          driver_name: string
          id?: string
          location?: string | null
          mileage?: number | null
          timestamp?: string
          type: string
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          driver_name?: string
          id?: string
          location?: string | null
          mileage?: number | null
          timestamp?: string
          type?: string
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_entries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenances: {
        Row: {
          category: string
          completed_date: string | null
          cost: number | null
          created_at: string
          description: string
          id: string
          notes: string | null
          scheduled_date: string
          status: string
          type: string
          updated_at: string
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          category: string
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          scheduled_date: string
          status?: string
          type: string
          updated_at?: string
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          category?: string
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          status?: string
          type?: string
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tires: {
        Row: {
          brand: string
          created_at: string
          current_mileage: number
          id: string
          install_date: string
          install_mileage: number
          last_inspection: string
          max_mileage: number
          model: string
          position: string
          status: string
          updated_at: string
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          brand: string
          created_at?: string
          current_mileage: number
          id?: string
          install_date: string
          install_mileage: number
          last_inspection?: string
          max_mileage: number
          model: string
          position: string
          status?: string
          updated_at?: string
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          brand?: string
          created_at?: string
          current_mileage?: number
          id?: string
          install_date?: string
          install_mileage?: number
          last_inspection?: string
          max_mileage?: number
          model?: string
          position?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "tires_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          created_at: string
          fuel_type: string
          id: string
          mileage: number
          model: string
          next_maintenance: string
          plate: string
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          brand: string
          created_at?: string
          fuel_type?: string
          id?: string
          mileage?: number
          model: string
          next_maintenance: string
          plate: string
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          brand?: string
          created_at?: string
          fuel_type?: string
          id?: string
          mileage?: number
          model?: string
          next_maintenance?: string
          plate?: string
          status?: string
          updated_at?: string
          year?: number
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
