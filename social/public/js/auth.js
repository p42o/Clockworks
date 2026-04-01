// auth.js
// Replace REPLACE_WITH_YOUR_UID with your Google UID after first sign-in.
// Find it at: Firebase Console → Authentication → Users

import { auth } from "./firebase-init.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Add your Google UID here after first sign-in attempt
const ALLOWED_UIDS = ["mGiLYpxQRgSSpAO1hcKXaed6hbH3"];

const provider = new GoogleAuthProvider();

export function signIn() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

export function onAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (!ALLOWED_UIDS.includes(user.uid)) {
        await signOut(auth);
        callback(null, "unauthorized");
        return;
      }
      callback(user, null);
    } else {
      callback(null, null);
    }
  });
}
