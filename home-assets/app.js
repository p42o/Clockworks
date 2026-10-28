/* ---------- "+ More" industries: shared by the hero demo and the team section ---------- */
// The six chips cover the most common shops; these sit behind "+ More". Picking one in either
// section locks it in there and pre-selects it in the other (event "cw:biz", detail { key, src }).
window.CW_MORE = (function () {
  var LIST = [['elec', 'Electrician'], ['gc', 'General contractor'], ['roof', 'Roofing'], ['auto', 'Auto repair'],
    ['clean', 'Cleaning service'], ['photo', 'Photographer'], ['event', 'Event planner'], ['fit', 'Fitness studio']];
  function label(key) { for (var i = 0; i < LIST.length; i++) if (LIST[i][0] === key) return LIST[i][1]; return ''; }
  // wrap: .biz-more element. onPick(key). Returns { set(key|null) } to reflect the current pick on the button.
  function mount(wrap, onPick) {
    var btn = wrap.querySelector('.biz-more-btn'), menu = wrap.querySelector('.biz-menu'), t = btn.querySelector('.biz-more-t'), cur = null;
    menu.innerHTML = LIST.map(function (x) { return '<button type="button" role="menuitemradio" aria-checked="false" data-key="' + x[0] + '">' + x[1] + '</button>'; }).join('');
    var items = Array.prototype.slice.call(menu.querySelectorAll('[data-key]'));
    function open(focusFirst) {
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); wrap.classList.add('open');
      var at = items.filter(function (b) { return b.dataset.key === cur; })[0] || items[0];
      if (focusFirst) at.focus();
      setTimeout(function () { document.addEventListener('click', outside, true); }, 0);
    }
    function close(refocus) {
      menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); wrap.classList.remove('open');
      document.removeEventListener('click', outside, true);
      if (refocus) btn.focus();
    }
    function outside(e) { if (!wrap.contains(e.target)) close(false); }
    btn.addEventListener('click', function () { menu.hidden ? open(true) : close(false); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); open(true); } });
    menu.addEventListener('keydown', function (e) {
      var i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); items[e.key === 'Home' ? 0 : items.length - 1].focus(); }
      else if (e.key === 'Tab') close(false);
    });
    items.forEach(function (b) { b.addEventListener('click', function () { close(true); onPick(b.dataset.key); }); });
    function set(key) {
      cur = key && label(key) ? key : null;
      t.textContent = cur ? label(cur) : '+ More';
      btn.classList.toggle('picked', !!cur);
      btn.setAttribute('aria-pressed', cur ? 'true' : 'false');
      items.forEach(function (b) { b.setAttribute('aria-checked', b.dataset.key === cur ? 'true' : 'false'); });
    }
    set(null);
    return { set: set };
  }
  function announce(key, src) { document.dispatchEvent(new CustomEvent('cw:biz', { detail: { key: key, src: src } })); }
  return { list: LIST, label: label, mount: mount, announce: announce };
})();

/* MN Clockworks — homepage: reveals, hero demo (texts from your team), day toggle, team builder */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ---------- reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal, .card');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- hero demo: your teammates text YOU a draft, you reply, then it goes out ---------- */
  (function heroDemo() {
    var demo = $('#demo'), thread = $('#dmThread');
    if (!demo || !thread) return;
    // Same names, icons and colours as the team section below, so the hero and the team tell one story.
    var ROLE = {
      call: ['Call Catch', 'i-call', '#D4582A'], desk: ['Front Desk', 'i-desk', '#B9822B'], book: ['Booking Desk', 'i-cal', '#8A6FB0'],
      quote: ['Quote Builder', 'i-quote', '#5E7F63'], chase: ['Quote Chaser', 'i-loop', '#4E8A86'], paper: ['Paper Mover', 'i-paper', '#7A5A43'],
      site: ['Site Keeper', 'i-web', '#3E6A9A'], design: ['Asset Designer', 'i-brush', '#C2557A'], docs: ['Doc Writer', 'i-doc', '#5B6B7A'],
      review: ['Review Engine', 'i-review', '#9A4659'], inbox: ['Inbox Sorter', 'i-mail', '#6D7A3A'], intel: ['Intel Desk', 'i-intel', '#4F6475']
    };
    // Sample days only. Businesses, names, numbers and times are made up.
    // Each scene: a teammate texts the owner a draft; the owner replies; only then does it go out.
    var BIZ = [
      { name: 'Sample Plumbing Co.', day: 'Tuesday', kind: 'a plumbing shop', team: ['call', 'quote', 'chase', 'paper', 'review', 'site'], scenes: [
        { a: 'call', t: '8:12 AM', msg: 'You missed a call from (763) 555-0142 while you were on a job. Want me to text them back?',
          to: 'Text to (763) 555-0142', body: "Sorry we missed your call! What's going on, and when is a good time to call you back?",
          ok: 'Send it', res: 'Texted (763) 555-0142', done: 'Texted back a missed call' },
        { a: 'quote', t: '10:40 AM', msg: "Dana's water heater quote is ready. I built it from your site photos.",
          to: 'Quote for Dana', body: '50 gallon water heater swap, haul-away included. Install Wednesday morning.',
          tweak: { say: 'Make it Thursday', msg: 'Done. Moved the install to Thursday.', body: '50 gallon water heater swap, haul-away included. Install Thursday morning.' },
          ok: 'Send it', res: 'Quote sent to Dana', done: "Sent Dana's quote" }
      ]},
      { name: 'Sample Salon & Spa', day: 'Friday', kind: 'a salon and spa', team: ['book', 'desk', 'design', 'site', 'review', 'docs'], scenes: [
        { a: 'book', t: '9:05 AM', msg: 'Jenna canceled her 2:00 tomorrow. Offer the spot to your waitlist?',
          to: 'Text to 3 people on the waitlist', body: "A 2:00 spot just opened tomorrow with Ava. Reply YES and it's yours!",
          ok: 'Send it', res: 'Sent to 3 on the waitlist', done: 'Filled a canceled spot' },
        { a: 'design', t: '11:30 AM', msg: "This month's promo graphic is ready for Instagram and the front window.",
          to: 'Instagram post', art: ['Holiday color', 'Book early'], body: 'Booking holiday color now. Grab your spot before the calendar fills!',
          ok: 'Post it', res: 'Posted to Instagram', done: 'Posted the holiday promo' }
      ]},
      { name: 'Sample Bistro', day: 'Saturday', kind: 'a restaurant', team: ['design', 'site', 'desk', 'review', 'docs', 'inbox'], scenes: [
        { a: 'review', t: '9:40 AM', msg: 'New 3-star review from Sam: "Great food, slow on a busy night." I drafted a reply.',
          to: 'Reply on Google', body: "Thanks, Sam. You're right about Friday. We've added a server, and we hope you'll give us another try.",
          ok: 'Post it', res: 'Reply posted on Google', done: "Answered Sam's review" },
        { a: 'site', t: '2:15 PM', msg: "You're closed on Thanksgiving. Want me to update your hours?",
          to: 'Hours on your website and Google', body: 'Closed Thanksgiving Day. Regular hours again on Friday.',
          ok: 'Update it', res: 'Hours updated on your site and Google', done: 'Updated holiday hours' }
      ]},
      { name: 'Sample Lawn & Landscape', day: 'Monday', kind: 'a landscaping crew', team: ['book', 'quote', 'chase', 'paper', 'design', 'intel'], scenes: [
        { a: 'chase', t: '7:30 AM', msg: "The Hendersons' spring cleanup bid has been quiet for 9 days. Follow up?",
          to: 'Text to the Hendersons', body: 'Checking in on your spring cleanup bid. Spots are filling up. Want me to hold a date in April?',
          tweak: { say: 'Say May, April is full', msg: "Got it. Here's the new version.", body: 'Checking in on your spring cleanup bid. Spots are filling up. Want me to hold a date in early May?' },
          ok: 'Send it', res: 'Sent to the Hendersons', done: 'Followed up on a quiet bid' },
        { a: 'book', t: '3:10 PM', msg: "Tomorrow's route has 8 stops. Text everyone a heads-up?",
          to: 'Text to 8 customers', body: "Hi, it's Sample Lawn & Landscape. We'll be out tomorrow morning. Please leave the side gate unlocked. Thanks!",
          ok: 'Send to all 8', res: 'Sent to 8 customers', done: "Gave tomorrow's route a heads-up" }
      ]},
      { name: 'Sample Boutique', day: 'Wednesday', kind: 'a retail shop', team: ['design', 'site', 'desk', 'inbox', 'docs', 'review'], scenes: [
        { a: 'desk', t: '10:15 AM', msg: 'A shopper texted: "Do you have the green wrap dress in a medium?" Your stock notes say 2 left.',
          to: 'Text to the shopper', body: 'We do! Two left in medium. Want us to hold one at the counter until 6?',
          ok: 'Send it', res: 'Replied to the shopper', done: 'Answered a sizing question' },
        { a: 'site', t: '1:30 PM', msg: '12 new arrivals are ready for your shop page. Photos, sizes and descriptions are done.',
          to: 'Shop page update', body: 'New this week: 12 fall sweaters, in sizes XS to XL.',
          ok: 'Publish it', res: 'Shop page updated', done: 'Added 12 new arrivals' }
      ]},
      { name: 'Sample Realty Group', day: 'Thursday', kind: 'a real estate agent', team: ['desk', 'book', 'design', 'site', 'docs', 'review'], scenes: [
        { a: 'desk', t: '7:52 AM', msg: 'New buyer lead on 412 Maple St: "Is it still available? Can we see it this weekend?"',
          to: 'Text to the buyer', body: 'It is! I have Saturday at 11 or 1 open for a showing. Which works better for you?',
          ok: 'Send it', res: 'Replied to the new lead', done: 'Answered a buyer lead in minutes' },
        { a: 'design', t: '12:20 PM', msg: 'The Just Listed post and flyer for 412 Maple are ready.',
          to: 'Instagram and Facebook post', art: ['Just listed', '412 Maple St'], body: 'Just listed: 3 bed, 2 bath on a quiet street. Open house Sunday, 1 to 3.',
          tweak: { say: 'Mention the big backyard', msg: 'Added it.', body: 'Just listed: 3 bed, 2 bath with a big backyard on a quiet street. Open house Sunday, 1 to 3.' },
          ok: 'Post it', res: 'Posted to Instagram and Facebook', done: 'Posted the Just Listed post' }
      ]}
    ];

    // Behind "+ More". Same shape as above.
    BIZ = BIZ.concat([
      { key: 'elec', name: 'Sample Electric Co.', day: 'Wednesday', kind: 'an electrician', team: ['call', 'quote', 'book', 'paper', 'review', 'site'], scenes: [
        { a: 'call', t: '7:48 AM', msg: 'You missed a call from (763) 555-0188 about a breaker that keeps tripping. Text them back?',
          to: 'Text to (763) 555-0188', body: "Sorry we missed you! Is the breaker tripping now, or only when something's running? We can come out today or tomorrow.",
          ok: 'Send it', res: 'Texted (763) 555-0188', done: 'Texted back a missed call' },
        { a: 'quote', t: '1:15 PM', msg: 'The panel upgrade quote for the Ortiz house is ready. I built it from your walkthrough notes.',
          to: 'Quote for the Ortiz family', body: '200 amp panel upgrade with permit and inspection. Two day job, starting the 14th.',
          tweak: { say: 'Start the 21st instead', msg: 'Updated.', body: '200 amp panel upgrade with permit and inspection. Two day job, starting the 21st.' },
          ok: 'Send it', res: 'Quote sent to the Ortiz family', done: 'Sent the panel upgrade quote' }
      ]},
      { key: 'gc', name: 'Sample Builders', day: 'Monday', kind: 'a general contractor', team: ['inbox', 'quote', 'book', 'docs', 'paper', 'site'], scenes: [
        { a: 'book', t: '6:55 AM', msg: "The drywall crew can't make Thursday. Let the Parkers know we're shifting a day?",
          to: 'Text to the Parker family', body: 'Quick update: drywall moves from Thursday to Friday. Everything else stays on schedule. Questions anytime.',
          tweak: { say: 'Add that the tile came in', msg: 'Added it.', body: 'Quick update: drywall moves from Thursday to Friday, and your tile came in. Everything else stays on schedule.' },
          ok: 'Send it', res: 'Sent to the Parker family', done: 'Kept the Parkers in the loop' },
        { a: 'docs', t: '4:30 PM', msg: "Today's job log for the Parker kitchen is written up from your crew's photos and notes.",
          to: 'Daily update email', body: 'Today: cabinets set, plumbing rough-in passed inspection. Tomorrow: countertop template.',
          ok: 'Send it', res: 'Daily update sent', done: 'Sent the daily job update' }
      ]},
      { key: 'roof', name: 'Sample Roofing', day: 'Thursday', kind: 'a roofing company', team: ['intel', 'call', 'quote', 'chase', 'design', 'review'], scenes: [
        { a: 'intel', t: '7:20 AM', msg: 'Hail hit the north metro overnight. 14 of your past customers live in that area. Check in with them?',
          to: 'Text to 14 past customers', body: "Hi, it's Sample Roofing. Last night's hail hit your area. Want us to take a look at your roof this week?",
          ok: 'Send to all 14', res: 'Sent to 14 past customers', done: 'Checked in after the hail' },
        { a: 'chase', t: '11:05 AM', msg: "Mike's roof replacement estimate has been quiet for 10 days. Follow up?",
          to: 'Text to Mike', body: 'Checking in on your roof estimate. Happy to walk through the shingle options or adjust the timing.',
          ok: 'Send it', res: 'Sent to Mike', done: 'Followed up on a quiet estimate' }
      ]},
      { key: 'auto', name: 'Sample Auto Repair', day: 'Tuesday', kind: 'an auto repair shop', team: ['book', 'desk', 'quote', 'paper', 'review', 'site'], scenes: [
        { a: 'quote', t: '10:30 AM', msg: "Inspection on Lisa's Camry found worn front brakes. The estimate with photos is ready.",
          to: 'Text to Lisa', body: "Your Camry's front brakes are worn down. Photos attached. Want us to replace them today? It would be ready by 4.",
          tweak: { say: 'Say ready by 5', msg: 'Changed it.', body: "Your Camry's front brakes are worn down. Photos attached. Want us to replace them today? It would be ready by 5." },
          ok: 'Send it', res: 'Sent to Lisa', done: 'Sent a brake estimate with photos' },
        { a: 'book', t: '4:50 PM', msg: "Lisa's car is done. Text her it's ready for pickup?",
          to: 'Text to Lisa', body: "Your Camry is ready! We're open until 6. Your keys are at the front desk.",
          ok: 'Send it', res: 'Sent to Lisa', done: 'Told Lisa her car is ready' }
      ]},
      { key: 'clean', name: 'Sample Cleaning Co.', day: 'Friday', kind: 'a cleaning service', team: ['book', 'desk', 'paper', 'docs', 'review', 'design'], scenes: [
        { a: 'book', t: '8:10 AM', msg: "Maria is out sick. Two of her homes today could move. Text those clients?",
          to: 'Text to 2 clients', body: "Hi, it's Sample Cleaning Co. We need to move today's clean to Monday at the same time. Does that still work?",
          tweak: { say: 'Offer Saturday too', msg: 'Done.', body: "Hi, it's Sample Cleaning Co. We need to move today's clean. Would Saturday or Monday at the same time work better?" },
          ok: 'Send it', res: 'Sent to 2 clients', done: 'Rescheduled 2 cleans' },
        { a: 'docs', t: '2:00 PM', msg: 'The move-out checklist for new hires is written up from how your team works.',
          to: 'Doc for your team', body: 'Move-out clean: inside the fridge and oven, baseboards, window tracks, cabinets inside and out.',
          ok: 'Share it', res: 'Shared with your team', done: 'Wrote the move-out checklist' }
      ]},
      { key: 'photo', name: 'Sample Photography', day: 'Wednesday', kind: 'a photographer', team: ['desk', 'book', 'design', 'site', 'paper', 'docs'], scenes: [
        { a: 'desk', t: '9:20 AM', msg: 'An engaged couple asked: "Are you free June 14 for a wedding?" Your calendar is open.',
          to: 'Reply to the couple', body: 'Congratulations! June 14 is open. Want me to send my wedding packages and set up a quick call?',
          ok: 'Send it', res: 'Replied to the couple', done: 'Answered a wedding inquiry' },
        { a: 'site', t: '3:00 PM', msg: "Sarah and Tom's gallery is ready to share. I picked 6 favorites for your portfolio page.",
          to: 'Gallery email and portfolio update', body: 'Your gallery is ready! Downloads are open for 60 days. It was a joy to photograph your day.',
          ok: 'Send it', res: 'Gallery sent, portfolio updated', done: 'Delivered a gallery' }
      ]},
      { key: 'event', name: 'Sample Events Co.', day: 'Thursday', kind: 'an event planner', team: ['inbox', 'book', 'docs', 'design', 'paper', 'desk'], scenes: [
        { a: 'inbox', t: '8:30 AM', msg: 'The florist says peonies are out for the Hansen wedding and suggests garden roses. Tell the couple?',
          to: 'Email to the Hansens', body: 'Quick update from the florist: peonies are out for June. Garden roses in the same blush color are a lovely match. Okay to switch?',
          ok: 'Send it', res: 'Sent to the Hansens', done: 'Handled a florist change' },
        { a: 'docs', t: '1:40 PM', msg: 'The day-of timeline for the Hansen wedding is ready for all 6 vendors.',
          to: 'Email to 6 vendors', body: 'Ceremony 4:00. Photos 4:30. Dinner 6:00. Toasts 7:15. Last song 11:00.',
          tweak: { say: 'Toasts at 7:00', msg: 'Moved it.', body: 'Ceremony 4:00. Photos 4:30. Dinner 6:00. Toasts 7:00. Last song 11:00.' },
          ok: 'Send to all 6', res: 'Sent to 6 vendors', done: 'Sent the day-of timeline' }
      ]},
      { key: 'fit', name: 'Sample Fitness Studio', day: 'Monday', kind: 'a fitness studio', team: ['book', 'desk', 'design', 'site', 'review', 'inbox'], scenes: [
        { a: 'book', t: '6:15 AM', msg: "Tonight's 6:00 class has 4 on the waitlist and 2 people just canceled. Offer the spots?",
          to: 'Text to 4 on the waitlist', body: "Two spots opened in tonight's 6:00 class. Reply YES to grab one!",
          ok: 'Send it', res: 'Sent to 4 on the waitlist', done: 'Filled 2 class spots' },
        { a: 'design', t: '12:30 PM', msg: 'Your new member challenge graphic is ready for Instagram and the front desk.',
          to: 'Instagram post', art: ['30 day challenge', 'Starts Nov 1'], body: 'Our 30 day challenge starts November 1. Sign up at the front desk or reply here!',
          ok: 'Post it', res: 'Posted to Instagram', done: 'Posted the challenge promo' }
      ]}
    ]);
    ['plumb', 'salon', 'food', 'lawn', 'shop', 'realty'].forEach(function (k, i) { BIZ[i].key = k; });
    var MAIN = 6; // chips; anything past this lives behind "+ More"
    function bizIndex(key) { for (var i = 0; i < BIZ.length; i++) if (BIZ[i].key === key) return i; return -1; }

    var bizEl = $('#bizName'), bizShort = $('#dmBizShort'), capEl = $('#demoCap'), stack = $('#dmStack'),
        chips = $('#dmChips'), field = $('#dmField'), tap = $('#tap'), screen = $('#dmScreen'),
        tapsEl = $('#phTaps'), doneList = $('#phDone'), pauseBtn = $('#dmPause'),
        steps = Array.prototype.slice.call(document.querySelectorAll('#dmSteps li')),
        bizBtns = Array.prototype.slice.call(document.querySelectorAll('#dmBiz [data-biz]'));

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function ico(id) { return '<svg class="ico"><use href="#' + id + '"/></svg>'; }
    function avatar(k) { var r = ROLE[k]; return '<span class="m-av" style="--c:' + r[2] + '">' + ico(r[1]) + '</span>'; }

    /* A tiny pausable timer queue, so Pause (and scrolling away) freezes the thread mid-sentence. */
    var q = [], running = false, instant = false;
    function arm(t) { t.at = Date.now(); t.id = setTimeout(function () { var i = q.indexOf(t); if (i > -1) q.splice(i, 1); t.fn(); }, t.left); }
    function later(fn, ms) { if (instant) { fn(); return; } var t = { fn: fn, left: ms }; q.push(t); if (running) arm(t); }
    function freeze() { q.forEach(function (t) { clearTimeout(t.id); t.left = Math.max(0, t.left - (Date.now() - t.at)); }); }
    function thaw() { q.forEach(arm); }
    function flush() { q.forEach(function (t) { clearTimeout(t.id); }); q = []; }

    /* ---- thread building blocks ---- */
    function push(cls, html) {
      var m = document.createElement('div');
      m.className = 'm ' + cls;
      m.innerHTML = '<div class="mi">' + html + '</div>';
      thread.appendChild(m);
      if (instant) m.classList.add('in'); else { void m.offsetWidth; m.classList.add('in'); }
      while (thread.children.length > 10) thread.removeChild(thread.firstChild);
      return m;
    }
    function draftHtml(s, body) {
      return '<div class="draft">' +
        (s.art ? '<div class="d-art"><b>' + esc(s.art[0]) + '</b><span>' + esc(s.art[1]) + '</span></div>' : '') +
        '<p class="d-lab"><span class="tag">Draft</span> ' + esc(s.to) + '</p><p class="d-body">' + esc(body) + '</p></div>';
    }
    function incoming(s, msg, body) {
      var r = ROLE[s.a];
      return push('m-in', avatar(s.a) + '<div class="m-col"><p class="m-name"><b>' + r[0] + '</b><time>' + s.t + '</time></p>' +
        '<div class="bub" style="--c:' + r[2] + '"><p>' + esc(msg) + '</p>' + (body ? draftHtml(s, body) : '') + '</div></div>');
    }
    function typing(s) {
      return push('m-in m-typing', avatar(s.a) + '<div class="m-col"><p class="m-name"><b>' + ROLE[s.a][0] + '</b><time>typing</time></p>' +
        '<div class="bub"><span class="dots"><i></i><i></i><i></i></span></div></div>');
    }
    function outgoing(text) { return push('m-out', '<div class="m-col"><p class="m-name"><b>You</b></p><div class="bub">' + esc(text) + '</div></div>'); }
    function result(text) { return push('m-sys', '<span class="sys">' + ico('i-check') + esc(text) + '</span>'); }
    function dayline(B) {
      return push('m-day', '<span class="dl">' + esc(B.day) + ' at ' + esc(B.name) + '</span>' +
        '<span class="lock">' + ico('i-lock') + 'Nothing sends without your OK</span>');
    }
    function drop(m) { if (m && m.parentNode) m.parentNode.removeChild(m); }

    function showChips(s) {
      chips.innerHTML = '<span class="c ok">' + ico('i-check') + esc(s.ok) + '</span><span class="c">Change it</span><span class="c">Skip</span>';
      chips.classList.add('on');
    }
    function hideChips() { chips.classList.remove('on'); }
    function setStep(n) { steps.forEach(function (li) { li.classList.toggle('on', +li.dataset.step === n); }); }
    var taps = 0;
    function addDone(s) {
      var li = document.createElement('li');
      li.innerHTML = ico('i-check') + '<span>' + esc(s.done) + '</span><time>' + s.t.replace(' AM', 'a').replace(' PM', 'p') + '</time>';
      doneList.insertBefore(li, doneList.firstChild);
      while (doneList.children.length > 4) doneList.removeChild(doneList.lastChild);
    }
    function tapOn(el, cb) {
      if (!instant) {
        var r = el.getBoundingClientRect(), pr = screen.getBoundingClientRect();
        tap.style.left = (r.left - pr.left + r.width / 2 - 22) + 'px';
        tap.style.top = (r.top - pr.top + r.height / 2 - 22) + 'px';
        tap.classList.remove('go'); void tap.offsetWidth; tap.classList.add('go');
        el.classList.add('press');
      }
      later(cb, 320);
    }
    function typeInto(text, cb) { // the owner types a quick tweak into the reply box
      field.innerHTML = '<span class="tx"></span><span class="caret"></span>';
      var tx = field.querySelector('.tx'), i = 0;
      (function step() { i++; tx.textContent = text.slice(0, i); if (i < text.length) later(step, 55); else later(cb, 380); })();
    }
    function clearField() { field.innerHTML = '<span class="ph">Reply to your team</span>'; }

    /* ---- one scene: teammate types, texts you a draft, you reply, it goes out ---- */
    function scene(s, next, stopAtAsk) {
      setStep(1);
      var ty = typing(s);
      later(function () {
        drop(ty);
        var msg = incoming(s, s.msg, s.body);
        setStep(2);
        later(function () {
          showChips(s); setStep(3);
          if (stopAtAsk) return next && next();
          later(function () {
            if (s.tweak) {
              typeInto(s.tweak.say, function () {
                clearField(); hideChips(); outgoing(s.tweak.say); setStep(1);
                later(function () {
                  var ty2 = typing(s);
                  later(function () {
                    drop(ty2);
                var old = msg.querySelector('.draft'); if (old) { old.classList.add('old'); old.querySelector('.tag').textContent = 'Changed'; }
                msg = incoming(s, s.tweak.msg, s.tweak.body); setStep(2);
                    later(function () { showChips(s); setStep(3); later(approve, 900); }, 2300);
                  }, 1300);
                }, 500);
              });
            } else approve();
          }, 1000);
        }, 2700);
        function approve() {
          tapOn(chips.querySelector('.ok'), function () {
            hideChips(); outgoing(s.ok);
            taps++; tapsEl.textContent = taps;
            later(function () {
              var d = msg.querySelector('.draft'); if (d) { d.classList.add('sent'); d.querySelector('.tag').innerHTML = ico('i-check') + 'Sent'; }
              result(s.res); addDone(s); setStep(4);
              later(next, 2400);
            }, 650);
          });
        }
      }, 1500);
    }

    var bizIdx = 0, locked = false, moreUi = null;
    function setBiz(i) {
      bizIdx = (i + BIZ.length) % BIZ.length;
      var B = BIZ[bizIdx];
      bizEl.textContent = B.name; bizShort.textContent = B.name;
      if (capEl) capEl.textContent = 'Sample day for ' + B.kind + '. Names, numbers and times are made up.';
      stack.innerHTML = B.team.slice(0, 3).map(avatar).join('') + '<span class="more">+' + (B.team.length - 3) + '</span>';
      bizBtns.forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.biz === bizIdx ? 'true' : 'false'); });
      if (moreUi) moreUi.set(bizIdx >= MAIN ? B.key : null);
      thread.innerHTML = ''; doneList.innerHTML = ''; hideChips(); clearField(); setStep(0);
      taps = 0; tapsEl.textContent = 0;
      return B;
    }
    function playBiz(i) {
      flush();
      var B = setBiz(i);
      demo.classList.remove('swap'); void demo.offsetWidth; demo.classList.add('swap');
      later(function () {
        dayline(B);
        var k = 0;
        (function nextScene() {
          // A business the visitor picked stays put and replays; otherwise rotate through the six chips.
          if (k >= B.scenes.length) { setStep(0); later(function () { playBiz(locked ? bizIdx : (bizIdx + 1) % MAIN); }, 1800); return; }
          later(function () { scene(B.scenes[k++], nextScene); }, k ? 500 : 900);
        })();
      }, 450);
    }

    // Reduced motion (or no animation): a finished, readable exchange plus one draft waiting on your OK.
    function staticBiz(i) {
      instant = true; flush();
      var B = setBiz(i);
      dayline(B);
      scene(B.scenes[0], function () {});
      scene(B.scenes[1], function () {}, true);
      setStep(0);
      instant = false;
    }

    var paused = false, visible = false;
    function sync() {
      var go = visible && !paused && !document.hidden;
      if (go === running) return;
      running = go; demo.classList.toggle('is-paused', !go);
      if (go) thaw(); else freeze();
    }
    function pickBiz(i, src) {
      locked = true;
      if (reduce) staticBiz(i); else { paused = false; setPauseUi(); playBiz(i); sync(); }
      if (src) window.CW_MORE.announce(BIZ[i].key, src);
    }
    bizBtns.forEach(function (b) { b.addEventListener('click', function () { pickBiz(+b.dataset.biz, 'hero'); }); });
    var moreWrap = $('#dmBiz .biz-more');
    if (moreWrap && window.CW_MORE) moreUi = window.CW_MORE.mount(moreWrap, function (key) { var i = bizIndex(key); if (i > -1) pickBiz(i, 'hero'); });
    // Picked further down the page: follow along, so scrolling back up shows the same business.
    document.addEventListener('cw:biz', function (e) {
      if (e.detail.src === 'hero') return;
      var i = bizIndex(e.detail.key); if (i > -1 && i !== bizIdx) pickBiz(i, null);
    });
    function setPauseUi() {
      if (!pauseBtn) return;
      pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pauseBtn.querySelector('.dm-pause-t').textContent = paused ? 'Play' : 'Pause';
      pauseBtn.classList.toggle('paused', paused);
    }

    if (reduce) {
      demo.classList.add('static');
      if (pauseBtn) pauseBtn.hidden = true;
      staticBiz(0);
    } else {
      if (pauseBtn) pauseBtn.addEventListener('click', function () { paused = !paused; setPauseUi(); sync(); });
      playBiz(0); // queued; runs once the demo is on screen
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { es.forEach(function (e) { visible = e.isIntersecting; sync(); }); }, { threshold: 0.05 }).observe(demo);
      } else { visible = true; }
      document.addEventListener('visibilitychange', sync);
      sync();
    }
  })();

  /* ---------- before / after toggle ---------- */
  var day = $('#dayCard'), tW = $('#tWith'), tWo = $('#tWithout'), tog = $('.toggle');
  var userTouched = false;
  function setMode(m) {
    day.dataset.mode = m;
    tog.classList.toggle('with', m === 'with');
    tW.setAttribute('aria-selected', m === 'with'); tWo.setAttribute('aria-selected', m !== 'with');
    day.classList.remove('swap'); void day.offsetWidth; day.classList.add('swap');
  }
  tW.addEventListener('click', function () { userTouched = true; setMode('with'); });
  tWo.addEventListener('click', function () { userTouched = true; setMode('without'); });
  if (!reduce && 'IntersectionObserver' in window) {
    var flipped = false;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !flipped) {
          flipped = true;
          setTimeout(function () { if (!userTouched) setMode('with'); }, 2600);
        }
      });
    }, { threshold: 0.5 }).observe(day);
  }
})();

/* ---------- team builder: a different team for each kind of business ---------- */
(function () {
  var root = document.getElementById('teamBuilder');
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ROLE = {
    call: ['Call Catch', 'i-call', '#D4582A'], desk: ['Front Desk', 'i-desk', '#B9822B'], book: ['Booking Desk', 'i-cal', '#8A6FB0'],
    quote: ['Quote Builder', 'i-quote', '#5E7F63'], chase: ['Quote Chaser', 'i-loop', '#4E8A86'], paper: ['Paper Mover', 'i-paper', '#7A5A43'],
    site: ['Site Keeper', 'i-web', '#3E6A9A'], design: ['Asset Designer', 'i-brush', '#C2557A'], docs: ['Doc Writer', 'i-doc', '#5B6B7A'],
    review: ['Review Engine', 'i-review', '#9A4659'], inbox: ['Inbox Sorter', 'i-mail', '#6D7A3A'], intel: ['Intel Desk', 'i-intel', '#4F6475']
  };
  // [role, what it does for this business, what it hands the owner]
  var TEAMS = {
    plumb: { name: 'Sample Plumbing Co.', team: [
      ['call', "Texts back the calls you miss while you're under a sink.", 'A text to OK'],
      ['quote', 'Turns your site notes and photos into a clean water heater quote.', 'A quote to send'],
      ['chase', 'Checks in on quotes that went quiet after a week.', 'A follow-up to OK'],
      ['paper', 'Builds the invoice when a job closes and nudges it politely if it sits.', 'An invoice to OK'],
      ['review', 'Asks every customer for a review and drafts your replies.', 'A reply to OK'],
      ['site', 'Keeps your service area, emergency hours and job photos current on your website.', 'A page update to OK']] },
    salon: { name: 'Sample Salon & Spa', team: [
      ['book', "Confirms tomorrow's appointments and offers cancellations to the waitlist.", 'Texts to OK'],
      ['desk', 'Answers "do you do balayage?" and "how much is a gloss?" from your price list.', 'Answers to OK'],
      ['design', "Makes this month's promo graphic for Instagram and the front window.", 'A graphic to approve'],
      ['site', 'Updates your service menu, prices and stylist bios on your website.', 'A page update to OK'],
      ['review', 'Asks happy clients for a review and drafts your replies.', 'A reply to OK'],
      ['docs', 'Writes the opening and closing checklist for new hires.', 'A doc to review']] },
    food: { name: 'Sample Bistro', team: [
      ['design', 'Designs the weekly specials board and the matching social post.', 'Artwork to approve'],
      ['site', 'Keeps hours, the menu and holiday closures right on your website.', 'A page update to OK'],
      ['desk', 'Answers catering and private event questions with your packages.', 'Answers to OK'],
      ['review', 'Drafts a reply to every review, good or rough.', 'A reply to OK'],
      ['docs', 'Turns your recipes into prep sheets and line checklists.', 'A doc to review'],
      ['inbox', 'Sorts vendor emails and flags invoices that are due.', 'A short list']] },
    lawn: { name: 'Sample Lawn & Landscape', team: [
      ['book', "Texts tomorrow's route a heads-up so gates are unlocked.", 'Texts to OK'],
      ['quote', 'Turns your walkthrough photos into a spring cleanup quote.', 'A quote to send'],
      ['chase', 'Follows up on bids that went quiet before the season fills.', 'A follow-up to OK'],
      ['paper', 'Sends seasonal contract invoices and gentle reminders.', 'An invoice to OK'],
      ['design', 'Makes door hangers and yard sign artwork for new neighborhoods.', 'Artwork to approve'],
      ['intel', 'Notes what people nearby are asking for this month.', 'A note, nothing sent']] },
    shop: { name: 'Sample Boutique', team: [
      ['design', 'Creates new arrival posts and in-store sale signage.', 'Artwork to approve'],
      ['site', 'Adds new products and keeps your shop page and hours current.', 'A page update to OK'],
      ['desk', 'Answers "do you have this in a medium?" from your stock notes.', 'Answers to OK'],
      ['inbox', 'Sorts supplier email and drafts the replies that matter.', 'Replies to OK'],
      ['docs', 'Writes your return policy and the how-tos for new staff.', 'A doc to review'],
      ['review', 'Asks shoppers for a review and drafts your replies.', 'A reply to OK']] },
    realty: { name: 'Sample Realty Group', team: [
      ['desk', 'Replies to new buyer leads in minutes, day or night, from your listing details.', 'A reply to OK'],
      ['book', 'Lines up showings and sends reminders the night before.', 'Texts to OK'],
      ['design', 'Makes Just Listed flyers, open house signs and social posts.', 'Artwork to approve'],
      ['site', 'Adds each new listing to your website with photos and details.', 'A page update to OK'],
      ['docs', 'Writes listing descriptions and your under-contract checklist.', 'A doc to review'],
      ['review', 'Asks happy clients for a review after closing and drafts your replies.', 'A reply to OK']] },
    elec: { name: 'Sample Electric Co.', team: [
      ['call', "Texts back the calls you miss while you're up a ladder.", 'A text to OK'],
      ['quote', 'Turns walkthrough notes into a clean panel upgrade or rewire quote.', 'A quote to send'],
      ['book', "Confirms tomorrow's jobs and inspection times with each customer.", 'Texts to OK'],
      ['paper', 'Sends the invoice when a job is signed off and nudges it if it sits.', 'An invoice to OK'],
      ['review', 'Asks every customer for a review and drafts your replies.', 'A reply to OK'],
      ['site', 'Keeps your services, service area and license info current on your website.', 'A page update to OK']] },
    gc: { name: 'Sample Builders', team: [
      ['inbox', 'Sorts sub and supplier email and flags what needs you today.', 'A short list'],
      ['quote', 'Turns your measurements into a clear, itemized remodel bid.', 'A bid to send'],
      ['book', 'Keeps homeowners posted when the schedule shifts.', 'Texts to OK'],
      ['docs', 'Writes daily job logs and change orders from crew photos and notes.', 'A doc to review'],
      ['paper', 'Sends progress invoices at each milestone.', 'An invoice to OK'],
      ['site', 'Adds finished projects to your website gallery.', 'A page update to OK']] },
    roof: { name: 'Sample Roofing', team: [
      ['intel', 'Notes storms and hail nearby so you can reach the right customers fast.', 'A note, nothing sent'],
      ['call', 'Texts back the calls you miss while you are on a roof.', 'A text to OK'],
      ['quote', 'Turns your photos and measurements into a clean estimate.', 'A quote to send'],
      ['chase', 'Follows up on estimates that went quiet.', 'A follow-up to OK'],
      ['design', 'Makes yard signs and before and after posts.', 'Artwork to approve'],
      ['review', 'Asks every homeowner for a review and drafts your replies.', 'A reply to OK']] },
    auto: { name: 'Sample Auto Repair', team: [
      ['book', 'Books oil changes and texts when a car is ready for pickup.', 'Texts to OK'],
      ['desk', 'Answers "how much is an alignment?" from your price list.', 'Answers to OK'],
      ['quote', 'Turns inspection notes and photos into an estimate customers approve by text.', 'An estimate to send'],
      ['paper', 'Sends invoices and fleet account reminders.', 'An invoice to OK'],
      ['review', 'Asks every customer for a review and drafts your replies.', 'A reply to OK'],
      ['site', 'Keeps your services, hours and specials current on your website.', 'A page update to OK']] },
    clean: { name: 'Sample Cleaning Co.', team: [
      ['book', "Confirms tomorrow's cleans and handles reschedules.", 'Texts to OK'],
      ['desk', 'Answers "do you do move-outs?" with a ballpark from your rates.', 'Answers to OK'],
      ['paper', 'Sends recurring invoices and gentle reminders.', 'An invoice to OK'],
      ['docs', 'Writes room-by-room checklists for new hires.', 'A doc to review'],
      ['review', 'Asks happy clients for a review and drafts your replies.', 'A reply to OK'],
      ['design', 'Makes referral cards and seasonal promo posts.', 'Artwork to approve']] },
    photo: { name: 'Sample Photography', team: [
      ['desk', 'Answers questions about dates and packages, even at midnight.', 'A reply to OK'],
      ['book', 'Books sessions and sends prep tips the day before.', 'Texts to OK'],
      ['design', 'Makes sneak peek posts from your favorite shots.', 'A post to approve'],
      ['site', 'Keeps your portfolio and packages fresh on your website.', 'A page update to OK'],
      ['paper', 'Sends contracts, deposit reminders and final invoices.', 'An invoice to OK'],
      ['docs', 'Writes shot lists and day-of timelines.', 'A doc to review']] },
    event: { name: 'Sample Events Co.', team: [
      ['inbox', 'Sorts vendor email and flags anything that changes the plan.', 'A short list'],
      ['book', "Tracks deadlines and reminds clients what's due next.", 'Texts to OK'],
      ['docs', 'Writes timelines, run-of-show sheets and vendor packets.', 'A doc to review'],
      ['design', 'Makes invitations, signage and recap posts.', 'Artwork to approve'],
      ['paper', 'Sends deposit and final payment reminders.', 'An invoice to OK'],
      ['desk', 'Answers "are you free in October?" with your packages.', 'A reply to OK']] },
    fit: { name: 'Sample Fitness Studio', team: [
      ['book', 'Fills canceled class spots from the waitlist.', 'Texts to OK'],
      ['desk', 'Answers "do you have a drop-in rate?" from your price list.', 'Answers to OK'],
      ['design', 'Makes challenge graphics and class schedule posts.', 'A post to approve'],
      ['site', 'Keeps your class schedule and coaches current on your website.', 'A page update to OK'],
      ['review', 'Asks members for a review and drafts your replies.', 'A reply to OK'],
      ['inbox', 'Sorts member email and drafts the replies that matter.', 'Replies to OK']] }
  };
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  var tabWrap = root.querySelector('.tb-tabs');
  var panel = document.getElementById('tbPanel'), list = document.getElementById('tbList');
  var bizEl = document.getElementById('tbBiz'), countEl = document.getElementById('tbCount');
  var roles = Array.prototype.slice.call(root.querySelectorAll('.tb-roles [data-role]'));
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function show(key, animate) {
    var t = TEAMS[key]; if (!t) return;
    var isTab = tabs.some(function (b) { return b.dataset.biz === key; });
    tabs.forEach(function (b, i) { var on = b.dataset.biz === key; b.setAttribute('aria-selected', on); b.tabIndex = on || (!isTab && i === 0) ? 0 : -1; if (on) panel.setAttribute('aria-labelledby', b.id); });
    if (!isTab) panel.setAttribute('aria-labelledby', 'tbMore-btn');
    if (moreUi) moreUi.set(isTab ? null : key);
    bizEl.textContent = t.name;
    countEl.textContent = 'A team of ' + t.team.length + ', picked for this business';
    list.innerHTML = t.team.map(function (m, i) {
      var r = ROLE[m[0]];
      return '<li class="' + (animate && !reduce ? 'enter' : '') + '" style="--c:' + r[2] + ';--i:' + i + '"><span class="tb-av"><svg class="ico"><use href="#' + r[1] + '"/></svg></span>'
        + '<div><b>' + esc(r[0]) + '</b><p>' + esc(m[1]) + '</p></div><span class="tb-hand">' + esc(m[2]) + '</span></li>';
    }).join('');
    var on = {}; t.team.forEach(function (m) { on[m[0]] = 1; });
    roles.forEach(function (li) { li.classList.toggle('on', !!on[li.dataset.role]); });
  }
  // Rotate through businesses while the section is on screen, until the visitor picks one.
  var keys = tabs.map(function (b) { return b.dataset.biz; }), idx = 0, timer = null, raf = null, start = 0, touched = false, DUR = 6500;
  function stop() { clearTimeout(timer); cancelAnimationFrame(raf); timer = raf = null; tabWrap.classList.remove('auto'); }
  function tick() { var p = Math.min(100, (performance.now() - start) / DUR * 100); var sel = tabWrap.querySelector('[aria-selected="true"]'); if (sel) sel.style.setProperty('--p', p + '%'); raf = requestAnimationFrame(tick); }
  function play() {
    if (touched || reduce || timer) return;
    tabWrap.classList.add('auto'); start = performance.now(); tick();
    timer = setTimeout(function next() {
      idx = (idx + 1) % keys.length; show(keys[idx], true); start = performance.now();
      timer = setTimeout(next, DUR);
    }, DUR);
  }
  function pick(b, focus) { touched = true; stop(); idx = keys.indexOf(b.dataset.biz); show(b.dataset.biz, true); if (focus) b.focus(); window.CW_MORE && window.CW_MORE.announce(b.dataset.biz, 'team'); }
  function pickKey(key, src) { if (!TEAMS[key]) return; touched = true; stop(); show(key, true); if (src) window.CW_MORE.announce(key, src); }
  var moreWrap = root.querySelector('.biz-more');
  var moreUi = moreWrap && window.CW_MORE ? window.CW_MORE.mount(moreWrap, function (key) { pickKey(key, 'team'); }) : null;
  // Picked in the hero demo: pre-select the same business here.
  document.addEventListener('cw:biz', function (e) { if (e.detail.src !== 'team') pickKey(e.detail.key, null); });
  tabs.forEach(function (b, i) {
    b.addEventListener('click', function () { pick(b); });
    b.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (n == null) return; e.preventDefault(); pick(tabs[(n + tabs.length) % tabs.length], true);
    });
  });
  show('plumb', false);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) play(); else stop(); }); }, { threshold: 0.35 }).observe(root);
  }
})();

/* ---------- assessment stats: count up once when they come into view ---------- */
(function () {
  var nums = document.querySelectorAll('.as-stats [data-count]');
  if (!nums.length || !('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  nums.forEach(function (n) { n.textContent = '0'; });
  new IntersectionObserver(function (es, io) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.disconnect();
      var t0 = performance.now();
      (function step(t) {
        var k = Math.min(1, (t - t0) / 1200), ease = 1 - Math.pow(1 - k, 3);
        nums.forEach(function (n) { n.textContent = Math.round(+n.dataset.count * ease); });
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.4 }).observe(document.querySelector('.as-stats'));
})();
