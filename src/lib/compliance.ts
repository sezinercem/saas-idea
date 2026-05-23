import { z } from "zod";
import { createActivityLog, listCandidates } from "./recruitment";
import { supabase } from "./supabase";
import type {
  CandidateClearance,
  CandidateComplianceItem,
  ClearanceItemStatus,
  DocumentRecord,
  OverallClearanceStatus,
} from "../types/agency";

const reviewSchema = z.object({
  status: z.enum(["Approved", "Rejected"]),
  expiry_date: z.string().nullable(),
  reviewer_notes: z.string(),
  rejection_reason: z.string(),
});

export type ComplianceReviewInput = z.infer<typeof reviewSchema>;

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateValue: string) {
  const milliseconds = new Date(`${dateValue}T00:00:00`).getTime() - new Date(`${isoToday()}T00:00:00`).getTime();
  return Math.ceil(milliseconds / (1000 * 60 * 60 * 24));
}

export function effectiveComplianceStatus(item: CandidateComplianceItem): ClearanceItemStatus {
  if (item.status === "Approved" && item.expiry_date) {
    const days = daysUntil(item.expiry_date);
    if (days < 0) return "Expired";
    if (days <= 30) return "Expiring Soon";
  }
  return item.status;
}

export function calculateClearance(candidateId: string, items: CandidateComplianceItem[]): CandidateClearance {
  const requiredItems = items.filter((item) => item.compliance_types?.required !== false);
  const effective = requiredItems.map((item) => effectiveComplianceStatus(item));
  let overallStatus: OverallClearanceStatus = "Non-Compliant";

  if (requiredItems.length > 0 && effective.every((status) => status === "Approved")) {
    overallStatus = "Cleared";
  } else if (effective.some((status) => status === "Missing" || status === "Rejected" || status === "Expired")) {
    overallStatus = "Non-Compliant";
  } else if (effective.some((status) => status === "Expiring Soon")) {
    overallStatus = "Expiring Soon";
  } else if (effective.some((status) => status === "Uploaded" || status === "Pending Review")) {
    overallStatus = "Pending Review";
  }

  const expiryDates = requiredItems
    .filter((item) => item.expiry_date)
    .map((item) => item.expiry_date as string)
    .sort();
  const reviewedDates = items
    .filter((item) => item.reviewed_at)
    .map((item) => item.reviewed_at as string)
    .sort()
    .reverse();

  return {
    candidateId,
    overallStatus,
    items,
    missingCount: effective.filter((status) => status === "Missing" || status === "Rejected" || status === "Expired").length,
    expiryRiskCount: effective.filter((status) => status === "Expiring Soon" || status === "Expired").length,
    nextExpiryDate: expiryDates[0] ?? null,
    lastReviewedAt: reviewedDates[0] ?? null,
  };
}

export async function listCandidateCompliance(agencyId: string, candidateId: string) {
  const client = getClient();
  const { data: types, error: typesError } = await client
    .from("compliance_types")
    .select("*")
    .eq("agency_id", agencyId)
    .order("sort_order", { ascending: true });
  if (typesError) throw typesError;

  const { data: rows, error: rowsError } = await client
    .from("candidate_compliance")
    .select("*, compliance_types(*), documents(*)")
    .eq("agency_id", agencyId)
    .eq("candidate_id", candidateId);
  if (rowsError) throw rowsError;

  const presentIds = new Set((rows ?? []).map((row) => row.compliance_type_id));
  const missingRows = (types ?? [])
    .filter((type) => !presentIds.has(type.id))
    .map((type) => ({ agency_id: agencyId, candidate_id: candidateId, compliance_type_id: type.id, status: "Missing" as const }));

  if (missingRows.length) {
    const { error } = await client.from("candidate_compliance").insert(missingRows);
    if (error) throw error;
    return listCandidateCompliance(agencyId, candidateId);
  }

  const items = (rows ?? []) as CandidateComplianceItem[];
  return items.sort((a, b) => (a.compliance_types?.sort_order ?? 0) - (b.compliance_types?.sort_order ?? 0));
}

export async function getCandidateClearance(agencyId: string, candidateId: string) {
  return calculateClearance(candidateId, await listCandidateCompliance(agencyId, candidateId));
}

export async function listCandidateClearances(agencyId: string) {
  const candidates = await listCandidates();
  const clearances = await Promise.all(candidates.map((candidate) => getCandidateClearance(agencyId, candidate.id)));
  return candidates.map((candidate, index) => ({ candidate, clearance: clearances[index] }));
}

export async function uploadComplianceDocument(
  agencyId: string,
  userId: string,
  candidateId: string,
  item: CandidateComplianceItem,
  file: File,
) {
  const client = getClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const path = `${agencyId}/candidates/${candidateId}/${item.compliance_type_id}/${safeName}`;
  const { error: uploadError } = await client.storage.from("recruitment-documents").upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  let document = item.documents;
  if (!document || document.file_path !== path) {
    const { data, error: documentError } = await client
      .from("documents")
      .insert({
        agency_id: agencyId,
        entity_type: "candidate",
        entity_id: candidateId,
        file_name: file.name,
        file_path: path,
        uploaded_by: userId,
      })
      .select()
      .single();
    if (documentError) throw documentError;
    document = data as DocumentRecord;
  }

  const { error: updateError } = await client
    .from("candidate_compliance")
    .update({ document_id: document.id, status: "Pending Review" })
    .eq("id", item.id);
  if (updateError) throw updateError;

  await createActivityLog(agencyId, userId, "candidate", candidateId, "compliance.document_uploaded", {
    compliance_type: item.compliance_types?.name,
  });
}

export async function reviewComplianceItem(
  agencyId: string,
  userId: string,
  candidateId: string,
  item: CandidateComplianceItem,
  input: ComplianceReviewInput,
) {
  const parsed = reviewSchema.parse(input);
  if (parsed.status === "Approved" && item.compliance_types?.requires_expiry_date && !parsed.expiry_date) {
    throw new Error("An expiry date is required before this item can be approved.");
  }
  if (parsed.status === "Approved" && item.compliance_types?.requires_document_upload && !item.documents) {
    throw new Error("Upload the required clearance document before approving this item.");
  }
  if (parsed.status === "Rejected" && !parsed.rejection_reason.trim()) {
    throw new Error("A rejection reason is required.");
  }

  const { error } = await getClient()
    .from("candidate_compliance")
    .update({
      status: parsed.status,
      expiry_date: parsed.expiry_date || null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: parsed.reviewer_notes,
      rejection_reason: parsed.status === "Rejected" ? parsed.rejection_reason : null,
    })
    .eq("id", item.id);
  if (error) throw error;

  await createActivityLog(
    agencyId,
    userId,
    "candidate",
    candidateId,
    parsed.status === "Approved" ? "compliance.document_approved" : "compliance.document_rejected",
    { compliance_type: item.compliance_types?.name, reason: parsed.rejection_reason },
  );
}

export async function signedComplianceDocumentUrl(path: string) {
  const { data, error } = await getClient().storage.from("recruitment-documents").createSignedUrl(path, 120);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteComplianceDocument(
  agencyId: string,
  userId: string,
  candidateId: string,
  item: CandidateComplianceItem,
  document: DocumentRecord,
) {
  const client = getClient();
  const { error: storageError } = await client.storage.from("recruitment-documents").remove([document.file_path]);
  if (storageError) throw storageError;
  const { error: itemError } = await client.from("candidate_compliance").update({ document_id: null, status: "Missing" }).eq("id", item.id);
  if (itemError) throw itemError;
  const { error: recordError } = await client.from("documents").delete().eq("id", document.id);
  if (recordError) throw recordError;
  await createActivityLog(agencyId, userId, "candidate", candidateId, "compliance.document_deleted", {
    compliance_type: item.compliance_types?.name,
  });
}

export async function getComplianceDashboard(agencyId: string) {
  const rows = await listCandidateClearances(agencyId);
  const newlyExpired = rows.flatMap(({ candidate, clearance }) =>
    clearance.items
      .filter((item) => item.status === "Approved" && effectiveComplianceStatus(item) === "Expired")
      .map((item) => ({ candidateId: candidate.id, item })),
  );
  await Promise.all(
    newlyExpired.map(async ({ candidateId, item }) => {
      const { error } = await getClient().from("candidate_compliance").update({ status: "Expired" }).eq("id", item.id);
      if (error) throw error;
      await createActivityLog(agencyId, null, "candidate", candidateId, "compliance.item_expired", {
        compliance_type: item.compliance_types?.name,
      });
    }),
  );
  return {
    rows,
    cleared: rows.filter((row) => row.clearance.overallStatus === "Cleared").length,
    pending: rows.filter((row) => row.clearance.overallStatus === "Pending Review").length,
    expiring: rows.filter((row) => row.clearance.overallStatus === "Expiring Soon").length,
    nonCompliant: rows.filter((row) => row.clearance.overallStatus === "Non-Compliant").length,
    pendingItems: rows.flatMap(({ candidate, clearance }) =>
      clearance.items
        .filter((item) => ["Uploaded", "Pending Review"].includes(effectiveComplianceStatus(item)))
        .map((item) => ({ candidate, item })),
    ),
    expiringItems: rows.flatMap(({ candidate, clearance }) =>
      clearance.items
        .filter((item) => effectiveComplianceStatus(item) === "Expiring Soon")
        .map((item) => ({ candidate, item, daysRemaining: item.expiry_date ? daysUntil(item.expiry_date) : 0 })),
    ),
  };
}
