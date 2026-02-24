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
      driver_goals: {
        Row: {
          achieved: boolean
          bonus_amount: number
          created_at: string
          driver_id: string
          driver_name: string
          id: string
          month: number
          target_consumption: number
          target_km: number
          target_score: number
          target_speed_violations: number
          updated_at: string
          year: number
        }
        Insert: {
          achieved?: boolean
          bonus_amount?: number
          created_at?: string
          driver_id: string
          driver_name: string
          id?: string
          month: number
          target_consumption?: number
          target_km?: number
          target_score?: number
          target_speed_violations?: number
          updated_at?: string
          year: number
        }
        Update: {
          achieved?: boolean
          bonus_amount?: number
          created_at?: string
          driver_id?: string
          driver_name?: string
          id?: string
          month?: number
          target_consumption?: number
          target_km?: number
          target_score?: number
          target_speed_violations?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_goals_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_journey: {
        Row: {
          created_at: string
          driver_id: string | null
          driver_name: string
          event_timestamp: string
          event_type: string
          id: string
          latitude: number | null
          longitude: number | null
          mileage: number | null
          raw_data: Json | null
          source: string | null
          tfr_id: string | null
          vehicle_id: string | null
          vehicle_plate: string | null
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          driver_name: string
          event_timestamp?: string
          event_type: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          mileage?: number | null
          raw_data?: Json | null
          source?: string | null
          tfr_id?: string | null
          vehicle_id?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          driver_name?: string
          event_timestamp?: string
          event_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          mileage?: number | null
          raw_data?: Json | null
          source?: string | null
          tfr_id?: string | null
          vehicle_id?: string | null
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_journey_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_journey_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_journey_compliance: {
        Row: {
          break_end: string | null
          break_start: string | null
          created_at: string
          driver_id: string
          driver_name: string
          id: string
          inter_journey_rest_minutes: number | null
          is_inter_journey_compliant: boolean | null
          is_overtime_compliant: boolean | null
          is_weekly_rest_compliant: boolean | null
          journey_date: string
          journey_end: string | null
          journey_start: string | null
          notes: string | null
          overtime_minutes: number | null
          source: string | null
          total_break_minutes: number | null
          total_worked_minutes: number | null
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          driver_id: string
          driver_name: string
          id?: string
          inter_journey_rest_minutes?: number | null
          is_inter_journey_compliant?: boolean | null
          is_overtime_compliant?: boolean | null
          is_weekly_rest_compliant?: boolean | null
          journey_date: string
          journey_end?: string | null
          journey_start?: string | null
          notes?: string | null
          overtime_minutes?: number | null
          source?: string | null
          total_break_minutes?: number | null
          total_worked_minutes?: number | null
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          driver_id?: string
          driver_name?: string
          id?: string
          inter_journey_rest_minutes?: number | null
          is_inter_journey_compliant?: boolean | null
          is_overtime_compliant?: boolean | null
          is_weekly_rest_compliant?: boolean | null
          journey_date?: string
          journey_end?: string | null
          journey_start?: string | null
          notes?: string | null
          overtime_minutes?: number | null
          source?: string | null
          total_break_minutes?: number | null
          total_worked_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_journey_compliance_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_journey_events: {
        Row: {
          created_at: string
          driver_id: string
          driver_name: string
          event_timestamp: string
          event_type: string
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          macro_code: string | null
          mileage: number | null
          raw_data: Json | null
          source: string | null
          vehicle_id: string | null
          vehicle_plate: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          driver_name: string
          event_timestamp?: string
          event_type: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          macro_code?: string | null
          mileage?: number | null
          raw_data?: Json | null
          source?: string | null
          vehicle_id?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          driver_name?: string
          event_timestamp?: string
          event_type?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          macro_code?: string | null
          mileage?: number | null
          raw_data?: Json | null
          source?: string | null
          vehicle_id?: string | null
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_journey_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_journey_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
      driver_vehicle_assignments: {
        Row: {
          assignment_code: string | null
          created_at: string
          driver_id: string
          driver_name: string
          end_time: string | null
          id: string
          is_active: boolean | null
          start_time: string
          trip_id: string | null
          updated_at: string
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          assignment_code?: string | null
          created_at?: string
          driver_id: string
          driver_name: string
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string
          trip_id?: string | null
          updated_at?: string
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          assignment_code?: string | null
          created_at?: string
          driver_id?: string
          driver_name?: string
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicle_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_assignments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          ac: string | null
          allowed_journey_end: string | null
          allowed_journey_start: string | null
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
          truckscontrol_id: string | null
          updated_at: string
        }
        Insert: {
          ac?: string | null
          allowed_journey_end?: string | null
          allowed_journey_start?: string | null
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
          truckscontrol_id?: string | null
          updated_at?: string
        }
        Update: {
          ac?: string | null
          allowed_journey_end?: string | null
          allowed_journey_start?: string | null
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
          truckscontrol_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      driving_behavior_events: {
        Row: {
          battery_level: number | null
          created_at: string
          details: Json | null
          driver_id: string | null
          driver_name: string | null
          event_timestamp: string
          event_type: string
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          rpm: number | null
          severity: string
          speed: number | null
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          details?: Json | null
          driver_id?: string | null
          driver_name?: string | null
          event_timestamp?: string
          event_type: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          rpm?: number | null
          severity?: string
          speed?: number | null
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          details?: Json | null
          driver_id?: string | null
          driver_name?: string | null
          event_timestamp?: string
          event_type?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          rpm?: number | null
          severity?: string
          speed?: number | null
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "driving_behavior_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_behavior_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
      geofence_zones: {
        Row: {
          alert_on_enter: boolean | null
          alert_on_exit: boolean | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          radius_meters: number
          updated_at: string
          zone_type: string
        }
        Insert: {
          alert_on_enter?: boolean | null
          alert_on_exit?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          radius_meters?: number
          updated_at?: string
          zone_type?: string
        }
        Update: {
          alert_on_enter?: boolean | null
          alert_on_exit?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          radius_meters?: number
          updated_at?: string
          zone_type?: string
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
      journey_legal_settings: {
        Row: {
          alert_enabled: boolean | null
          alert_overtime_warning_minutes: number | null
          created_at: string
          id: string
          macro_break_end: string | null
          macro_break_start: string | null
          macro_journey_end: string | null
          macro_journey_start: string | null
          max_consecutive_work_days: number | null
          max_daily_hours: number | null
          max_overtime_hours: number | null
          min_inter_journey_hours: number | null
          min_weekly_rest_hours: number | null
          updated_at: string
        }
        Insert: {
          alert_enabled?: boolean | null
          alert_overtime_warning_minutes?: number | null
          created_at?: string
          id?: string
          macro_break_end?: string | null
          macro_break_start?: string | null
          macro_journey_end?: string | null
          macro_journey_start?: string | null
          max_consecutive_work_days?: number | null
          max_daily_hours?: number | null
          max_overtime_hours?: number | null
          min_inter_journey_hours?: number | null
          min_weekly_rest_hours?: number | null
          updated_at?: string
        }
        Update: {
          alert_enabled?: boolean | null
          alert_overtime_warning_minutes?: number | null
          created_at?: string
          id?: string
          macro_break_end?: string | null
          macro_break_start?: string | null
          macro_journey_end?: string | null
          macro_journey_start?: string | null
          max_consecutive_work_days?: number | null
          max_daily_hours?: number | null
          max_overtime_hours?: number | null
          min_inter_journey_hours?: number | null
          min_weekly_rest_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_costs: {
        Row: {
          amount: number
          cost_date: string
          cost_type: string
          created_at: string
          description: string
          id: string
          invoice_number: string | null
          notes: string | null
          supplier: string | null
          updated_at: string
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          amount?: number
          cost_date?: string
          cost_type: string
          created_at?: string
          description: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          supplier?: string | null
          updated_at?: string
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          amount?: number
          cost_date?: string
          cost_type?: string
          created_at?: string
          description?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          supplier?: string | null
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_costs_vehicle_id_fkey"
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
      offline_journey_queue: {
        Row: {
          created_at: string
          driver_id: string
          event_timestamp: string
          event_type: string
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          mileage: number | null
          sync_error: string | null
          synced: boolean | null
          synced_at: string | null
          vehicle_id: string | null
          vehicle_plate: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          event_timestamp: string
          event_type: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mileage?: number | null
          sync_error?: string | null
          synced?: boolean | null
          synced_at?: string | null
          vehicle_id?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          event_timestamp?: string
          event_type?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mileage?: number | null
          sync_error?: string | null
          synced?: boolean | null
          synced_at?: string | null
          vehicle_id?: string | null
          vehicle_plate?: string | null
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
      telemetry_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          driver_id: string | null
          driver_name: string | null
          event_timestamp: string
          g_force: number | null
          id: string
          idle_duration: number | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          message: string
          severity: string
          speed: number | null
          speed_limit: number | null
          title: string
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          event_timestamp?: string
          g_force?: number | null
          id?: string
          idle_duration?: number | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          message: string
          severity: string
          speed?: number | null
          speed_limit?: number | null
          title: string
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          event_timestamp?: string
          g_force?: number | null
          id?: string
          idle_duration?: number | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          message?: string
          severity?: string
          speed?: number | null
          speed_limit?: number | null
          title?: string
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_history: {
        Row: {
          created_at: string
          driver_id: string | null
          driver_name: string | null
          event_severity: string | null
          event_type: string | null
          g_force_x: number | null
          g_force_y: number | null
          g_force_z: number | null
          gps_timestamp: string | null
          heading: number | null
          id: string
          ignition_on: boolean | null
          latitude: number | null
          longitude: number | null
          speed: number | null
          trip_id: string | null
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          event_severity?: string | null
          event_type?: string | null
          g_force_x?: number | null
          g_force_y?: number | null
          g_force_z?: number | null
          gps_timestamp?: string | null
          heading?: number | null
          id?: string
          ignition_on?: boolean | null
          latitude?: number | null
          longitude?: number | null
          speed?: number | null
          trip_id?: string | null
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          event_severity?: string | null
          event_type?: string | null
          g_force_x?: number | null
          g_force_y?: number | null
          g_force_z?: number | null
          gps_timestamp?: string | null
          heading?: number | null
          id?: string
          ignition_on?: boolean | null
          latitude?: number | null
          longitude?: number | null
          speed?: number | null
          trip_id?: string | null
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_settings: {
        Row: {
          created_at: string
          expected_consumption: number | null
          hard_accel_threshold: number | null
          hard_brake_threshold: number | null
          hard_turn_threshold: number | null
          id: string
          idle_critical_minutes: number | null
          idle_warning_minutes: number | null
          last_error_debug: Json | null
          operation_end_time: string | null
          operation_start_time: string | null
          speed_limit_highway: number | null
          speed_limit_urban: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_consumption?: number | null
          hard_accel_threshold?: number | null
          hard_brake_threshold?: number | null
          hard_turn_threshold?: number | null
          id?: string
          idle_critical_minutes?: number | null
          idle_warning_minutes?: number | null
          last_error_debug?: Json | null
          operation_end_time?: string | null
          operation_start_time?: string | null
          speed_limit_highway?: number | null
          speed_limit_urban?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_consumption?: number | null
          hard_accel_threshold?: number | null
          hard_brake_threshold?: number | null
          hard_turn_threshold?: number | null
          id?: string
          idle_critical_minutes?: number | null
          idle_warning_minutes?: number | null
          last_error_debug?: Json | null
          operation_end_time?: string | null
          operation_start_time?: string | null
          speed_limit_highway?: number | null
          speed_limit_urban?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tire_management: {
        Row: {
          brand: string
          created_at: string
          current_mileage: number
          id: string
          install_date: string
          install_mileage: number
          last_inspection: string | null
          max_mileage: number
          min_tread_depth: number | null
          model: string
          notes: string | null
          position: string
          recapped_count: number | null
          serial_number: string | null
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
          current_mileage?: number
          id?: string
          install_date?: string
          install_mileage?: number
          last_inspection?: string | null
          max_mileage?: number
          min_tread_depth?: number | null
          model: string
          notes?: string | null
          position: string
          recapped_count?: number | null
          serial_number?: string | null
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
          id?: string
          install_date?: string
          install_mileage?: number
          last_inspection?: string | null
          max_mileage?: number
          min_tread_depth?: number | null
          model?: string
          notes?: string | null
          position?: string
          recapped_count?: number | null
          serial_number?: string | null
          status?: string
          tread_depth?: number | null
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
          warning_tread_depth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tire_management_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
      trip_statistics: {
        Row: {
          avg_consumption_km_per_liter: number | null
          avg_speed: number | null
          created_at: string
          driver_id: string | null
          driver_name: string | null
          driving_score: number | null
          end_time: string | null
          fuel_consumed_liters: number | null
          hard_accels_count: number | null
          hard_brakes_count: number | null
          hard_turns_count: number | null
          id: string
          max_speed: number | null
          start_time: string
          time_over_speed_limit_minutes: number | null
          total_distance_km: number | null
          total_idle_time_minutes: number | null
          total_stops: number | null
          trip_id: string | null
          updated_at: string
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          avg_consumption_km_per_liter?: number | null
          avg_speed?: number | null
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          driving_score?: number | null
          end_time?: string | null
          fuel_consumed_liters?: number | null
          hard_accels_count?: number | null
          hard_brakes_count?: number | null
          hard_turns_count?: number | null
          id?: string
          max_speed?: number | null
          start_time: string
          time_over_speed_limit_minutes?: number | null
          total_distance_km?: number | null
          total_idle_time_minutes?: number | null
          total_stops?: number | null
          trip_id?: string | null
          updated_at?: string
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          avg_consumption_km_per_liter?: number | null
          avg_speed?: number | null
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          driving_score?: number | null
          end_time?: string | null
          fuel_consumed_liters?: number | null
          hard_accels_count?: number | null
          hard_brakes_count?: number | null
          hard_turns_count?: number | null
          id?: string
          max_speed?: number | null
          start_time?: string
          time_over_speed_limit_minutes?: number | null
          total_distance_km?: number | null
          total_idle_time_minutes?: number | null
          total_stops?: number | null
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_statistics_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_statistics_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_statistics_vehicle_id_fkey"
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
      vehicle_can_data: {
        Row: {
          created_at: string
          data_timestamp: string
          driver_id: string | null
          driver_name: string | null
          fuel_level: number | null
          g_force_x: number | null
          g_force_y: number | null
          g_force_z: number | null
          harsh_acceleration: boolean | null
          harsh_braking: boolean | null
          harsh_cornering: boolean | null
          id: string
          odometer: number | null
          raw_data: Json | null
          rpm: number | null
          rpm_violation: boolean | null
          speed: number | null
          speed_violation: boolean | null
          total_time_minutes: number | null
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          created_at?: string
          data_timestamp?: string
          driver_id?: string | null
          driver_name?: string | null
          fuel_level?: number | null
          g_force_x?: number | null
          g_force_y?: number | null
          g_force_z?: number | null
          harsh_acceleration?: boolean | null
          harsh_braking?: boolean | null
          harsh_cornering?: boolean | null
          id?: string
          odometer?: number | null
          raw_data?: Json | null
          rpm?: number | null
          rpm_violation?: boolean | null
          speed?: number | null
          speed_violation?: boolean | null
          total_time_minutes?: number | null
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          created_at?: string
          data_timestamp?: string
          driver_id?: string | null
          driver_name?: string | null
          fuel_level?: number | null
          g_force_x?: number | null
          g_force_y?: number | null
          g_force_z?: number | null
          harsh_acceleration?: boolean | null
          harsh_braking?: boolean | null
          harsh_cornering?: boolean | null
          id?: string
          odometer?: number | null
          raw_data?: Json | null
          rpm?: number | null
          rpm_violation?: boolean | null
          speed?: number | null
          speed_violation?: boolean | null
          total_time_minutes?: number | null
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_can_data_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_can_data_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_telemetry: {
        Row: {
          battery_level: number | null
          created_at: string
          engine_hours: number | null
          events: Json | null
          fuel_level: number | null
          g_force_x: number | null
          g_force_y: number | null
          g_force_z: number | null
          gps_timestamp: string | null
          heading: number | null
          id: string
          ignition_on: boolean | null
          last_mld: number | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          municipality: string | null
          odometer: number | null
          received_at: string
          rpm: number | null
          speed: number | null
          state: string | null
          truckscontrol_id: string | null
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          engine_hours?: number | null
          events?: Json | null
          fuel_level?: number | null
          g_force_x?: number | null
          g_force_y?: number | null
          g_force_z?: number | null
          gps_timestamp?: string | null
          heading?: number | null
          id?: string
          ignition_on?: boolean | null
          last_mld?: number | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          municipality?: string | null
          odometer?: number | null
          received_at?: string
          rpm?: number | null
          speed?: number | null
          state?: string | null
          truckscontrol_id?: string | null
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          engine_hours?: number | null
          events?: Json | null
          fuel_level?: number | null
          g_force_x?: number | null
          g_force_y?: number | null
          g_force_z?: number | null
          gps_timestamp?: string | null
          heading?: number | null
          id?: string
          ignition_on?: boolean | null
          last_mld?: number | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          municipality?: string | null
          odometer?: number | null
          received_at?: string
          rpm?: number | null
          speed?: number | null
          state?: string | null
          truckscontrol_id?: string | null
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_telemetry_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
          truckscontrol_id: string | null
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
          truckscontrol_id?: string | null
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
          truckscontrol_id?: string | null
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
