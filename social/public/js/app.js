// app.js — bootstrap, nav routing, auth wiring
import { onAuth, signIn, signOutUser } from "./auth.js";
import { initPosts } from "./posts.js";
import { initCredentials } from "./credentials.js";
import { initLogs } from "./logs.js";
import { initImport } from "./csv.js";
import { initFeed } from "./feed.js";

const authGate   = document.getElementById("auth-gate");
const appEl      = document.getElementById("app");
const signInBtn  = document.getElementById("sign-in-btn");
const authErr    = document.getElementById("auth-err");
const layout     = document.getElementById("layout");
const logToggle  = document.getElementById("log-toggle");
const logCloseBtn = document.getElementById("log-close-btn");
const signOutBtn = document.getElementById("sign-out-btn");

// ── Auth ──────────────────────────────────────────────────────────────────────
signInBtn.addEventListener("click", () => {
  signInBtn.disabled = true;
  signInBtn.textContent = "Signing in…";
  authErr.style.display = "none";
  signIn().catch((e) => {
    signInBtn.disabled = false;
    signInBtn.textContent = "Sign in with Google";
    authErr.style.display = "block";
    authErr.textContent = e.message || "Sign-in failed. Check console for details.";
    console.error("Sign-in error:", e);
  });
});

signOutBtn.addEventListener("click", () => signOutUser());

onAuth((user, err) => {
  if (user) {
    authGate.classList.add("hidden");
    appEl.classList.remove("hidden");
    bootApp();
  } else if (err === "unauthorized") {
    authErr.style.display = "block";
    signInBtn.disabled = false;
    signInBtn.textContent = "Sign in with Google";
  } else {
    authGate.classList.remove("hidden");
    appEl.classList.add("hidden");
    signInBtn.disabled = false;
    signInBtn.textContent = "Sign in with Google";
  }
});

// ── Navigation ────────────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll("nav a[data-page]").forEach(a => a.classList.remove("active"));
  const section = document.getElementById(`page-${name}`);
  if (section) section.classList.add("active");
  const navLink = document.querySelector(`nav a[data-page="${name}"]`);
  if (navLink) navLink.classList.add("active");
}

document.querySelectorAll("nav a[data-page]").forEach(a => {
  a.addEventListener("click", () => showPage(a.dataset.page));
});

// ── Log panel ─────────────────────────────────────────────────────────────────
logToggle.addEventListener("click", () => {
  const opening = !layout.classList.contains("log-open");
  layout.classList.toggle("log-open");
  if (opening) {
    // Clear badge when opened
    const badge = document.getElementById("log-badge");
    badge.textContent = "0";
    badge.classList.remove("show");
  }
});

logCloseBtn.addEventListener("click", () => layout.classList.remove("log-open"));

// ── Boot ──────────────────────────────────────────────────────────────────────
let booted = false;
function bootApp() {
  if (booted) return;
  booted = true;
  initFeed();
  initPosts();
  initCredentials();
  initLogs();
  initImport();
}
