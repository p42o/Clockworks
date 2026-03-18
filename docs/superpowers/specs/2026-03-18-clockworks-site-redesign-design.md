# Clockworks Site Redesign — Design Spec

**Date:** 2026-03-18
**Scope:** index.html (primary), admin.html (social links settings)
**Assets:** Tabler Icons (CDN), existing images/logo-full.svg, images/Parker.png

---

## 1. Hero Section — Tighten Spacing

**Problem:** Too much white space between the "AI-POWERED AUTOMATION · SMALL BUSINESS" badge and the h1 headline.

**Changes:**
- Reduce `.hero-badge` margin-bottom from `28px` → `16px`
- Reduce `.hero-content` top padding from `130px` → `110px`
- No other hero layout changes

---

## 2. Clickable Headshot Bio Card

**Trigger:** Clicking/tapping the hero headshot circle (`.hero-headshot` in the trust line) OR the about section headshot (`.about-headshot`).

**Animation:** CSS transition triggered by adding/removing a class. Transition on `border-radius` (50% → 16px) and `transform: scale()`. No keyframe animations — a class-toggle transition is simpler and reversible on close. Backdrop dims with a semi-transparent overlay.

**Card content (modal):**
```
[Photo — larger, rounded square, ~120px]
Parker Swanson
Founder, Clockworks · Maple Grove, MN

Married with 2 kids and a German Shepherd. 20 years in
technology — deploying cloud-based solutions to millions
of customers and demystifying AI for everyday work.

Hobbies: Anything with my family, 3D Printing,
Vibe Coding, and Travelling!

[X button top-right] [Social icons: X, Facebook]
```

**Dismiss:** Clean X button (top-right corner), click/tap outside card, or Escape key.

**Implementation:**
- Single modal element in the DOM, triggered by click handlers on both headshot images
- CSS transition with class toggle (`.bio-card-open`) — not keyframes
- `aria-modal="true"`, focus trap, body scroll lock while open
- Close on overlay click, X button, Escape key
- Social icons use Tabler Icons (`ti-brand-x`, `ti-brand-facebook`) linking to the URLs specified in Section 7
- Social link URLs are populated from Firestore with hardcoded fallbacks (same pattern as Section 7d)

---

## 3. "What I Build" Section Redesign

**Remove entirely:**
- The n8n connector rows (3 flow visualizations)
- The promise list (4 checkmark items + CTA)
- The 4 workflow cards (Auto-Invoice, Missed Call, Auto Scheduling, Competitor Intel)
- The industry selector bar HTML, CSS, and all its JavaScript
- The entire `IC` industry-content object and `selectIndustry()` function
- The Before/After comparison section (`.ba-grid`) — this was populated by the `IC` data and has no standalone value without the industry system

**Keep:**
- Section heading: "What I Build" label + "The Clockworks System." h2
- Subheading paragraph (updated — see copy below)
- Dark navy section background
- The "I build it. I deploy it. You just watch it run." badge (placed below the card grid)

**Static content after IC removal:**
- Hero description becomes static (the general/default variant, updated per Section 4c)
- Hero trust badges become static (updated per Section 4e)
- CTA description becomes static

### 3a. Filter Pills

Horizontal pill bar above the card grid:
- **All** (default active) | **Social Media** | **Operations** | **Growth**
- Styled: rounded pill buttons, active state uses copper gradient
- Clicking a filter shows only cards tagged with that category
- "All" shows all 6 cards
- Smooth fade/filter transition on cards (opacity + transform transition)

### 3b. Card Grid

3-column grid, 2 rows = 6 cards. On dark navy background.

Each card:
- Tabler Icon in a gradient-colored rounded square (52×52px icon wrap)
- Title (bold, white)
- One-liner subtitle (muted white)
- Impact badge (green text)
- Hover: lift + shadow + subtle border glow
- Click: opens detail modal
- `cursor: pointer` and `role="button"` for accessibility

**Card definitions (order = display order, Social Media first):**

| # | Title | Icon (Tabler) | Gradient | Subtitle | Badge | Category |
|---|-------|--------------|----------|----------|-------|----------|
| 1 | Social Media Autopilot | `ti-brand-instagram` | Copper | Set it & forget it | 3+ hrs/week saved | Social Media |
| 2 | Listing → Social Kit | `ti-home-search` | Blue | Listing to post-ready | World-class marketing | Social Media |
| 3 | Auto-Invoice + Review | `ti-file-invoice` | Green | Done → paid → reviewed | ~45 min/job saved | Operations |
| 4 | Missed Call Recovery | `ti-phone-incoming` | Rose | Never lose a lead | 0 lost leads | Operations |
| 5 | Auto Scheduling | `ti-calendar-event` | Purple | Quote → calendar → parts | 4+ hrs/week saved | Operations |
| 6 | Competitor Intel | `ti-target-arrow` | Amber | Weekly market briefing | Stay one step ahead | Growth |

**Gradient color definitions:**
- Copper: `#C4834A → #E8B87A` (bg: `rgba(196,131,74,0.15)`)
- Blue: `#3B82F6 → #93C5FD` (bg: `rgba(59,130,246,0.15)`)
- Green: `#22C55E → #86EFAC` (bg: `rgba(34,197,94,0.15)`)
- Rose: `#F43F5E → #FDA4AF` (bg: `rgba(244,63,94,0.15)`)
- Purple: `#8B5CF6 → #C4B5FD` (bg: `rgba(139,92,246,0.15)`)
- Amber: `#F59E0B → #FCD34D` (bg: `rgba(245,158,11,0.15)`)

**Responsive:** 3 columns → 2 columns at ≤768px → 1 column at ≤480px

### 3c. Detail Modal (on card click)

Centered modal overlay (dimmed backdrop):
- Larger icon + gradient at top
- Card title as modal heading
- Full flow arrows: trigger → step → step → result (styled pills like current workflow cards)
- Impact fact paragraph
- Brief description of what the automation does
- "Book a Free Strategy Session →" CTA button at bottom
- Dismiss: X button, click outside, Escape

**Data architecture:** All card and modal content is stored in a JS array of objects (similar to the current `IC` object pattern but simpler — no industry switching logic). Each object contains: title, icon, gradient class, subtitle, badge, category, flow steps array, and impact text. This keeps the content centralized and easy to update.

```javascript
const AUTOMATIONS = [
  {
    id: 'social-media',
    title: 'Social Media Autopilot',
    icon: 'ti-brand-instagram',
    gradient: 'grad-copper',
    subtitle: 'Set it & forget it',
    badge: '3+ hrs/week saved',
    category: 'social-media',
    flow: ['Content AI', 'Schedule Posts', 'Auto-Publish', 'Track Engagement'],
    impact: 'Businesses that post 3+ times per week see 2× more engagement...'
  },
  // ... 5 more
];
```

**Flow arrow data per card:**

1. **Social Media Autopilot:** Content AI → Schedule Posts → Auto-Publish → Track Engagement
   - Impact: "Businesses that post 3+ times per week see 2× more engagement. This runs on autopilot — pre-written, scheduled, and posted without you touching a thing."

2. **Listing → Social Kit:** New Listing Added → AI Generates Copy & Hashtags → Creates Multi-Platform Posts → Ready to Publish
   - Impact: "World-class marketing materials for every listing, generated in seconds. Professional captions, platform-optimized formats, and trending hashtags — all from your listing data."

3. **Auto-Invoice + Review:** Job Marked Done → Invoice Generated & Sent → 2hr Later: Review Text → Reviews Collected
   - Impact: "You packed up from your last job. Before you started the truck, the invoice was out and the review request was already in the customer's pocket."

4. **Missed Call Recovery:** Call Missed → Auto-Text Sent Instantly → Calendar Link Included → Lead Logged in CRM
   - Impact: "A customer called while you were on a job. They got an instant, professional text back. By the time you finished, the booking was already on your calendar."

5. **Auto Scheduling:** Job Quote Accepted → Job Added to Calendar → Parts List Generated → Supplier Order Drafted
   - Impact: "Customer accepts the quote Tuesday night. By Wednesday morning, the job's on your calendar, your supplier has the parts order, and the customer's address is in your GPS."

6. **Competitor Intel:** Every Monday, 7am → Scrapes Google Reviews & Nextdoor → Checks Seasonal Trends → Intel Report in Your Inbox
   - Impact: "Every Monday you get a tailored briefing: what your competitors are hearing, what locals are asking about, and what's trending this season in your industry."

---

## 4. Pricing Updates

### 4a. Remove monthly payment option
- "The System" tier: change `one-time · or $167/mo × 6` → just `one-time`

### 4b. Strategy Session — add demo mention
- Add feature line: "Free working demo of your solution delivered after the call"
- This goes in the Strategy Session plan card feature list

### 4c. Hero description — mention demo
- Update hero-desc to include demo: "...and give you a written roadmap and a free working demo — whether you hire me or not."

### 4d. Guarantee callout — coffee bet
- Replace BOTH guarantee callout blocks (after How It Works and after Pricing) with:
  - **Title:** "The Guarantee"
  - **Text:** "If we don't find at least one thing that would drastically save you time after our 30-minute session, I'll buy you a coffee."
- Note: This guarantee is scoped to the free strategy session, which is the entry point for all tiers. Placing it after pricing reinforces the low-risk entry point — every engagement starts with the free session.

### 4e. Hero trust badge + plan feature line
- Change hero trust badge "8-hr/week guarantee" → "Coffee-bet guarantee"
- Update all industry-specific trust arrays in JS — since the entire `IC` object is being removed (Section 3), this is handled by making the hero trust static with the new badge text
- Change "The System" plan feature line from "60-day support + 8-hr/week guarantee" → "60-day support included"

---

## 5. Availability Language

**Location:** About section paragraph (the one starting "Every client I take on...")

**Current:** "Every client I take on gets my personal attention. You'll have my number. If something breaks at 7am before a job, you're not opening a support ticket — you're texting me. That's the deal."

**New:** "Every client I take on gets my personal attention. You'll have my number. I work directly with every client — no support tickets, no runaround. When you need me, I'll always get back to you as fast as I can."

---

## 6. Form Updates

### 6a. Meeting preference field (main booking form only)
- New field: "Preferred Meeting Type"
- Pill-style toggles (not radio buttons, not dropdown): **In-Person | Zoom | Phone Call**
- Placement: after the "Type of Business" row, before the textarea
- Only one can be selected at a time
- Default: none selected (user must choose)
- **Required field** — validation error message: "Please select a preferred meeting type"
- Styled to match filter pill aesthetic: rounded, border, active state with copper gradient
- Add to form submission data

### 6b. Implementation
- Three `<button type="button">` elements styled as pills inside a `.meeting-pills` container
- Clicking a pill adds `.active` class (removes from siblings)
- A hidden `<input type="hidden" name="meeting-preference">` is updated with the selected value on click
- The `validate()` function checks that the hidden input has a value; if not, shows the error message
- Submitted with the rest of the form data

### 6c. Mid-page CTA form
- Do NOT add meeting preference to the mid-page CTA form. Keep it minimal (name + email only) — its purpose is quick capture, not a full intake form.

---

## 7. Social Links & Email

### 7a. Email update
- Replace all instances of `hello@clockworksai.com` with `parker@mnclockworks.com`
- Includes: Schema.org JSON-LD, footer, any mailto: links, form error handlers

### 7b. Footer social links
- Add social icons in footer (Tabler Icons): X (`ti-brand-x`) and Facebook (`ti-brand-facebook`)
- X: https://x.com/ClockworksMN
- Facebook: https://www.facebook.com/profile.php?id=61580475420690
- Styled as subtle icon links (muted white, brighten on hover), consistent with footer design
- Placed near the footer logo area

### 7c. Bio card social links
- The headshot bio card modal (Section 2) includes X and Facebook icon links using Tabler Icons
- Same URLs as footer

### 7d. Admin portal — Social Links settings
- Add a "Social & Contact" section within the existing **Settings** tab in admin.html
- Fields: Email address, X (Twitter) URL, Facebook URL
- Stored in Firestore at `siteContent/settings` document alongside existing settings (timezone, AI provider, etc.)
- Field names in Firestore: `contactEmail`, `socialX`, `socialFacebook`
- Uses existing `saveSettings()` / `loadSettings()` functions in admin.html — extend them to include the new fields

### 7e. How index.html consumes social settings
- Extend the existing `loadSiteContent()` function to read `contactEmail`, `socialX`, `socialFacebook` from the Firestore config/settings
- On load: render hardcoded defaults immediately (footer social links, bio card links, email)
- If Firestore data loads successfully, overwrite with Firestore values
- This matches the existing pattern where HTML renders first and Firestore overlays data

---

## 8. Tabler Icons Integration

- Load via CDN: `https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.24.0/dist/tabler-icons.min.css` (pinned version)
- Add to `<head>` of index.html
- Used in: "What I Build" card grid, detail modals, footer social icons, bio card social icons
- Icon gradient technique: CSS `background-clip: text` with `-webkit-text-fill-color: transparent` on the `<i>` elements

---

## 9. Cleanup

- Remove the old industry selector bar HTML, CSS, and JavaScript
- Remove the old n8n connector rows and workflow card HTML
- Remove the entire `IC` object and `selectIndustry()` function
- Remove the Before/After comparison section (`.ba-grid`) and its CSS
- Remove old dark-logo references in any JS data objects
- Remove the `$167/mo × 6` payment text
- Remove orphaned CSS classes (`.n8n-connector`, `.n8n-app`, `.wf-*`, `.ind-*`, `.ba-*`)
- Remove any `hello@clockworksai.com` references

---

## Files Modified

| File | Changes |
|------|---------|
| `index.html` | Sections 1–9: hero spacing, bio card modal, "What I Build" redesign, pricing, availability, form, socials, email, Tabler Icons, cleanup |
| `admin.html` | Section 7d: Social & Contact fields added to Settings tab |

## Dependencies

- Tabler Icons webfont v3.24.0 (CDN) — no npm install needed
- Existing Firestore integration in admin.html for settings storage
