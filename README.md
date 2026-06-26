# PlayPulse — full app deploy

This is the real thing: every tab — Programs, Plays, Focus & Notes, the Session Library, Drill Library, Squads, Coaches — wired up to your actual Supabase project, sitting behind the login screen.

## What's in here

- `src/App.jsx` — the whole PlayPulse app.
- `src/supabaseStore.js` — every read/write the app makes, mapped onto your real database tables and Row Level Security.
- `src/auth.jsx` — sign-in, sign-up (for invited coaches), and forgot-password, already pointed at your real Supabase project.
- `src/main.jsx` — wires the login wall and the real app together: logged out shows the auth screens, logged in shows PlayPulse itself.
- `package.json`, `vite.config.js`, `index.html` — standard project scaffolding so this can actually run and build.

## One real piece that still needs deploying separately

Inviting or removing a coach can't happen directly from the browser — it needs Supabase's service role key, which must never sit in frontend code. That logic lives in a separate file, `invite-coach-edge-function.ts`, deployed straight to Supabase (not part of this website). See that file's own comments for the exact deploy command. Until that's deployed, the Coaches tab's "Add coach" and "Remove" actions won't work — everything else in the app will.

## Updating this deployment

This replaces the earlier login-only test deploy. If you're updating the SAME GitHub repo from before:

1. On github.com, open your existing repo.
2. Delete the old loose files at the root if any remain outside `src/`.
3. Upload these new files the same way as before — drag them in via "uploading an existing file," keeping `src/` as a real folder.
4. Commit. Vercel will automatically redeploy.

If anything looks off after deploying, check the browser console (right-click → Inspect → Console) for the actual error — that's always more specific than Vercel's build log for anything that happens after the build succeeds (e.g. how the app behaves once it's actually running).
