import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "../types/profile";

export type ProfileInput = {
  full_name: string;
  company_name: string;
};

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
