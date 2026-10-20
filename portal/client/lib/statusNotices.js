// Client-visible copies of the v1.1 notice templates. Kept equal to functions/lib/notices.js.
// COUNSEL-DRAFT-2026-10-19. Source: BILLING-COPY-v1.1-1WTioaCW-20261019.md. Nothing is sent.

export const ANNUAL_NOTICE_SUBJECT = `Your annual Care Plan notice`;
export const ANNUAL_NOTICE_BODY = `Hi {{client_name}},

This is your annual reminder that your Care Plan is continuous service and stays active until you cancel.

What is included: {{plan_tier}}, {{included_hours_or_sessions}} per month.

Your current terms: {{current_offer_terms_full_block}}.

Cancel anytime using [Cancel Care Plan]({{cancel_url}}) or email <parker@mnclockworks.com>. Cancellation is effective at the current paid month's end, no later than 31 days after verified notice unless you choose later. There is no cancellation fee. Your applicable refund terms: {{current_refund_terms}}.

Manage your plan here: {{portal_manage_url}}. Keep this email for your records.

PGS Ventures LLC d/b/a MN Clockworks <parker@mnclockworks.com>`;
export const SUSPENDED_SUBJECT = `Your Clockworks account is SUSPENDED`;
export const SUSPENDED_BODY = `Your account is SUSPENDED because {{suspension_reason}}. An active SOW or Care Plan remains. Portal access is off and work is paused as applicable. Your data is kept under its existing category retention rules; suspension does not extend a deletion deadline. Close has not been triggered.

Billing effect and resume date: {{signed_pause_or_failed_payment_terms}}. For failed payment, work pauses at day 15 and the plan ends at day 30 if unpaid. No late fees. You may still cancel with {{portal_cancel_url}} or <parker@mnclockworks.com>; an email route always remains available without login.

You can request data or receipts without login by emailing <parker@mnclockworks.com>. We check your email with a code and verify authority. Enter a Clockworks verification code only in its dedicated field. Never send any other account's code or credentials.`;
export const ARCHIVED_SUBJECT = `Your Clockworks account is ARCHIVED`;
export const ARCHIVED_BODY = `Your account is ARCHIVED. There is no active SOW or Clockworks subscription. Your engagement closed on {{close_date}}. Your 90 days of read only access to export files, receipts and data ends {{export_window_end_date}}. Download what you need during that window. Earlier intake deletion deadlines still apply.

After the window, portal access ends and noncontract records are deleted under the applicable retention schedules. Contract Record is kept for the relationship plus six years after the later of the last SOW ending or final payment. It includes receipts, signing and acceptance audit and the admin action log containing metadata only, including deletion proof by category and date. Longer voluntary retention needs your separate opt in; legally required holds affect only required records for the required period. Routine security and rate limit logs last 30 days. Backups age out within 35 days and deletions are reapplied after restore.

Receipts can be downloaded during this window and emailed on request for the six year retention period. Data requests work without login by email to <parker@mnclockworks.com>, with an email code check and authority verification. Enter the code only in its dedicated field.

Your agents and your Grok Bot subscription stay with you. Canceling with us does not cancel them, and you keep paying the Platform directly if you keep using it. Remove any access granted to Clockworks.`;

export function fillNotice(body, vars) {
  return String(body).replace(/\{\{([a-z0-9_]+)\}\}/g, (_, key) => {
    const v = vars?.[key];
    return v == null || String(v).trim() === '' ? '' : String(v);
  });
}

/** Local fixture fills. Real placeholders come from the client record when it has them. */
export const LOCAL_NOTICE_VARS = Object.freeze({
  suspension_reason: 'Parker turned portal access off',
  signed_pause_or_failed_payment_terms: 'Billing is off in this build. No charge is made from the portal.',
  portal_cancel_url: 'http://127.0.0.1:8830/portal/client/#/account',
  cancel_url: 'http://127.0.0.1:8830/portal/client/#/account',
  portal_manage_url: 'http://127.0.0.1:8830/portal/client/#/account',
});
