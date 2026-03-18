# Clockworks — Setup Guide

## What you have

| File | Purpose |
|------|---------|
| `index.html` | Your public website |
| `admin.html` | Your private content dashboard |
| `SETUP.md` | This guide |

---

## Step 1 — Create a Firebase Project (5 min)

1. Go to **[firebase.google.com](https://firebase.google.com)** and sign in with your Google account
2. Click **"Add project"** → name it `clockworks` → click through (disable Google Analytics if you want)
3. Once created, click the **`</>`** (Web) icon to add a web app
4. Name it `clockworks-site` → click **"Register app"**
5. Copy the `firebaseConfig` object — you'll need it in Step 2

---// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAgYsFRypLXu5yym-KIRS9GXqcRWGwrtkA",
  authDomain: "stonearchai.firebaseapp.com",
  projectId: "stonearchai",
  storageBucket: "stonearchai.firebasestorage.app",
  messagingSenderId: "815481121273",
  appId: "1:815481121273:web:182d13a485f645c9bdf528",
  measurementId: "G-6EB5L3V0P6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

## Step 2 — Add Your Firebase Config (2 min)

Open **both** `index.html` and `admin.html` in a text editor.

Find this block (near the bottom of each file, inside `<script>`):

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  ...
};
```

Replace the placeholder values with the ones Firebase gave you. Do this in **both files**.

---

## Step 3 — Set Up Firestore Database (2 min)

1. In the Firebase Console sidebar, click **"Build" → "Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in production mode"** → select your region (us-central1 is fine) → click **"Done"**
4. Click the **"Rules"** tab and replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read (public site)
    match /{document=**} {
      allow read: if true;
    }
    // Only logged-in admins can write
    match /{document=**} {
      allow write: if request.auth != null;
    }
  }
}
```

5. Click **"Publish"**

---

## Step 4 — Create Your Admin Login (1 min)

1. In Firebase Console sidebar, click **"Build" → "Authentication"**
2. Click **"Get started"**
3. Click **"Email/Password"** → enable it → **"Save"**
4. Click the **"Users"** tab → **"Add user"**
5. Enter your email and a strong password → **"Add user"**

This is how you'll log into `admin.html`.

---

## Step 5 — Seed Your Content (2 min)

1. Open `admin.html` in your browser (you can just double-click the file locally)
2. Sign in with the email/password you just created
3. Your site already has default content built in — it shows automatically
4. To save the defaults to Firestore permanently: edit any item and save it, which triggers a write

---

## Step 6 — Deploy to Firebase Hosting (5 min)

This gives you a free, fast URL like `clockworks.web.app` that you can point your Namecheap domain at.

### Install Firebase CLI (one-time)
```bash
npm install -g firebase-tools
firebase login
```

### Deploy
```bash
cd "/path/to/your/Stonearch AI folder"
firebase init hosting
# Select your project → public directory: . (dot) → single-page app: No → overwrite index.html: No
firebase deploy
```

Your site is now live at `https://YOUR_PROJECT_ID.web.app`

---

## Step 7 — Point Your Namecheap Domain

1. In Firebase Console → **Hosting** → **"Add custom domain"**
2. Enter your domain (e.g., `clockworksai.com`)
3. Firebase gives you two **A records** (IP addresses)
4. Log into **Namecheap** → go to your domain → **"Manage"** → **"Advanced DNS"**
5. Delete any existing A records for `@`
6. Add the two A records Firebase gave you
7. Wait 10–30 min for DNS to propagate

---

## How the Admin Works

| Tab | What you can do |
|-----|----------------|
| **Blog Posts** | Add, edit, delete posts. Click a post on the site to expand the full content. |
| **AI Wins** | Edit the 6 win cards on the home page |
| **Industries** | Edit the rotating ticker in the hero section |
| **Testimonials** | Edit the quote cards |
| **FAQ** | Edit the accordion questions/answers |
| **Submissions** | See everyone who filled out the contact form |

All changes save instantly to Firestore and appear on your live site on the next page load.

---

## Connecting a Real Contact Form Email (optional)

Right now form submissions are stored in Firestore (visible in the Submissions tab).
To also get an email notification, set up a **Firebase Cloud Function** or use a free service like:
- **[Formspree](https://formspree.io)** — replace the form's submit handler with a Formspree endpoint
- **[EmailJS](https://emailjs.com)** — send email directly from the browser, no backend needed

---

## Troubleshooting

**"Firebase: Error (auth/invalid-api-key)"** → Your firebaseConfig values aren't filled in yet (Step 2)

**Content not showing / spinner stuck** → Firestore rules may be blocking reads. Double-check Step 3.

**"Permission denied" when saving** → You're not logged in, or the write rules aren't set up (Step 3).

**Site shows default content, not my edits** → The config document in Firestore may not exist yet. Make one edit and save it from the admin panel.
