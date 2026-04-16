/**
 * Supabase `public` 스키마 타입 (RLS 적용 테이블)
 * 프로덕션에서는 `supabase gen types typescript` 로 재생성 권장 → 이 파일을 대체하거나 병합
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          organization_id: string | null;
          created_by: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          organization_id?: string | null;
          created_by: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          organization_id?: string | null;
          created_by?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "Admin" | "Manager" | "Member" | "Viewer";
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: "Admin" | "Manager" | "Member" | "Viewer";
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: "Admin" | "Manager" | "Member" | "Viewer";
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string;
          type: "normal" | "auction" | "meeting" | "deadline";
          location: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          notify_on_dday?: boolean | null;
          dday_email_sent_on?: string | null;
          remind_days_before?: number | null;
          remind_minutes_before?: number | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          start_time: string;
          end_time: string;
          type: "normal" | "auction" | "meeting" | "deadline";
          location?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          notify_on_dday?: boolean | null;
          dday_email_sent_on?: string | null;
          remind_days_before?: number | null;
          remind_minutes_before?: number | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string;
          type?: "normal" | "auction" | "meeting" | "deadline";
          location?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          notify_on_dday?: boolean | null;
          dday_email_sent_on?: string | null;
          remind_days_before?: number | null;
          remind_minutes_before?: number | null;
        };
        Relationships: [];
      };
      user_notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string | null;
          href: string | null;
          kind: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body?: string | null;
          href?: string | null;
          kind?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string | null;
          href?: string | null;
          kind?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_type: "free" | "pro" | "enterprise";
          status: "active" | "canceled" | "expired";
          toss_order_id: string | null;
          started_at: string;
          expired_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_type: "free" | "pro" | "enterprise";
          status: "active" | "canceled" | "expired";
          toss_order_id?: string | null;
          started_at: string;
          expired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_type?: "free" | "pro" | "enterprise";
          status?: "active" | "canceled" | "expired";
          toss_order_id?: string | null;
          started_at?: string;
          expired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_org_member: { Args: { p_org_id: string }; Returns: boolean };
      can_access_project: { Args: { p_project_id: string }; Returns: boolean };
      project_admin_or_manager: {
        Args: { p_project_id: string };
        Returns: boolean;
      };
      org_admin_or_owner: { Args: { p_org_id: string }; Returns: boolean };
      lookup_user_id_by_email_for_org: {
        Args: { p_organization_id: string; p_email: string };
        Returns: string | null;
      };
      lookup_user_id_by_email_for_project: {
        Args: { p_project_id: string; p_email: string };
        Returns: string | null;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
