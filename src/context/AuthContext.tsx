import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { AuthContext, type AuthContextValue, type ProfileInput } from "./auth-context";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Profile } from "../types/profile";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthContextValue["session"]>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  const fetchProfile = useCallback(async (user: User | null) => {
    if (!supabase || !user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

    if (error) {
      throw error;
    }

    setProfile(data);
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await fetchProfile(data.session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      fetchProfile(nextSession?.user ?? null).catch(() => setProfile(null));
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const ensureSupabase = useCallback(() => {
    if (!supabase) {
      throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    return supabase;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const client = ensureSupabase();
      const { error } = await client.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }
    },
    [ensureSupabase],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const client = ensureSupabase();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        throw error;
      }

      // Create a profile immediately when Supabase returns a user; RLS policies keep this scoped.
      if (data.user) {
        await client.from("profiles").upsert({
          id: data.user.id,
          email,
          full_name: "",
          company_name: "",
        });
      }
    },
    [ensureSupabase],
  );

  const signOut = useCallback(async () => {
    const client = ensureSupabase();
    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }
  }, [ensureSupabase]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile(session?.user ?? null);
  }, [fetchProfile, session?.user]);

  const updateProfile = useCallback(
    async (input: ProfileInput) => {
      const client = ensureSupabase();
      const currentUser = session?.user;

      if (!currentUser) {
        throw new Error("You must be signed in to update your profile.");
      }

      const { error } = await client.from("profiles").upsert({
        id: currentUser.id,
        email: currentUser.email ?? "",
        full_name: input.full_name,
        company_name: input.company_name,
      });

      if (error) {
        throw error;
      }

      await fetchProfile(currentUser);
    },
    [ensureSupabase, fetchProfile, session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [isLoading, profile, refreshProfile, session, signIn, signOut, signUp, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
