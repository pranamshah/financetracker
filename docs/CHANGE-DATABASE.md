# How to move to a fresh database (when the old one is full)

Simple — no SQL, no coding. The app builds its own tables and logins
automatically on a new database. Years away; only do it if the storage bar
(⋮ menu in the app) is near full.

## Steps

1. **Backup first:** App → **Summary** → **Download ALL data (backup PDF)**.
   Email it to yourself. (Your permanent record.)

2. **New database:** go to **https://neon.tech** → **New Project** →
   **Connect** → copy the **connection string**.

3. **Put it in Vercel:** **https://vercel.com** → project **finance-tracker** →
   **Settings → Environment Variables** → edit **DATABASE_URL** → paste the new
   string → **Save**. (Paste it exactly as Neon gives it — any extra options are
   handled automatically.)

4. **Redeploy (REQUIRED):** Vercel → **Deployments** → newest one →
   **⋯ → Redeploy** → confirm. Wait ~1 minute.
   *Changing the string alone does nothing until you redeploy — the app keeps
   using the old database until this step.*

5. **Open the app** (https://finance-tracker-chi-ruddy-55.vercel.app) and log in
   (Sailesh 2904). It will be fresh and empty — the tables and PINs are created
   automatically. Start adding customers again.

That's it. The old data stays in your backup PDF. Free, repeatable anytime.

### If login says "Wrong PIN" right after switching
Wait 30 seconds and try once more (the first open creates everything). If it
still fails, the connection string was pasted wrong — re-copy from Neon (Step 2)
and redo Steps 3–4.
