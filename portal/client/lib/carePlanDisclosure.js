// Care Plan offer terms + cancel control. COUNSEL-DRAFT-2026-10-19 spec v2.3.
// Copy is verbatim from BILLING-COPY-v1.1-1WTioaCW-20261019.md (billing screen offer terms and cancel screen).
// That file supersedes BILLING-COPY-1RtVfntM-20261019.md. Do not paraphrase.
// Renders only when SWAP.billing.disclosures === true. That flag ships false. Billing stays off.
// Do not edit the legal documents. This is UI copy from the billing doc, flagged off.
// The pay control stays disabled. There is no payment code path.

export const CARE_PLAN_OFFER_TEXT = `YOUR CARE PLAN CONTINUES UNTIL YOU CANCEL

What is included: {{plan_tier}}, {{included_hours_or_sessions}} per month.

Cancellation: Cancel anytime with Cancel Care Plan or by email to parker@mnclockworks.com. Your plan ends at the end of the current paid month, no later than 31 days after verified notice unless you choose a later date. No cancellation fee. If that limit cuts a paid period short, we refund the unused portion.

Recurring charge: {{monthly_price_and_tax}} every month on {{billing_date}}, starting {{start_date}}. Known future charge and date, or none: {{known_charge_change}}. The amount may change only after at least 30 days of clear written notice explaining the change and how to cancel free. Otherwise the change does not apply.

Term: Continuous monthly service until canceled. If you select annual prepay, its price is {{annual_price_and_tax}}, covering {{annual_start_date}} to {{annual_end_date}}. At the end, service continues monthly at {{post_annual_monthly_price_and_tax}} on {{post_annual_billing_date}} unless you cancel. We do not repeat an annual charge without a new affirmative authorization.

Minimum purchase: One paid month at {{minimum_month_price}}, with no additional minimum, subject to mandatory rights. Annual prepay does not prevent cancellation anytime.

Refunds: No partial month refunds except a pro rata credit or refund for included work we failed to deliver, the cancellation cutoff described above, or required legal rights. Annual prepay cancellation refunds unused full months pro rata, with no penalty or retroactive repricing. The setup fee is nonrefundable once the Deployment Session is held. Your deposit is refunded if Clockworks cancels. If Clockworks stops regulated work, unused prepaid Care Plan fees are refunded pro rata.

Pause: Up to two whole months per 12 months under the signed Schedule. No billing or work for paused months. Annual prepaid time extends by those months without charge. No catch up billing. Your selected pause terms: {{signed_pause_terms}}. You may still cancel.

Other selected terms: {{friends_family_rate_if_applicable_and_duration}}, {{rollover_rule}}. The signed Schedule and MSA control, below any applicable state addendum. No monitoring or incident response obligation is included.

I authorize the payment processor to save my payment method and charge {{authorized_initial_amount_and_tax}} on {{first_charge_date}} and {{authorized_recurring_amount_and_tax}} on {{recurring_billing_date}} for the selected Care Plan until I cancel, under the terms shown here. If I selected annual prepay, the first charge covers the stated annual term and monthly billing starts afterward unless I cancel. Clockworks never sees or stores my card number.`;

// COUNSEL-DRAFT-2026-10-19. Cancel screen from billing copy v1.1. Placeholders stay until a signed record fills them.
export const CANCEL_SCREEN_TEXT = `Cancel your Care Plan

You can cancel here or email parker@mnclockworks.com. Your cancellation takes effect {{cancellation_effective_date}}, the current paid month's end, no later than 31 days after verified notice unless you choose a later date. There is no cancellation fee.

Your final charge or refund details: {{final_charge_or_refund_details}}. Work ends on {{cancellation_effective_date}}. If another SOW remains active, its terms continue. Otherwise your account becomes ARCHIVED when the engagement closes, with 90 days of read only export before deletion under your retention schedule, except Contract Record and required legal holds. Receipts stay available as described below.

Your agents and your Grok Bot subscription stay with you. Canceling with us does not cancel them, and you keep paying the Platform directly if you keep using it.

Remove any access you granted to Clockworks, including account invitations, shared access and remote access permissions.

Reason for canceling, optional: {{optional_reason_field}}. You may leave this blank.

A pause stops work and billing for the whole months allowed in your signed Schedule, then resumes on your selected date. A downgrade changes your plan's included time and price under a separate approved change. You do not have to choose either to cancel.

May we show you an offer to stay? [Yes, show an offer] [No thanks]. This choice is optional and does not affect cancellation.

Button: Cancel my Care Plan

Optional later end date: {{client_selected_later_date}}.`;

/** Empty string unless the disclosure flag is on. The account screen inserts the result. */
export function carePlanDisclosureHtml(swap) {
  if (swap?.billing?.disclosures !== true) return '';
  const body = CARE_PLAN_OFFER_TEXT.split('\n\n').map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const cancel = CANCEL_SCREEN_TEXT.split('\n\n').map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  return `<section class="card care-disclosure" aria-labelledby="care-offer-h"><h2 id="care-offer-h">Your Care Plan continues until you cancel</h2>${body}<button type="button" class="btn" data-cancel-plan>Cancel Care Plan</button><button type="button" class="btn" disabled>Authorize and pay {{authorized_initial_amount_and_tax}}</button><div data-cancel-screen hidden><h3>Cancel your Care Plan</h3>${cancel}<button type="button" class="btn" data-cancel-confirm>Cancel my Care Plan</button><p role="status" data-cancel-status></p></div></section>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
