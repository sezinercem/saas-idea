import { createClient } from "@supabase/supabase-js";
import type { Profile } from "../types/profile";
import type { Candidate, Job, Placement } from "../types/recruitment";
import type {
  ActivityLog,
  Agency,
  AgencyMember,
  CandidateCompliance,
  ComplianceType,
  DocumentRecord,
  Note,
} from "../types/agency";
import type { CandidateUser, JobApplication, PortalInvite, PortalNotification, Shift, ShiftBooking } from "../types/portal";

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
      agencies: {
        Row: Agency;
        Insert: Omit<Agency, "id" | "created_at" | "logo_url" | "primary_colour"> & {
          id?: string;
          created_at?: string | null;
          logo_url?: string | null;
          primary_colour?: string;
        };
        Update: Partial<Omit<Agency, "id" | "created_at">>;
        Relationships: [];
      };
      agency_members: {
        Row: AgencyMember;
        Insert: Omit<AgencyMember, "id" | "created_at"> & { id?: string; created_at?: string | null };
        Update: Partial<Omit<AgencyMember, "id" | "agency_id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, "id" | "created_at"> & { id?: string; created_at?: string | null };
        Update: Partial<Omit<ActivityLog, "id" | "agency_id" | "created_at">>;
        Relationships: [];
      };
      notes: {
        Row: Note;
        Insert: Omit<Note, "id" | "created_at"> & { id?: string; created_at?: string | null };
        Update: Partial<Omit<Note, "id" | "agency_id" | "created_by" | "entity_type" | "entity_id" | "created_at">>;
        Relationships: [];
      };
      documents: {
        Row: DocumentRecord;
        Insert: Omit<DocumentRecord, "id" | "created_at"> & { id?: string; created_at?: string | null };
        Update: Partial<Omit<DocumentRecord, "id" | "agency_id" | "entity_type" | "entity_id" | "created_at">>;
        Relationships: [];
      };
      compliance_types: {
        Row: ComplianceType;
        Insert: Omit<ComplianceType, "id" | "created_at"> & { id?: string; created_at?: string | null };
        Update: Partial<Omit<ComplianceType, "id" | "agency_id" | "created_at">>;
        Relationships: [];
      };
      candidate_compliance: {
        Row: CandidateCompliance;
        Insert: Pick<CandidateCompliance, "agency_id" | "candidate_id" | "status"> & {
          id?: string;
          compliance_type_id?: string | null;
          expiry_date?: string | null;
          document_id?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reviewer_notes?: string | null;
          rejection_reason?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          verification_status?: CandidateCompliance["verification_status"];
          verification_warnings?: string[];
          verified_at?: string | null;
        };
        Update: Partial<Omit<CandidateCompliance, "id" | "agency_id" | "candidate_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "candidate_compliance_compliance_type_id_fkey";
            columns: ["compliance_type_id"];
            isOneToOne: false;
            referencedRelation: "compliance_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidate_compliance_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
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
        Insert: Omit<
          Placement,
          "id" | "created_at" | "compliance_override" | "compliance_override_reason" | "compliance_override_by" | "compliance_override_at"
        > & {
          id?: string;
          created_at?: string | null;
          compliance_override?: boolean;
          compliance_override_reason?: string | null;
          compliance_override_by?: string | null;
          compliance_override_at?: string | null;
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
      candidate_users: {
        Row: CandidateUser;
        Insert: Omit<CandidateUser, "id" | "created_at"> & { id?: string; created_at?: string | null };
        Update: Partial<Omit<CandidateUser, "id" | "candidate_id" | "agency_id" | "created_at">>;
        Relationships: [];
      };
      portal_invites: {
        Row: PortalInvite;
        Insert: Omit<PortalInvite, "id" | "created_at"> & { id?: string; created_at?: string | null };
        Update: Partial<Omit<PortalInvite, "id" | "agency_id" | "candidate_id" | "created_at">>;
        Relationships: [];
      };
      shifts: {
        Row: Shift;
        Insert: Omit<Shift, "id" | "created_at"> & { id?: string; created_at?: string | null };
        Update: Partial<Omit<Shift, "id" | "agency_id" | "created_at">>;
        Relationships: [];
      };
      job_applications: {
        Row: JobApplication;
        Insert: Omit<JobApplication, "id" | "applied_at" | "jobs" | "candidates"> & { id?: string; applied_at?: string | null };
        Update: Partial<Omit<JobApplication, "id" | "candidate_id" | "agency_id" | "job_id" | "applied_at" | "jobs" | "candidates">>;
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      shift_bookings: {
        Row: ShiftBooking;
        Insert: Omit<ShiftBooking, "id" | "booked_at" | "shifts" | "candidates"> & { id?: string; booked_at?: string | null };
        Update: Partial<Omit<ShiftBooking, "id" | "candidate_id" | "agency_id" | "shift_id" | "booked_at" | "shifts" | "candidates">>;
        Relationships: [
          {
            foreignKeyName: "shift_bookings_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: PortalNotification;
        Insert: Omit<PortalNotification, "id" | "created_at"> & { id?: string; created_at?: string | null };
        Update: Partial<Omit<PortalNotification, "id" | "agency_id" | "recipient_user_id" | "recipient_candidate_user_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_portal_invite: {
        Args: { target_candidate_id: string; invite_token_hash: string; invite_expires_at: string };
        Returns: string;
      };
      portal_invite_preview: {
        Args: { raw_token: string };
        Returns: Array<{ agency_name: string; candidate_first_name: string | null; primary_colour: string; logo_url: string | null; expires_at: string }>;
      };
      accept_portal_invite: { Args: { raw_token: string }; Returns: string };
    };
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
