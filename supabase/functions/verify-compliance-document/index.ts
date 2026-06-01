import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Verification function is not configured." }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const body = await request.json() as {
    itemId: string;
    fileName: string;
    filePath: string;
    complianceType: string;
  };

  const warnings = buildWarnings(body.fileName, body.complianceType);
  const status = warnings.length ? "Needs Review" : "Verified";

  const { error } = await supabase.rpc("mark_compliance_verification", {
    target_item_id: body.itemId,
    new_verification_status: status,
    warnings,
  });
  if (error) return json({ error: error.message }, 500);

  return json({ status, warnings });
});

function buildWarnings(fileName: string, complianceType: string) {
  const normalizedFile = fileName.toLowerCase();
  const normalizedType = complianceType.toLowerCase();
  const warnings: string[] = [];

  if (!/\.(pdf|png|jpg|jpeg|heic|webp)$/i.test(fileName)) {
    warnings.push("Unsupported or unusual file type for safer recruitment evidence.");
  }
  if (normalizedType.includes("dbs") && !normalizedFile.includes("dbs")) {
    warnings.push("Filename does not clearly reference DBS evidence.");
  }
  if (normalizedType.includes("right to work") && !/(right|work|passport|visa|share-code)/.test(normalizedFile)) {
    warnings.push("Filename does not clearly reference Right to Work evidence.");
  }
  if (normalizedType.includes("safeguarding") && !normalizedFile.includes("safeguard")) {
    warnings.push("Filename does not clearly reference safeguarding training.");
  }

  return warnings;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
