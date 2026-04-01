// firebase-init.js
// Replace all REPLACE_WITH_YOUR_* values with your Firebase project config.
// Find it at: Firebase Console → Project Settings → Your apps → Web app → Config

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCYXFJ1F1WawzkaKOTqgsQKzvcO2n8fjpk",
  authDomain:        "clockwork-social.firebaseapp.com",
  projectId:         "clockwork-social",
  storageBucket:     "clockwork-social.firebasestorage.app",
  messagingSenderId: "749630699708",
  appId:             "1:749630699708:web:6b6094dfc8a9d2967178b9"
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
