# Build the Finance Tracker Android APK (free, no Play Store)

This produces a real `.apk` file you can install directly on any Android phone
and share via WhatsApp / Google Drive. No Play Store, no Google developer
account, no cost.

You do this **once on a computer** (Windows / Mac / Linux). After that, updating
the app = repeat the short "Update" section at the bottom.

---

## Prerequisites (all free, one-time)

1. **Node.js** (18+) — https://nodejs.org
2. **Android Studio** — https://developer.android.com/studio
   (during first launch it installs the Android SDK — just accept defaults)
3. **Java JDK 17** — Android Studio bundles one; nothing extra usually needed.

---

## Step 0 — Deploy the web app first (required)

The APK needs the address of your live API. So the site must be on Vercel first.

1. Push this repo to GitHub (already done if you're reading this from GitHub).
2. Go to https://vercel.com → **Add New → Project** → import the repo.
3. In **Environment Variables**, add:
   - `DATABASE_URL` = your Neon pooled connection string
4. Deploy. Note the URL it gives you, e.g. `https://finance-tracker-xyz.vercel.app`.

Test the URL in a browser — you should see the login screen.

---

## Step 1 — Get the code and install

```bash
git clone https://github.com/pranamshah/financetracker.git
cd financetracker
npm install
```

## Step 2 — Point the app at your deployed API

Create a file named `.env` in the project root with your Vercel URL:

```
VITE_API_BASE=https://finance-tracker-xyz.vercel.app
```

(Use YOUR real Vercel URL. This is what lets the APK talk to the database.)

## Step 3 — Build the web app and add Android

```bash
npm run build          # builds the web app into /dist
npm run android:add    # creates the android/ project (first time only)
npm run android:sync   # copies the web build into the android project
```

## Step 4 — Open in Android Studio and build the APK

```bash
npm run android:open   # opens the android/ folder in Android Studio
```

In Android Studio:

1. Wait for "Gradle sync" to finish (bottom status bar).
2. Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. When it finishes, click **locate** in the popup (bottom-right), or find it at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

That `app-debug.apk` is your app. Copy it to the phone (USB / Drive / WhatsApp),
tap it, allow "install from unknown sources" once, and it installs like any app.

---

## Optional — a signed release APK (recommended eventually)

A debug APK works forever but Android may show a warning over time. For a clean
release build, in Android Studio: **Build → Generate Signed Bundle / APK → APK**,
then **Create new…** keystore (fill the fields, keep the file + passwords safe).
Choose **release**. Output lands in `android/app/build/outputs/apk/release/`.

Reuse the same keystore for every future update so phones treat it as the same app.

---

## Updating the app later

Whenever the code changes (new features, fixes):

```bash
git pull
npm install
npm run build
npm run android:sync
npm run android:open      # then Build → Build APK(s) again
```

Share the new APK the same way. (There's no auto-update since it's not on the
Play Store — re-sharing the APK is the update.)

## iPhone (no build needed)

iPhone users just open your Vercel URL in **Safari → Share → Add to Home Screen**.
It behaves like an app and uses the same database, so entries sync both ways.
