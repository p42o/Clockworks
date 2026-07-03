/**
 * Provider-abstracted audit intake.
 *
 * The UI only ever calls `submitAudit()`. Swapping the backend (Cal.com,
 * a real CRM, an email service) means writing one new provider and changing
 * the list in `index.ts` — the flow component never changes.
 */

export type AuditRequest = {
  name: string;
  business: string;
  trade: string;
  painPoint: string;
  detail: string;
  email: string;
  phone: string;
  preferred: string;
  page: string;
  submittedAt: string; // ISO
};

export type SubmitResult = {
  delivered: boolean; // reached a channel Parker actually reads
  logged: boolean; // persisted somewhere durable
};

export interface AuditProvider {
  readonly name: string;
  submit(req: AuditRequest): Promise<boolean>;
}

export function summarize(req: AuditRequest): string {
  return [
    `Trade: ${req.trade}`,
    `Biggest time-sink: ${req.painPoint}`,
    req.detail ? `In their words: ${req.detail}` : null,
    req.phone ? `Phone: ${req.phone}` : null,
    `Preferred time: ${req.preferred}`,
  ]
    .filter(Boolean)
    .join("\n");
}
