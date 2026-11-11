/*
 * Écran « Compétitions » : toutes les compétitions de la saison, regroupées par événement.
 */
import { state, competitionsInSeason, getEvent } from '../store.js';
import { esc, pageHeader, bindCommon } from '../ui.js';
import { formatDateRange } from '../format.js';
import { openCompetitionForm, compRow } from './competition-form.js';

// Filtres choisis (gardés tant que l'app reste ouverte)
let typeFilter = 'all';
let divisionFilter = 'all';

export function render(el) {
  const all = competitionsInSeason();
  const divisions = state.settings.divisions.filter((d) => all.some((c) => c.division === d));
  if (divisionFilter !== 'all' && !divisions.includes(divisionFilter)) divisionFilter = 'all';

  const comps = all.filter((c) => (typeFilter === 'all' || c.type === typeFilter)
    && (divisionFilter === 'all' || c.division === divisionFilter));

  const finals = comps.filter((c) => c.roundReached === 'final').length;
  const jjPoints = comps.filter((c) => c.type === 'jj').reduce((sum, c) => sum + (Number(c.points) || 0), 0);

  // Regroupement par événement, du plus récent au plus ancien
  const groups = new Map();
  comps
    .map((c) => ({ c, event: getEvent(c.eventId) }))
    .sort((a, b) => (b.event?.startDate || '').localeCompare(a.event?.startDate || ''))
    .forEach(({ c, event }) => {
      const key = c.eventId;
      if (!groups.has(key)) groups.set(key, { event, items: [] });
      groups.get(key).items.push(c);
    });

  el.innerHTML = `
    ${pageHeader('Compétitions')}

    <div class="segmented">
      ${[['all', 'Toutes'], ['jj', 'Jack & Jill'], ['strictly', 'Strictly']].map(([k, label]) => `
        <button type="button" data-type="${k}" class="${typeFilter === k ? 'on' : ''}">${label}</button>`).join('')}
    </div>
    ${divisions.length > 1 ? `
      <div class="list mt">
        <label class="row"><div class="row-main">Division</div>
          <select data-division>
            <option value="all">Toutes</option>
            ${divisions.map((d) => `<option ${d === divisionFilter ? 'selected' : ''}>${esc(d)}</option>`).join('')}
          </select>
        </label>
      </div>` : ''}

    <div class="card mt stats">
      <div><div class="stat-value">${comps.length}</div><div class="stat-label">Compétitions</div></div>
      <div><div class="stat-value">${finals}</div><div class="stat-label">Finales</div></div>
      <div><div class="stat-value">${jjPoints}</div><div class="stat-label">Points J&amp;J</div></div>
    </div>

    ${groups.size ? [...groups.values()].map(({ event, items }) => `
      <div class="section-title">${event ? `${esc(event.name)} · ${formatDateRange(event.startDate, event.endDate)}` : 'Événement supprimé'}</div>
      <div class="list">${items.map((c) => compRow(c)).join('')}</div>`).join('')
    : `<div class="empty"><div class="big">🏆</div>Aucune compétition pour cette sélection.<br>
         Touche <strong>＋</strong> pour en ajouter une.</div>`}

    <button type="button" class="fab" data-add aria-label="Nouvelle compétition">＋</button>
  `;

  bindCommon(el);
  el.querySelectorAll('[data-type]').forEach((btn) => {
    btn.addEventListener('click', () => { typeFilter = btn.dataset.type; render(el); });
  });
  const divSelect = el.querySelector('[data-division]');
  if (divSelect) divSelect.addEventListener('change', () => { divisionFilter = divSelect.value; render(el); });
  el.querySelector('[data-add]').addEventListener('click', () => openCompetitionForm());
}
