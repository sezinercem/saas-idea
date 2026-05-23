import { z } from "zod";
import { supabase } from "./supabase";
import type { Agency, AgencyMemberWithProfile, AgencyRole } from "../types/agency";

export const onboardingSchema = z.object({
  name: z.string().min(2, "Agency name is required."),
  recruitment_niche: z.string().min(2, "Recruitment niche is required."),
  team_size: z.string().min(1, "Team size is required."),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function getCurrentAgency(userId: string) {
  const client = getClient();
  const { data: membership, error: membershipError } = await client
    .from("agency_members")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) return { agency: null, membership: null };

  const { data: agency, error: agencyError } = await client.from("agencies").select("*").eq("id", membership.agency_id).single();
  if (agencyError) throw agencyError;

  return { agency, membership };
}

export async function completeAgencyOnboarding(agencyId: string, input: OnboardingInput) {
  const parsed = onboardingSchema.parse(input);
  const { data, error } = await getClient()
    .from("agencies")
    .update({ ...parsed, onboarding_complete: true, slug: slugify(parsed.name, agencyId) })
    .eq("id", agencyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listAgencyMembers(agencyId: string) {
  const { data, error } = await getClient()
    .from("agency_members")
    .select("*, profiles(email, full_name)")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as AgencyMemberWithProfile[];
}

export async function updateAgencyMemberRole(memberId: string, role: AgencyRole) {
  const { data, error } = await getClient().from("agency_members").update({ role }).eq("id", memberId).select().single();
  if (error) throw error;
  return data;
}

export async function updateAgencyBranding(agencyId: string, input: { logo_url: string; primary_colour: string }) {
  if (!/^#[0-9a-fA-F]{6}$/.test(input.primary_colour)) {
    throw new Error("Primary colour must be a 6 digit hex colour, for example #1d4ed8.");
  }
  if (input.logo_url && !URL.canParse(input.logo_url)) {
    throw new Error("Enter a valid logo URL.");
  }
  const { data, error } = await getClient()
    .from("agencies")
    .update({ logo_url: input.logo_url || null, primary_colour: input.primary_colour })
    .eq("id", agencyId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createAgencyForExistingUser(userId: string, email: string) {
  const agencyName = `${email.split("@")[0]} Agency`;
  const { data: agency, error: agencyError } = await getClient()
    .from("agencies")
    .insert({ name: agencyName, slug: slugify(agencyName, userId), recruitment_niche: null, team_size: null, onboarding_complete: false })
    .select()
    .single();

  if (agencyError) throw agencyError;

  const { error: memberError } = await getClient()
    .from("agency_members")
    .insert({ agency_id: agency.id, user_id: userId, role: "owner" });

  if (memberError) throw memberError;
  return agency as Agency;
}

function slugify(name: string, suffix: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "agency"}-${suffix.slice(0, 8)}`;
}
