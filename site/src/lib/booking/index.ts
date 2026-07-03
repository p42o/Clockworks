import type { AuditRequest, SubmitResult } from "./provider";
import { discordProvider } from "./discord";
import { firestoreProvider } from "./firestore";

/**
 * Delivery = Discord (Parker reads it in minutes).
 * Log      = Firestore formLogs (shows up in admin.html).
 * Success  = at least one of the two landed; the UI offers a mailto fallback
 *            with the full request pre-filled if both somehow fail.
 */
export async function submitAudit(req: AuditRequest): Promise<SubmitResult> {
  const [delivered, logged] = await Promise.all([
    discordProvider.submit(req).catch(() => false),
    firestoreProvider.submit(req).catch(() => false),
  ]);
  return { delivered, logged };
}

export type { AuditRequest, SubmitResult } from "./provider";
