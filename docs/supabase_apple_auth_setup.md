# Sign in with Apple — Configuration & Setup Guide

This guide walks you through configuring **Sign in with Apple** on both the **Apple Developer Portal** and the **Supabase Dashboard** for Linkiac (Web & Mobile).

---

## 1. How It Works in Linkiac

- **Web App (`apps/web`)**: Uses standard OAuth redirect flow via `supabase.auth.signInWithOAuth({ provider: 'apple' })`. Users are redirected to Apple's authentication page and returned to your callback URL with an active Supabase session.
- **iOS Mobile App (`apps/mobile`)**: Uses native iOS Face ID / Touch ID / Passcode prompt via `expo-apple-authentication` (`signInAsync`). It receives a signed Apple `identityToken` and exchanges it directly with Supabase via `supabase.auth.signInWithIdToken({ provider: 'apple', token })`. This eliminates browser redirects on mobile devices.

---

## 2. Apple Developer Portal Setup

> You will need an active [Apple Developer Program](https://developer.apple.com/account/) account.

### Step 2.1: Verify App ID (for iOS Native)
1. Go to **Certificates, Identifiers & Profiles** → **Identifiers**.
2. Select your App ID (e.g., `eu.linkiac.app`, matching `ios.bundleIdentifier` in `apps/mobile/app.json`).
3. Under **Capabilities**, ensure **Sign In with Apple** is checked.
4. Click **Save**.

### Step 2.2: Create Services ID (for Web OAuth)
1. In **Certificates, Identifiers & Profiles** → **Identifiers**, click the blue **`+`** icon.
2. Select **Services IDs** and click **Continue**.
3. Description: `Linkiac Web Auth`
4. Identifier: e.g., `eu.linkiac.web` (or `eu.linkiac.service`). Note this value down.
5. Click **Continue** and **Register**.
6. Click on the newly created Services ID to configure it.
7. Check the box next to **Sign In with Apple**, then click **Configure**:
   - **Primary App ID**: Select your Linkiac App ID (`eu.linkiac.app`).
   - **Domains and Subdomains**: Enter your Supabase project domain without `https://` (e.g., `<your-project-ref>.supabase.co`). If you also host your web app on your custom domain (e.g., `linkiac.eu`, `app.linkiac.eu`), include them as well.
   - **Return URLs**: Enter your Supabase OAuth callback URL:
     ```text
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
8. Click **Next** → **Done** → **Save**.

### Step 2.3: Generate Private Key (`.p8`)
1. In **Certificates, Identifiers & Profiles**, go to **Keys** and click **`+`**.
2. Key Name: `Linkiac Apple Auth Key`.
3. Check **Sign in with Apple**, then click **Configure** on the right.
4. Select your **Primary App ID** (`eu.linkiac.app`).
5. Click **Save** → **Continue** → **Register**.
6. **Important**:
   - Note down the **Key ID** (10-character string).
   - Click **Download** to download the `.p8` private key file (e.g., `AuthKey_XXXXXXXXXX.p8`).
   - *Note: Apple only lets you download this file once. Store it securely.*

### Step 2.4: Locate your Team ID
1. In your Apple Developer account, click your account name in the top right or go to **Membership Details**.
2. Note your **Team ID** (a 10-character alphanumeric string).

---

## 3. Supabase Dashboard Configuration

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **Authentication** → **URL Configuration**:
   - **Site URL**: `https://linkiac.eu`
   - **Redirect URLs**: Add the following:
     ```text
     https://linkiac.eu/**
     https://*.linkiac.eu/**
     http://localhost:3000/**
     linkiac://**
     eu.linkiac.app://**
     ```
3. Go to **Authentication** → **Providers** in the sidebar.
4. Scroll down and click on **Apple** to expand its settings.
5. Toggle **Enable Sign in with Apple** to ON.
6. Fill in the required fields:
   - **Services ID / Client ID**: The Services ID created in Step 2.2 (e.g., `eu.linkiac.web`).
   - **Apple Team ID**: Your 10-character Team ID from Step 2.4.
   - **Apple Key ID**: The 10-character Key ID from Step 2.3.
   - **Apple Secret Key / Private Key**: Open the `.p8` file downloaded in Step 2.3 in a text editor and copy the entire contents (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`), then paste it here.
   - **Authorized Client IDs (Required for iOS Native App)**:
     - Add your iOS Bundle Identifier: `eu.linkiac.app` (comma-separated if multiple).
     - *Why this is required*: When the native iOS app authenticates via `expo-apple-authentication`, Apple issues an identity token whose audience (`aud`) is the iOS App ID (`eu.linkiac.app`), not the Services ID. Listing it here allows Supabase to accept tokens from both the Web and the native iOS app.
7. Click **Save**.

---

## 4. Testing & Verification Checklist

### Web App Verification
1. Navigate to `/login` or `/signup` on Linkiac Web.
2. Click **Continue with Apple**.
3. You should be directed to `appleid.apple.com`.
4. Sign in with an Apple ID (or choose to share / hide your email address).
5. You should be redirected back to Linkiac and logged into your library (`/library`).

### Mobile App Verification
1. Run the mobile application on an iOS Simulator or physical iOS device with an Apple ID signed in:
   ```bash
   pnpm dev:mobile
   ```
2. On the login screen, verify that the **"Continue with Apple"** button appears below the divider.
3. Tap the button. The native iOS sheet (Face ID / Passcode) will present.
4. Confirm authentication.
5. The app verifies the token with Supabase and navigates immediately into the main tabs (`/(tabs)/library`).
6. On Android devices or non-iOS environments, `AppleAuthentication.isAvailableAsync()` automatically evaluates to `false`, gracefully hiding the button.

---

## 5. Troubleshooting & FAQ

- **Error: "invalid_client" during Web OAuth redirect**:
  - Verify that the Return URL in Apple Developer Portal (`https://<project-ref>.supabase.co/auth/v1/callback`) matches your Supabase project reference exactly.
  - Verify the `.p8` private key, Key ID, and Team ID in the Supabase Dashboard.
- **Error: "Token signature is invalid" or "Audience mismatch" on Mobile**:
  - Ensure `eu.linkiac.app` is added to **Authorized Client IDs** in the Supabase Apple provider settings.
- **Apple Private Relay emails (`...@privaterelay.appleid.com`)**:
  - When users choose "Hide My Email", Apple generates an anonymous private relay address. Supabase handles this seamlessly as the user's primary auth email.
