// Environment + Firebase wiring for the client portal.
// localhost/127.0.0.1 -> the local emulators (project demo-clockworks-v3), as before.
// mnclockworks.com (live site; Parker approved go-live 2026-10-20) -> project clockworks-portal-pgs.
// Any other host initialises nothing: the app shows a gate.
// PROD_CONFIG is the public web config (it identifies the project; rules + server checks guard access).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

import { getStorage, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const REGION = "us-central1";
export const DEV_PROJECT = "demo-clockworks-v3";

export function isLocalDev() {
  return ["localhost", "127.0.0.1"].includes(location.hostname);
}
export function isLiveSite() {
  return ["mnclockworks.com", "www.mnclockworks.com"].includes(location.hostname);
}
const PROD_CONFIG = {
  apiKey: "AIzaSyB5sn7HYChDBS6MPD905Q0kUFWr5MmWn64",
  authDomain: "clockworks-portal-pgs.firebaseapp.com",
  projectId: "clockworks-portal-pgs",
  storageBucket: "clockworks-portal-pgs.firebasestorage.app",
  messagingSenderId: "938718948945",
  appId: "1:938718948945:web:03b5c58433662518f7d270",
};

// Filled by initFirebase(); stays all-null on non-local hosts.
export const fb = { app: null, auth: null, db: null, fns: null, storage: null };

export function initFirebase() {
  if (fb.app) return true;
  if (isLiveSite()) {
    const app = initializeApp(PROD_CONFIG, "cw-client");
    Object.assign(fb, { app, auth: getAuth(app), db: getFirestore(app), fns: getFunctions(app, REGION), storage: getStorage(app) });
    return true;
  }
  if (!isLocalDev()) return false;
  const app = initializeApp({
    apiKey: "demo-key",
    projectId: DEV_PROJECT,
    authDomain: "demo-clockworks-v3.firebaseapp.com",
    storageBucket: "demo-clockworks-v3.appspot.com",
  }, "cw-client");
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const fns = getFunctions(app, REGION);
  connectFunctionsEmulator(fns, "127.0.0.1", 5001);
  const storage = getStorage(app);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  Object.assign(fb, { app, auth, db, fns, storage });
  return true;
}

// A second Auth app so a password check never touches the client session listener.
let bridge = null;
export function passwordBridge() {
  initFirebase();
  if (bridge) return bridge;
  if (isLiveSite()) {
    const app = initializeApp(PROD_CONFIG, "cw-password-bridge");
    bridge = { auth: getAuth(app), fns: getFunctions(app, REGION) };
    return bridge;
  }
  if (!isLocalDev()) throw new Error("local only");
  const app = initializeApp({
    apiKey: "demo-key",
    projectId: DEV_PROJECT,
    authDomain: "demo-clockworks-v3.firebaseapp.com",
  }, "cw-password-bridge");
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const fns = getFunctions(app, REGION);
  connectFunctionsEmulator(fns, "127.0.0.1", 5001);
  bridge = { auth, fns };
  return bridge;
}
