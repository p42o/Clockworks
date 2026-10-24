// Clockworks client portal — THE swap file.
// Every open placeholder Parker still has to decide lives here, and nowhere else.
// The client app imports this directly; the dev Functions (portal-dev/functions/config.js) read this same
// file so the two can never disagree, and portal-dev/tests/config/ fails if the server mirror drifts.
//
// HARD flags (marked HARD) are fail-closed and SERVER-enforced: the server refuses the action whenever they
// are false, regardless of what the UI shows. Fixture clients (clients/{cid}.fixture === true) on the
// emulator may exercise gated features as PREVIEWS. Flipping a flag to true is NOT a release — the gates in
// portal-dev/README.md "BEFORE ANYTHING LIVE" (counsel sign-off, 13 go-live conditions, backup/restore,
// Parker's release tap) still have to pass. Values are plain literals on purpose (no logic) so this file is
// safe to diff and to read at a glance.
//
// Sources: spec/COUNSEL-PRIVACY-ADDENDUM-2026-10-18.md (later sections override earlier ones) and
// spec/counsel-review/SPEC-EDITS-DECISIONS-v2.md (authoritative switch table).

// COUNSEL-DRAFT-2026-10-19. One string. The completion screen and the intake acknowledgement outbox both use it.
// Reply-time decision history, all 2026-10-19 CT: null, then 2 business days, then dropped, then 24h,
// then "Thanks! We'll get back to you." at 4:33, then this 4:48 Counsel wording.
const INTAKE_COMPLETE_COPY = "Thanks, your intake is in. We'll get back to you. Submitting this intake does not start an engagement.";

export const SWAP = Object.freeze({
  // ---- Parker placeholders ----
  // Fake placeholder pilot. Parker picks the real pilot later (SPEC-v3 Q6). Never put a real client here.
  pilot: Object.freeze({
    clientName: "Sample Pilot Co (Placeholder)",
    slug: "sample-pilot-placeholder",
    targetDate: "TBD",
  }),

  // SPEC-v3 Q2. false = later visits need a fresh invite link from Parker (the sign-in screen says so).
  // true  = a client can ask for a 6-digit sign-in code by email (code-only, client-initiated).
  emailSignInCodes: false,

  // SPEC-v3 Q12. Display-only placeholders until Parker sets real plans. Nothing is charged.
  plans: Object.freeze([
    Object.freeze({ id: "plan_a", name: "Plan A (placeholder)", priceDisplay: "$—/mo", interval: "month" }),
    Object.freeze({ id: "plan_b", name: "Plan B (placeholder)", priceDisplay: "$—/mo", interval: "month" }),
    Object.freeze({ id: "plan_setup", name: "One-time setup (placeholder)", priceDisplay: "$—", interval: "one_time" }),
  ]),

  // Payment Links remain on sellability HOLD until Counsel clearance and Parker's release tap.
  // HARD UI gate: URLs alone never make an offer available. Independent of portal billing.
  shopPass: Object.freeze({
    productName: "Shop Pass",
    monthlyPriceLabel: "$99/mo",
    deployPriceLabel: "$499",
    deployPaymentLinkUrl: "",
    shopPassPaymentLinkUrl: "",
    offered: false,
  }),

  // SPEC-v3 §5.2 client labels, keyed by the client stageKey.
  stageLabels: Object.freeze({
    intro: "Getting to know you",
    intake: "Intake",
    review: "Business review",
    plan: "Your plan",
    setup: "Setup",
    live: "Live",
    onhold: "On hold",
    wrapped: "Wrapped up",
    unknown: "In progress",
  }),

  // COUNSEL-DRAFT-2026-10-19 4:48 CT. Same string as intakeCompleteCopy. Not a reply-time promise.
  // Message threads do not render it. See portal-dev/REPLY-TIME-HISTORY.md.
  replyTimePromise: INTAKE_COMPLETE_COPY,
  intakeCompleteCopy: INTAKE_COMPLETE_COPY,
  // COUNSEL-DRAFT-2026-10-19 ruling 1. Exact submit-screen sentence.
  // COUNSEL-DRAFT-2026-10-19 7:40 PM CT: submit without signing is APPROVED. The flag stays off until go-live.
  submitScreenCopy: "Submitting this intake does not start an engagement or require a signature.",
  // Starter Terms v3.3 section 5. Admin-issued invites and the test harness use this same value.
  inviteExpiryDays: 14,
  // Password-step acceptance. ONE object: label, versions, files, and link targets.
  // SHA-256 is the hash of those files (server loadAcceptance). COUNSEL-DRAFT-2026-10-19.
  acceptance: Object.freeze({
    counsel: "FINAL-2026-10-20 (Parker approved; Fable review, see portal-dev/spec/LEGAL-REVIEW-2026-10-20.md)",
    label: "I agree to the MN Clockworks Starter Terms and have read the Privacy Notice.",
    terms: Object.freeze({
      version: "v4.0a",
      // Matches "Last updated" in the file below. Shown on the public /terms/ page.
      date: "October 23, 2026",
      file: "legal/starter-terms-v4.0a.md",
      linkText: "Starter Terms",
      href: "#/starter-terms",
    }),
    // Plain-English "what changed" bullets for the current versions, shown on the terms-updated screen.
    changes: Object.freeze([
      "Our phone number is now (763) 296-9777.",
      "The Privacy Notice now explains the Google Analytics on our website and the sign-in pages of our client portal.",
    ]),
    notice: Object.freeze({
      version: "v2.0a",
      file: "legal/privacy-notice-v2.0a.md",
      linkText: "Privacy Notice",
      href: "#/privacy-notice",
    }),
  }),
  // History (Counsel ruling 2026-10-23, non-material phone change, Terms s.25). Label and counsel unchanged on purpose.
  // 2026-10-23 3:16 PM CT Counsel ruling: Notice v2.0a also gains the Google Analytics paragraph (website + portal sign-in pages);
  // legal/privacy-notice-v2.0a.md sha256 670a76d73a5a96d812aca131976a72bfb16691a6e8692470d838e927067353f2. Terms v4.0a unchanged (7cb00f4f...c09975).
  // Superseded, kept unedited for acceptance proof: Terms v4.0 legal/starter-terms-v4.0.md sha256 6d130b1c...de52d; Notice v2.0 legal/privacy-notice-v2.0.md sha256 5302a16a...a2707 (accepted Oct 20 to Oct 23, 2026).

  // Parker approved: content-free "You have a reply" email (stubbed to the dev outbox) + in-portal badge.
  replyNoticeEmail: true,

  // Parker approved 2026-10-18 9:16 PM CT.
  contact: Object.freeze({
    privacyEmail: "parker@mnclockworks.com",
  }),

  // History only. Legacy email-code acceptance of these hashes still opens the gate.
  // Never displayed as the current versions. Current client-facing docs are `acceptance` above.
  docs: Object.freeze({
    notice: Object.freeze({ version: "v1.2 DRAFT", file: "legal/privacy-notice-v1.2-DRAFT.md", approvedSha256: "[NOTICE_SHA256]", legacy: true }),
    terms: Object.freeze({ version: "v3.1 DRAFT", file: "legal/portal-terms-v3.1-DRAFT.md", approvedSha256: "[TERMS_SHA256]", legacy: true }),
    msa: Object.freeze({ version: "v2.1 DRAFT", approvedSha256: "[MSA_SHA256]", legacy: true }),
    sow: Object.freeze({ version: "v2 DRAFT", legacy: true }),
    effectiveDate: "[EFFECTIVE_DATE]",
    lastUpdated: "[LAST_UPDATED]",
  }),

  // COUNSEL-DRAFT-2026-10-19 7:40 PM CT. Test-only draft hashes. draft:true blocks non-fixture acceptance.
  // Source files were checked with sha256sum -c against /workspace/ops/hashes/v2.3-new-20261019.sha256.
  draftHashes: Object.freeze({
    // 2026-10-20: false. Parker removed the draft status from Starter Terms v4.0 / Privacy Notice v2.0
    // (password-step acceptance). MSA/SOW e-signing stays off separately (eSign.realClients false).
    draft: false,
    counsel: "COUNSEL-DRAFT-2026-10-19",
    msa: Object.freeze({ version: "v2.3", sha256: "35aae9636119300f31d3d67f447329a429f5d12577e957e7154847bbc1efdf02", file: "/workspace/clockworks/agreements/MSA-v2.3.md" }),
    sow: Object.freeze({ version: "v2.2", sha256: "362ad5304142402faeb409314a68af056a8268372fa9625704a256fea43f117f", file: "/workspace/clockworks/agreements/SOW-template-v2.2.md" }),
    notice: Object.freeze({ version: "v1.4", sha256: "417bc2ccc6544da67753a29f4a2b24d618cc692a561f6eb7549041716253f881", file: "/workspace/projects/clockworks-intake-wizard-spec-2026-10-18/counsel-review/PRIVACY-NOTICE-DRAFT-v1.4.md" }),
    terms: Object.freeze({ version: "v3.3", sha256: "3dfd774e00bcbabbaf735403a0f8a94c809d73245709d80f135281ed09398365", file: "/workspace/projects/clockworks-intake-wizard-spec-2026-10-18/counsel-review/STARTER-TERMS-DRAFT-v3.3.md" }),
    billing: Object.freeze({ version: "v1.1", sha256: "faea5d949c217f80b1b61bdfce5c37b15aeb773ae9bcb00ee312a6633b24f2e8", file: "/workspace/projects/clockworks-intake-wizard-spec-2026-10-18/counsel-review/PORTAL-BILLING-COPY-v1.1.md" }),
  }),

  // ---- Retention (Parker-approved 2026-10-18; MSA-v2.1 §2.11 Close, §2.12 Contract Record, §4) ----
  retention: Object.freeze({
    closedReadOnlyDays: 90,                       // read-only Home/Files/My data after closedAt, then the account closes
    workingFilesAiMemoryDeleteDaysAfterClose: 90, // research notes, AI memory, working files WITHOUT Intake materials
    intakeDeleteDaysAfterClose: 90,               // INTAKE_DELETE_AT = min(intakeDate + 24 months, closedAt + 90 days)
    intakeOuterLimitMonths: 24,
    messagesDeleteDaysAfterClose: 90,             // except Contract Record messages (approvals, notices, change requests)
    contractRecordYearsAfterEnd: 6,               // relationship + 6 years after later of last SOW end / final payment; legalHold overrides; no TTL
    // COUNSEL-DRAFT-2026-10-19 ruling 4: admin action log is 6 years, metadata only.
    adminAuditYears: 6,
    // COUNSEL-DRAFT-2026-10-19 ruling 1: no-engagement deletion clocks.
    noEngagementDeclineDays: 90,
    noEngagementSubmitMonths: 12,
    backupDays: 35,
    securityLogDays: 30,                          // ruling 4: security logs 30 days
    rateLimitBucketTtlDays: 30,                   // ruling 4: rate-limit logs 30 days
    registerStaleDays: 35,                        // weekly Monday register check flags lastVerifiedAt older than this
    sweepDryRun: true,                            // HARD on the emulator: retentionSweep only logs what it WOULD delete
  }),

  // ---- Request my data (SPEC-v3 §5.6 as amended) ----
  dataRequests: Object.freeze({
    goLive: false,                 // HARD: non-fixture clients cannot file data requests while false
    dueDays: 30,
    extensionMaxDays: 30,          // ONE extension, written reason + revised deadline sent before day 30
    extensionReviewDay: 25,
    targetBusinessDays: 10,
    nameServicesOnRequest: true,   // admin-generated specific-services list for a verified requester; never in the notice or ordinary views
  }),

  // ---- HARD flags (server-enforced, fail closed) ----
  portal: Object.freeze({ pilotGoLive: true }),    // HARD: non-fixture clients cannot use the portal at all while false. ON: go-live 2026-10-20 (Parker)
  billing: Object.freeze({
    enabled: false,       // HARD: nothing is ever charged
    disclosures: false,   // HARD: Care Plan offer terms + cancel button (Minn. Stat. 325G). Off until counsel approves.
  }),
  // COUNSEL-DRAFT-2026-10-19 spec v2.3. Annual notice job stays off unless a test forces it.
  notices: Object.freeze({ carePlanAnnual: false }),
  // App Check enforcement hook. Off in the emulator (functions/config.js also forces it off there).
  appCheck: Object.freeze({ enforce: false }),
  // COUNSEL-DRAFT-2026-10-19 7:40 PM CT: submit without signing is APPROVED.
  // The flag stays off globally until go-live. Emulator fixtures may still force the path in tests.
  // submitWithoutSigning: on for go-live 2026-10-20 (Counsel-approved copy). The MSA/SOW are signed later, outside the intake.
  intake: Object.freeze({ termsLive: false, submitWithoutSigning: true }),
  termsLive: false,                                // HARD: portal account terms acceptance is a DRAFT preview while false
  // When false, the real "Sign and agree" is refused server-side for any client not marked fixture:true,
  // and the UI shows "Preview — signing isn't live yet".
  eSign: Object.freeze({ realClients: false }),
  // Password reset. "firebase" = Firebase Auth's built-in reset email (free, sent from
  // noreply@clockworks-portal-pgs.firebaseapp.com); its link opens #/reset-confirm, which enforces the portal
  // password rules. "outbox" = the older code-in-outbox flow (nothing reaches the client).
  passwordReset: "firebase",
  // "Terms updated, please review and accept" screen for a version change. OFF in production: while off, a version
  // change shows the plain must-accept gate (#/accept) instead. The server enforces re-acceptance either way.
  termsUpdateScreen: false,

  // Kept for older readers; same value as retention.closedReadOnlyDays.
  closedReadOnlyDays: 90,
});

export default SWAP;
