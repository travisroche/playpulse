# PlayPulse — login test deploy

This is a small, real project with just the login screens wired up to your actual Supabase project. The goal right now is narrow: prove that sign-in actually works end to end, hosted on a real URL. The rest of PlayPulse (squads, sessions, drills, etc.) connects in after this is confirmed working.

## What's in here

- `auth.jsx` — the sign-in / sign-up / forgot-password screens, already pointed at your real Supabase project.
- `src/main.jsx` — wires it together and shows a simple "you're signed in" placeholder once login succeeds.
- Everything else (`package.json`, `vite.config.js`, `index.html`) is standard project scaffolding so this can actually run.

---

## Step 1 — Upload to GitHub (no command line needed)

1. Go to **github.com**, sign in, click the **+** in the top right → **New repository**.
2. Name it something like `playpulse` (private or public, your choice — private is fine).
3. **Don't** tick "Add a README" — leave the repo empty for now.
4. Click **Create repository**.
5. On the next page, look for **"uploading an existing file"** (a blue link, usually mid-page).
6. Drag in every file and folder from this project (keep the folder structure — `src/` should stay a folder, not be flattened).
7. Scroll down, click **Commit changes**.

## Step 2 — Deploy to Vercel

1. Go to **vercel.com** → **Sign up** → choose **Continue with GitHub** (this links the two automatically).
2. Once logged in, click **Add New… → Project**.
3. Find your `playpulse` repo in the list and click **Import**.
4. Vercel should auto-detect this as a Vite project — leave the settings as default.
5. Click **Deploy**.

A minute or two later, you'll get a real URL like `playpulse-xyz.vercel.app`. Open it.

## Step 3 — Test it

- You should land on the **Sign in** screen.
- Sign in with the email/password you created for yourself in Supabase (the one you made a Platform Admin).
- If everything's wired correctly, you'll see "You're signed in as [your name] (Platform Admin)".

## If something goes wrong

- **Blank white page** → open the browser's developer console (right-click → Inspect → Console tab) and check for a red error. Most likely cause: a typo in the Supabase URL/key inside `auth.jsx`.
- **"Invalid login credentials"** → double-check the email/password match exactly what you created in Supabase's Authentication → Users.
- **Stuck on "No coach profile found"** → this means login worked, but your `platform_admins` row doesn't match — double check the UUID you inserted matches your Supabase Auth user's ID exactly.

Let me know what you see and we'll go from there.
