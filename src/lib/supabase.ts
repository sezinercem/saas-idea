import { createClient } from "@supabase/supabase-js";
import type { Profile } from "../types/profile";
import type { Candidate, Job, Placement } from "../types/recruitment";

type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, "id" | "email" | "created_at">>;
        Relationships: [];
      };
      candidates: {
        Row: Candidate;
        Insert: Omit<Candidate, "id" | "created_at"> & {
          id?: string;
          created_at?: string | null;
        };
        Update: Partial<Omit<Candidate, "id" | "created_by" | "created_at">>;
        Relationships: [];
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, "id" | "created_at"> & {
          id?: string;
          created_at?: string | null;
        };
        Update: Partial<Omit<Job, "id" | "created_by" | "created_at">>;
        Relationships: [];
      };
      placements: {
        Row: Placement;
        Insert: Omit<Placement, "id" | "created_at"> & {
          id?: string;
          created_at?: string | null;
        };
        Update: Partial<Omit<Placement, "id" | "created_by" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "placements_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "placements_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// The app can render without credentials, but auth actions are disabled until env vars are set.
export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;
