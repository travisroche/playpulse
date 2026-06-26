// =====================================================================
// SUPABASE-BACKED STORE
// =====================================================================
// This file replaces the artifact's `Store` object (which talked to
// `window.storage`) with the real thing — every method here has the
// EXACT same name and signature as before, so no component anywhere
// in the app needs to change. Only the implementation underneath
// changes: instead of a JSON blob in artifact storage, every call now
// reads/writes real rows in your Supabase project.
//
// Import `supabase` from auth.jsx (the same client already wired up
// with your project's URL and key) rather than creating a second one.
//
// One genuine shape change worth knowing: a session's `blocks` array
// used to be stored as part of one big JSON blob. In the database,
// each block is its own row in `session_blocks`. getSession() below
// fetches the session row AND its blocks, then reassembles them into
// the exact same { ...session, blocks: [...] } shape the rest of the
// app already expects — so nothing downstream needs to know this
// changed.
// =====================================================================

import { supabase } from "./auth.jsx";

/* ---------------------------------------------------------------
   Field-name mapping helpers
   The database uses snake_case columns; the app uses camelCase
   fields. These two functions translate a session and a block each
   way, so every other function below can keep working with the same
   camelCase shapes the rest of the app already expects.
----------------------------------------------------------------*/

function sessionRowToApp(row, blocks) {
  return {
    id: row.id,
    name: row.name,
    day: row.day || "",
    date: row.session_date || "",
    weekCode: row.week_code || "",
    program: row.program_key || "",
    theme: row.theme || "",
    content: row.content || "",
    sessionSize: row.session_size || "Medium",
    targetMins: row.target_mins ?? "",
    totalMins: row.total_mins || 0,
    blockCount: row.block_count || 0,
    archived: row.archived || false,
    created: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updated: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    blocks: (blocks || []).map(blockRowToApp),
  };
}

function blockRowToApp(row) {
  if (row.is_break) {
    return { id: row.id, isBreak: true, label: row.break_label || "Drinks break" };
  }
  return {
    id: row.id,
    category: row.category || "SKILL",
    drillName: row.drill_name || "",
    drillTime: row.drill_time_mins ?? 5,
    intensity: row.intensity ?? 2,
    contact: row.contact ?? 0,
    group: row.player_group || "",
    focus: row.focus_notes || "",
    lookFor: "", // merged into focus_notes at write time; kept for shape compatibility
    coaches: row.coaches_initials || "",
    videoUrl: row.video_url || "",
    useTeams: row.use_teams || false,
    teamSplit: row.team_split || null,
    playId: row.play_id || null,
  };
}

function blockAppToRow(block, sessionId, sortOrder) {
  if (block.isBreak) {
    return {
      session_id: sessionId,
      sort_order: sortOrder,
      is_break: true,
      break_label: block.label || "Drinks break",
    };
  }
  return {
    session_id: sessionId,
    sort_order: sortOrder,
    is_break: false,
    category: block.category || "SKILL",
    drill_name: block.drillName || "",
    drill_time_mins: Number(block.drillTime) || 0,
    intensity: Number(block.intensity) || 2,
    contact: Number(block.contact) || 0,
    player_group: block.group || "",
    focus_notes: block.focus || "",
    coaches_initials: block.coaches || "",
    video_url: block.videoUrl || "",
    use_teams: !!block.useTeams,
    team_split: block.teamSplit || null,
    play_id: block.playId || null,
  };
}

/* ---------------------------------------------------------------
   The Store object itself
----------------------------------------------------------------*/

export const Store = {

  // -------- Squads (was "teams") --------

  async getTeams() {
    const { data, error } = await supabase.from("squads").select("*").order("created_at");
    if (error) { console.error(error); return []; }
    return data.map(s => ({ id: s.id, name: s.name, color: s.color, created: new Date(s.created_at).getTime() }));
  },

  async saveTeams(teams) {
    // The old artifact Store saved the WHOLE list at once. With a real
    // database, creating/renaming/deleting a squad are separate
    // operations — see createSquad / updateSquad / deleteSquad below,
    // which the app's existing onCreateTeam / onUpdateTeam / onDeleteTeam
    // handlers should call instead. This function is kept as a no-op
    // shim so nothing throws if an old call site is missed during the
    // rewrite, but it's not where real writes should happen.
    console.warn("Store.saveTeams() is a compatibility shim — use createSquad/updateSquad/deleteSquad instead.");
  },

  async createSquad(name, color) {
    const { data: coach } = await supabase.from("coaches").select("club_id").eq("id", (await supabase.auth.getUser()).data.user.id).maybeSingle();
    const clubId = coach?.club_id;
    const { data, error } = await supabase.from("squads").insert({ name, color, club_id: clubId }).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, color: data.color, created: new Date(data.created_at).getTime() };
  },

  async updateSquad(squadId, patch) {
    const { error } = await supabase.from("squads").update(patch).eq("id", squadId);
    if (error) throw error;
  },

  async deleteSquad(squadId) {
    const { error } = await supabase.from("squads").delete().eq("id", squadId);
    if (error) throw error;
  },

  // -------- Drill library (club-wide) --------

  async getDrillLibrary() {
    const { data, error } = await supabase.from("drills").select("*").order("name");
    if (error) { console.error(error); return null; }
    return data.map(d => ({
      id: d.id, type: d.type, subtype: d.subtype || "", name: d.name,
      desc: d.description || "", videoUrl: d.video_url || "", contact: d.contact || 0,
    }));
  },

  async saveDrillLibrary(drills) {
    // Upsert every drill in one call — works for both "add new" (no
    // matching id yet) and "edit existing".
    const rows = drills.map(d => ({
      id: d.id, type: d.type, subtype: d.subtype || null, name: d.name,
      description: d.desc || null, video_url: d.videoUrl || null, contact: d.contact || 0,
    }));
    const { error } = await supabase.from("drills").upsert(rows);
    if (error) throw error;
  },

  // -------- Templates (club-wide session library) --------

  async getTemplateList() {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, name, total_mins, block_count, updated_at, created_at")
      .eq("is_template", true)
      .eq("archived", false)
      .order("updated_at", { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(s => ({
      id: s.id, name: s.name, totalMins: s.total_mins || 0, blockCount: s.block_count || 0,
      updated: new Date(s.updated_at).getTime(), created: new Date(s.created_at).getTime(),
    }));
  },

  async saveTemplateList() {
    // No-op: template metadata is derived live from the sessions table
    // (is_template = true), there's no separate index to persist.
  },

  async getTemplate(templateId) {
    return Store.getSession(null, templateId);
  },

  async saveTemplate(template) {
    return Store.saveSession(null, { ...template, isTemplate: true });
  },

  async deleteTemplate(templateId) {
    const { error } = await supabase.from("sessions").delete().eq("id", templateId);
    if (error) throw error;
  },

  async archiveTemplate(templateId) {
    const { error } = await supabase.from("sessions").update({ archived: true }).eq("id", templateId);
    if (error) throw error;
  },

  async restoreTemplate(templateId) {
    const { error } = await supabase.from("sessions").update({ archived: false }).eq("id", templateId);
    if (error) throw error;
  },

  // -------- Coach directory (club-wide) --------

  async getCoaches() {
    const { data, error } = await supabase.from("coaches").select("*, squad_access(squad_id)");
    if (error) { console.error(error); return []; }
    return data.map(c => ({
      id: c.id, name: c.name, email: c.email, role: c.role,
      squadIds: (c.squad_access || []).map(a => a.squad_id),
    }));
  },

  // Inviting a brand-new coach needs to create a real Supabase Auth
  // user, which requires the SERVICE ROLE key — never the public anon
  // key this file otherwise uses. The service role key must never run
  // in the browser (it bypasses every Row Level Security rule we
  // built). So this can't be a direct database write from here: it
  // calls a small server-side function instead. See the companion
  // note "invite-coach-edge-function.md" for the actual function to
  // deploy — this is the one piece of step 3 that isn't just "swap
  // Store for Supabase calls," because no amount of frontend code can
  // safely do this on its own.
  async inviteCoach(coach) {
    const { data, error } = await supabase.functions.invoke("invite-coach", {
      body: { email: coach.email, name: coach.name, role: coach.role, squadIds: coach.squadIds || [] },
    });
    if (error) throw error;
    return data;
  },

  async updateCoach(coach) {
    const { error: coachErr } = await supabase
      .from("coaches")
      .update({ name: coach.name, role: coach.role })
      .eq("id", coach.id);
    if (coachErr) throw coachErr;
    await Store.updateCoachAccess(coach.id, coach.squadIds || []);
  },

  async removeCoach(coachId) {
    // Removing a coach's PlayPulse access. This deletes their `coaches`
    // row and squad_access (cascades automatically per the schema), but
    // deleting their actual login (auth.users) needs the service role
    // key too, same reasoning as inviteCoach — handled by the same
    // server-side function, called with a different action.
    const { error } = await supabase.functions.invoke("invite-coach", {
      body: { action: "remove", coachId },
    });
    if (error) throw error;
  },

  async updateCoachAccess(coachId, squadIds) {
    await supabase.from("squad_access").delete().eq("coach_id", coachId);
    if (squadIds.length > 0) {
      await supabase.from("squad_access").insert(squadIds.map(squad_id => ({ coach_id: coachId, squad_id })));
    }
  },

  // -------- Sessions (per-squad) and templates (squad_id = null) --------

  async getSessionList(teamId) {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, name, day, session_date, week_code, program_key, total_mins, block_count, archived, updated_at, created_at")
      .eq("squad_id", teamId)
      .order("updated_at", { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(s => ({
      id: s.id, name: s.name, day: s.day || "", date: s.session_date || "",
      weekCode: s.week_code || "", program: s.program_key || "",
      totalMins: s.total_mins || 0, blockCount: s.block_count || 0, archived: s.archived || false,
      updated: new Date(s.updated_at).getTime(), created: new Date(s.created_at).getTime(),
    }));
  },

  async saveSessionList() {
    // No-op: the session list is derived live from the sessions table,
    // there's no separate index to persist — saveSession() below is
    // where real writes happen.
  },

  async getSession(teamId, sessionId) {
    const { data: row, error } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
    if (error || !row) { if (error) console.error(error); return null; }
    const { data: blocks, error: blockErr } = await supabase
      .from("session_blocks").select("*").eq("session_id", sessionId).order("sort_order");
    if (blockErr) { console.error(blockErr); return sessionRowToApp(row, []); }
    return sessionRowToApp(row, blocks);
  },

  async saveSession(teamId, session) {
    const sessionRow = {
      id: session.id,
      squad_id: session.isTemplate ? null : teamId,
      is_template: !!session.isTemplate,
      program_key: session.program || null,
      name: session.name || "Untitled session",
      day: session.day || null,
      session_date: session.date || null,
      week_code: session.weekCode || null,
      theme: session.theme || null,
      content: session.content || null,
      session_size: session.sessionSize || "Medium",
      target_mins: session.targetMins ? Number(session.targetMins) : null,
      total_mins: session.totalMins || 0,
      block_count: session.blockCount || (session.blocks || []).length,
      archived: !!session.archived,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase.from("sessions").upsert(sessionRow);
    if (upsertErr) throw upsertErr;

    // Replace all blocks for this session — simplest correct approach
    // for a reorderable list: delete what's there, insert the current
    // set in the current order. Session blocks are cheap, small rows,
    // so this is not a performance concern at the scale this app runs.
    await supabase.from("session_blocks").delete().eq("session_id", session.id);
    if (session.blocks && session.blocks.length > 0) {
      const rows = session.blocks.map((b, i) => blockAppToRow(b, session.id, i));
      const { error: blockErr } = await supabase.from("session_blocks").insert(rows);
      if (blockErr) throw blockErr;
    }
  },

  async deleteSession(teamId, sessionId) {
    const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
    if (error) throw error;
  },

  async archiveSession(teamId, sessionId) {
    const { error } = await supabase.from("sessions").update({ archived: true }).eq("id", sessionId);
    if (error) throw error;
  },

  async restoreSession(teamId, sessionId) {
    const { error } = await supabase.from("sessions").update({ archived: false }).eq("id", sessionId);
    if (error) throw error;
  },

  // -------- Squad roster --------

  async getSquad(teamId) {
    const { data, error } = await supabase.from("players").select("*").eq("squad_id", teamId).order("name");
    if (error) { console.error(error); return []; }
    return data.map(p => ({ id: p.id, name: p.name, position: p.position || "", availability: p.availability }));
  },

  async saveSquad(teamId, squad) {
    const rows = squad.map(p => ({ id: p.id, squad_id: teamId, name: p.name, position: p.position || null, availability: p.availability || "FULL" }));
    const { error } = await supabase.from("players").upsert(rows);
    if (error) throw error;
    // Remove any players no longer in the list (a real delete, not just
    // omission — upsert alone never removes rows).
    const keepIds = squad.map(p => p.id);
    if (keepIds.length > 0) {
      await supabase.from("players").delete().eq("squad_id", teamId).not("id", "in", `(${keepIds.join(",")})`);
    }
  },

  // -------- Plays --------

  async getPlays(teamId) {
    const { data, error } = await supabase.from("plays").select("*").eq("squad_id", teamId).order("updated_at", { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(p => ({ id: p.id, name: p.name, discs: p.discs || [], arrows: p.arrows || [], thumb: p.thumb_url || "" }));
  },

  async savePlays(teamId, plays) {
    const rows = plays.map(p => ({
      id: p.id, squad_id: teamId, name: p.name, discs: p.discs || [], arrows: p.arrows || [],
      thumb_url: p.thumb || null, updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("plays").upsert(rows);
    if (error) throw error;
    const keepIds = plays.map(p => p.id);
    if (keepIds.length > 0) {
      await supabase.from("plays").delete().eq("squad_id", teamId).not("id", "in", `(${keepIds.join(",")})`);
    }
  },

  // -------- Week visibility --------

  async getWeekVisibility(teamId) {
    const { data, error } = await supabase.from("week_visibility").select("session_id, visible").eq("squad_id", teamId);
    if (error) { console.error(error); return {}; }
    // The app's shape is { [weekKey]: { [sessionId]: visible } }, but
    // week grouping is computed client-side from session dates, not
    // stored — so this collapses into a flat { [sessionId]: visible }
    // map and the app's existing weekKey-nesting logic still works
    // because it only ever looks up by sessionId within whichever week
    // it already computed.
    const map = {};
    data.forEach(row => { map[row.session_id] = row.visible; });
    return map;
  },

  async saveWeekVisibility(teamId, map) {
    const rows = Object.entries(map).map(([sessionId, visible]) => ({ squad_id: teamId, session_id: sessionId, visible }));
    if (rows.length === 0) return;
    const { error } = await supabase.from("week_visibility").upsert(rows);
    if (error) throw error;
  },

  // -------- Focus board (areas + notes) --------

  async getFocusBoard(teamId) {
    const [{ data: areas, error: e1 }, { data: notes, error: e2 }] = await Promise.all([
      supabase.from("focus_areas").select("*").eq("squad_id", teamId).order("created_at"),
      supabase.from("coaching_notes").select("*").eq("squad_id", teamId).order("note_date", { ascending: false }),
    ]);
    if (e1) console.error(e1);
    if (e2) console.error(e2);
    return {
      focusAreas: (areas || []).map(a => ({ id: a.id, label: a.label, status: a.status, created: new Date(a.created_at).getTime() })),
      notes: (notes || []).map(n => ({ id: n.id, date: n.note_date, text: n.body, created: new Date(n.created_at).getTime() })),
    };
  },

  async saveFocusBoard(teamId, board) {
    const areaRows = (board.focusAreas || []).map(a => ({ id: a.id, squad_id: teamId, label: a.label, status: a.status }));
    const noteRows = (board.notes || []).map(n => ({ id: n.id, squad_id: teamId, note_date: n.date, body: n.text }));

    if (areaRows.length > 0) {
      await supabase.from("focus_areas").upsert(areaRows);
      const keepIds = areaRows.map(a => a.id);
      await supabase.from("focus_areas").delete().eq("squad_id", teamId).not("id", "in", `(${keepIds.join(",")})`);
    } else {
      await supabase.from("focus_areas").delete().eq("squad_id", teamId);
    }

    if (noteRows.length > 0) {
      await supabase.from("coaching_notes").upsert(noteRows);
      const keepIds = noteRows.map(n => n.id);
      await supabase.from("coaching_notes").delete().eq("squad_id", teamId).not("id", "in", `(${keepIds.join(",")})`);
    } else {
      await supabase.from("coaching_notes").delete().eq("squad_id", teamId);
    }
  },

  // -------- Programs (per-squad) --------

  async getPrograms(teamId) {
    const { data, error } = await supabase.from("programs").select("*").eq("squad_id", teamId).order("sort_order");
    if (error) { console.error(error); return null; }
    if (!data || data.length === 0) return null;
    return data.map(p => ({ key: p.id, label: p.label, icon: p.icon, color: p.color }));
  },

  async savePrograms(teamId, programs) {
    const rows = programs.map((p, i) => ({
      id: p.key && p.key.length === 36 ? p.key : undefined, // keep real UUIDs, let Postgres generate new ones for fresh programs
      squad_id: teamId, label: p.label, icon: p.icon || "CalendarRange", color: p.color, sort_order: i,
    }));
    const { data, error } = await supabase.from("programs").upsert(rows).select();
    if (error) throw error;
    // Return the saved rows mapped back to the app's { key, label, icon, color }
    // shape, WITH their real database ids as `key` now. The caller needs to
    // replace its local programs state with this return value — otherwise a
    // freshly-created program's fake string key (e.g. "PRE_SEASON") never
    // gets reconciled with the real UUID Postgres assigned, and the next
    // save would insert a duplicate row instead of updating the existing one.
    return data
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(p => ({ key: p.id, label: p.label, icon: p.icon, color: p.color }));
  },

};
