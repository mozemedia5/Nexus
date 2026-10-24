# Secure administrator access — Nexus A Liverton Store

Administrator sign-in uses Firebase Authentication. The browser never decides that someone is an administrator: every admin session and privileged API request is checked on the server against a verified Firebase ID token and a server-issued custom claim.

## Configure the first administrator

1. In Firebase Console, enable **Authentication → Email/Password** and email verification. Create the owner’s Firebase Auth account and verify its email. Do not use an account that is also used by untrusted people.
2. Configure the existing public Firebase web-app settings as `VITE_FIREBASE_CONFIG_JSON`. These values identify the Firebase project; they are not administrator credentials.
3. Configure these **server-only** environment variables in the production runtime (and local `.env` when needed):
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: a Firebase service-account JSON with Firebase Authentication and Firestore administrative access. Never prefix this with `VITE_` or commit it.
   - `NEXUS_INITIAL_ADMIN_EMAIL`: the exact, already-verified email of the initial owner account.
4. Deploy the application. Sign in to `/admin` with the Firebase account. The server verifies the token and verified email, assigns the owner’s protected `admin: true` and `role: "superadmin"` custom claims, and returns the session. The client refreshes its Firebase ID token so subsequent requests carry those claims.
5. After the bootstrap owner has successfully accessed the console and custom claims are in place, remove `NEXUS_INITIAL_ADMIN_EMAIL` from the runtime configuration and redeploy. The server-issued claims continue to authorize the owner.

If no bootstrap variable is configured, an initial administrator can instead be granted Firebase custom claims through a trusted one-off Firebase Admin SDK operation. Never grant claims from browser code or from a user-editable Firestore document.

## Sign in and administer accounts

Go to `/admin` and sign in with the authorized Firebase email and password. The account must have a verified email and must be enabled in Firebase Authentication. Firebase ID tokens are sent in the `Authorization: Bearer …` header; the server verifies their signature, expiry, revocation status, email verification, and admin custom claims on every privileged request. Admin state is not persisted in localStorage.

Only a superadministrator can manage administrators. The Admin Accounts page can promote an **existing, active, email-verified Firebase user** to store admin. That user must sign in again after promotion so Firebase issues a token containing the new claim. Revoking an admin removes the server-issued claims, revokes refresh tokens, and disables the registry entry. The bootstrap superadministrator and the currently signed-in superadministrator cannot be removed from that page.

Use Firebase’s password policy and account-protection controls. For stronger assurance, enable multi-factor authentication for administrator accounts in Firebase Authentication.

## Firestore security rules

Deploy the repository’s `firestore.rules` in **Firebase Console → Firestore Database → Rules**, or with the Firebase CLI after selecting the intended project. The rules deny all direct client reads and writes to `nexus_admins`; the Admin SDK remains able to manage it. Admin-only campaign/profile access uses the server-issued `request.auth.token.admin` custom claim. Reserved Cari conversations are server-only.

Verify the Firebase project before publishing rules: Firestore rules affect the selected project immediately. The source file is the intended rule set; the Firebase Console does not automatically adopt repository changes.

## Removed legacy behavior

Embedded passkeys, passkey hints, email-substring promotion (for example, addresses containing “admin”), and browser-editable admin-session records are no longer accepted. Old passkey strings remain in Git history from earlier commits, but the new application does not recognize them; do not reuse them as Firebase passwords or other secrets.
