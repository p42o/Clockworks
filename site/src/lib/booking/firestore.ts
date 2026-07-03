import type { AuditProvider, AuditRequest } from "./provider";
import { summarize } from "./provider";

/**
 * Logs the request into the existing `stonearchai` Firestore `formLogs`
 * collection via the REST API — same collection and field shape the legacy
 * contact modal writes and admin.html reads, so audit requests show up in
 * Parker's existing admin portal with zero changes there.
 *
 * Uses REST instead of the Firebase SDK to keep ~100KB of JS off a page
 * that only ever performs one write.
 */

const PROJECT = "stonearchai";
const API_KEY = "AIzaSyAgYsFRypLXu5yym-KIRS9GXqcRWGwrtkA"; // public web config, same as legacy site
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

type FsValue =
  | { stringValue: string }
  | { timestampValue: string };

function fields(req: AuditRequest): Record<string, FsValue> {
  return {
    name: { stringValue: `${req.name} (${req.business})` },
    email: { stringValue: req.email },
    subject: { stringValue: "AI Time & Lead Audit request" },
    message: { stringValue: summarize(req) },
    destination: { stringValue: "discord" },
    status: { stringValue: "sent" },
    page: { stringValue: req.page },
    timestamp: { timestampValue: req.submittedAt },
    trade: { stringValue: req.trade },
    painPoint: { stringValue: req.painPoint },
    phone: { stringValue: req.phone },
    preferred: { stringValue: req.preferred },
  };
}

export const firestoreProvider: AuditProvider = {
  name: "firestore-formLogs",
  async submit(req) {
    const res = await fetch(`${BASE}/formLogs?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: fields(req) }),
    });
    return res.ok;
  },
};

/** Reads the same runtime settings doc the legacy modal used (webhook override). */
export async function getWebhookOverride(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/siteContent/formSettings?key=${API_KEY}`);
    if (!res.ok) return null;
    const doc = (await res.json()) as {
      fields?: { discordWebhook?: { stringValue?: string } };
    };
    return doc.fields?.discordWebhook?.stringValue || null;
  } catch {
    return null;
  }
}
