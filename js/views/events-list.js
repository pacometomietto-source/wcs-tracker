/*
 * Écran « Événements » — version étape 0 : simple liste en lecture.
 * La version complète (à venir / passés, fiches, statuts) arrive à l'étape 1.
 */
import { eventsInSeason } from '../store.js';
import { esc, pageHeader, bindCommon } from '../ui.js';
import { formatDateRange } from '../format.js';

export function render(el) {
  const events = eventsInSeason().sort((a, b) => a.startDate.localeCompare(b.startDate));

  el.innerHTML = `
    ${pageHeader('Événements')}
    <div class="list" style="margin-top:12px">
      ${events.map((e) => `
        <div class="row">
          <div class="row-main">
            <div class="row-title">${esc(e.name)} ${e.isSample ? '<span class="tag">Exemple</span>' : ''}</div>
            <div class="row-sub">${formatDateRange(e.startDate, e.endDate)} · ${esc(e.city)}</div>
          </div>
        </div>`).join('') || '<div class="empty"><div class="big">📅</div>Aucun événement pour cette saison.</div>'}
    </div>
    <div class="section-footer">Les fiches détaillées arrivent à l'étape 1.</div>
  `;
  bindCommon(el);
}
