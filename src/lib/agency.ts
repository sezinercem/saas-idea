import { z } from "zod";
import { supabase } from "./supabase";
import type { Agency, AgencyMemberWithProfile, AgencyRole, OnboardingStep, TeamInvite } from "../types/agency";

export const onboardingSchema = z.object({
  name: z.string().min(2, "Agency name is required."),
  recruitment_niche: z.string().optional(),
  team_size: z.string().optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type OnboardingProgressInput = Partial<OnboardingInput> & {
  onboarding_step?: OnboardingStep;
  onboarding_completed?: boolean;
};

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
    .update({
      ...parsed,
      recruitment_niche: parsed.recruitment_niche || null,
      team_size: parsed.team_size || null,
      onboarding_complete: true,
      onboarding_completed: true,
      onboarding_step: "Completed",
      onboarding_completed_at: new Date().toISOString(),
      slug: slugify(parsed.name, agencyId),
    })
    .eq("id", agencyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveAgencyOnboardingProgress(agencyId: string, input: OnboardingProgressInput) {
  const updates: Partial<Omit<Agency, "id" | "created_at">> = {};
  if (typeof input.name === "string" && input.name.trim().length >= 2) {
    updates.name = input.name.trim();
    updates.slug = slugify(input.name, agencyId);
  }
  if (typeof input.recruitment_niche === "string") updates.recruitment_niche = input.recruitment_niche.trim() || null;
  if (typeof input.team_size === "string") updates.team_size = input.team_size || null;
  if (input.onboarding_step) updates.onboarding_step = input.onboarding_step;
  if (input.onboarding_completed) {
    updates.onboarding_complete = true;
    updates.onboarding_completed = true;
    updates.onboarding_step = "Completed";
    updates.onboarding_completed_at = new Date().toISOString();
  }

  const { data, error } = await getClient().from("agencies").update(updates).eq("id", agencyId).select().single();
  if (error) throw error;
  return data;
}

export async function listAgencyMembers(agencyId: string) {
  const client = getClient();
  const { data: members, error } = await client
    .from("agency_members")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const userIds = (members ?? []).map((member) => member.user_id);
  const { data: profiles, error: profileError } = userIds.length
    ? await client.from("profiles").select("id,email,full_name").in("id", userIds)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return (members ?? []).map((member) => ({
    ...member,
    profiles: profilesById.get(member.user_id) ?? null,
  })) as AgencyMemberWithProfile[];
}

export async function updateAgencyMemberRole(memberId: string, role: AgencyRole) {
  const { data, error } = await getClient().from("agency_members").update({ role }).eq("id", memberId).select().single();
  if (error) throw error;
  return data;
}

export async function removeAgencyMember(memberId: string) {
  const { error } = await getClient().from("agency_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function listTeamInvites(agencyId: string) {
  const { data, error } = await getClient()
    .from("team_invites")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TeamInvite[];
}

export async function createTeamInvite(agencyId: string, email: string, role: Exclude<AgencyRole, "owner">) {
  const { data, error } = await getClient().rpc("create_team_invite", {
    target_agency_id: agencyId,
    target_email: email,
    target_role: role,
  });
  if (error) throw error;
  return data;
}

export async function resendTeamInvite(inviteId: string) {
  const { data, error } = await getClient()
    .from("team_invites")
    .update({ status: "Pending", last_sent_at: new Date().toISOString() })
    .eq("id", inviteId)
    .select()
    .single();
  if (error) throw error;
  return data as TeamInvite;
}

export async function revokeTeamInvite(inviteId: string) {
  const { data, error } = await getClient().from("team_invites").update({ status: "Revoked" }).eq("id", inviteId).select().single();
  if (error) throw error;
  return data as TeamInvite;
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
    .insert({
      name: agencyName,
      slug: slugify(agencyName, userId),
      recruitment_niche: null,
      team_size: null,
      onboarding_complete: false,
      onboarding_completed: false,
      onboarding_step: "Profile Setup",
      onboarding_completed_at: null,
    })
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
