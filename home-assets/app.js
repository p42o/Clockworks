/* MN Clockworks — facelift v2 mockup: hero demo, reveals, day toggle */
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

  /* ---------- hero demo ---------- */
  // Agents are drawn as little blob characters (chat-app style), each with its own shape + colour.
  var AGENTS = {
    call:   { name: 'Call Catch',    c: '#F26A2E', shape: 'circle', idle: 'Missed calls' },
    desk:   { name: 'Front Desk',    c: '#2F7FEA', shape: 'tri',    idle: 'Common questions' },
    quote:  { name: 'Quote Chaser',  c: '#27B567', shape: 'pill',   idle: 'Follow-ups' },
    paper:  { name: 'Paper Mover',   c: '#8A5A3B', shape: 'cloud',  idle: 'Open paperwork' },
    review: { name: 'Review Engine', c: '#E5458A', shape: 'flower', idle: 'Review asks' },
    intel:  { name: 'Intel Desk',    c: '#17A99B', shape: 'drop',   idle: 'Notes for you' }
  };
  var SHAPES = {
    circle: '<circle cx="20" cy="20" r="17"/>',
    tri:    '<path d="M20 3.5c2.2 0 3.6 1.3 5 3.7l11 19.6c2.3 4.2.3 8.2-4.6 8.2H8.6c-4.9 0-6.9-4-4.6-8.2l11-19.6c1.4-2.4 2.8-3.7 5-3.7z"/>',
    pill:   '<rect x="2" y="8" width="36" height="25" rx="12.5"/>',
    cloud:  '<circle cx="14" cy="16" r="10"/><circle cx="25" cy="14" r="10"/><circle cx="28" cy="24" r="9.5"/><circle cx="13" cy="26" r="9.5"/>',
    flower: '<circle cx="20" cy="9.5" r="8"/><circle cx="30" cy="16.5" r="8"/><circle cx="26.5" cy="28.5" r="8"/><circle cx="13.5" cy="28.5" r="8"/><circle cx="10" cy="16.5" r="8"/><circle cx="20" cy="20" r="10"/>',
    drop:   '<path d="M20 3c4 4.7 15 13.6 15 21.6C35 32.5 28.3 37 20 37S5 32.5 5 24.6C5 16.6 16 7.7 20 3z"/>'
  };
  var EYES = '<rect x="13.2" y="14.5" width="4.6" height="9" rx="2.3" fill="#fff"/><rect x="22.2" y="14.5" width="4.6" height="9" rx="2.3" fill="#fff"/>';

  // Sample days only. Names, numbers and times are made up. The demo rotates through these.
  var BIZ = [
    { name: 'Sample Plumbing Co.', day: 'Tuesday', kind: 'a plumbing shop', scenes: [
      { a: 'call', time: '8:12 AM', ev: '<b>Missed call</b> from (763) 555-0142', sub: 'You were on a job',
        ctx: 'Text back · (763) 555-0142', done: 'Texted back the missed caller',
        draft: 'Sorry we missed your call. Reply with what you need and a good time for a call back.' },
      { a: 'quote', time: '11:30 AM', ev: '<b>Quote #318</b> has gone quiet', sub: 'Sent 6 days ago · no reply',
        ctx: 'Follow-up text · Quote #318', done: 'Followed up on Quote #318',
        draft: 'Checking in on the quote I sent. Happy to answer questions or adjust the scope. Want me to hold a date?' },
      { a: 'desk', time: '1:05 PM', ev: '<b>Website question:</b> "Do you do water heaters?"', sub: 'Answered from info you approved',
        ctx: 'Reply on your website', done: 'Answered a water heater question',
        draft: 'We do handle that. I can take the address and the best time for a call back.' },
      { a: 'review', time: '2:40 PM', ev: '<b>Job closed</b> at the Maple Grove address', sub: 'Customer marked happy',
        ctx: 'Review ask · text', done: 'Asked for a review',
        draft: 'Thanks again for having us out. An honest review helps neighbors find a local shop. Here is the link.' },
      { a: 'paper', time: '4:15 PM', ev: '<b>Invoice #1042</b> is still open', sub: 'Open 14 days',
        ctx: 'Invoice reminder · email', done: 'Sent the Invoice #1042 reminder',
        draft: 'A reminder that this invoice is still open. Here is the pay link if you want it. Tell me if anything on the bill looks off.' },
      { a: 'intel', time: '5:00 PM', ev: '<b>Weekly note</b> on what people nearby are asking', sub: 'From public posts', note: true,
        ctx: 'A note just for you · nothing sent', done: 'Saved a note for you',
        draft: 'Public posts this week mention furnace checks and water heater leaks in the north metro.' }
    ]},
    { name: 'Sample Realty', day: 'Thursday', kind: 'a real estate agent', scenes: [
      { a: 'call', time: '9:05 AM', ev: '<b>Missed call</b> from (763) 555-0188', sub: 'You were at a showing',
        ctx: 'Text back · (763) 555-0188', done: 'Texted back the missed caller',
        draft: "Sorry I missed you, I'm at a showing. Calling about the Elm Street listing? Reply with a good time and I'll call you back today." },
      { a: 'desk', time: '10:40 AM', ev: '<b>Website question:</b> "Is Elm Street still available?"', sub: 'Answered from your listing info',
        ctx: 'Reply on your website', done: 'Answered a listing question',
        draft: "Yes, it's still available. The open house is Saturday 1 to 3. Want me to set up a private showing?" },
      { a: 'quote', time: '12:15 PM', ev: '<b>Saturday\'s buyers</b> haven\'t heard back', sub: 'Toured 3 days ago',
        ctx: 'Follow-up text · showing', done: 'Followed up after the showing',
        draft: 'Thanks for touring the Elm Street home. Any questions I can answer, or want to see a couple of similar homes this week?' },
      { a: 'paper', time: '1:30 PM', ev: '<b>Inspection addendum</b> still unsigned', sub: 'Due Friday',
        ctx: 'Reminder · email', done: 'Reminded about the addendum',
        draft: 'Quick reminder: the inspection addendum still needs your signature by Friday. Here is the link. Call me if anything looks off.' },
      { a: 'review', time: '3:15 PM', ev: '<b>Closing day</b> on Birch Lane', sub: 'Keys handed over',
        ctx: 'Review ask · text', done: 'Asked for a review',
        draft: 'Congratulations on the new house! If you have a minute, an honest review helps other families find me.' },
      { a: 'intel', time: '5:00 PM', ev: '<b>Weekly note</b> on what buyers nearby are asking', sub: 'From public posts', note: true,
        ctx: 'A note just for you · nothing sent', done: 'Saved a note for you',
        draft: 'Public posts this week ask about first-time buyer programs and property taxes in Maple Grove.' }
    ]},
    { name: 'Sample Salon & Spa', day: 'Friday', kind: 'a salon', scenes: [
      { a: 'call', time: '9:20 AM', ev: '<b>Missed call</b> from (763) 555-0123', sub: 'You were with a client',
        ctx: 'Text back · (763) 555-0123', done: 'Texted back the missed caller',
        draft: "Sorry we missed your call! Reply with the service you want and a couple of times that work, and we'll get you booked." },
      { a: 'desk', time: '11:00 AM', ev: '<b>Instagram question:</b> "Do you do balayage?"', sub: 'Answered from your service menu',
        ctx: 'Reply on Instagram', done: 'Answered a balayage question',
        draft: 'We do! Balayage starts with a quick consult. Want me to find you a time next week?' },
      { a: 'quote', time: '12:30 PM', ev: '<b>Jenna\'s color</b> is due', sub: 'Last visit 7 weeks ago',
        ctx: 'Rebook text · Jenna', done: 'Offered Jenna her usual spot',
        draft: "Hi Jenna, it's been about 7 weeks since your color. Want me to hold your usual Thursday spot?" },
      { a: 'paper', time: '1:45 PM', ev: '<b>Gift card order</b> waiting on payment', sub: 'Ordered online 2 days ago',
        ctx: 'Reminder · email', done: 'Sent the gift card pay link',
        draft: "Your gift card order is almost done. Here's the pay link, and we'll email it right over." },
      { a: 'review', time: '4:10 PM', ev: '<b>Happy client</b> flagged by your stylist', sub: 'Loved the new cut',
        ctx: 'Review ask · text', done: 'Asked for a review',
        draft: 'Thanks for coming in today! If you love your hair, a quick review means a lot to a small salon.' },
      { a: 'intel', time: '5:30 PM', ev: '<b>Weekly note</b> on what people nearby are asking', sub: 'From public posts', note: true,
        ctx: 'A note just for you · nothing sent', done: 'Saved a note for you',
        draft: 'Local posts this month mention prom updos and booking holiday color early.' }
    ]},
    { name: 'Sample Coffee Co.', day: 'Saturday', kind: 'a coffee shop', scenes: [
      { a: 'call', time: '7:10 AM', ev: '<b>Missed call</b> during the morning rush', sub: '(763) 555-0177',
        ctx: 'Text back · (763) 555-0177', done: 'Texted back the missed caller',
        draft: 'Sorry we missed you during the rush! Calling about catering? Reply with the date and headcount and we will get back to you.' },
      { a: 'desk', time: '9:30 AM', ev: '<b>Website question:</b> "Are you dog friendly?"', sub: 'Answered from info you approved',
        ctx: 'Reply on your website', done: 'Answered a patio question',
        draft: 'Yes! Dogs are welcome on the patio, and we keep treats behind the counter.' },
      { a: 'quote', time: '11:45 AM', ev: '<b>Catering quote</b> for a birthday party is quiet', sub: 'Sent 5 days ago',
        ctx: 'Follow-up text · catering', done: 'Followed up on the catering quote',
        draft: 'Checking in on the catering quote for your party. Happy to adjust the menu. Want me to hold the date?' },
      { a: 'paper', time: '1:20 PM', ev: '<b>Office coffee invoice</b> still open', sub: 'Open 10 days',
        ctx: 'Invoice reminder · email', done: 'Sent the invoice reminder',
        draft: "A friendly reminder that the invoice for your office coffee order is still open. Here's the pay link." },
      { a: 'review', time: '3:00 PM', ev: '<b>Regular</b> tapped "Loved it" on the receipt', sub: 'Morning visit',
        ctx: 'Review ask · text', done: 'Asked for a review',
        draft: 'Thanks for stopping in this morning! A quick review helps neighbors find a local coffee shop.' },
      { a: 'intel', time: '4:30 PM', ev: '<b>Weekly note</b> on what people nearby are asking', sub: 'From public posts', note: true,
        ctx: 'A note just for you · nothing sent', done: 'Saved a note for you',
        draft: 'Public posts this week mention pumpkin drinks and quiet places to work with good Wi-Fi.' }
    ]}
  ];
  var bizIdx = 0, SCENES = BIZ[0].scenes;

  var roster = $('#roster'), feed = $('#feed'), stage = $('#phStage'), empty = $('#phEmpty'),
      doneList = $('#phDone'), tapsEl = $('#phTaps'), countEl = $('#countDone'), tap = $('#tap'), phSub = $('#phSub'), demo = $('#demo'),
      bizEl = $('#bizName'), capEl = $('#demoCap');
  if (!roster) return;

  function setBiz(i) {
    bizIdx = i % BIZ.length; var B = BIZ[bizIdx]; SCENES = B.scenes;
    if (bizEl) { bizEl.textContent = B.name + ' · ' + B.day; bizEl.classList.remove('swap'); void bizEl.offsetWidth; bizEl.classList.add('swap'); }
    if (capEl) capEl.textContent = 'Sample day for ' + B.kind + '. Names, numbers and times are made up.';
  }

  function svg(id) { return '<svg class="ico"><use href="#' + id + '"/></svg>'; }
  function av(k, cls) {
    var A = AGENTS[k];
    return '<span class="av blob ' + (cls || '') + '" style="--c:' + A.c + '"><svg viewBox="0 0 40 40" aria-hidden="true"><g fill="' + A.c + '">' + SHAPES[A.shape] + '</g>' + EYES + '</svg></span>';
  }

  Object.keys(AGENTS).forEach(function (k) {
    var li = document.createElement('li');
    li.className = 'r-item'; li.dataset.k = k;
    li.title = AGENTS[k].name;
    li.innerHTML = av(k) + '<div><b>' + AGENTS[k].name + '</b><small>' + AGENTS[k].idle + '</small></div>';
    roster.appendChild(li);
  });
  function setRoster(k, state, text) {
    var li = roster.querySelector('[data-k="' + k + '"]');
    li.classList.toggle('on', state !== 'idle');
    li.querySelector('small').textContent = text || AGENTS[k].idle;
  }

  var timers = [], running = false, started = false, idx = 0, handled = 0, cur = null;
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function addEvent(s, chipClass, chipText) { // chat style: newest message at the bottom
    var li = document.createElement('li');
    li.className = 'ev';
    li.innerHTML = '<div class="ev-from">Message from ' + av(s.a, 'mini') + '<b>' + AGENTS[s.a].name + '</b><span>· ' + s.time + '</span></div>' +
      '<div class="ev-b"><div class="ev-t">' + s.ev + '<small>' + s.sub + '</small></div>' +
      '<span class="chip ' + chipClass + '">' + chipText + '</span></div>';
    feed.appendChild(li);
    while (feed.children.length > 4) feed.removeChild(feed.firstChild);
    return li;
  }
  function setChip(li, cls, html) { var c = li.querySelector('.chip'); c.className = 'chip ' + cls; c.innerHTML = html; }

  function askCard(s) {
    var d = document.createElement('div');
    d.className = 'ask';
    d.innerHTML = '<div class="ask-top">' + av(s.a) + '<div><b>' + AGENTS[s.a].name + '</b><small>' + s.ctx + '</small></div></div>' +
      '<div class="ask-draft"><span class="txt"></span><span class="caret"></span></div>' +
      '<div class="ask-btns"><span class="e">' + (s.note ? 'Later' : 'Edit') + '</span><span class="a">' + svg('i-check') + (s.note ? 'Got it' : 'Approve') + '</span></div>';
    return d;
  }
  function addDone(s) {
    var li = document.createElement('li');
    li.innerHTML = svg('i-check') + '<span>' + s.done + '</span><time>' + s.time.replace(' AM', 'a').replace(' PM', 'p') + '</time>';
    doneList.insertBefore(li, doneList.firstChild);
    while (doneList.children.length > 3) doneList.removeChild(doneList.lastChild);
  }

  function type(el, text, cb) {
    var i = 0;
    (function step() {
      if (!running) return;
      i += Math.max(1, Math.round(text.length / 60));
      el.textContent = text.slice(0, i);
      if (i < text.length) later(step, 26); else cb();
    })();
  }

  function playScene() {
    if (!running) return;
    if (idx >= SCENES.length) { // end of day: pause, then reset
      phSub.textContent = 'All caught up for today';
      later(function () { setBiz(bizIdx + 1); resetDay(); }, 3600);
      return;
    }
    var s = SCENES[idx];
    setRoster(s.a, 'on', 'Drafting…');
    phSub.textContent = AGENTS[s.a].name + ' is drafting…';
    var ev = addEvent(s, 'drafting', 'Drafting');
    cur = { ev: ev, card: null, a: s.a };

    later(function () {
      empty.style.opacity = 0;
      var card = askCard(s);
      stage.appendChild(card);
      cur.card = card;
      setChip(ev, s.note ? 'note' : 'waiting', s.note ? 'For you' : 'Waiting on you');
      setRoster(s.a, 'on', s.note ? 'Note ready' : 'Waiting on you');
      phSub.textContent = s.note ? 'A note for you' : '1 draft needs your OK';
      type(card.querySelector('.txt'), s.draft, function () {
        card.querySelector('.caret').remove();
        later(function () {
          var btn = card.querySelector('.a');
          var r = btn.getBoundingClientRect(), pr = stage.parentNode.getBoundingClientRect();
          tap.style.left = (r.left - pr.left + r.width / 2 - 22) + 'px';
          tap.style.top = (r.top - pr.top + r.height / 2 - 22) + 'px';
          tap.classList.remove('go'); void tap.offsetWidth; tap.classList.add('go');
          later(function () {
            btn.classList.add('done');
            btn.innerHTML = svg('i-check') + (s.note ? 'Saved' : 'Sent');
            setChip(ev, s.note ? 'note' : 'sent', svg('i-check') + (s.note ? 'Saved · not sent' : 'Sent ' + s.time));
            setRoster(s.a, 'idle');
            handled++; countEl.textContent = handled; tapsEl.textContent = handled;
            cur = null;
            later(function () {
              card.classList.add('out');
              addDone(s);
              later(function () { card.remove(); empty.style.opacity = 1; phSub.textContent = 'Your team is on it'; }, 420);
              idx++;
              later(playScene, 1100);
            }, 650);
          }, 260);
        }, 900);
      });
    }, 1300);
  }

  function resetDay() {
    feed.innerHTML = ''; doneList.innerHTML = ''; stage.querySelectorAll('.ask').forEach(function (n) { n.remove(); });
    empty.style.opacity = 1; handled = 0; countEl.textContent = 0; tapsEl.textContent = 0; idx = 0;
    Object.keys(AGENTS).forEach(function (k) { setRoster(k, 'idle'); });
    phSub.textContent = 'Your team is on it';
    later(playScene, 700);
  }
  function start() {
    if (running) return; running = true;
    if (!started) { started = true; setBiz(0); resetDay(); } else { later(playScene, 400); }
  }
  function stop() { // pause; drop any half-finished scene so resume replays it cleanly
    if (!running) return;
    running = false; clearTimers(); tap.classList.remove('go');
    if (cur) {
      if (cur.ev && cur.ev.parentNode) cur.ev.remove();
      if (cur.card && cur.card.parentNode) cur.card.remove();
      setRoster(cur.a, 'idle'); cur = null;
    }
    stage.querySelectorAll('.ask.out').forEach(function (n) { n.remove(); });
    if (!stage.querySelector('.ask')) empty.style.opacity = 1;
  }

  function staticState() { // reduced motion: show a finished day, no movement
    setBiz(0);
    SCENES.slice(0, 5).forEach(function (s) {
      addEvent(s, s.note ? 'note' : 'sent', svg('i-check') + (s.note ? 'Saved · not sent' : 'Sent ' + s.time));
    });
    var s = SCENES[5], card = askCard(s);
    card.querySelector('.txt').textContent = s.draft; card.querySelector('.caret').remove();
    stage.appendChild(card); empty.style.opacity = 0;
    SCENES.slice(2, 5).forEach(addDone);
    countEl.textContent = 5; tapsEl.textContent = 5; phSub.textContent = 'A note for you';
  }

  if (reduce) { staticState(); }
  else if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
    }, { threshold: 0.05 }).observe(demo);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
    });
  } else { start(); }

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
      ['review', 'Asks shoppers for a review and drafts your replies.', 'A reply to OK']] }
  };
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  var tabWrap = root.querySelector('.tb-tabs');
  var panel = document.getElementById('tbPanel'), list = document.getElementById('tbList');
  var bizEl = document.getElementById('tbBiz'), countEl = document.getElementById('tbCount');
  var roles = Array.prototype.slice.call(root.querySelectorAll('.tb-roles [data-role]'));
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function show(key, animate) {
    var t = TEAMS[key]; if (!t) return;
    tabs.forEach(function (b) { var on = b.dataset.biz === key; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on) panel.setAttribute('aria-labelledby', b.id); });
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
  function pick(b, focus) { touched = true; stop(); idx = keys.indexOf(b.dataset.biz); show(b.dataset.biz, true); if (focus) b.focus(); }
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
