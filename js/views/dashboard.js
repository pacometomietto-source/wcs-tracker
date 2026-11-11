/*
 * Écran « Accueil » : le tableau de bord de la saison choisie.
 *  1. Prochains événements + actions en suspens
 *  2. Points WSDC : total, progression vers la division suivante, courbe
 *  3. Dépenses : total, par catégorie, par mois, par événement
 */
import {
  state, getEvent, saveEvent, eventsInSeason, expensesInSeason, isUpcoming, pendingTasks,
  eventUrgency, taskUrgency, URGENCY_COLOR, myShare, totalPoints, seasonPoints,
} from '../store.js';
import { AREAS, CATEGORIES } from '../labels.js';
import { esc, pageHeader, backupBanner, bindCommon, refresh, toast } from '../ui.js';
import {
  parseISO, formatDayMonth, formatMonthShort, formatMonthYear, formatEuro, formatEuroShort,
  daysUntil, formatRelativeDays,
} from '../format.js';
import { stepLineChart, columnChart, segmentedBar, bindChartTips } from '../charts.js';

const MAX_TASKS = 6;
const CATEGORY_SLOTS = ['pass', 'lodging', 'transport', 'competition', 'privateLesson']; // couleur fixe par catégorie

// Division affichée dans la courbe (gardée tant que l'app reste ouverte)
let chartDivision = null;

export function render(el) {
  el.innerHTML = `
    ${pageHeader('Accueil')}
    ${backupBanner()}
    ${upcomingSection()}
    ${tasksSection()}
    ${pointsSection()}
    ${expensesSection()}
  `;
  bindCommon(el);
  bindChartTips(el);

  // Cocher une action directement depuis l'accueil
  el.querySelectorAll('[data-done]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const [eventId, taskId] = btn.dataset.done.split('|');
      const event = getEvent(eventId);
      await saveEvent({ ...event, tasks: event.tasks.map((t) => (t.id === taskId ? { ...t, done: true } : t)) });
      toast('Action faite ✅');
      refresh();
    });
  });
  el.querySelectorAll('[data-division]').forEach((btn) => {
    btn.addEventListener('click', () => { chartDivision = btn.dataset.division; render(el); });
  });
}

const seasonText = () => (state.settings.season === 'all' ? 'toutes saisons' : `saison ${state.settings.season}`);

// ---------------------------------------------------------------------------
// 1. Prochains événements & actions
// ---------------------------------------------------------------------------
function upcomingSection() {
  const events = eventsInSeason()
    .filter((e) => isUpcoming(e) && e.participation !== 'no' && e.participation !== 'cancelled')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 3);

  const rows = events.map((e) => {
    const n = daysUntil(e.startDate);
    const when = n <= 0 ? 'en cours' : n === 1 ? 'demain' : `dans ${n} j`;
    const pending = pendingTasks(e).length;
    return `
      <a class="row" href="#/evenements/${esc(e.id)}">
        <div class="date-box">
          <div class="d">${parseISO(e.startDate).getDate()}</div>
          <div class="m">${formatMonthShort(e.startDate)}</div>
        </div>
        <div class="row-main">
          <div class="row-title">${esc(e.name)}</div>
          <div class="row-sub">${esc(e.city)} · ${when}</div>
        </div>
        ${pending ? `<span class="badge bg-${URGENCY_COLOR[eventUrgency(e)]}">${pending}</span>` : ''}
        <span class="row-chevron"></span>
      </a>`;
  }).join('');

  return `
    <div class="section-title">Prochains événements</div>
    <div class="list">
      ${rows || `<a class="row" href="#/evenements"><div class="row-main muted">Aucun événement à venir pour cette saison.</div><span class="row-chevron"></span></a>`}
    </div>`;
}

function tasksSection() {
  const items = eventsInSeason()
    .flatMap((e) => (e.tasks || []).filter((t) => !t.done).map((t) => ({ t, e })))
    .sort((a, b) => (a.t.dueDate || '9999').localeCompare(b.t.dueDate || '9999'));

  const rows = items.slice(0, MAX_TASKS).map(({ t, e }) => {
    const urgency = taskUrgency(t);
    let due = '';
    if (t.dueDate) {
      const text = `${formatDayMonth(t.dueDate)} (${formatRelativeDays(daysUntil(t.dueDate))})`;
      due = urgency === 'overdue' || urgency === 'soon'
        ? ` · <span class="c-${URGENCY_COLOR[urgency]}">${urgency === 'overdue' ? '⚠️ ' : ''}${text}</span>`
        : ` · ${text}`;
    }
    return `
      <div class="row">
        <button type="button" class="check" data-done="${esc(e.id)}|${esc(t.id)}" aria-label="Marquer comme fait"></button>
        <a class="row-main" href="#/evenements/${esc(e.id)}" style="color:inherit">
          <div class="row-title">${esc(t.label)}</div>
          <div class="row-sub">${esc(e.name)} · ${AREAS[t.area] || ''}${due}</div>
        </a>
      </div>`;
  }).join('');

  const more = items.length > MAX_TASKS
    ? `<a class="row" href="#/evenements"><div class="row-main muted">… et ${items.length - MAX_TASKS} autre(s) action(s)</div><span class="row-chevron"></span></a>`
    : '';

  return `
    <div class="section-title">Actions en suspens${items.length ? ` · ${items.length}` : ''}</div>
    <div class="list">
      ${rows || '<div class="row"><div class="row-main muted">Aucune action en suspens 🎉</div></div>'}
      ${more}
    </div>
    ${items.length ? '<div class="section-footer">En rouge : date dépassée. En orange : dans les 7 jours.</div>' : ''}`;
}

// ---------------------------------------------------------------------------
// 2. Points WSDC
// ---------------------------------------------------------------------------
function pointsSection() {
  const s = state.settings;
  const current = s.myDivision;
  const total = totalPoints(current);
  const threshold = s.thresholds.find((t) => t.from === current);
  const season = s.season;

  let progress = `<p class="meter-text muted">Aucun seuil de passage défini pour ${esc(current)} (voir Réglages).</p>`;
  if (threshold && threshold.required > 0) {
    const { allowed, required, to } = threshold;
    let text;
    if (total >= required) text = `⚠️ <strong>Tu dois passer en ${esc(to)}</strong> (seuil obligatoire : ${required} pts).`;
    else if (total >= allowed) text = `✅ <strong>Tu peux passer en ${esc(to)}.</strong> Encore ${required - total} pts avant l'obligation.`;
    else text = `Encore <strong>${allowed - total} pts</strong> pour pouvoir passer en ${esc(to)}.`;
    progress = `
      <div class="meter" role="img" aria-label="${total} points sur ${required}">
        <div class="meter-fill ${total >= allowed ? 'ok' : ''}" style="width:${Math.min(100, (total / required) * 100)}%"></div>
        <div class="meter-mark" style="left:${(allowed / required) * 100}%"></div>
      </div>
      <div class="meter-scale">
        <span style="left:0">0</span>
        <span style="left:${(allowed / required) * 100}%">${allowed} : je peux monter</span>
        <span style="left:100%">${required}</span>
      </div>
      <p class="meter-text">${text}</p>`;
  }

  // Autres divisions où j'ai des points
  const others = s.divisions.filter((d) => d !== current && totalPoints(d) > 0);
  const othersList = others.length ? `
    <div class="list mt">
      ${others.map((d) => `<div class="row"><div class="row-main">${esc(d)}</div><div class="row-value">${totalPoints(d)} pts</div></div>`).join('')}
    </div>` : '';

  return `
    <div class="section-title">Points WSDC · Jack &amp; Jill</div>
    <div class="card">
      <div class="muted small">${esc(current)} · total cumulé</div>
      <div class="big-amount">${total} pts</div>
      ${season !== 'all' ? `<div class="muted small">+${seasonPoints(current)} pts en ${season}</div>` : ''}
      ${progress}
    </div>
    ${othersList}
    ${pointsChart()}`;
}

function pointsChart() {
  const s = state.settings;
  const withPoints = s.divisions.filter((d) => totalPoints(d) > 0);
  if (!withPoints.length) {
    return '<div class="card mt"><div class="muted small">La courbe apparaîtra dès que tu auras des points (compétitions J&amp;J ou points de départ dans les Réglages).</div></div>';
  }
  if (!withPoints.includes(chartDivision)) chartDivision = withPoints.includes(s.myDivision) ? s.myDivision : withPoints[0];
  const division = chartDivision;

  // Compétitions J&J avec points dans cette division, dans l'ordre chronologique
  const comps = state.competitions
    .filter((c) => c.type === 'jj' && c.division === division && Number(c.points) > 0 && getEvent(c.eventId))
    .map((c) => ({ c, event: getEvent(c.eventId) }))
    .sort((a, b) => a.event.startDate.localeCompare(b.event.startDate));

  const season = s.season;
  const today = Date.now();
  let rangeStart;
  let rangeEnd;
  if (season === 'all') {
    rangeStart = comps.length ? parseISO(comps[0].event.endDate).getTime() - 45 * 86400000 : today - 365 * 86400000;
    rangeEnd = Math.max(today, comps.length ? parseISO(comps[comps.length - 1].event.endDate).getTime() : today);
  } else {
    rangeStart = new Date(season, 0, 1).getTime();
    rangeEnd = Math.min(new Date(season, 11, 31).getTime(), Math.max(today, rangeStart + 30 * 86400000));
  }

  // Point de départ : points de départ + tout ce qui a été gagné avant la période
  let cumul = Number(s.startingPoints[division]) || 0;
  const points = [];
  comps.forEach(({ c, event }) => {
    const t = parseISO(event.endDate).getTime();
    if (t < rangeStart) cumul += Number(c.points);
  });
  points.push({ t: rangeStart, y: cumul, marker: false });
  comps.forEach(({ c, event }) => {
    const t = parseISO(event.endDate).getTime();
    if (t < rangeStart || t > rangeEnd) return;
    cumul += Number(c.points);
    points.push({ t, y: cumul, marker: true, tip: `${event.name} (${formatDayMonth(event.endDate)}) : +${c.points} pts → ${cumul} pts` });
  });
  points.push({ t: Math.max(rangeEnd, points[points.length - 1].t), y: cumul, marker: false });

  // Graduations de l'axe horizontal : trimestres sur une saison, années sinon
  const xTicks = [];
  if (season === 'all') {
    for (let y = new Date(rangeStart).getFullYear() + 1; y <= new Date(rangeEnd).getFullYear(); y += 1) {
      xTicks.push({ t: new Date(y, 0, 1).getTime(), label: String(y) });
    }
  } else {
    [0, 3, 6, 9].forEach((m) => xTicks.push({ t: new Date(season, m, 1).getTime(), label: formatMonthShort(`${season}-${String(m + 1).padStart(2, '0')}-01`) }));
  }

  const switcher = withPoints.length > 1 ? `
    <div class="segmented small" style="margin-bottom:10px">
      ${withPoints.map((d) => `<button type="button" data-division="${esc(d)}" class="${d === division ? 'on' : ''}">${esc(d)}</button>`).join('')}
    </div>` : '';

  const hasEvents = points.some((p) => p.marker);
  return `
    <div class="card mt">
      <div class="card-title">Évolution des points ${esc(division)} <span class="muted">· ${seasonText()}</span></div>
      ${switcher}
      ${stepLineChart({
        points,
        xTicks,
        formatY: (v) => String(v),
        label: `Points cumulés en ${division}`,
        hint: hasEvents ? 'Touche un point pour le détail' : 'Aucun point gagné sur cette période',
      })}
    </div>`;
}

// ---------------------------------------------------------------------------
// 3. Dépenses
// ---------------------------------------------------------------------------
function expensesSection() {
  const list = expensesInSeason();
  const total = list.reduce((s, x) => s + myShare(x), 0);

  const header = `
    <div class="section-title">Dépenses</div>
    <div class="card">
      <div class="muted small">Ma part · ${seasonText()}</div>
      <div class="big-amount">${formatEuro(total)}</div>
      <div class="muted small">${list.length} dépense(s)</div>
    </div>`;
  if (!list.length) return header;

  return header + byCategory(list) + byMonth(list) + byEvent(list);
}

function byCategory(list) {
  const totals = CATEGORY_SLOTS.map((key, i) => ({
    key,
    slot: i + 1,
    value: list.filter((x) => x.category === key).reduce((s, x) => s + myShare(x), 0),
  }));
  const positive = totals.reduce((s, c) => s + Math.max(0, c.value), 0);
  const share = (v) => (positive > 0 && v > 0 ? `${Math.round((v / positive) * 100)} %` : '—');

  const bar = segmentedBar({
    label: 'Répartition des dépenses par catégorie',
    hint: 'Touche un bloc pour le détail',
    parts: totals.map((c) => ({
      label: CATEGORIES[c.key],
      value: c.value,
      color: `var(--series-${c.slot})`,
      ink: c.slot === 4 ? 'var(--on-series-4)' : '#ffffff',
      tip: `${CATEGORIES[c.key]} : ${formatEuro(c.value)} (${share(c.value)})`,
    })),
  });

  // Légende + tableau des valeurs (lisible même sans distinguer les couleurs)
  const table = totals.map((c) => `
    <div class="row">
      <span class="swatch" style="background:var(--series-${c.slot})"></span>
      <div class="row-main">${CATEGORIES[c.key]}</div>
      <div class="amount-col">${formatEuro(c.value)} <span class="muted small">· ${share(c.value)}</span></div>
    </div>`).join('');

  return `
    <div class="card mt">
      <div class="card-title">Par catégorie</div>
      ${bar}
    </div>
    <div class="list mt">${table}</div>`;
}

function byMonth(list) {
  const months = [...new Set(list.map((x) => x.date.slice(0, 7)))].sort();
  const first = months[0];
  const last = months[months.length - 1];
  const items = [];
  let [y, m] = first.split('-').map(Number);
  while (`${y}-${String(m).padStart(2, '0')}` <= last) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const value = list.filter((x) => x.date.startsWith(key)).reduce((s, x) => s + myShare(x), 0);
    items.push({ key, value, month: m, year: y });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  const many = items.length > 14;
  const chart = columnChart({
    label: 'Dépenses par mois',
    hint: 'Touche une colonne pour le détail',
    formatY: formatEuroShort,
    items: items.map((it) => ({
      value: it.value,
      // Initiale du mois (ou l'année seulement en janvier si la période est longue)
      label: many
        ? (it.month === 1 ? `${String(it.year).slice(2)}` : '')
        : formatMonthShort(`${it.key}-01`).charAt(0).toUpperCase(),
      tip: `${formatMonthYear(`${it.key}-01`)} : ${formatEuro(it.value)}`,
    })),
  });
  return `
    <div class="card mt">
      <div class="card-title">Par mois <span class="muted">· date de paiement</span></div>
      ${chart}
    </div>`;
}

function byEvent(list) {
  const groups = new Map();
  list.forEach((x) => {
    const key = x.eventId || '';
    groups.set(key, (groups.get(key) || 0) + myShare(x));
  });
  const rows = [...groups].sort((a, b) => b[1] - a[1]);
  const max = Math.max(0, ...rows.map(([, v]) => v)) || 1;

  return `
    <div class="section-title">Par événement</div>
    <div class="list">
      ${rows.map(([eventId, value]) => {
        const event = eventId ? getEvent(eventId) : null;
        const name = event ? event.name : 'Hors événement';
        const tag = event ? 'a' : 'div';
        return `
          <${tag} class="bar-row" ${event ? `href="#/evenements/${esc(eventId)}"` : ''}>
            <div class="bar-head"><span>${esc(name)}</span><span>${formatEuro(value)}</span></div>
            <div class="bar-track">${value > 0 ? `<div class="bar-fill" style="width:${(value / max) * 100}%"></div>` : ''}</div>
          </${tag}>`;
      }).join('')}
    </div>`;
}
