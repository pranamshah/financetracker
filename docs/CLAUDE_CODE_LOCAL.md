# Instructions for Claude Code (running locally on your computer)

Paste this whole file to Claude Code **on your own machine** (not the web
version) to have it build the Android APK for you. It automates everything
except the final Android Studio button press (which needs a GUI).

---

## Task for Claude Code

You are helping build an Android APK for the "Finance Tracker" app (a Vite +
React PWA with a Capacitor Android shell). Do the following, checking each step
succeeds before moving on:

1. Confirm prerequisites are installed; if missing, tell the user and stop:
   - `node --version` (need 18+)
   - `java -version` (need JDK 17)
   - Android SDK present (env var `ANDROID_HOME` or `ANDROID_SDK_ROOT` set, or
     `~/Android/Sdk` / `~/Library/Android/sdk` exists)

2. In the project root, ensure a `.env` file exists containing:
   ```
   VITE_API_BASE=<the user's deployed Vercel URL>
   ```
   Ask the user for the URL if it's not already set. This is required — without
   it the APK cannot reach the database.

3. Run:
   ```
   npm install
   npm run build
   npm run android:add      # skip if an android/ folder already exists
   npm run android:sync
   ```

4. Build the APK **without the GUI** using Gradle directly:
   ```
   cd android
   ./gradlew assembleDebug          # on Windows: gradlew.bat assembleDebug
   ```
   The APK is written to:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

5. Tell the user the exact path to the finished APK and how to install it
   (copy to phone, tap, allow "unknown sources" once).

If `./gradlew assembleDebug` fails due to a missing Android SDK component,
report the exact error and the SDK package it needs — do not attempt to
download SDK licenses non-interactively unless the user approves.

Notes:
- Never commit the `.env` file or the `android/` folder (both are gitignored).
- For a signed release APK, guide the user through creating a keystore and run
  `./gradlew assembleRelease` after configuring signing in
  `android/app/build.gradle`.
