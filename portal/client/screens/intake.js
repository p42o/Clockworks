// Template-driven intake: confirmed prefill, scoped drafts, revision-aware saves, review, preview signing, receipt.
import { html, mount, ic, fmtDateY, skeleton, errorState, onRetry, setBusy, raw, showErrors, focusHeading } from "../lib/ui.js";
import { getDraft, putDraft, removeDraft } from "../lib/drafts.js";
import { documentBody } from "../lib/legal.js";
import { showDevCode } from "../lib/dev.js";
import { state } from "../lib/session.js";
import * as api from "../lib/api.js";
import * as data from "../lib/data.js";
import { SWAP } from "../swap-config.js";
import { INTAKE_COMPLETE_COPY, SUBMIT_SCREEN_COPY } from "../lib/clientCopy.js";
import { live, emptyState, act } from "./_util.js";
import { questionForm } from "./messages.js";

// Fixture previews only: real clients never see the signing step while eSign is off (reviewSubmit instead).
const previewBanner = () => !SWAP.eSign.realClients && state.me?.fixture === true
  ? html`<div class="banner preview">${ic("alert")}<div><b>Preview — signing not live yet.</b>You can look through everything, but nothing you sign here is binding.</div></div>` : "";

// Group the template's steps into a few named parts so the intake reads as 4 short sections, not 11 screens.
// Unknown step ids join the part before them, so a template change never breaks the stepper.
const PARTS = [
  { name: "Your business", ids: ["welcome", "business", "hours", "channels"] },
  { name: "Team and work", ids: ["people", "jobs"] },
  { name: "Your tools", ids: ["accounts", "boundaries", "quickwin"] },
  { name: "Wrap up", ids: ["legal", "review"] },
];
function partsOf(list) {
  const out = PARTS.map((p) => ({ name: p.name, steps: [] }));
  let cur = 0;
  list.forEach((st, i) => {
    const k = PARTS.findIndex((p) => p.ids.includes(st.id));
    if (k >= 0) cur = k;
    out[cur].steps.push(i);
  });
  return out.filter((p) => p.steps.length);
}
const minutesOf = (list) => list.reduce((n, st) => n + (st.estMinutes || 1), 0);

export function render(ctx) {
  const { el, router } = ctx;
  let inner = null;
  // Decide which view from the home projection; swap views when intake status changes.
  let mode = null;
  const outer = data.subscribeHome((h) => {
    const st = h?.intake?.status;
    const next = !h || !h.intake ? "none" : ["submitted", "reviewed"].includes(st) ? "info" : "wizard";
    if (next === mode || (mode === "wizard" && next === "info")) return;
    mode = next; inner?.(); inner = null;
    if (next === "none") mount(el, html`<h1>Intake</h1>${emptyState("No intake yet.", "Parker will set this up when it's time.", "intake")}`);
    else if (next === "info") inner = myInfo(el, router);
    else inner = wizard(el, h.intake);
  }, () => { mount(el, html`<h1>Intake</h1>${errorState()}`); onRetry(el, () => router.go("#/home")); });
  return () => { outer(); inner?.(); };
}

function wizard(el, intake) {
  let dead = false, r, index = 0, lastIndex = 0, timer, saving = Promise.resolve(), dirty = false;
  const values = {}, pending = {};
  let draftKey, conflict = false;
  const persist = () => state.clearingDrafts || !state.user ? Promise.resolve() : putDraft(draftKey, { values, pending, index, rev:r.rev, expiresAt:Math.min(state.sessionExpiresAt || Date.now()+86400000,Date.now()+86400000*30) });
  const reconcile = async () => {
    const latest = await api.intakeGet();
    if(latest.rev !== r.rev) { conflict = true; mount(el, html`<h1>Choose the answers to keep</h1><div class="stack"><p>This intake changed on another screen. Your device draft is still safe here.</p><button class="btn primary" data-server>Use the saved portal answers</button><button class="btn" data-device>Keep this device's draft</button></div>`);
      el.querySelector('[data-server]').onclick = async () => { await removeDraft(draftKey); location.reload(); };
      el.querySelector('[data-device]').onclick = async () => { r.rev=latest.rev; conflict=false; for(const step of steps()) pending[step.id]=Object.fromEntries(step.questions.filter(q=>values[q.id]!==undefined).map(q=>[q.id,values[q.id]])); dirty=true; await persist(); paint(); };
      focus(); return false;
    } return true;
  };
  const steps = () => r.template.steps.filter(s => !s.termsStep);
  const focus = () => { if (!dead) focusHeading(); };
  const showError = e => showErrors(el, [{ msg: api.errCode(e) === 'aborted' ? 'Your answers changed on another screen. Reopen Intake to load the saved copy before continuing.' : api.friendlyError(e) }]);
  async function load() {
    mount(el, html`<h1>Tell us about your business</h1>${skeleton(3)}`);
    try {
      r = await api.intakeGet();
      if (dead) return;
      for (const [key, answer] of Object.entries(r.answers)) values[key] = answer.value;
      if (!r.privacyAck) await api.intakeAckPrivacy({ intakeId: r.intakeId });
      draftKey = `${state.user.uid}:${r.intakeId}`;
      const draft = await getDraft(draftKey);
      if (draft) { Object.assign(values,draft.values); Object.assign(pending,draft.pending); }
      if (r.signed) { await removeDraft(draftKey); return done(); }
      index = Math.max(0, steps().findIndex(s => s.id === r.currentStepId));
      if (draft) { index=draft.index || 0; if(draft.rev !== r.rev) { r.rev=draft.rev; if(!await reconcile()) return; } }
      const all = steps(), parts = partsOf(all), mins = minutesOf(all);
      const done = r.rev ? Math.max(0, steps().findIndex(st => st.id === r.currentStepId)) : 0;
      mount(el, html`<div class="page-head"><span class="eyebrow rule">Intake</span><h1>Tell us about your <em>business</em></h1><p>A few short parts so Parker starts from the right place. Mostly taps, and it saves as you go.</p></div><div class="stack">${previewBanner()}<section class="card intake-start"><h2>A good place to begin</h2>
        <div class="facts"><div><b>${parts.length}</b><span>Short parts</span></div><div><b>~${mins}</b><span>Minutes</span></div><div><b>${r.rev ? `${Math.round(done / all.length * 100)}%` : "0%"}</b><span>Done</span></div></div>
        <ol class="parts">${parts.map(pt => html`<li>${pt.name}<small>${minutesOf(pt.steps.map(i => all[i]))} min</small></li>`)}</ol>
        <p class="small muted">Your answers save as you go. You can leave and pick up here later. A draft may stay on this device until you submit or sign out. Always sign out on a shared device. We never ask for passwords or bank details.</p>
        <div class="actions"><button class="btn primary" data-start>${r.rev ? 'Pick up where you left off' : 'Start'}</button></div></section></div>`);
      el.querySelector('[data-start]').onclick = paint;
      focus();
    } catch(e) { if (!dead) { mount(el, html`<h1>Intake</h1>${errorState()}`); onRetry(el, load); } }
  }
  function field(q) {
    const v = values[q.id], pf = r.prefill[q.prefillKey];
    const hint = html`<span class="hint" id="why-${q.id}">${q.why}${q.required ? ' Required.' : ' Optional.'}</span>`;
    const attrs = raw(`id="${q.id}" aria-describedby="why-${q.id}" data-q="${q.id}"`);
    if (q.type === 'choice' || q.type === 'multi') return html`<fieldset class="field"><legend>${q.label}</legend>${hint}${q.options.map(option => html`<label class="check"><input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="${q.id}" data-q="${q.id}" value="${option}"${(q.type === 'multi' ? (v || []).includes(option) : v === option) ? raw(' checked') : ''}><span>${option}</span></label>`)}</fieldset>`;
    if (q.type === 'confirm') return html`<div class="field"><label for="${q.id}">${q.label}</label>${hint}
      ${pf ? html`<p class="provenance">${pf.source}, ${fmtDateY(pf.asOf)} · Please confirm or correct</p>` : ''}
      <input type="text" ${attrs} value="${v?.value ?? pf?.value ?? ''}" maxlength="300"><div class="actions"><button class="btn" type="button" data-confirm="${q.id}">That's right</button><button class="btn quiet" type="button" data-change="${q.id}">Change it</button><button class="btn quiet" type="button" data-unsure="${q.id}">Not sure</button></div><span class="hint" data-confirmed="${q.id}">${v?.action === 'confirmed' ? 'Confirmed' : v?.action === 'corrected' ? 'Corrected' : v?.action === 'not-sure' ? 'Not sure — you can revisit this' : 'Please confirm or correct.'}</span></div>`;
    if (['table-confirm','accounts'].includes(q.type)) {
      const rows = Array.isArray(v) && v.length ? v : [{}];
      return html`<fieldset class="field"><legend>${q.label}</legend>${hint}<div class="stack" data-table="${q.id}">${rows.map((row,i) => html`<div class="table-entry">${q.columns.map(col => html`<label>${col === 'loginIdentifier' ? 'Login name or email' : col[0].toUpperCase()+col.slice(1)}<input type="text" data-q="${q.id}" data-row="${i}" data-col="${col}" value="${row[col] || ''}" maxlength="150" aria-describedby="why-${q.id}"></label>`)}</div>`)}</div><button class="btn quiet" type="button" data-add="${q.id}">Add another row</button></fieldset>`;
    }
    return html`<div class="field"><label for="${q.id}">${q.label}</label>${hint}${q.type === 'longtext' ? html`<textarea ${attrs} maxlength="${q.maxLength || 2000}">${v || ''}</textarea>` : html`<input type="text" ${attrs} maxlength="${q.maxLength || 300}" value="${v || ''}">`}</div>`;
  }
  function read() {
    for (const q of steps()[index].questions) {
      const inputs = [...el.querySelectorAll('[data-q]')].filter(input => input.dataset.q === q.id);
      if (q.type === 'choice') values[q.id] = inputs.find(i => i.checked)?.value || '';
      else if (q.type === 'multi') values[q.id] = inputs.filter(i => i.checked).map(i => i.value);
      else if (['table-confirm','accounts'].includes(q.type)) {
        const rows = [];
        inputs.forEach(i => { (rows[Number(i.dataset.row)] ||= {})[i.dataset.col] = i.value; });
        values[q.id] = rows.filter(row => Object.values(row).some(Boolean));
      } else if (q.type === 'confirm') {
        const value = inputs[0].value;
        const previous = values[q.id];
        values[q.id] = { action: previous ? (previous.value === value ? previous.action : 'corrected') : (value !== (r.prefill[q.prefillKey]?.value || '') ? 'corrected' : 'skipped'), value };
      } else values[q.id] = inputs[0].value;
    }
  }
  function save() {
    clearTimeout(timer);
    if (conflict) return Promise.reject(new Error('conflict'));
    if (dirty) {
      read(); dirty=false;
      const step=steps()[index]; pending[step.id]=Object.fromEntries(step.questions.map(q=>[q.id,values[q.id]]));
    }
    saving = saving.catch(()=>{}).then(async()=>{
      await persist();
      const status=el.querySelector('[data-save]');
      if(!navigator.onLine) { if(status) status.textContent='Offline — saved on this device. Reconnect before signing.'; return; }
      if(!Object.keys(pending).length) return;
      if(status) { status.textContent='Saving…'; status.dataset.state='saving'; }
      if(!await reconcile()) throw new Error('conflict');
      for(const stepId of Object.keys(pending)) {
        const answers=structuredClone(pending[stepId]);
        const result=await api.intakeSaveStep({ intakeId:r.intakeId,rev:r.rev,stepId,answers });
        r.rev=result.rev;
        if(JSON.stringify(pending[stepId])===JSON.stringify(answers)) delete pending[stepId];
        await persist();
      }
      if(status?.isConnected) { status.textContent='Saved. You can come back any time.'; status.dataset.state='saved'; showErrors(el,[]); }
    }).catch(e=>{ if(!navigator.onLine) { const status=el.querySelector('[data-save]'); if(status)status.textContent='Offline — saved on this device. Reconnect before signing.'; return; } if(!dead && !conflict) { const status=el.querySelector('[data-save]');if(status)status.textContent='Saved on this device. Keep this screen open and try again.';showError(e); } throw e; });
    return saving;
  }
  function valid() {
    read();
    const missing = steps()[index].questions.filter(q => q.required).filter(q => {
      const v = values[q.id];
      return !v || (Array.isArray(v) && !v.length) || (q.type === 'confirm' && !['confirmed','corrected'].includes(v.action));
    });
    showErrors(el, missing.map(q => ({ id: q.type === 'choice' || q.type === 'multi' || q.type === 'table-confirm' ? undefined : q.id, msg:`Please ${q.type === 'confirm' ? 'confirm or correct' : 'answer'} “${q.label}”.` })));
    return !missing.length;
  }
  const display = value => Array.isArray(value) ? value.map(x => typeof x === 'object' ? Object.values(x).join(' · ') : x).join(', ') : typeof value === 'object' ? value?.value || value?.action : value || 'Not answered';
  function reviewAnswers() {
    return html`${steps().filter(s => s.id !== 'review').map((s,i) => html`<section class="card"><div class="row"><h2 class="grow">${s.title}</h2><button class="btn quiet" type="button" data-edit="${i}">Edit</button></div><dl class="kv">${s.questions.map(q => html`<dt>${q.label}</dt><dd>${display(values[q.id])}</dd>`)}</dl></section>`)}`;
  }
  function bindEdits() { el.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => { await save(); index = Number(b.dataset.edit); paint(); }); }
  function paint() {
    if (dead) return;
    const step = steps()[index];
    const all = steps(), parts = partsOf(all), pi = Math.max(0, parts.findIndex(pt => pt.steps.includes(index)));
    const left = minutesOf(all.slice(index));
    const dir = index < lastIndex ? ' back-dir' : '';
    lastIndex = index;
    mount(el, html`<div class="stepper"><div class="where"><span>Step ${index+1} of ${all.length} · <b>Part ${pi+1} of ${parts.length}</b></span><span>about ${left} min left</span></div>
      <div class="segs" role="progressbar" aria-valuemin="0" aria-valuemax="${all.length}" aria-valuenow="${index+1}" aria-label="Intake progress">${all.map((_, i) => html`<i class="${i < index ? 'done' : i === index ? 'on' : ''}"></i>`)}</div>
      <div class="chapters" aria-hidden="true">${parts.map((pt, k) => html`<span class="${k < pi ? 'done' : k === pi ? 'on' : ''}">${pt.name}</span>`)}</div></div>
      <div class="step-in${dir}"><div class="page-head"><h1>${step.title}</h1><p>${step.intro}</p></div><div class="stack">${step.id === 'review' ? reviewAnswers() : ''}<form class="card stack intake-form" novalidate>${step.questions.map(field)}<div class="actions">${index > 0 ? html`<button class="btn" type="button" data-back>Back</button>` : ""}<button class="btn primary" type="submit">Save &amp; continue</button></div><div class="foot"><p class="save-pill" role="status" data-save>Saved answers stay here when you return.</p><button class="btn quiet" type="button" data-pause>Save &amp; leave for now</button></div></form></div></div>`);
    const form = el.querySelector('form');
    form.oninput = () => { dirty = true; timer && clearTimeout(timer); timer = setTimeout(() => save().catch(()=>{}), 1500); };
    form.addEventListener('focusout', () => { if(dirty) save().catch(()=>{}); });
    el.querySelectorAll('[data-confirm]').forEach(b => b.onclick = () => { const q = b.dataset.confirm; values[q] = { action:'confirmed', value:el.querySelector('#'+q).value }; dirty = true; el.querySelector(`[data-confirmed="${q}"]`).textContent = 'Confirmed'; save().catch(()=>{}); });
    el.querySelectorAll('[data-change]').forEach(b => b.onclick = () => { const input = el.querySelector('#'+b.dataset.change); input.focus(); input.select(); });
    el.querySelectorAll('[data-unsure]').forEach(b => b.onclick = () => { const q = b.dataset.unsure; values[q] = { action:'not-sure', value:el.querySelector('#'+q).value }; dirty = true; el.querySelector(`[data-confirmed="${q}"]`).textContent = 'Not sure — please confirm before signing'; save().catch(()=>{}); });
    el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { read(); const q = b.dataset.add; const limit = step.questions.find(x => x.id === q).maxRows || 20; if (values[q].length < limit) values[q].push({}); paint(); });
    const backBtn = el.querySelector('[data-back]');
    if (backBtn) backBtn.onclick = async () => { try { await save(); if (index) index--; paint(); } catch {} };
    el.querySelector('[data-pause]').onclick = async () => { try { dirty = true; await save(); location.hash = '#/home'; } catch {} };
    form.onsubmit = async ev => { ev.preventDefault(); if (!valid()) return; const b = form.querySelector('[type=submit]'); setBusy(b,true); try { dirty=true; await save(); if (index === steps().length-1) signReview(); else { index++; paint(); } } catch { setBusy(b,false); } };
    bindEdits(); focus();
  }
  // Real clients while e-signing is off: no agreement to sign here (the MSA/SOW come later), just review + submit.
  function reviewSubmit() {
    mount(el, html`<div class="page-head"><span class="eyebrow rule">Last step</span><h1>Review and <em>submit</em></h1><p>Take a quick look. You can edit any part before you send it to Parker.</p></div><div class="stack">${reviewAnswers()}
      <section class="card" data-unsigned><h2>Ready to send?</h2><p>${r.submitScreenCopy || SUBMIT_SCREEN_COPY}</p>
        <div class="actions">${r.allowUnsignedSubmit === true ? html`<button class="btn primary" type="button" data-unsigned-submit>Submit my intake <span class="arrow">${ic("arrow-right")}</span></button>` : html`<p class="small muted">Submitting isn't open yet. Your answers are saved, and Parker can help.</p>`}<button class="btn" type="button" data-return>Back</button></div></section></div>`);
    bindEdits(); focus();
    el.querySelector('[data-return]').onclick = paint;
    el.querySelector('[data-unsigned-submit]')?.addEventListener('click', async (ev) => {
      const b = ev.currentTarget;
      setBusy(b, true);
      try { await api.intakeSubmit({ withoutSigning: true }); await removeDraft(draftKey); doneUnsigned(); }
      catch (e) { setBusy(b, false); showError(e); }
    });
  }
  function signReview() {
    if (r.signingMode === 'not_live') return reviewSubmit();
    const entityTypes = { LLC:'llc', Corporation:'corporation', Partnership:'partnership', 'Sole proprietor':'sole_prop' };
    const entity = { type:entityTypes[values.e_type], entityLegalName:values.e_legal_name, stateOfOrganization:values.e_state, title:values.e_title, dbaName:values.e_legal_name };
    const checks = [['ageAttested', "I'm 18 or older"], ['authorityAttested', "I'm authorized to sign for this business"], ['purpose', 'This agreement is for business purposes'], ['disclosureAccessConfirmed', 'I can open, read, save, and print these electronic records'], ['eConsent','I agree to use electronic records and signatures'], ['intent','I intend to sign and agree to these terms']];
    const idem = crypto.randomUUID();
    const unsigned = r.allowUnsignedSubmit === true ? html`<section class="card" data-unsigned data-counsel="COUNSEL-DRAFT-2026-10-19 approved 7:40 PM CT"><h2>Submit without signing</h2><p>${r.submitScreenCopy || SUBMIT_SCREEN_COPY}</p><button class="btn" type="button" data-unsigned-submit>Submit without signing</button></section>` : "";
    mount(el, html`<div class="page-head"><span class="eyebrow rule">Last step</span><h1>Review and agree</h1></div><div class="stack">${previewBanner()}${unsigned}${reviewAnswers()}<section class="card"><h2>Read your draft agreement</h2><p>${r.terms.version} · SHA-256 ${r.terms.termsSha256.slice(0,12)}</p>${documentBody(r.terms.termsText)}<a class="btn" href="${SWAP.acceptance.terms.file}" download>Download draft terms</a><div class="banner warn"><div>Please read the limitation of liability, disclaimer, and Minnesota law / Hennepin County courts sections carefully.</div></div></section>
      <form class="card stack" novalidate><h2>Your signature</h2><p>${r.signingMode === 'preview' ? 'Fixture preview — not a binding signature.' : "Preview — signing isn't live yet"}</p>
      <div class="field"><label for="typed-name">Type your full legal name</label><input type="text" id="typed-name" autocomplete="off" maxlength="120"><span class="hint">Type this yourself to show your intent to sign.</span></div><p class="signature-block" data-block aria-live="polite">${entity.entityLegalName}, by [Name], its ${entity.title}</p>
      ${checks.map(([key,label]) => html`<label class="check"><input type="checkbox" name="${key}"><span>${label}</span></label>`)}
      <button class="btn" type="button" data-code>Email me a signing code</button><div class="field"><label for="sign-code">Fresh 6-digit signing code</label><input type="text" id="sign-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6"><span class="hint" data-sent>The code will go to ${r.signerEmailMasked}.</span></div>
      <div class="actions"><button class="btn" type="button" data-return>Back to review</button><button class="btn primary" type="submit"${r.signingMode === 'not_live' ? raw(' disabled') : ''}>Sign and agree</button></div></form></div>`);
    bindEdits(); focus();
    el.querySelector('[data-unsigned-submit]')?.addEventListener('click', async (ev) => {
      const b = ev.currentTarget;
      setBusy(b, true);
      try {
        await api.intakeSubmit({ withoutSigning: true });
        await removeDraft(draftKey);
        doneUnsigned();
      } catch (e) { setBusy(b, false); showError(e); }
    });
    const form = el.querySelector('form'), name = el.querySelector('#typed-name');
    name.oninput = () => { el.querySelector('[data-block]').textContent = entity.type === 'sole_prop' ? `${name.value || '[Name]'}, doing business as ${entity.dbaName}` : `${entity.entityLegalName}, by ${name.value || '[Name]'}, its ${entity.title}`; };
    el.querySelector('[data-return]').onclick = paint;
    el.querySelector('[data-code]').onclick = async ev => { const b = ev.currentTarget; setBusy(b,true); try { await api.intakeSendSignCode(); el.querySelector('[data-sent]').textContent = 'Code sent. It works for 10 minutes.'; showDevCode(state.email); let left=30; b.textContent='Code sent · wait 30s'; const countdown=setInterval(()=>{ left--; if (!b.isConnected || left<=0) {clearInterval(countdown); if(b.isConnected) {setBusy(b,false);b.textContent='Send a new signing code';}} else b.textContent=`Code sent · wait ${left}s`; },1000); } catch(e) { setBusy(b,false); showError(e); } };
    form.onsubmit = async ev => {
      ev.preventDefault();
      const errors = [];
      if (!name.value.trim()) errors.push({id:'typed-name', msg:'Type your full legal name.'});
      checks.forEach(([key,label])=> { if(!form.elements[key].checked) errors.push({msg:label + ' — please confirm before signing.'}); });
      const code = el.querySelector('#sign-code').value.replace(/\D/g,'');
      if(code.length !== 6) errors.push({id:'sign-code',msg:'Enter the fresh 6-digit signing code.'});
      if (!entity.type) errors.push({msg:'Go back to your business details and choose its legal setup before signing.'});
      showErrors(form,errors); if(errors.length) return;
      if(!navigator.onLine || Object.keys(pending).length) { showErrors(form,[{msg:'Reconnect and save your answers before signing.'}]);return; }
      const b=form.querySelector('[type=submit]');setBusy(b,true);
      try { const signed = await api.intakeSign({ intakeId:r.intakeId, idempotencyKey:idem, typedName:name.value.trim(), entity, ageAttested:true, authorityAttested:true, purpose:'business', disclosureAccessConfirmed:true, eConsent:true, intent:true, code }); await api.intakeSubmit(); await removeDraft(draftKey); done(signed.receiptId); }
      catch(e) { setBusy(b,false); showError(e); }
    };
  }
  function done(receiptId) {
    mount(el, html`<div class="page-head"><span class="eyebrow rule">Intake complete</span><h1>You're all set!</h1></div><div class="stack"><div class="banner preview"><div>Preview signature — not binding.</div></div><section class="card"><h2>Thanks for walking us through it.</h2><p data-complete>${r.completionCopy || INTAKE_COMPLETE_COPY}</p><p>Parker reviews everything next. Nothing connects or changes without your OK.</p><p>Your preview receipt is ready. A copy is recorded in the local email outbox.</p><button class="btn primary" data-receipt>Download your receipt</button><a class="btn quiet" href="#/home">Back to Home</a></section></div>`);
    el.querySelector('[data-receipt]').onclick = async ev => { if (!receiptId) { location.hash='#/account/files'; return; } const result = await act(ev.currentTarget,()=>api.getDownloadLink('receipt:'+receiptId)); if(result?.url) location.assign(result.url); };
    focus();
  }
  function doneUnsigned() {
    mount(el, html`<div class="page-head"><span class="eyebrow rule">Intake complete</span><h1>Your intake is <em>in</em></h1></div><div class="stack"><section class="card"><p data-complete>${r.completionCopy || INTAKE_COMPLETE_COPY}</p><p class="small muted" style="margin-top:8px">Parker reviews everything next. You'll see each step on your Home page.</p><div class="actions"><a class="btn primary" href="#/home">Back to Home</a></div></section></div>`);
    focus();
  }
  const reconnect = () => { if(r && !dead && !el.querySelector('#typed-name')) save().catch(()=>{}); };
  window.addEventListener('online',reconnect);
  load();
  return () => { if(dirty && !state.clearingDrafts && el.querySelector('[data-save]')) save().catch(()=>{}); window.removeEventListener('online',reconnect); dead = true; clearTimeout(timer); document.querySelector('.devhelp')?.remove(); };
}

function myInfo(el, router) {
  return live(el, "My info", data.subscribeProfile, (p) => {
    if (!p) { mount(el, html`<h1>My info</h1>${emptyState("Nothing here yet.", "Parker will fill this in after your intake.", "intake")}`); return; }
    const kv = [["Business", p.businessName], ["Type of work", p.trade], ["Town", p.town], ["Phone", p.publicPhone], ["Website", p.website]].filter((x) => x[1]);
    mount(el, html`<div class="page-head"><h1>My info</h1></div><div class="stack">
      <section class="card" aria-labelledby="mi-h"><h2 id="mi-h">About your business</h2><dl class="kv">${kv.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl></section>
      ${(p.people || []).length ? html`<section class="card" aria-labelledby="pp-h"><h2 id="pp-h">People</h2><ul class="list" style="margin-top:8px">${p.people.map((x) => html`<li><div class="row"><div class="grow">${x.name}</div><span class="sub">${x.role}</span></div></li>`)}</ul></section>` : ""}
      ${p.signedTerms ? html`<section class="card">${p.signedTerms.preview ? html`<div class="banner preview" style="margin-bottom:12px">${ic("alert")}<div>Preview — not a binding signature.</div></div>` : ""}
        <div class="row" style="padding:0"><div class="grow"><div class="title">Terms signed ${fmtDateY(p.signedTerms.signedAt)}</div></div><a class="btn" href="#/account/files">${ic("file")} View receipt</a></div></section>` : ""}
      <section class="card"><h2>Something wrong?</h2><div class="actions"><button type="button" class="btn" data-fix>Ask Parker</button></div><div data-fixform></div></section></div>`);
    el.querySelector("[data-fix]").addEventListener("click", () => {
      const host = el.querySelector("[data-fixform]");
      questionForm(host, { subject: "Correction to my info", onSent: (tid) => router.go(`#/m/${tid}`) });
      host.querySelector("#nq-text").focus();
    });
  });
}
