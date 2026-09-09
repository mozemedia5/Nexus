# Firebase Administrator Setup Guide — Nexus A Liverton Store

This document explains how to set up administrator access, customer accounts, and Firebase Firestore security rules for **Nexus A Liverton Store**.

---

## 1. Firebase Project Setup

### Prerequisites
- A Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- Firebase Authentication enabled (Email/Password, Google, and Apple providers)
- Firestore Database created

### Enable Authentication Providers
1. Go to **Firebase Console → Authentication → Sign-in method**
2. Enable **Email/Password** provider
3. Enable **Google** provider (requires a project-level support email)
4. Enable **Apple** provider (requires an Apple Developer account with Sign in with Apple capability)

### Get Your Firebase Config
1. Go to **Firebase Console → Project Settings → General**
2. Scroll to "Your apps" → click the web app icon (`</>`) if you haven't added one
3. Copy the `firebaseConfig` object values
4. Add them to your Freebuff/Freebuff Environment **Settings → Keys** tab:

| Environment Variable | Value |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Your Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Your project.firebaseapp.com |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Your project.appspot.com |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |

---

## 2. Firebase Administrator Collection Setup (`nexus_admins`)

To grant administrative access for managing store promotional campaigns, discounts, and order configurations in Firebase Firestore:

### Collection Name
`nexus_admins`

### Required Fields for Administrator Documents

Each document in `nexus_admins` should use the admin's unique Firebase Auth `uid` as the Document ID.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `uid` | `string` | The Firebase Authentication User ID. |
| `fullName` | `string` | Administrator's full name (e.g. `System Administrator`). |
| `email` | `string` | Administrator's registered email address. |
| `role` | `string` | Role name, set to `"superadmin"` or `"admin"`. |
| `isAdmin` | `boolean` | Must be set to `true`. |
| `adminAccessToken` | `string` | Admin security passkey (default: `nexus-admin-2026`). |
| `createdAt` | `timestamp` | Firestore server timestamp when created (`request.time`). |
| `updatedAt` | `timestamp` | Firestore server timestamp when modified. |

### Step-by-Step Admin Setup

1. **Create the admin user in Firebase Authentication first:**
   - Go to **Firebase Console → Authentication → Users**
   - Click **Add user**
   - Enter the admin's email and a strong password
   - Note the **User UID** that Firebase assigns

2. **Create the admin document in Firestore:**
   - Go to **Firebase Console → Firestore Database**
   - Create a collection named `nexus_admins`
   - Add a new document with the **Document ID** set to the admin's Firebase Auth UID
   - Fill in the fields from the table above

### Sample Document JSON

```json
{
  "uid": "aB1cD2eF3gH4iJ5kL6mN",
  "fullName": "Nexus Store Admin",
  "email": "admin@nexus.com",
  "role": "superadmin",
  "isAdmin": true,
  "adminAccessToken": "nexus-admin-2026",
  "createdAt": "2026-03-30T10:00:00Z",
  "updatedAt": "2026-03-30T10:00:00Z"
}
```

---

## 3. Customer User Collection Setup (`nexus_users`)

When users sign in or register on the site to unlock exclusive promotional discounts, their profiles are stored in the `nexus_users` collection:

### Collection Name
`nexus_users`

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `uid` | `string` | Unique user ID. |
| `fullName` | `string` | Customer's full name. |
| `email` | `string` | Customer's email. |
| `hasDiscountEligible` | `boolean` | Set to `true` when customer signs in to receive exclusive deals. |
| `registeredAt` | `timestamp` | Date registered. |

**Note:** The `nexus_users` collection documents are created automatically when a customer registers through the login/register page. No manual setup is required for standard customer accounts.

---

## 4. Firebase Security Rules (`firestore.rules`)

Deploy these rules to your Firebase Firestore console to protect customer data and reserve campaign management exclusively to authenticated administrators:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is an admin
    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/nexus_admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/nexus_admins/$(request.auth.uid)).data.isAdmin == true;
    }

    // Admins Collection
    match /nexus_admins/{adminId} {
      allow read, write: if request.auth != null && (request.auth.uid == adminId || isAdmin());
    }

    // Users Collection (Customers)
    match /nexus_users/{userId} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow create: if true;
    }

    // Campaigns Collection
    match /nexus_campaigns/{campaignId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Reserved Cari AI Conversations
    match /nexus_cari_conversations/{conversationId} {
      allow create, read, update: if true;
    }
  }
}
```

### How to Deploy Rules
1. Go to **Firebase Console → Firestore Database → Rules**
2. Paste the rules above
3. Click **Publish**

---

## 5. Default Admin Credentials

- **Admin Passkey / Access Token:** `nexus-admin-2026`
- **OAuth Options:** Google Sign-In & Apple Sign-In supported via the Login page

---

## 6. Admin Access via the Application

1. Navigate to `/admin` in the browser
2. Click **Sign In** and enter the admin passkey: `nexus-admin-2026`
3. Once authenticated, you can manage campaigns and view customer activity

---

## 7. How Customer Login Works

1. Navigate to `/login` in the browser
2. Customers can sign in using:
   - **Google** — one-click OAuth
   - **Apple** — one-click OAuth
   - **Email/Password** — traditional email + password
3. New customers can register at `/register`
4. Upon registration, a customer profile is automatically created in the `nexus_users` collection with `hasDiscountEligible: true`
