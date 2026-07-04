# Testimonials Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Firestore-backed testimonials management tab to admin.html that dynamically controls a testimonials section on the home page (index.html), with add/edit/delete, drag-to-reorder, live/draft toggle, rich text editing, global section toggle, and real-time preview.

**Architecture:** Single Firestore document (`siteContent/testimonials`) stores a `sectionEnabled` boolean and an `items` array. Admin panel gets a new Testimonials tab with CRUD, drag-and-drop reorder, and live preview iframe. Home page reads the document and renders an adaptive layout (featured card + supporting grid) for live items, or hides the section entirely.

**Tech Stack:** Firebase/Firestore (existing), vanilla JS, HTML5 Drag and Drop API, inline CSS, Tabler Icons (existing CDN)

**Spec:** `docs/superpowers/specs/2026-03-18-testimonials-management-design.md`

---

### Task 1: Home Page Cleanup — Remove Placeholder Testimonials and Update Section Backgrounds

**Files:**
- Modify: `index.html` — CSS block (old `.testimonials` classes around line 341-345) and HTML block (`<div class="testimonials" id="testimonials-container">` around line 728-746)
- Modify: `index.html` — `.about` CSS class (line 334) and `.faq` CSS class (line 348)

- [ ] **Step 1: Remove old testimonial CSS classes**

In the `<style>` block of `index.html`, delete these 5 CSS rules (the `.testimonials`, `.testimonials-heading`, `.testimonial`, `.testimonial p`, `.testimonial cite` blocks located between the `.about-trust-label` rule and the `/* FAQ */` comment):

```css
/* DELETE these lines: */
    .testimonials { margin-top: 36px; text-align: left; }
    .testimonials-heading { font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 16px; text-align: center; }
    .testimonial { margin-bottom: 20px; padding-left: 16px; border-left: 2px solid var(--border); }
    .testimonial p { font-style: italic; font-size: 15px; color: var(--text-muted); line-height: 1.7; margin-bottom: 4px; }
    .testimonial cite { font-size: 13px; color: var(--text-dim); font-style: normal; }
```

- [ ] **Step 2: Update section backgrounds for alternation**

Change `.about` background from `var(--bg-off)` to `#fff`:
```css
    .about { background: #fff; }
```

Change `.faq` background from `#fff` to `var(--bg-off)`:
```css
    .faq { background: var(--bg-off); }
```

- [ ] **Step 3: Remove placeholder testimonials HTML**

In the About section HTML, delete the entire `<div class="testimonials" id="testimonials-container">` block and its children (the block that starts with `<!-- Testimonials placeholder -->` and contains three placeholder `<div class="testimonial">` elements). This is inside the `<div class="about-centered reveal">` container, after the `<div class="about-trust">` block.

- [ ] **Step 4: Verify page loads without errors**

Open `index.html` in a browser. Confirm:
- About section displays correctly without testimonials
- About section has white background
- FAQ section has off-white (`#f8f9fc`) background
- No console errors

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "chore: remove placeholder testimonials and fix section background alternation"
```

---

### Task 2: Home Page — Add Testimonials Section HTML, CSS, and Nav Links

**Files:**
- Modify: `index.html` — add CSS, HTML section, and nav links

- [ ] **Step 1: Add testimonials CSS**

In the `<style>` block of `index.html`, add these styles after the `.about-trust-label` rule and before the `/* FAQ */` comment (where the old testimonial styles were):

```css
    /* ══ TESTIMONIALS ══ */
    .testimonials-section { background: var(--bg-off); }
    .testimonials-grid { max-width: 720px; margin: 0 auto; }
    .testimonial-featured {
      background: #fff; border: 1px solid var(--border); border-radius: 14px;
      padding: 32px 28px; box-shadow: var(--shadow-md); text-align: center;
      max-width: 620px; margin: 0 auto;
    }
    .testimonial-quote-mark {
      font-size: 36px; color: rgba(196,131,74,0.2); font-family: 'Instrument Serif', Georgia, serif;
      line-height: 1; margin-bottom: 8px;
    }
    .testimonial-quote { font-style: italic; font-size: 15px; color: var(--text); line-height: 1.8; margin-bottom: 14px; }
    .testimonial-quote p { margin-bottom: 0.5rem; }
    .testimonial-quote p:last-child { margin-bottom: 0; }
    .testimonial-attr { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
    .testimonial-name { font-weight: 600; font-size: 13px; color: var(--navy); }
    .testimonial-biz { font-size: 13px; color: var(--text-muted); }
    .testimonial-dot { color: var(--text-dim); }
    .google-review-link { display: inline-flex; margin-left: 4px; opacity: 0.3; transition: opacity 0.2s; }
    .google-review-link:hover { opacity: 0.5; }
    .testimonial-supporting { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .testimonial-card {
      background: #fff; border: 1px solid var(--border); border-radius: 12px;
      padding: 20px; box-shadow: var(--shadow-sm);
    }
    .testimonial-card .testimonial-quote { font-size: 13px; color: var(--text-muted); line-height: 1.7; margin-bottom: 10px; }
    .testimonial-card .testimonial-attr { justify-content: flex-start; }
    .testimonial-card .testimonial-name { font-size: 12px; }
    .testimonial-card .testimonial-biz { font-size: 12px; }
    .testimonial-card .google-review-link { margin-left: auto; }

    @media (max-width: 640px) {
      .testimonial-supporting { grid-template-columns: 1fr; }
    }
```

- [ ] **Step 2: Add testimonials section HTML**

Insert this new `<section>` between the closing `</section>` of Pricing and the opening `<!-- ABOUT -->` comment:

```html
<!-- TESTIMONIALS -->
<section id="testimonials" class="section testimonials-section" style="display:none;" aria-labelledby="testimonials-heading">
  <div class="container">
    <div class="reveal" style="text-align:center;margin-bottom:44px;">
      <p class="section-label" style="color:var(--orange-dark);">What Clients Say</p>
      <h2 id="testimonials-heading" class="section-heading" style="margin-bottom:12px;">Results speak louder than promises.</h2>
    </div>
    <div id="testimonials-grid" class="testimonials-grid reveal"></div>
  </div>
</section>
```

- [ ] **Step 3: Add nav links (desktop, mobile, footer)**

In the desktop nav (`.nav-links`), the current order is: `What I Build > How It Works > Pricing > Resources > About`. Add the Testimonials link after Pricing and before Resources (matching the page section order: Pricing → Testimonials → About):
```html
      <a href="#testimonials" class="nav-link nav-link-testimonials" role="listitem" style="display:none;">Testimonials</a>
```

In the mobile menu (`.mobile-menu`), same position — after Pricing, before Resources:
```html
  <a href="#testimonials" class="mobile-link nav-link-testimonials" style="display:none;">Testimonials</a>
```

In the footer nav (`.footer-links`), the current order is: `What I Build > How It Works > Pricing > About > Resources > Book Session > Email`. Add after Pricing and before About:
```html
        <a href="#testimonials" class="footer-link nav-link-testimonials" style="display:none;">Testimonials</a>
```

- [ ] **Step 4: Verify page loads without errors**

Open `index.html` in browser. Confirm:
- Testimonials section is NOT visible (hidden by default)
- Testimonials nav links are NOT visible (hidden by default)
- No console errors
- All other sections render correctly

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add testimonials section shell, CSS, and hidden nav links"
```

---

### Task 3: Home Page — Add Testimonial Rendering JS and Firestore Integration

**Files:**
- Modify: `index.html` — `<script>` block

- [ ] **Step 1: Add the Google Review SVG constant and renderTestimonials function**

In the `<script>` block of `index.html`, add this code before the `loadSiteContent()` function:

```javascript
// ── TESTIMONIALS RENDERING ──
const GOOGLE_SVG_16 = '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';
const GOOGLE_SVG_14 = '<svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';

function renderGoogleIcon(url, size) {
  if (!url) return '';
  const svg = size === 16 ? GOOGLE_SVG_16 : GOOGLE_SVG_14;
  return '<a href="' + escHtml(url) + '" target="_blank" rel="noopener noreferrer" title="View on Google Reviews" class="google-review-link">' + svg + '</a>';
}

function renderFeaturedCard(t) {
  return '<div class="testimonial-featured">' +
    '<div class="testimonial-quote-mark">\u201C</div>' +
    '<div class="testimonial-quote">' + t.quote + '</div>' +
    '<div class="testimonial-attr">' +
      '<span class="testimonial-name">' + escHtml(t.name) + '</span>' +
      (t.business ? '<span class="testimonial-dot">&middot;</span><span class="testimonial-biz">' + escHtml(t.business) + '</span>' : '') +
      renderGoogleIcon(t.googleReviewUrl, 16) +
    '</div>' +
  '</div>';
}

function renderSupportingCard(t) {
  return '<div class="testimonial-card">' +
    '<div class="testimonial-quote">' + t.quote + '</div>' +
    '<div class="testimonial-attr">' +
      '<span class="testimonial-name">' + escHtml(t.name) + '</span>' +
      (t.business ? '<span class="testimonial-dot">&middot;</span><span class="testimonial-biz">' + escHtml(t.business) + '</span>' : '') +
      renderGoogleIcon(t.googleReviewUrl, 14) +
    '</div>' +
  '</div>';
}

function renderTestimonials(items) {
  const grid = document.getElementById('testimonials-grid');
  if (!items.length) { grid.innerHTML = ''; return; }

  let html = renderFeaturedCard(items[0]);

  if (items.length === 2) {
    // Single supporting card, full width (no grid wrapper)
    html += '<div style="margin-top:12px;">' + renderSupportingCard(items[1]) + '</div>';
  } else if (items.length > 2) {
    html += '<div class="testimonial-supporting">' +
      items.slice(1).map(t => renderSupportingCard(t)).join('') +
    '</div>';
  }

  grid.innerHTML = html;
}
```

- [ ] **Step 2: Replace old testimonials loading in loadSiteContent()**

In the `loadSiteContent()` function, find and **delete** the old testimonials rendering block:
```javascript
    // Render testimonials
    if (data.testimonials && data.testimonials.length > 0) {
      const container = document.getElementById('testimonials-container');
      if (container) {
        container.innerHTML = data.testimonials.map(t => `
          <div class="testimonial">
            <p>"${escHtml(t.quote)}"</p>
            <cite>&mdash; ${escHtml(t.name)}${t.biz ? ', ' + escHtml(t.biz) : ''}</cite>
          </div>
        `).join('');
      }
    }
```

**Replace** it with the new testimonials loading code (add after the `siteContent/config` block, before the FAQ block):

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

- [ ] **Step 3: Verify in browser**

Open `index.html`. Confirm:
- No console errors
- Testimonials section remains hidden (no data in Firestore yet)
- All other sections work correctly

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add testimonials rendering JS and Firestore integration"
```

---

### Task 4: Admin Panel — Add Testimonials Tab Button, Panel Shell, and CSS

**Files:**
- Modify: `admin.html` — CSS, tab bar HTML, panel HTML, `ALL_TABS` array, `switchTab()` function

- [ ] **Step 1: Add testimonials admin CSS**

In the `<style>` block of `admin.html`, add these styles before the `/* RESPONSIVE */` comment:

```css
    /* ====== TESTIMONIALS ====== */
    .toggle-row { display:flex;justify-content:space-between;align-items:center; }
    .toggle-switch { position:relative;width:44px;height:24px;flex-shrink:0; }
    .toggle-switch input { opacity:0;width:0;height:0; }
    .toggle-slider { position:absolute;inset:0;background:rgba(255,255,255,0.1);border-radius:12px;cursor:pointer;transition:background 0.2s; }
    .toggle-slider::before { content:'';position:absolute;width:18px;height:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:transform 0.2s; }
    .toggle-switch input:checked + .toggle-slider { background:var(--green); }
    .toggle-switch input:checked + .toggle-slider::before { transform:translateX(20px); }
    .toggle-label { font-size:13px;color:var(--text-muted);font-weight:500; }
    .section-disabled-banner { font-size:12px;color:var(--text-dimmer);padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-top:12px;font-style:italic; }

    .test-form { background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px;margin-bottom:20px;display:none; }
    .test-form.visible { display:block; }
    .test-form-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
    .test-form-grid .full { grid-column:span 2; }

    .test-editor-layout { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px; }
    .test-editor-panel { background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;display:flex;flex-direction:column; }
    .test-editor-textarea { flex:1;width:100%;min-height:120px;padding:12px;background:transparent;border:none;color:#e2e8f0;font-family:'JetBrains Mono','Fira Code',monospace;font-size:13px;line-height:1.7;resize:none;outline:none; }

    .test-row { background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px;transition:border-color 0.2s;margin-bottom:6px; }
    .test-row:hover { border-color:rgba(255,255,255,0.1); }
    .test-row.dragging { opacity:0.5;border-color:var(--orange); }
    .test-row.drag-over { border-top:2px solid var(--orange); }
    .test-drag { cursor:grab;color:var(--text-dimmer);font-size:18px;flex-shrink:0; }
    .test-drag:active { cursor:grabbing; }
    .test-row-body { flex:1;min-width:0; }
    .test-row-quote { font-size:13px;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:italic; }
    .test-row-meta { font-size:11px;color:var(--text-dimmer);margin-top:2px; }
    .test-row-btns { display:flex;gap:6px;flex-shrink:0;align-items:center; }

    .test-preview-wrap { margin-top:20px; }
    .test-preview-header { font-size:11px;font-weight:600;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px; }

    @media (max-width: 900px) {
      .test-editor-layout { grid-template-columns:1fr; }
      .test-form-grid { grid-template-columns:1fr; }
      .test-form-grid .full { grid-column:span 1; }
    }
```

- [ ] **Step 2: Add Testimonials tab button**

In the tab bar (`.tabs`), add this button **after** the Settings tab and **before** the Submissions tab:

```html
      <button class="tab" role="tab" aria-selected="false" onclick="switchTab('testimonials')">
        <i class="ti ti-quote"></i> Testimonials
      </button>
```

- [ ] **Step 3: Update ALL_TABS array**

Change the `ALL_TABS` constant from:
```javascript
const ALL_TABS = ['dashboard','blog','settings','submissions','privacy','terms'];
```
to:
```javascript
const ALL_TABS = ['dashboard','blog','settings','testimonials','submissions','privacy','terms'];
```

- [ ] **Step 4: Add testimonials panel HTML**

Add this panel after the Settings panel (`</div>` closing `panel-settings`) and before the Submissions panel (`<!-- SUBMISSIONS -->`):

```html
    <!-- ══════════════════════════════════════════
         TESTIMONIALS
    ══════════════════════════════════════════ -->
    <div id="panel-testimonials" class="tab-panel">
      <div class="panel-header">
        <span class="panel-title">Testimonials</span>
        <div style="display:flex;align-items:center;gap:12px;">
          <label class="toggle-label" for="test-section-toggle">Show on homepage</label>
          <label class="toggle-switch">
            <input type="checkbox" id="test-section-toggle" onchange="toggleTestimonialsSection()" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div id="test-disabled-banner" class="section-disabled-banner" style="display:none;">
        Testimonials section is hidden from visitors.
      </div>

      <!-- Add/Edit Form -->
      <div id="test-form" class="test-form">
        <div class="test-editor-layout">
          <div>
            <div class="test-form-grid">
              <div class="full">
                <div class="field"><label>Quote *</label></div>
              </div>
            </div>
            <div class="test-editor-panel">
              <div class="editor-toolbar">
                <button class="toolbar-btn" onclick="insertTestTag('strong')" title="Bold"><i class="ti ti-bold"></i></button>
                <button class="toolbar-btn" onclick="insertTestTag('em')" title="Italic"><i class="ti ti-italic"></i></button>
                <button class="toolbar-btn" onclick="insertTestTag('p')" title="Paragraph"><i class="ti ti-align-left"></i> P</button>
                <button class="toolbar-btn" onclick="insertTestLink()" title="Link"><i class="ti ti-link"></i></button>
              </div>
              <textarea class="test-editor-textarea" id="test-quote" placeholder="Write the testimonial quote here..." oninput="updateTestQuotePreview()"></textarea>
            </div>
          </div>
          <div class="preview-panel" style="max-height:260px;">
            <div class="preview-header"><span>Quote Preview</span></div>
            <iframe id="test-quote-preview" style="flex:1;width:100%;min-height:180px;border:none;border-radius:0 0 14px 14px;background:#f9f7f2;"></iframe>
          </div>
        </div>
        <div class="test-form-grid" style="margin-top:12px;">
          <div>
            <div class="field"><label>Name *</label>
              <input class="inp" id="test-name" type="text" placeholder="e.g. Mike R." />
            </div>
          </div>
          <div>
            <div class="field"><label>Business / Title</label>
              <input class="inp" id="test-biz" type="text" placeholder="e.g. Twin Cities Plumbing" />
            </div>
          </div>
          <div class="full">
            <div class="field"><label>Google Review URL (optional)</label>
              <input class="inp" id="test-google-url" type="text" placeholder="https://g.co/..." />
            </div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;">
          <button class="btn btn-primary" id="test-save-btn" onclick="saveTestimonialItem()"><i class="ti ti-device-floppy" style="font-size:14px;margin-right:4px;"></i> Save Testimonial</button>
          <button class="btn btn-ghost" onclick="closeTestForm()">Cancel</button>
        </div>
        <input type="hidden" id="test-editing-id" value="" />
      </div>

      <!-- Add Button -->
      <div id="test-add-wrap" style="margin-bottom:16px;">
        <button class="btn btn-primary" onclick="openTestForm()"><i class="ti ti-plus" style="font-size:14px;margin-right:4px;"></i> Add Testimonial</button>
      </div>

      <!-- Testimonial List -->
      <div id="test-list"><div class="spinner-wrap"><div class="spinner"></div></div></div>

      <!-- Live Section Preview -->
      <div class="test-preview-wrap">
        <div class="test-preview-header">Section Preview</div>
        <div style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);border-radius:14px;overflow:hidden;">
          <iframe id="test-section-preview" style="width:100%;min-height:300px;border:none;border-radius:14px;background:#f8f9fc;"></iframe>
        </div>
      </div>
    </div>
```

- [ ] **Step 5: Add testimonials state stubs and switchTab() integration**

In the STATE section of the script (after `legalFormats`), add these stubs so the admin works at this commit point:

```javascript
let testimonialsLoaded = false;
let testimonialsData = { sectionEnabled: true, items: [] };
let editingTestimonialId = null;
function loadTestimonials() { /* stub — implemented in Task 5 */ }
```

In the `switchTab()` function, add this block after the terms lazy-load check:

```javascript
  // Load testimonials on first visit
  if (name === 'testimonials' && !testimonialsLoaded) {
    loadTestimonials();
  }
```

- [ ] **Step 6: Update dashboard grid to 5 columns**

In the CSS, change `.dash-grid` from:
```css
    .dash-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px; }
```
to:
```css
    .dash-grid { display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:28px; }
```

- [ ] **Step 7: Add Testimonials dashboard card**

In the dashboard panel HTML, add this card after the Submissions card (the last `dash-card` before the closing `</div>` of `.dash-grid`):

```html
        <div class="dash-card">
          <div class="dash-card-label">Testimonials</div>
          <div class="dash-card-value" id="dash-testimonials">—</div>
          <div class="dash-card-sub">Live on homepage</div>
        </div>
```

- [ ] **Step 8: Verify admin panel loads without errors**

Open `admin.html` in browser, log in. Confirm:
- Testimonials tab appears between Settings and Submissions
- Clicking the tab shows the panel with spinner, toggle, and form
- Dashboard shows 5 cards in a row
- All other tabs still work correctly (no index misalignment)
- No console errors

- [ ] **Step 9: Commit**

```bash
git add admin.html
git commit -m "feat: add testimonials tab shell, form HTML, and admin CSS"
```

---

### Task 5: Admin Panel — Testimonials JavaScript (State, Load, Save, CRUD, Reorder, Preview)

**Files:**
- Modify: `admin.html` — `<script>` block

- [ ] **Step 1: Add state variables**

In the STATE section of the script, **replace** the stubs added in Task 4 Step 5 (`let testimonialsLoaded`, `let testimonialsData`, `let editingTestimonialId`, and the `loadTestimonials` stub function) with the real state declarations:

```javascript
let testimonialsLoaded = false;
let testimonialsData = { sectionEnabled: true, items: [] };
let editingTestimonialId = null;
```

- [ ] **Step 2: Add loadTestimonials function**

Add after the legal editors section in the script:

```javascript
/* ================================================================
   TESTIMONIALS
================================================================ */
async function loadTestimonials() {
  const listEl = document.getElementById('test-list');
  listEl.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

  try {
    const doc = await db.collection('siteContent').doc('testimonials').get();
    if (doc.exists) {
      testimonialsData = doc.data();
      if (!testimonialsData.items) testimonialsData.items = [];
    } else {
      testimonialsData = { sectionEnabled: true, items: [] };
    }
    testimonialsLoaded = true;

    // Set toggle
    document.getElementById('test-section-toggle').checked = testimonialsData.sectionEnabled;
    document.getElementById('test-disabled-banner').style.display = testimonialsData.sectionEnabled ? 'none' : '';

    renderTestimonialsList();
    updateTestSectionPreview();
    updateDashboardTestimonials();
  } catch(err) {
    listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--red);"><p style="font-size:13px;">Failed to load testimonials: ' + escHtml(err.message) + '</p></div>';
  }
}
```

- [ ] **Step 3: Add saveTestimonials function**

```javascript
async function saveTestimonials() {
  try {
    await db.collection('siteContent').doc('testimonials').set(testimonialsData);
    renderTestimonialsList();
    updateTestSectionPreview();
    updateDashboardTestimonials();
  } catch(err) {
    toast('Save failed: ' + err.message, 'error');
  }
}
```

- [ ] **Step 4: Add toggle, dashboard update, and form functions**

```javascript
async function toggleTestimonialsSection() {
  testimonialsData.sectionEnabled = document.getElementById('test-section-toggle').checked;
  document.getElementById('test-disabled-banner').style.display = testimonialsData.sectionEnabled ? 'none' : '';
  await saveTestimonials();
  toast(testimonialsData.sectionEnabled ? 'Testimonials visible on homepage' : 'Testimonials hidden from homepage');
}

function updateDashboardTestimonials() {
  const liveCount = testimonialsData.items.filter(t => t.live).length;
  document.getElementById('dash-testimonials').textContent = liveCount;
}

function openTestForm(item) {
  editingTestimonialId = item ? item.id : null;
  document.getElementById('test-editing-id').value = editingTestimonialId || '';
  document.getElementById('test-quote').value = item ? item.quote || '' : '';
  document.getElementById('test-name').value = item ? item.name || '' : '';
  document.getElementById('test-biz').value = item ? item.business || '' : '';
  document.getElementById('test-google-url').value = item ? item.googleReviewUrl || '' : '';
  document.getElementById('test-save-btn').innerHTML = '<i class="ti ti-device-floppy" style="font-size:14px;margin-right:4px;"></i> ' + (item ? 'Update Testimonial' : 'Save Testimonial');
  document.getElementById('test-form').classList.add('visible');
  document.getElementById('test-add-wrap').style.display = 'none';
  updateTestQuotePreview();
  document.getElementById('test-name').focus();
}

function closeTestForm() {
  editingTestimonialId = null;
  document.getElementById('test-form').classList.remove('visible');
  document.getElementById('test-add-wrap').style.display = '';
  document.getElementById('test-quote').value = '';
  document.getElementById('test-name').value = '';
  document.getElementById('test-biz').value = '';
  document.getElementById('test-google-url').value = '';
  document.getElementById('test-editing-id').value = '';
}
```

- [ ] **Step 5: Add save item, delete, and toggle live functions**

```javascript
async function saveTestimonialItem() {
  const name = document.getElementById('test-name').value.trim();
  if (!name) { toast('Name is required', 'error'); return; }

  const quote = document.getElementById('test-quote').value.trim();
  if (!quote) { toast('Quote is required', 'error'); return; }

  const itemData = {
    quote,
    name,
    business: document.getElementById('test-biz').value.trim(),
    googleReviewUrl: document.getElementById('test-google-url').value.trim()
  };

  if (editingTestimonialId) {
    const idx = testimonialsData.items.findIndex(t => t.id === editingTestimonialId);
    if (idx !== -1) {
      testimonialsData.items[idx] = { ...testimonialsData.items[idx], ...itemData };
    }
  } else {
    const newItem = {
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ...itemData,
      live: false,
      order: testimonialsData.items.length
    };
    testimonialsData.items.push(newItem);
  }

  const wasEditing = !!editingTestimonialId;
  await saveTestimonials();
  closeTestForm();
  toast(wasEditing ? 'Testimonial updated' : 'Testimonial added');
}

async function deleteTestimonial(id) {
  if (!confirm('Delete this testimonial? This cannot be undone.')) return;
  testimonialsData.items = testimonialsData.items.filter(t => t.id !== id);
  // Re-index order
  testimonialsData.items.forEach((t, i) => t.order = i);
  await saveTestimonials();
  toast('Testimonial deleted');
}

async function toggleTestimonialLive(id) {
  const item = testimonialsData.items.find(t => t.id === id);
  if (item) {
    item.live = !item.live;
    await saveTestimonials();
    toast(item.live ? 'Testimonial set to live' : 'Testimonial set to draft');
  }
}
```

- [ ] **Step 6: Add list rendering with drag-and-drop**

```javascript
function stripHtmlTags(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function renderTestimonialsList() {
  const listEl = document.getElementById('test-list');
  const items = testimonialsData.items.sort((a, b) => a.order - b.order);

  if (!items.length) {
    listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);"><p style="font-size:14px;margin-bottom:12px;">No testimonials yet.</p><button class="btn btn-primary" onclick="openTestForm()">Add your first testimonial</button></div>';
    return;
  }

  listEl.innerHTML = items.map((t, i) => {
    const preview = stripHtmlTags(t.quote).slice(0, 80) + (stripHtmlTags(t.quote).length > 80 ? '...' : '');
    const statusClass = t.live ? 'published' : 'draft';
    const statusLabel = t.live ? 'LIVE' : 'DRAFT';

    return '<div class="test-row" draggable="true" data-id="' + t.id + '" data-index="' + i + '">' +
      '<i class="ti ti-grip-vertical test-drag"></i>' +
      '<div class="test-row-body">' +
        '<div class="test-row-quote">&ldquo;' + escHtml(preview) + '&rdquo;</div>' +
        '<div class="test-row-meta">' + escHtml(t.name) + (t.business ? ' &middot; ' + escHtml(t.business) : '') + '</div>' +
      '</div>' +
      '<div class="test-row-btns">' +
        '<span class="status-pill ' + statusClass + '" style="cursor:pointer;" onclick="toggleTestimonialLive(\'' + t.id + '\')">' + statusLabel + '</span>' +
        '<button class="btn btn-ghost btn-sm" onclick="editTestimonial(\'' + t.id + '\')">Edit</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteTestimonial(\'' + t.id + '\')">Delete</button>' +
      '</div>' +
    '</div>';
  }).join('');

  // Attach drag-and-drop handlers
  initTestimonialDragDrop();
}

function editTestimonial(id) {
  const item = testimonialsData.items.find(t => t.id === id);
  if (item) openTestForm(item);
}
```

- [ ] **Step 7: Add drag-and-drop implementation**

```javascript
function initTestimonialDragDrop() {
  const rows = document.querySelectorAll('.test-row[draggable]');
  let dragSrcIndex = null;

  rows.forEach(row => {
    row.addEventListener('dragstart', function(e) {
      dragSrcIndex = parseInt(this.dataset.index);
      this.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragSrcIndex);
    });

    row.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.classList.add('drag-over');
    });

    row.addEventListener('dragleave', function() {
      this.classList.remove('drag-over');
    });

    row.addEventListener('drop', async function(e) {
      e.preventDefault();
      this.classList.remove('drag-over');
      const dropIndex = parseInt(this.dataset.index);
      if (dragSrcIndex === null || dragSrcIndex === dropIndex) return;

      // Reorder
      const sorted = testimonialsData.items.sort((a, b) => a.order - b.order);
      const [moved] = sorted.splice(dragSrcIndex, 1);
      sorted.splice(dropIndex, 0, moved);
      sorted.forEach((t, i) => t.order = i);

      await saveTestimonials();
      toast('Order updated');
    });

    row.addEventListener('dragend', function() {
      this.classList.remove('dragging');
      document.querySelectorAll('.test-row.drag-over').forEach(r => r.classList.remove('drag-over'));
    });
  });
}
```

- [ ] **Step 8: Add toolbar and quote preview functions**

```javascript
function insertTestTag(tag) {
  const ta = document.getElementById('test-quote');
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.substring(start, end) || 'text';
  const isBlock = tag === 'p';
  const nl = isBlock ? '\n' : '';
  const insert = '<' + tag + '>' + selected + '</' + tag + '>' + nl;
  ta.value = ta.value.substring(0, start) + insert + ta.value.substring(end);
  ta.selectionStart = start + tag.length + 2;
  ta.selectionEnd = start + tag.length + 2 + selected.length;
  ta.focus();
  updateTestQuotePreview();
}

function insertTestLink() {
  const ta = document.getElementById('test-quote');
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.substring(start, end) || 'link text';
  const insert = '<a href="https://">' + selected + '</a>';
  ta.value = ta.value.substring(0, start) + insert + ta.value.substring(end);
  ta.focus();
  updateTestQuotePreview();
}

let testQuoteDebounce;
function updateTestQuotePreview() {
  clearTimeout(testQuoteDebounce);
  testQuoteDebounce = setTimeout(() => {
    const content = document.getElementById('test-quote').value.trim();
    const frame = document.getElementById('test-quote-preview');
    const safeContent = content
      ? content.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<link[^>]*>/gi, '')
      : '<p class="empty">Quote preview...</p>';
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head>' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">' +
      '<style>' + PREVIEW_CSS + '</style></head><body>' + safeContent + '</body></html>');
    doc.close();
  }, 300);
}
```

- [ ] **Step 9: Add section preview function**

```javascript
const TEST_SECTION_PREVIEW_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; background: #f8f9fc; padding: 40px 24px; }
  .container { max-width: 720px; margin: 0 auto; }
  .heading { text-align: center; margin-bottom: 32px; }
  .label { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #A86C35; margin-bottom: 8px; }
  .title { font-family: 'Instrument Serif', Georgia, serif; font-size: 28px; color: #1C2333; line-height: 1.12; }
  .featured { background: #fff; border: 1px solid rgba(28,35,51,0.08); border-radius: 14px; padding: 28px 24px; box-shadow: 0 4px 16px rgba(28,35,51,0.10); text-align: center; max-width: 620px; margin: 0 auto; }
  .quote-mark { font-size: 36px; color: rgba(196,131,74,0.2); font-family: 'Instrument Serif', Georgia, serif; line-height: 1; margin-bottom: 8px; }
  .quote { font-style: italic; font-size: 15px; color: #334155; line-height: 1.8; margin-bottom: 14px; }
  .quote p { margin-bottom: 0.5rem; } .quote p:last-child { margin-bottom: 0; }
  .attr { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
  .name { font-weight: 600; font-size: 13px; color: #1C2333; }
  .biz { font-size: 13px; color: #64748b; }
  .dot { color: #94a3b8; }
  .g-link { display: inline-flex; margin-left: 4px; opacity: 0.3; }
  .supporting { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
  .card { background: #fff; border: 1px solid rgba(28,35,51,0.08); border-radius: 12px; padding: 18px; box-shadow: 0 1px 4px rgba(28,35,51,0.06); }
  .card .quote { font-size: 13px; color: #64748b; line-height: 1.7; margin-bottom: 10px; }
  .card .attr { justify-content: flex-start; }
  .card .name { font-size: 12px; } .card .biz { font-size: 12px; }
  .card .g-link { margin-left: auto; }
  .empty { text-align: center; padding: 40px; color: #94a3b8; font-style: italic; font-size: 14px; }
`;

const GOOGLE_SVG_PREVIEW_16 = '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';
const GOOGLE_SVG_PREVIEW_14 = '<svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';

let testSectionDebounce;
function updateTestSectionPreview() {
  clearTimeout(testSectionDebounce);
  testSectionDebounce = setTimeout(() => {
    const frame = document.getElementById('test-section-preview');
    const liveItems = testimonialsData.items
      .filter(t => t.live)
      .sort((a, b) => a.order - b.order);

    if (!testimonialsData.sectionEnabled || !liveItems.length) {
      const doc = frame.contentDocument || frame.contentWindow.document;
      doc.open();
      doc.write('<!DOCTYPE html><html><head><style>' + TEST_SECTION_PREVIEW_CSS + '</style></head><body><div class="empty">Testimonials section is currently hidden. Toggle it on and add live testimonials to see a preview.</div></body></html>');
      doc.close();
      return;
    }

    function gIcon(url, size) {
      if (!url) return '';
      const svg = size === 16 ? GOOGLE_SVG_PREVIEW_16 : GOOGLE_SVG_PREVIEW_14;
      return '<a href="#" class="g-link" title="Google Review link">' + svg + '</a>';
    }

    function featuredHtml(t) {
      return '<div class="featured"><div class="quote-mark">\u201C</div><div class="quote">' + t.quote + '</div><div class="attr"><span class="name">' + escHtml(t.name) + '</span>' + (t.business ? '<span class="dot">&middot;</span><span class="biz">' + escHtml(t.business) + '</span>' : '') + gIcon(t.googleReviewUrl, 16) + '</div></div>';
    }

    function cardHtml(t) {
      return '<div class="card"><div class="quote">' + t.quote + '</div><div class="attr"><span class="name">' + escHtml(t.name) + '</span>' + (t.business ? '<span class="dot">&middot;</span><span class="biz">' + escHtml(t.business) + '</span>' : '') + gIcon(t.googleReviewUrl, 14) + '</div></div>';
    }

    let body = '<div class="container"><div class="heading"><div class="label">What Clients Say</div><div class="title">Results speak louder than promises.</div></div>';
    body += featuredHtml(liveItems[0]);

    if (liveItems.length === 2) {
      body += '<div style="margin-top:12px;">' + cardHtml(liveItems[1]) + '</div>';
    } else if (liveItems.length > 2) {
      body += '<div class="supporting">' + liveItems.slice(1).map(t => cardHtml(t)).join('') + '</div>';
    }

    body += '</div>';

    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head>' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif&display=swap" rel="stylesheet">' +
      '<style>' + TEST_SECTION_PREVIEW_CSS + '</style></head><body>' + body + '</body></html>');
    doc.close();
  }, 300);
}
```

- [ ] **Step 10: Add testimonials to bootAdmin**

Update the `bootAdmin()` function — add `loadTestimonials()` call and update dashboard count:

Change:
```javascript
async function bootAdmin() {
  await loadSettings();
  await loadBlog();
  loadSubmissions();
}
```
to:
```javascript
async function bootAdmin() {
  await loadSettings();
  await loadBlog();
  loadSubmissions();
  // Pre-load testimonials count for dashboard
  db.collection('siteContent').doc('testimonials').get().then(doc => {
    if (doc.exists) {
      const d = doc.data();
      const liveCount = (d.items || []).filter(t => t.live).length;
      document.getElementById('dash-testimonials').textContent = liveCount;
    } else {
      document.getElementById('dash-testimonials').textContent = 0;
    }
  });
}
```

- [ ] **Step 11: Full integration test**

Open `admin.html`, log in, and test:
1. Click Testimonials tab — spinner shows, then empty state
2. Toggle "Show on homepage" off and back on — banner appears/disappears, toast confirms
3. Click "Add Testimonial" — form appears with toolbar and preview
4. Fill in quote (with bold/italic formatting), name, business, Google URL
5. Save — item appears in list as DRAFT
6. Click DRAFT pill — toggles to LIVE, toast confirms
7. Click Edit — form pre-populates, button says "Update Testimonial"
8. Update and save — changes reflected in list
9. Add 3+ testimonials, toggle some live
10. Drag rows to reorder — order updates, toast confirms
11. Delete a testimonial — confirms, removes from list
12. Check live preview iframe — shows adaptive layout with live items
13. Check dashboard — Testimonials count shows correct live count
14. Open `index.html` — testimonials section visible with live items, nav links visible
15. Toggle section off in admin — refresh `index.html` — section hidden, nav links hidden

- [ ] **Step 12: Commit**

```bash
git add admin.html
git commit -m "feat: add testimonials CRUD, drag-reorder, live preview, and Firestore integration"
```

---

### Task 6: Final Verification and Cleanup Commit

**Files:**
- Verify: `admin.html`, `index.html`

- [ ] **Step 1: Cross-file integration check**

1. Open admin, add 3 testimonials with different content. Set 2 to live, 1 draft.
2. Open home page in another tab — verify only 2 live testimonials show in adaptive layout (featured + 1 supporting)
3. Drag reorder in admin so a different testimonial is position 0 — refresh home page, confirm new featured testimonial
4. Toggle section off in admin — refresh home page, confirm section hidden and nav links hidden
5. Toggle back on — confirm section visible again

- [ ] **Step 2: Responsive check**

1. Resize home page to mobile width — confirm supporting grid collapses to single column
2. Resize admin to tablet width — confirm form and editor grids collapse to single column
3. Verify admin tabs scroll horizontally on narrow screens

- [ ] **Step 3: Final commit**

```bash
git add admin.html index.html
git commit -m "feat: testimonials management system — complete integration"
```
