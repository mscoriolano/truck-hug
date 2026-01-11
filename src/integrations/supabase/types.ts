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
      delivery_receipts: {
        Row: {
          created_at: string
          delivery_date: string
          driver_id: string
          driver_name: string
          files: string[] | null
          id: string
          notes: string | null
          recipient_name: string | null
          trip_id: string
          updated_at: string
          vehicle_plate: string
        }
        Insert: {
          created_at?: string
          delivery_date?: string
          driver_id: string
          driver_name: string
          files?: string[] | null
          id?: string
          notes?: string | null
          recipient_name?: string | null
          trip_id: string
          updated_at?: string
          vehicle_plate: string
        }
        Update: {
          created_at?: string
          delivery_date?: string
          driver_id?: string
          driver_name?: string
          files?: string[] | null
          id?: string
          notes?: string | null
          recipient_name?: string | null
          trip_id?: string
          updated_at?: string
          vehicle_plate?: string
        }
        Relationships: []
      }
      driver_expense_claims: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          description: string
          driver_id: string
          driver_name: string
          expense_date: string
          expense_type: string
          id: string
          receipts: string[] | null
          status: string
          trip_id: string | null
          updated_at: string
          vehicle_id: string | null
          vehicle_plate: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          description: string
          driver_id: string
          driver_name: string
          expense_date?: string
          expense_type: string
          id?: string
          receipts?: string[] | null
          status?: string
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          description?: string
          driver_id?: string
          driver_name?: string
          expense_date?: string
          expense_type?: string
          id?: string
          receipts?: string[] | null
          status?: string
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_plate?: string | null
        }
        Relationships: []
      }
      driver_maintenance_requests: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          description: string
          driver_id: string
          driver_name: string
          id: string
          photos: string[] | null
          status: string
          updated_at: string
          urgency: string
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          description: string
          driver_id: string
          driver_name: string
          id?: string
          photos?: string[] | null
          status?: string
          updated_at?: string
          urgency?: string
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          description?: string
          driver_id?: string
          driver_name?: string
          id?: string
          photos?: string[] | null
          status?: string
          updated_at?: string
          urgency?: string
          vehicle_id?: string
          vehicle_plate?: string
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
      driver_tire_reports: {
        Row: {
          condition: string
          created_at: string
          description: string | null
          driver_id: string
          driver_name: string
          id: string
          photos: string[] | null
          tire_position: string
          updated_at: string
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          condition: string
          created_at?: string
          description?: string | null
          driver_id: string
          driver_name: string
          id?: string
          photos?: string[] | null
          tire_position: string
          updated_at?: string
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          condition?: string
          created_at?: string
          description?: string | null
          driver_id?: string
          driver_name?: string
          id?: string
          photos?: string[] | null
          tire_position?: string
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          ac: string | null
          avatar: string | null
          cnh_category: string | null
          cnh_expiry: string | null
          created_at: string
          current_vehicle: string | null
          id: string
          journey_start: string | null
          license: string
          name: string
          phone: string
          r3: string | null
          status: string
          total_hours_today: number | null
          updated_at: string
        }
        Insert: {
          ac?: string | null
          avatar?: string | null
          cnh_category?: string | null
          cnh_expiry?: string | null
          created_at?: string
          current_vehicle?: string | null
          id?: string
          journey_start?: string | null
          license: string
          name: string
          phone: string
          r3?: string | null
          status?: string
          total_hours_today?: number | null
          updated_at?: string
        }
        Update: {
          ac?: string | null
          avatar?: string | null
          cnh_category?: string | null
          cnh_expiry?: string | null
          created_at?: string
          current_vehicle?: string | null
          id?: string
          journey_start?: string | null
          license?: string
          name?: string
          phone?: string
          r3?: string | null
          status?: string
          total_hours_today?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
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
      monthly_costs: {
        Row: {
          amount: number
          category_id: string | null
          category_name: string
          cost_type: string
          created_at: string
          id: string
          month: number
          notes: string | null
          updated_at: string
          year: number
        }
        Insert: {
          amount?: number
          category_id?: string | null
          category_name: string
          cost_type: string
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          category_id?: string | null
          category_name?: string
          cost_type?: string
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_costs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_performance: {
        Row: {
          accumulated_result: number
          availability_percentage: number | null
          average_freight_per_ton: number
          cost_avoided: number
          created_at: string
          external_freight_cost: number
          fixed_cost: number
          id: string
          invoiced_weight: number
          month: number
          notes: string | null
          result: number
          target_compliance_percentage: number | null
          total_insourcing_cost: number
          updated_at: string
          variable_cost: number
          year: number
        }
        Insert: {
          accumulated_result?: number
          availability_percentage?: number | null
          average_freight_per_ton?: number
          cost_avoided?: number
          created_at?: string
          external_freight_cost?: number
          fixed_cost?: number
          id?: string
          invoiced_weight?: number
          month: number
          notes?: string | null
          result?: number
          target_compliance_percentage?: number | null
          total_insourcing_cost?: number
          updated_at?: string
          variable_cost?: number
          year: number
        }
        Update: {
          accumulated_result?: number
          availability_percentage?: number | null
          average_freight_per_ton?: number
          cost_avoided?: number
          created_at?: string
          external_freight_cost?: number
          fixed_cost?: number
          id?: string
          invoiced_weight?: number
          month?: number
          notes?: string | null
          result?: number
          target_compliance_percentage?: number | null
          total_insourcing_cost?: number
          updated_at?: string
          variable_cost?: number
          year?: number
        }
        Relationships: []
      }
      operational_phases: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string
          target_availability: number | null
          target_cost_per_ton: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          target_availability?: number | null
          target_cost_per_ton?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          target_availability?: number | null
          target_cost_per_ton?: number | null
          updated_at?: string
        }
        Relationships: []
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
          good_tread_depth: number | null
          id: string
          install_date: string
          install_mileage: number
          last_inspection: string
          max_mileage: number
          min_tread_depth: number | null
          model: string
          position: string
          status: string
          tread_depth: number | null
          updated_at: string
          vehicle_id: string
          vehicle_plate: string
          warning_tread_depth: number | null
        }
        Insert: {
          brand: string
          created_at?: string
          current_mileage: number
          good_tread_depth?: number | null
          id?: string
          install_date: string
          install_mileage: number
          last_inspection?: string
          max_mileage: number
          min_tread_depth?: number | null
          model: string
          position: string
          status?: string
          tread_depth?: number | null
          updated_at?: string
          vehicle_id: string
          vehicle_plate: string
          warning_tread_depth?: number | null
        }
        Update: {
          brand?: string
          created_at?: string
          current_mileage?: number
          good_tread_depth?: number | null
          id?: string
          install_date?: string
          install_mileage?: number
          last_inspection?: string
          max_mileage?: number
          min_tread_depth?: number | null
          model?: string
          position?: string
          status?: string
          tread_depth?: number | null
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
          warning_tread_depth?: number | null
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
      trips: {
        Row: {
          created_at: string
          cycle_value: number
          departure_date: string
          driver_id: string
          driver_name: string
          id: string
          notes: string | null
          trip_type: string
          updated_at: string
          vehicle_id: string
          vehicle_plate: string
          weight: number
        }
        Insert: {
          created_at?: string
          cycle_value?: number
          departure_date: string
          driver_id: string
          driver_name: string
          id?: string
          notes?: string | null
          trip_type: string
          updated_at?: string
          vehicle_id: string
          vehicle_plate: string
          weight?: number
        }
        Update: {
          created_at?: string
          cycle_value?: number
          departure_date?: string
          driver_id?: string
          driver_name?: string
          id?: string
          notes?: string | null
          trip_type?: string
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string
          consumption_target: number | null
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
          consumption_target?: number | null
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
          consumption_target?: number | null
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
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "viewer" | "driver"
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
      app_role: ["admin", "manager", "viewer", "driver"],
    },
  },
} as const
