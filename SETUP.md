# Setup Guide

Follow these steps in order. None of them require git commands — everything
can be done through the GitHub website and the Firebase/Vercel consoles
(step 0 uses the VS Code workflow you just set up).

## 0. Get these files into your repo

1. Open your cloned `cutecomplaints` folder in VS Code.
2. Copy all the files from this package into that folder, overwriting
   the old ones (`index.html`, `view.html`, `read.js`, `submit.js`,
   `style.css`, `auth.js`, `firebase-config.js`, `firebase-rules.json`,
   `.gitignore`, `README.md`, `SETUP.md`).
3. In VS Code's Source Control tab, review the diffs, write a commit
   message like "Add passphrase auth, login, voice messages, last seen",
   commit, then push (or use `git add .`, `git commit -m "..."`,
   `git push` in the terminal).

## 1. Rotate your Firebase API key (do this first)

Your old API key has been sitting in a public repo, so treat it as
burned even though we're locking things down.

1. Go to the [Firebase Console](https://console.firebase.google.com) →
   your project → ⚙️ Project Settings → General.
2. Under "Your apps", you can't directly rotate a web app's API key from
   here — instead, go to
   [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
   (same project).
3. Find the API key matching your Firebase web app, click it, and under
   "Application restrictions" choose **HTTP referrers** and add your
   site's domain (e.g. `cutecomplaints.vercel.app/*`). This stops the key
   from being usable from any other website even if someone copies it.
4. (Optional, more thorough) Click "Regenerate Key" to get a brand new
   key, then update `firebase-config.js` with the new value.

## 2. Set up Firebase Authentication (for your view page)

1. Firebase Console → Build → Authentication → Get Started.
2. Enable **Email/Password** sign-in method.
3. Go to the "Users" tab → Add User. Use your own email and a strong
   password — this is the login you'll use on `view.html`. Don't share
   this with anyone, including her.

## 3. Set your Database Rules

1. Firebase Console → Build → Realtime Database → Rules tab.
2. First, decide on her passphrase (something only she'd know, e.g. a
   memory between you two — not "password123").
3. Open `view.html` in a browser temporarily, open the browser console
   (F12), and run:
   ```js
   await hashPassphrase("her-passphrase-here")
   ```
   (This works because `auth.js` is loaded on the page.) Copy the long
   hex string it prints.
4. Open `firebase-rules.json` from this repo, replace **both**
   occurrences of `PUT_HER_PASSPHRASE_HASH_HERE` with that hash, paste
   the whole thing into the Firebase Rules editor, and click Publish.

This means: she needs the right passphrase to send a message, and only
you (logged in) can read or delete messages. Nobody else can do either,
regardless of who finds the site or the repo.

## 4. Make the GitHub repo private

1. On GitHub, go to your repo → Settings → scroll to "Danger Zone" →
   "Change repository visibility" → Private.
2. Note: this will **immediately unpublish** your current GitHub Pages
   site, because Pages on a free account requires the repo to be public.
   That's expected — you're moving hosting in the next step.

## 5. Deploy with Vercel instead of GitHub Pages

1. Go to [vercel.com](https://vercel.com) → sign up using your GitHub
   account.
2. Click "Add New Project" → select your `cutecomplaints` repo (Vercel
   can access private repos once you authorize it).
3. Framework preset: choose "Other" (it's a static site, no build step
   needed). Leave build/output settings blank/default.
4. Click Deploy. You'll get a URL like `cutecomplaints.vercel.app` or
   similar.
5. Send her the new link to `index.html` (e.g.
   `https://cutecomplaints.vercel.app/index.html` or
   `https://cutecomplaints.vercel.app/` if you rename it to be the
   homepage).
6. Bookmark `https://cutecomplaints.vercel.app/view.html` for yourself.

Every time you push a change to GitHub, Vercel auto-redeploys — no extra
steps needed.

## 6. First-time use

- **Her side:** first time she sends a message, the page will prompt
  her once for the passphrase. It's then remembered on her device
  (saved in the browser, not sent anywhere in plain text). She can now
  also record a short voice message (up to 1 minute) instead of, or
  alongside, typing. She'll see a "He last saw your messages: ..." line
  at the top — this updates automatically whenever you open and log
  into `view.html`, or whenever you tap "Mark as seen 👀" there.
- **Your side:** open `view.html`, log in with the email/password you
  created in step 2. Your browser will usually keep you logged in after
  that. Voice messages appear as a small audio player you can tap to
  play.

## If something goes wrong

- "Permission denied" when she sends a message → the passphrase hash in
  the Rules doesn't match. Re-run step 3.3 carefully (it's case- and
  character-sensitive) and re-publish the rules.
- "Permission denied" when you try to view → make sure you're logged in
  (check the login box isn't still showing on `view.html`).
- Vercel deploy fails → check the deployment log on vercel.com, it's
  usually a missing/renamed file.
