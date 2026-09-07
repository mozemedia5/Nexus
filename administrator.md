# Firebase Administrator Setup Guide — Nexus A Liverton Store

This document explains how to set up administrator access, customer accounts, and Firebase Firestore security rules for **Nexus A Liverton Store**.

---

## 1. Firebase Administrator Collection Setup (`nexus_admins`)

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

## 2. Customer User Collection Setup (`nexus_users`)

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

---

## 3. Firebase Security Rules (`firestore.rules`)

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
      allow read, write: if request.auth != null && request.auth.uid == adminId;
    }

    // Users Collection (Customers)
    match /nexus_users/{userId} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || isAdmin());
    }

    // Campaigns Collection
    match /nexus_campaigns/{campaignId} {
      allow read: if true; // Public read for live campaigns
      allow write: if isAdmin();
    }

    // Reserved Cari AI Conversations
    match /nexus_cari_conversations/{conversationId} {
      allow create, read, update: if true;
    }
  }
}
```

---

## 4. Default Admin Credentials

- **Admin Passkey / Access Token:** `nexus-admin-2026`
- **OAuth Options:** Google Sign-In & Apple Sign-In supported via Admin Portal.
