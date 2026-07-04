# Testimonials Management System — Design Spec

**Date:** 2026-03-18
**Scope:** Admin panel testimonials tab + dynamic home page testimonials section
**Files affected:** `admin.html`, `index.html`

---

## Overview

Add a Testimonials management tab to the admin panel that controls a dynamic testimonials section on the home page. The section can be globally toggled on/off, and individual testimonials can be added, edited, deleted, reordered, and toggled live/draft — all persisted in Firestore.

## Data Model

**Firestore path:** `siteContent/testimonials`

```json
{
  "sectionEnabled": true,
  "items": [
    {
      "id": "t_1710000000_a3f2",
      "quote": "<p>Rich text content...</p>",
      "name": "Mike R.",
      "business": "Twin Cities Plumbing",
      "googleReviewUrl": "https://g.co/...",
      "live": true,
      "order": 0
    }
  ]
}
```

Single document, array of items. Consistent with existing `siteContent` collection pattern (settings, privacy, terms). No new collections.

**Field details:**
- `id` — generated as `t_` + `Date.now()` + `_` + random 4-char suffix to prevent collisions on rapid saves
- `quote` — HTML string from rich text editor. **Trust boundary note:** quote content is admin-authored and rendered as raw HTML on the home page (not escaped). The `name` and `business` fields remain escaped with `escHtml()`.
- `name` — plain text, required
- `business` — plain text, optional
- `googleReviewUrl` — plain text URL, optional. When present, a subtle Google "G" icon renders next to the attribution, linking out in a new tab.
- `live` — boolean. Only `live: true` items render on the home page.
- `order` — integer. Controls display order. Position 0 = featured/spotlight testimonial.

**Migration note:** The current `siteContent/config` document has a `testimonials` array field used by the old rendering code. This only contains placeholder data (no real client quotes). No data migration needed — the old field is abandoned and the old rendering code is removed.

**Firestore rules:** The new `siteContent/testimonials` document is covered by the existing wildcard rule on `siteContent/*`. No rule changes needed.

## Admin Panel (admin.html)

### Tab

New tab "Testimonials" added to the tab bar after Settings, before Submissions. Icon: `ti-quote`. Tab ID: `testimonials`.

**`ALL_TABS` array must be updated to:**
```javascript
const ALL_TABS = ['dashboard','blog','settings','testimonials','submissions','privacy','terms'];
```

The `switchTab()` function relies on index-based coupling between the DOM button order and this array. The HTML tab button for Testimonials must be inserted at the matching position (4th button, index 3) to keep all tabs working correctly.

### Panel Layout (top to bottom)

#### 1. Section Header + Global Toggle

- Panel title: "Testimonials"
- Right side: toggle switch labeled "Show on homepage"
  - Toggle controls `sectionEnabled` in Firestore
  - When off, a subtle info banner appears: "Testimonials section is hidden from visitors"
  - Toggle auto-saves immediately on change

#### 2. Add/Edit Form

Collapsible panel (hidden by default, shown when "Add Testimonial" is clicked or when editing).

**Fields:**
- **Quote** — textarea with a simplified rich text toolbar: bold, italic, paragraph, link. (Simpler than the blog toolbar — H3 headings, blockquotes, HRs, and lists are inappropriate for short testimonial quotes.)
- **Name** — text input, required
- **Business / Title** — text input, optional
- **Google Review URL** — text input, optional, placeholder: `https://g.co/...`

**Buttons:**
- "Save Testimonial" (btn-primary) — creates new or updates existing
- "Cancel" (btn-ghost) — closes form, clears fields

When editing an existing item, the form pre-populates and the save button reads "Update Testimonial".

**Rich text preview:** Small preview panel below the quote textarea showing rendered HTML, matching the blog editor preview pattern. Uses the same `PREVIEW_CSS` and iframe approach.

#### 3. Testimonial List

Shows a loading spinner on initial load (matching submissions/blog pattern). Then renders drag-to-reorder rows using native HTML5 Drag and Drop API (no external library).

**Note:** HTML5 drag-and-drop does not work on mobile touch devices. This is acceptable since the admin panel is used on desktop.

**Each row contains:**
- Drag handle icon (`ti-grip-vertical`)
- Truncated quote preview (first ~80 chars, stripped of HTML tags)
- Name + business
- Status pill: "LIVE" (green, `btn-success` style) or "DRAFT" (gray) — clickable to toggle, auto-saves
- Edit button (`btn-ghost btn-sm`)
- Delete button (`btn-danger btn-sm`) — with confirmation prompt

**Behaviors:**
- Drag-and-drop reorders the `items` array and auto-saves new `order` values
- Toggling live/draft auto-saves to Firestore
- Delete prompts "Delete this testimonial? This cannot be undone." then removes from array and saves
- Empty state: centered message "No testimonials yet." with "Add your first testimonial" button

#### 4. Live Preview

Full-width iframe below the list rendering an accurate preview of how the testimonials section will appear on the home page.

**Preview rules:**
- Only shows `live: true` items in current `order`
- Uses adaptive layout (see Home Page section below)
- Updates in real-time on any change (add/edit/delete/reorder/toggle)
- Uses debounced rendering (300ms) matching existing preview patterns
- Renders with same fonts, colors, and spacing as the actual home page section
- If `sectionEnabled` is off OR no live items exist, preview shows: "Testimonials section is currently hidden. Toggle it on and add live testimonials to see a preview."

### Data Flow

- `loadTestimonials()` — called on tab switch (lazy load, same pattern as submissions/legal). Shows spinner during fetch.
- `saveTestimonials()` — writes entire `siteContent/testimonials` doc after any change
- State held in a local `testimonials` object: `{ sectionEnabled: true, items: [...] }`

### Dashboard Integration

Add a "Testimonials" card to the dashboard grid showing the count of live testimonials. Change the dashboard grid from `repeat(4, 1fr)` to `repeat(5, 1fr)` to accommodate the 5th card. The 900px responsive breakpoint already collapses to `1fr`.

## Home Page (index.html)

### Section Placement

New `<section>` element between Pricing and About. Remove the existing placeholder testimonials from inside the About section (the `<div class="testimonials" id="testimonials-container">` block and its children within `.about-centered`).

**HTML structure:**
```html
<section id="testimonials" class="section testimonials-section" style="display:none;" aria-labelledby="testimonials-heading">
  <div class="container">
    <div class="reveal" style="text-align:center;margin-bottom:44px;">
      <p class="section-label" style="color:var(--orange-dark);">What Clients Say</p>
      <h2 id="testimonials-heading" class="section-heading">Results speak louder than promises.</h2>
    </div>
    <div id="testimonials-grid" class="testimonials-grid reveal"></div>
  </div>
</section>
```

Starts hidden (`display:none`). JavaScript shows it only when `sectionEnabled === true` AND at least one `live` item exists.

### Adaptive Layout

Rendered dynamically by `renderTestimonials(liveItems)` based on the count of live testimonials:

**1 item — Single featured card:**
- Centered card, max-width ~620px
- Large decorative open-quote in `var(--orange)` at 20% opacity
- Quote text at 15-16px, centered
- Name + business inline below, with optional Google icon

**2 items — Featured + stacked:**
- Featured card on top (same as 1-item)
- One supporting card below, full width, smaller text (13-14px)

**3+ items — Featured + 2-column grid:**
- Featured card on top (same as 1-item)
- Supporting cards in a 2-column grid below
- Grid collapses to 1 column on mobile (< 640px)

`renderTestimonials(items)` builds the HTML string based on `items.length`, sets `innerHTML` on `#testimonials-grid`, using the featured card markup for `items[0]` and supporting card markup for `items.slice(1)`. The `quote` field is rendered as raw HTML (trusted admin content); `name` and `business` are escaped with `escHtml()`.

### Featured Card Design
- White background, `var(--border)` border, 14px border-radius
- `var(--shadow-md)` box shadow
- Decorative `"` character: 36px, `rgba(196,131,74,0.2)`, Georgia/serif
- Quote: italic, 15px, `var(--text)` color
- Attribution: `font-weight:600` name + `var(--text-muted)` business, separated by middot

### Supporting Card Design
- White background, `var(--border)` border, 12px border-radius
- `var(--shadow-sm)` box shadow
- Quote: italic, 13px, `var(--text-muted)` color
- Attribution: 12px, same name/business pattern

### Google Review Icon
- Inline SVG of the Google "G" logo (4-color), ~16px on featured / ~14px on supporting
- Opacity: 0.3, increases to 0.5 on hover
- Wrapped in `<a href="..." target="_blank" rel="noopener noreferrer" title="View on Google Reviews">`
- Only rendered when `googleReviewUrl` is non-empty

### Section Backgrounds

Inserting Testimonials between Pricing and About changes the section background rhythm. Updated backgrounds:

| Section | Background |
|---------|-----------|
| Pricing | `#fff` |
| **Testimonials** | `var(--bg-off)` (`#f8f9fc`) |
| About | `#fff` (changed from `var(--bg-off)`) |
| FAQ | `var(--bg-off)` (changed from `#fff`) |
| CTA/Contact | dark gradient (unchanged) |

This maintains the alternating white/off-white pattern throughout the page.

### CSS

New styles added to the `<style>` block in index.html:

```css
/* Testimonials Section */
.testimonials-section { background: var(--bg-off); }
.testimonials-grid { max-width: 720px; margin: 0 auto; }
.testimonial-featured { ... }
.testimonial-card { ... }
.testimonial-supporting { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.testimonial-quote-mark { ... }
.testimonial-quote { ... }
.testimonial-attr { ... }
.google-review-link { ... }

@media (max-width: 640px) {
  .testimonial-supporting { grid-template-columns: 1fr; }
}
```

Remove old `.testimonials`, `.testimonials-heading`, `.testimonial` CSS classes that belonged to the placeholder.

### Rendering Logic

Replace the existing `siteContent/config` testimonials block in `loadSiteContent()` with:

```javascript
// Load testimonials from dedicated document
const testimonialsDoc = await db.collection('siteContent').doc('testimonials').get();
if (testimonialsDoc.exists) {
  const tData = testimonialsDoc.data();
  const section = document.getElementById('testimonials');
  if (tData.sectionEnabled && tData.items) {
    const liveItems = tData.items
      .filter(t => t.live)
      .sort((a, b) => a.order - b.order);
    if (liveItems.length > 0) {
      section.style.display = '';
      renderTestimonials(liveItems);
      // Show nav links
      document.querySelectorAll('.nav-link-testimonials').forEach(el => el.style.display = '');
    }
  }
}
```

### Nav Links

Add "Testimonials" scroll link between "Pricing" and "About" in three places:
1. **Desktop nav** (`.nav-links`) — `<a href="#testimonials" class="nav-link nav-link-testimonials" style="display:none;">Testimonials</a>`
2. **Mobile menu** (`.mobile-menu`) — `<a href="#testimonials" class="mobile-link nav-link-testimonials" style="display:none;">Testimonials</a>`
3. **Footer links** — same pattern if testimonials links exist in footer

All start hidden and are shown by the rendering JS when the section is visible.

## Cleanup

- Remove the `<div class="testimonials" id="testimonials-container">` block and its children from inside the About section
- Remove old `.testimonials`, `.testimonials-heading`, `.testimonial` CSS classes
- Remove the old `data.testimonials` rendering block from `loadSiteContent()` that reads from `siteContent/config`
- Update About section: `background: #fff`
- Update FAQ section: `background: var(--bg-off)`

## Not In Scope

- Image/avatar upload for testimonials
- Star ratings display
- Markdown mode for testimonial quotes (HTML only)
- Pagination or "show more" for large numbers of testimonials
- Animation/carousel for testimonials
- Mobile touch drag-and-drop in admin (desktop only)
