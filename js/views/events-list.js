/*
 * Écran « Événements » : trois vues pour la saison choisie
 *  - À venir / Passés : les événements
 *  - Dépenses         : toutes les dépenses (y compris « hors événement »), par mois
 */
import {
  state, eventsInSeason, expensesInSeason, isUpcoming, pendingTasks, eventUrgency, URGENCY_COLOR, myShare,
} from '../store.js';
import { PARTICIPATION, PARTICIPATION_COLOR, AREAS, AREA_ICONS, STATUS, STATUS_COLOR } from '../labels.js';
import { esc, pageHeader, bindCommon } from '../ui.js';
import { formatDateRange, formatMonthShort, formatMonthYear, formatEuro, parseISO } from '../format.js';
import { openEventForm } from './event-form.js';
import { openExpenseForm, expenseRow, bindExpenseRows } from './expense-form.js';

// Vue choisie (gardée tant que l'app reste ouverte)
let currentTab = 'upcoming';

export function render(el) {
  const events = eventsInSeason();
  const upcoming = events.filter(isUpcoming).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = events.filter((e) => !isUpcoming(e)).sort((a, b) => b.startDate.localeCompare(a.startDate));

  let content;
  if (currentTab === 'expenses') content = expensesView();
  else content = eventsView(currentTab === 'upcoming' ? upcoming : past);

  el.innerHTML = `
    ${pageHeader('Événements')}
    <div class="segmented" role="tablist">
      <button type="button" data-tab="upcoming" class="${currentTab === 'upcoming' ? 'on' : ''}">À venir (${upcoming.length})</button>
      <button type="button" data-tab="past" class="${currentTab === 'past' ? 'on' : ''}">Passés (${past.length})</button>
      <button type="button" data-tab="expenses" class="${currentTab === 'expenses' ? 'on' : ''}">Dépenses</button>
    </div>
    ${content}
    <button type="button" class="fab" data-add
      aria-label="${currentTab === 'expenses' ? 'Nouvelle dépense' : 'Nouvel événement'}">＋</button>
  `;

  bindCommon(el);
  bindExpenseRows(el);
  el.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      render(el);
    });
  });
  el.querySelector('[data-add]').addEventListener('click', () => {
    if (currentTab === 'expenses') openExpenseForm(); else openEventForm();
  });
}

// ---------------------------------------------------------------------------
// Événements
// ---------------------------------------------------------------------------
function eventsView(list) {
  if (!list.length) {
    return `<div class="empty"><div class="big">📅</div>
      ${currentTab === 'upcoming' ? 'Aucun événement à venir' : 'Aucun événement passé'} pour cette saison.<br>
      Touche <strong>＋</strong> pour en ajouter un.</div>`;
  }
  return `<div class="list mt">${list.map(eventRow).join('')}</div>`;
}

function eventRow(event) {
  const pending = pendingTasks(event).length;
  const inactive = event.participation === 'cancelled' || event.participation === 'no';
  const place = [event.city, event.country].filter(Boolean).join(', ');

  const areas = Object.keys(AREAS).map((key) => {
    const status = event.statuses[key];
    return `<span class="area-ind" title="${esc(AREAS[key])} : ${esc(STATUS[status])}">
      ${AREA_ICONS[key]}<span class="dot bg-${STATUS_COLOR[status]}"></span></span>`;
  }).join('');

  return `
    <a class="row ${inactive ? 'dim' : ''}" href="#/evenements/${esc(event.id)}">
      <div class="date-box">
        <div class="d">${parseISO(event.startDate).getDate()}</div>
        <div class="m">${formatMonthShort(event.startDate)}</div>
      </div>
      <div class="row-main">
        <div class="row-title">${esc(event.name)}</div>
        <div class="row-sub">${formatDateRange(event.startDate, event.endDate)}${place ? ` · ${esc(place)}` : ''}</div>
        <div class="status-line">
          <span class="tag ${PARTICIPATION_COLOR[event.participation]}">${PARTICIPATION[event.participation]}</span>
          ${inactive ? '' : areas}
          ${event.isSample ? '<span class="tag">Exemple</span>' : ''}
        </div>
      </div>
      ${pending ? `<span class="badge bg-${URGENCY_COLOR[eventUrgency(event)]}" title="Actions en suspens">${pending}</span>` : ''}
      <span class="row-chevron"></span>
    </a>`;
}

// ---------------------------------------------------------------------------
// Dépenses de la saison, regroupées par mois de paiement
// ---------------------------------------------------------------------------
function expensesView() {
  const season = state.settings.season;
  const list = expensesInSeason().sort((a, b) => b.date.localeCompare(a.date));
  const total = list.reduce((sum, x) => sum + myShare(x), 0);

  const summary = `
    <div class="card mt">
      <div class="muted small">Ma part · ${season === 'all' ? 'toutes saisons' : `saison ${season}`}</div>
      <div class="big-amount">${formatEuro(total)}</div>
      <div class="muted small">${list.length} dépense(s)</div>
    </div>`;

  if (!list.length) {
    return `${summary}<div class="empty"><div class="big">💶</div>
      Aucune dépense pour cette saison.<br>Touche <strong>＋</strong> pour en ajouter une.</div>`;
  }

  const groups = new Map();
  list.forEach((x) => {
    const month = x.date.slice(0, 7);
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(x);
  });

  return summary + [...groups].map(([month, items]) => `
    <div class="section-title">${formatMonthYear(`${month}-01`)} · ${formatEuro(items.reduce((s, x) => s + myShare(x), 0))}</div>
    <div class="list">${items.map((x) => expenseRow(x, { showEvent: true })).join('')}</div>`).join('')
    + `<div class="section-footer">Une dépense compte dans la saison de son événement, même si elle a été payée l'année d'avant.</div>`;
}
