// Supabase Edge Function: invite-coach
// =====================================================================
// This runs on Supabase's servers, NOT in the browser — that's the
// whole point. It's the only piece of code in this entire project
// that's allowed to use the SERVICE ROLE key, because it's the only
// piece that never reaches a coach's browser.
//
// Two things only an Admin or Owner should be able to trigger:
//   - inviting a brand-new coach (creates a real login + a coaches row)
//   - removing a coach (deletes their login entirely)
//
// Deploy this with the Supabase CLI:
//   supabase functions deploy invite-coach
//
// Set the required secret once (the CLI prompts for this, or set it
// in the Supabase dashboard under Edge Functions -> Secrets):
//   SUPABASE_SERVICE_ROLE_KEY  (find it in Project Settings -> API,
//   the key labelled "service_role" — keep this one secret, never put
//   it in any frontend file)
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Two clients: one with the caller's own permissions (to check who's
// asking), one with full admin rights (to actually do the work).
function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401 });
    }

    // Verify the caller is who they say they are, using their own token.
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401 });
    }

    const admin = adminClient();

    // Confirm the caller is actually allowed to manage coaches: either a
    // platform admin, or an Owner within their own club. This re-checks
    // the same rule the database's Row Level Security already enforces —
    // belt and suspenders, since this function runs WITH the service
    // role key and bypasses RLS entirely, so it must do its own check.
    const { data: isAdmin } = await admin.from("platform_admins").select("id").eq("id", caller.id).maybeSingle();
    const { data: callerCoach } = await admin.from("coaches").select("club_id, access_level").eq("id", caller.id).maybeSingle();
    const callerIsOwner = callerCoach?.access_level === "owner";

    if (!isAdmin && !callerIsOwner) {
      return new Response(JSON.stringify({ error: "Only an Owner or Admin can manage coaches" }), { status: 403 });
    }

    const body = await req.json();

    // ---- Remove an existing coach ----
    if (body.action === "remove") {
      const { data: target } = await admin.from("coaches").select("club_id").eq("id", body.coachId).maybeSingle();
      if (!isAdmin && target?.club_id !== callerCoach?.club_id) {
        return new Response(JSON.stringify({ error: "You can only remove coaches in your own club" }), { status: 403 });
      }
      // Deleting the auth user cascades to the coaches row and
      // squad_access automatically, per the schema's "on delete cascade".
      const { error } = await admin.auth.admin.deleteUser(body.coachId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    }

    // ---- Invite a new coach ----
    const { email, name, role, squadIds } = body;
    if (!email || !name) {
      return new Response(JSON.stringify({ error: "Email and name are required" }), { status: 400 });
    }

    const clubId = callerIsOwner ? callerCoach.club_id : body.clubId;
    if (!clubId) {
      return new Response(JSON.stringify({ error: "Admin must specify which club this coach belongs to" }), { status: 400 });
    }

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
    if (inviteErr) throw inviteErr;

    const { error: coachErr } = await admin.from("coaches").insert({
      id: invited.user.id, club_id: clubId, name, email, role: role || "Assistant Coach", access_level: "coach",
    });
    if (coachErr) throw coachErr;

    if (squadIds && squadIds.length > 0) {
      await admin.from("squad_access").insert(squadIds.map((squad_id) => ({ coach_id: invited.user.id, squad_id })));
    }

    return new Response(
      JSON.stringify({ id: invited.user.id, name, email, role: role || "Assistant Coach", squadIds: squadIds || [] }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Something went wrong" }), { status: 500 });
  }
});
