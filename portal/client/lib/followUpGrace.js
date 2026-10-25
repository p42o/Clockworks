// Follow-Up grace. Pure: no Firestore, no firebase-admin.
// Keep portal/client/lib/followUpGrace.js byte-identical (a unit test checks).
//
// The free portal stays open for graceDays calendar days after the deploy date
// (default 30, America/Chicago). The end instant is Chicago midnight at the
// start of the day AFTER the last open day. Exempt, or an active Shop Pass
// record, keeps the portal open. This module never sets Close or closedAt.

export const DEFAULT_FOLLOW_UP_GRACE_DAYS = 30;
export const MAX_FOLLOW_UP_GRACE_DAYS = 3650;
export const GRACE_TIME_ZONE = 'America/Chicago';

const DAY = 86400000;

export function msOf(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
  if (typeof v.toMillis === 'function') {
    try {
      const n = v.toMillis();
      return Number.isFinite(n) ? n : null;
    } catch { return null; }
  }
  if (typeof v.toDate === 'function') {
    try {
      const d = v.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : null;
    } catch { return null; }
  }
  if (typeof v.seconds === 'number') return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
  if (typeof v._seconds === 'number') return v._seconds * 1000;
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  return null;
}

function partsOf(ms, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map = {};
  for (const p of fmt.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const hour = map.hour === '24' ? '00' : map.hour;
  return {
    ymd: `${map.year}-${map.month}-${map.day}`,
    h: Number(hour),
    min: Number(map.minute),
    s: Number(map.second),
  };
}

/** YYYY-MM-DD in America/Chicago. */
export function ymdChicago(value, timeZone = GRACE_TIME_ZONE) {
  const ms = msOf(value);
  if (ms == null) return '';
  return partsOf(ms, timeZone).ymd;
}

export function addCalendarDaysYmd(ymd, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m || !Number.isInteger(days)) return null;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

/** UTC millis of midnight at the start of ymd in America/Chicago. Null if ymd is not a real date. */
export function chicagoMidnightUtc(ymd, timeZone = GRACE_TIME_ZONE) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  let t = Date.UTC(y, mo - 1, d, 12, 0, 0);
  for (let i = 0; i < 6; i++) {
    const p = partsOf(t, timeZone);
    const [py, pm, pd] = p.ymd.split('-').map(Number);
    const got = Date.UTC(py, pm - 1, pd, p.h, p.min, p.s);
    const want = Date.UTC(y, mo - 1, d, 0, 0, 0);
    const delta = want - got;
    t += delta;
    if (delta === 0) break;
  }
  const p = partsOf(t, timeZone);
  if (p.ymd === `${m[1]}-${m[2]}-${m[3]}` && p.h === 0 && p.min === 0 && p.s === 0) return t;
  return null;
}

function ymdDiff(fromYmd, toYmd) {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromYmd);
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toYmd);
  if (!a || !b) return null;
  const am = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const bm = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((bm - am) / DAY);
}

function clampStoredDays(v) {
  const n = typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v.trim()) : Number(v);
  if (Number.isInteger(n) && n >= 1 && n <= MAX_FOLLOW_UP_GRACE_DAYS) return n;
  return DEFAULT_FOLLOW_UP_GRACE_DAYS;
}

function readDays(v) {
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) v = Number(v.trim());
  if (!Number.isInteger(v) || v < 1 || v > MAX_FOLLOW_UP_GRACE_DAYS) return null;
  return v;
}

function liveRecord(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (obj.canceledAt || obj.cancelledAt) return false;
  if (obj.active === true) return true;
  const st = String(obj.status || '').toLowerCase();
  return st === 'active' || st === 'trialing' || st === 'past_due';
}

function isShopPassRecord(sub) {
  if (!sub || typeof sub !== 'object') return false;
  const norm = (v) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const kind = norm(sub.kind || sub.product);
  const planId = norm(sub.plan?.id || sub.planId);
  const planName = String(sub.plan?.name || '').trim().toLowerCase();
  return kind === 'shop_pass' || planId === 'shop_pass' || planName === 'shop pass';
}

/**
 * True only for a per-client Shop Pass record that is clearly active.
 * A placeholder subscription, Care Plan, or signed agreement does not count.
 * SWAP.shopPass / billing flags are not read here. They are not a keep-alive.
 */
export function shopPassKeepsPortalOpen(client, subscription = null) {
  if (liveRecord(client?.shopPass)) return true;
  if (liveRecord(client?.portal?.shopPass)) return true;
  if (isShopPassRecord(subscription) && liveRecord(subscription)) return true;
  return false;
}

/** Exclusive end: Chicago midnight of the deploy calendar day plus graceDays. */
export function exclusiveEndFromDeploy(deployAt, graceDays, timeZone = GRACE_TIME_ZONE) {
  const deployMs = msOf(deployAt);
  const days = clampStoredDays(graceDays);
  if (deployMs == null) return null;
  const ymd = ymdChicago(deployMs, timeZone);
  const endYmd = addCalendarDaysYmd(ymd, days);
  if (!endYmd) return null;
  return chicagoMidnightUtc(endYmd, timeZone);
}

function calendarDaysLeft(nowMs, exclusiveEndMs) {
  if (exclusiveEndMs == null || nowMs >= exclusiveEndMs) return 0;
  const today = ymdChicago(nowMs);
  const lastDay = ymdChicago(exclusiveEndMs - 1);
  const diff = ymdDiff(today, lastDay);
  if (diff == null) return 0;
  return diff + 1;
}

/**
 * @returns {{
 *   state: 'unset'|'open'|'expired'|'exempt'|'shop_pass',
 *   boot: boolean,
 *   endsAt: number|null,
 *   endsOverride: number|null,
 *   graceDays: number,
 *   deployAt: number|null,
 *   exempt: boolean,
 *   shopPass: boolean,
 *   daysLeft: number|null,
 *   note: string,
 * }}
 */
export function followUpGraceDecision(client, now, opts = {}) {
  const nowMs = msOf(now) ?? Date.now();
  const g = client?.portal?.followUpGrace;
  const graceDays = clampStoredDays(g?.graceDays);
  const deployAt = msOf(g?.deployAt);
  const endsOverride = msOf(g?.endsAt);
  const exempt = g?.exempt === true;
  const shopPass = typeof opts.shopPassActive === 'boolean'
    ? opts.shopPassActive
    : shopPassKeepsPortalOpen(client, opts.subscription ?? null);
  const note = typeof g?.note === 'string' ? g.note.slice(0, 300) : '';
  let endsAt = null;
  if (endsOverride != null) endsAt = endsOverride;
  else if (deployAt != null) endsAt = exclusiveEndFromDeploy(deployAt, graceDays);

  let state = 'unset';
  if (shopPass) state = 'shop_pass';
  else if (exempt) state = 'exempt';
  else if (endsAt == null) state = 'unset';
  else if (nowMs >= endsAt) state = 'expired';
  else state = 'open';

  const daysLeft = endsAt == null ? null : calendarDaysLeft(nowMs, endsAt);
  return {
    state,
    boot: state === 'expired',
    endsAt,
    endsOverride,
    graceDays,
    deployAt,
    exempt,
    shopPass,
    daysLeft,
    note,
  };
}

export function formatChicagoDate(value, now = new Date(), timeZone = GRACE_TIME_ZONE) {
  const ms = msOf(value);
  if (ms == null) return '';
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' });
  const pick = (instant) => {
    const map = {};
    for (const p of fmt.formatToParts(new Date(instant))) {
      if (p.type !== 'literal') map[p.type] = p.value;
    }
    return map;
  };
  const parts = pick(ms);
  const nowYear = pick(msOf(now) ?? Date.now()).year;
  const day = String(Number(parts.day));
  if (parts.year === nowYear) return `${parts.month} ${day}`;
  return `${parts.month} ${day}, ${parts.year}`;
}

/** Admin status line. `ends` is the last open Chicago calendar day. */
export function graceAdminLine(decision, now = new Date()) {
  if (!decision || decision.state === 'unset') return 'Follow-Up grace: No deploy date set';
  if (decision.state === 'shop_pass') return 'Follow-Up grace: Shop Pass keeps the portal open';
  if (decision.state === 'exempt') return 'Follow-Up grace: Exempt';
  if (decision.state === 'expired') return 'Follow-Up grace: Expired — portal booted';
  const when = decision.endsAt == null ? '' : formatChicagoDate(decision.endsAt - 1, now);
  const n = decision.daysLeft;
  const unit = n === 1 ? 'day' : 'days';
  return `Follow-Up grace: ${n} ${unit} left · ends ${when}`;
}

/** True when the stored projection is still enabled but its grace end has passed. */
export function graceProjectionStale(pa, nowMs = Date.now()) {
  if (!pa || pa.enabled !== true) return false;
  if (pa.graceExempt === true || pa.graceShopPass === true) return false;
  const ends = msOf(pa.graceEndsAt);
  if (ends == null) return false;
  const now = typeof nowMs === 'number' ? nowMs : (msOf(nowMs) ?? Date.now());
  return now >= ends;
}

function parseWhen(v, kind) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return { ok: true, date: new Date(v.getTime()) };
  if (typeof v === 'number' && Number.isFinite(v)) return { ok: true, date: new Date(v) };
  if (typeof v !== 'string') return { ok: false };
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    if (kind === 'end') {
      const next = addCalendarDaysYmd(s, 1);
      const end = next ? chicagoMidnightUtc(next) : null;
      if (end == null) return { ok: false };
      return { ok: true, date: new Date(end) };
    }
    const start = chicagoMidnightUtc(s);
    if (start == null) return { ok: false };
    return { ok: true, date: new Date(start) };
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return { ok: false };
  return { ok: true, date: d };
}

function graceSnapshot(g) {
  if (!g || typeof g !== 'object') return null;
  const deployAt = msOf(g.deployAt);
  const endsAt = msOf(g.endsAt);
  const has = deployAt != null || endsAt != null || g.exempt === true || g.graceDays != null || g.note;
  if (!has) return null;
  return {
    deployAt: deployAt == null ? null : new Date(deployAt).toISOString(),
    graceDays: clampStoredDays(g.graceDays),
    exempt: g.exempt === true,
    endsAt: endsAt == null ? null : new Date(endsAt).toISOString(),
    note: typeof g.note === 'string' ? g.note.slice(0, 300) : '',
  };
}

/**
 * Merge an admin patch onto the stored grace object.
 * Omitted fields stay. `clearEndsAt` / `clearDeployAt` remove those clocks.
 * A date-only deployAt is Chicago midnight. A date-only endsAt is the last open day
 * (stored as the next Chicago midnight).
 */
export function normalizeFollowUpGracePatch(prev, input, now = new Date()) {
  const cur = prev && typeof prev === 'object' ? prev : {};
  const body = input && typeof input === 'object' ? input : {};
  const at = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const next = {
    graceDays: clampStoredDays(cur.graceDays),
    exempt: cur.exempt === true,
    note: typeof cur.note === 'string' ? cur.note.slice(0, 300) : '',
  };
  const prevDeploy = msOf(cur.deployAt);
  if (prevDeploy != null) next.deployAt = new Date(prevDeploy);
  const prevEnds = msOf(cur.endsAt);
  if (prevEnds != null) next.endsAt = new Date(prevEnds);

  if (body.graceDays !== undefined && body.graceDays !== null && body.graceDays !== '') {
    const n = readDays(body.graceDays);
    if (n == null) return { ok: false, error: 'bad_grace_days' };
    next.graceDays = n;
  }
  if (body.exempt !== undefined) {
    if (typeof body.exempt !== 'boolean') return { ok: false, error: 'bad_exempt' };
    next.exempt = body.exempt;
  }
  if (body.note !== undefined) {
    if (typeof body.note !== 'string') return { ok: false, error: 'bad_note' };
    next.note = body.note.trim().slice(0, 300);
  }
  if (body.clearDeployAt === true) delete next.deployAt;
  else if (body.deployAt !== undefined && body.deployAt !== null && body.deployAt !== '') {
    const parsed = parseWhen(body.deployAt, 'deploy');
    if (!parsed.ok) return { ok: false, error: 'bad_deploy_at' };
    next.deployAt = parsed.date;
  }
  if (body.clearEndsAt === true) delete next.endsAt;
  else if (body.endsAt !== undefined && body.endsAt !== null && body.endsAt !== '') {
    const parsed = parseWhen(body.endsAt, 'end');
    if (!parsed.ok) return { ok: false, error: 'bad_ends_at' };
    next.endsAt = parsed.date;
  }
  if (body.extendDays !== undefined && body.extendDays !== null && body.extendDays !== '') {
    const n = readDays(body.extendDays);
    if (n == null) return { ok: false, error: 'bad_extend_days' };
    const nowMs = at.getTime();
    let baseMs = msOf(next.endsAt);
    if (baseMs == null && msOf(next.deployAt) != null) baseMs = exclusiveEndFromDeploy(next.deployAt, next.graceDays);
    let endMs;
    if (baseMs == null || baseMs <= nowMs) {
      const today = ymdChicago(nowMs);
      endMs = chicagoMidnightUtc(addCalendarDaysYmd(today, n));
    } else {
      endMs = chicagoMidnightUtc(addCalendarDaysYmd(ymdChicago(baseMs), n));
    }
    if (endMs == null) return { ok: false, error: 'bad_extend_days' };
    next.endsAt = new Date(endMs);
  }
  next.updatedAt = at;
  return { ok: true, grace: next, before: graceSnapshot(cur) };
}
