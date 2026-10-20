// Firestore subscriptions (read) and the few direct client writes the rules allow.
// All subscribe* functions return an unsubscribe handle. Paths follow ARCHITECTURE section 3.
import {
  collection, doc, query, orderBy, onSnapshot, writeBatch, addDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { fb } from "./env.js";
import { state } from "./session.js";

const cid = () => state.cid;
const view = (name) => doc(fb.db, "clients", cid(), "clientView", name);
const snapData = (d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) });

function watchDoc(ref, cb, onErr) {
  return onSnapshot(ref, (s) => cb(s.exists() ? snapData(s) : null), (e) => onErr?.(e));
}
export const subscribeHome = (cb, err) => watchDoc(view("home"), cb, err);
export const subscribeProfile = (cb, err) => watchDoc(view("profile"), cb, err);
export const subscribeAccount = (cb, err) => watchDoc(view("account"), cb, err);

function watchList(q, cb, onErr, map = snapData) {
  return onSnapshot(q, (s) => cb(s.docs.map(map)), (e) => onErr?.(e));
}
export const subscribeThreads = (cb, err) =>
  watchList(query(collection(fb.db, "clients", cid(), "threads"), orderBy("lastMessageAt", "desc")), cb, err);

/** Messages of a thread. Hidden messages are dropped, except the client's own, which become a notice. */
export function subscribeMessages(tid, cb, err) {
  const q = query(collection(fb.db, "clients", cid(), "threads", tid, "messages"), orderBy("createdAt"));
  return watchList(q, (rows) => cb(rows.flatMap((m) => {
    if (m.hidden === true) return m.authorUid === state.user?.uid ? [{ id: m.id, notice: true, createdAt: m.createdAt }] : [];
    return [m];
  })), err);
}
export const subscribeSuggestions = (cb, err) =>
  watchList(query(collection(fb.db, "clients", cid(), "suggestions"), orderBy("publishedAt", "desc")), cb, err);
export const subscribeResponses = (sid, cb, err) =>
  watchList(query(collection(fb.db, "clients", cid(), "suggestions", sid, "responses"), orderBy("at", "desc")), cb, err);
export function subscribeSuggestion(sid, cb, err) {
  return watchDoc(doc(fb.db, "clients", cid(), "suggestions", sid), cb, err);
}

// ---------- direct writes (keys must match firestore.rules exactly) ----------
const clientMsg = (text) => ({ by: "client", authorUid: state.user.uid, text, createdAt: serverTimestamp() });

/** Thread + first message in one atomic batch. Returns the new thread id. */
export async function createThread({ subject, text, linkedKind, linkedSuggestionId, linkedNeedId, files = [] }) {
  const tref = doc(collection(fb.db, "clients", cid(), "threads"));
  const t = {
    subject: String(subject).slice(0, 120), state: "open", createdBy: state.user.uid,
    createdAt: serverTimestamp(), lastMessageAt: serverTimestamp(), lastBy: "client",
  };
  if (linkedKind) t.linkedKind = linkedKind;               // general | suggestion | need
  if (linkedSuggestionId) t.linkedSuggestionId = linkedSuggestionId;
  if (linkedNeedId) t.linkedNeedId = linkedNeedId;
  const b = writeBatch(fb.db);
  b.set(tref, t);
  const attachments = await uploadAttachments(tref.id, files);
  b.set(doc(collection(tref, "messages")), { ...clientMsg(text), ...(attachments.length ? { attachments } : {}) });
  await b.commit();
  return tref.id;
}
export async function postMessage(tid, text, files = []) {
  const attachments = await uploadAttachments(tid, files);
  await addDoc(collection(fb.db, "clients", cid(), "threads", tid, "messages"), { ...clientMsg(text), ...(attachments.length ? { attachments } : {}) });
}
export async function respondToIdea(sid, value, threadId) {
  const r = { value, byUid: state.user.uid, at: serverTimestamp() }; // value: interested | not_now | asked
  if (threadId) r.threadId = threadId;
  await addDoc(collection(fb.db, "clients", cid(), "suggestions", sid, "responses"), r);
}
async function uploadAttachments(tid, files) {
  if (files.length > 3) throw new Error('Choose up to three files.');
  const allowed = ['image/png','image/jpeg','image/webp','image/heic','application/pdf'];
  if (files.some(f => !allowed.includes(f.type) || f.size >= 20*1024*1024)) throw new Error('Use images or PDFs smaller than 20 MB.');
  const attachments = [];
  for (const file of files) {
    const path = `clients/${cid()}/client-uploads/${tid}/${crypto.randomUUID()}`;
    await uploadBytes(ref(fb.storage,path), file, { contentType:file.type });
    attachments.push({ path, name:file.name.slice(0,120), size:file.size, contentType:file.type });
  }
  return attachments;
}

export const subscribeThread = (tid, cb, err) => watchDoc(doc(fb.db, "clients", cid(), "threads", tid), cb, err);
