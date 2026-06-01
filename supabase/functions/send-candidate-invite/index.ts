import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("INVITE_FROM_EMAIL") ?? "RecruitFlow <onboarding@resend.dev>";
  if (!supabaseUrl || !anonKey) return json({ error: "Supabase function environment is not configured." }, 500);

  const authHeader = request.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const body = await request.json() as {
    inviteId: string;
    email: string;
    candidateName: string;
    inviteLink: string;
  };

  if (!resendApiKey) {
    await supabase.rpc("mark_portal_invite_delivery", {
      invite_id: body.inviteId,
      delivery_status: "Skipped",
      delivery_error: "RESEND_API_KEY is not configured.",
    });
    return json({ sent: false, skipped: true, message: "RESEND_API_KEY is not configured." });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: body.email,
      subject: "Your candidate portal invitation",
      html: `
        <p>Hello ${escapeHtml(body.candidateName)},</p>
        <p>Your agency has invited you to complete safer recruitment checks and view school opportunities.</p>
        <p><a href="${body.inviteLink}">Accept your candidate portal invitation</a></p>
        <p>This link is unique to your agency and expires soon.</p>
      `,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    await supabase.rpc("mark_portal_invite_delivery", {
      invite_id: body.inviteId,
      delivery_status: "Failed",
      delivery_error: text,
    });
    return json({ sent: false, message: text }, 502);
  }

  await supabase.rpc("mark_portal_invite_delivery", {
    invite_id: body.inviteId,
    delivery_status: "Sent",
    delivery_error: null,
  });
  return json({ sent: true });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[character] ?? character));
}
