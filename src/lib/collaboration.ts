import { supabase } from "./supabase";
import { noteSchema } from "./validation";
import type { ActivityLog, DocumentRecord, Note } from "../types/agency";

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function listNotes(agencyId: string, entityType: string, entityId: string) {
  const { data, error } = await getClient()
    .from("notes")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function addNote(agencyId: string, userId: string, entityType: string, entityId: string, content: string) {
  const parsed = noteSchema.parse({ content });
  const { data, error } = await getClient()
    .from("notes")
    .insert({ agency_id: agencyId, created_by: userId, entity_type: entityType, entity_id: entityId, content: parsed.content })
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function listDocuments(agencyId: string, entityType: string, entityId: string) {
  const { data, error } = await getClient()
    .from("documents")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentRecord[];
}

export async function uploadDocument(agencyId: string, userId: string, entityType: string, entityId: string, file: File) {
  const path = `${agencyId}/${entityType}/${entityId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await getClient().storage.from("recruitment-documents").upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await getClient()
    .from("documents")
    .insert({ agency_id: agencyId, entity_type: entityType, entity_id: entityId, file_name: file.name, file_path: path, uploaded_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data as DocumentRecord;
}

export async function deleteDocument(document: DocumentRecord) {
  const client = getClient();
  const { error: storageError } = await client.storage.from("recruitment-documents").remove([document.file_path]);
  if (storageError) throw storageError;

  const { error } = await client.from("documents").delete().eq("id", document.id);
  if (error) throw error;
}

export async function listEntityActivity(agencyId: string, entityType: string, entityId: string) {
  const { data, error } = await getClient()
    .from("activity_logs")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as ActivityLog[];
}
