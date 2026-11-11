/*
 * Écran « Événements » : liste À venir / Passés de la saison choisie.
 */
import {
  eventsInSeason, isUpcoming, pendingTasks, eventUrgency, URGENCY_COLOR,
} from '../store.js';
import { PARTICIPATION, PARTICIPATION_COLOR, AREAS, STATUS, STATUS_COLOR } from '../labels.js';
import { esc, pageHeader, bindCommon } from '../ui.js';
import { formatDateRange, formatMonthShort, parseISO } from '../format.js';
import { openEventForm } from './event-form.js';

// Onglet choisi (gardé tant que l'app reste ouverte)
let currentTab = 'upcoming';

const AREA_ICONS = { registration: '🎟️', lodging: '🏨', transport: '🚆', competitions: '🏆' };

export function render(el) {
  const events = eventsInSeason();
  const upcoming = events.filter(isUpcoming).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = events.filter((e) => !isUpcoming(e)).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const list = currentTab === 'upcoming' ? upcoming : past;

  el.innerHTML = `
    ${pageHeader('Événements')}
    <div class="segmented" role="tablist">
      <button type="button" data-tab="upcoming" class="${currentTab === 'upcoming' ? 'on' : ''}">À venir (${upcoming.length})</button>
      <button type="button" data-tab="past" class="${currentTab === 'past' ? 'on' : ''}">Passés (${past.length})</button>
    </div>

    ${list.length
      ? `<div class="list mt">${list.map(eventRow).join('')}</div>`
      : `<div class="empty"><div class="big">📅</div>
           ${currentTab === 'upcoming' ? 'Aucun événement à venir' : 'Aucun événement passé'} pour cette saison.<br>
           Touche <strong>＋</strong> pour en ajouter un.</div>`}

    <button type="button" class="fab" data-add aria-label="Nouvel événement">＋</button>
  `;

  bindCommon(el);
  el.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      render(el);
    });
  });
  el.querySelector('[data-add]').addEventListener('click', () => openEventForm());
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
