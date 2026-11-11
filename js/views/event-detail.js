/*
 * Écran « Fiche événement » (#/evenements/<id>)
 * Les listes déroulantes, étoiles, cases et notes s'enregistrent immédiatement.
 */
import {
  state, getEvent, saveEvent, myShare, sortTasks, taskUrgency, URGENCY_COLOR, pendingTasks, ratingAverage,
} from '../store.js';
import {
  PARTICIPATION, PARTICIPATION_COLOR, AREAS, STATUS, STATUS_COLOR, RATING_CRITERIA, VERDICT,
} from '../labels.js';
import { esc, options, refresh, toast } from '../ui.js';
import {
  formatDateRange, formatDayMonth, formatEuro, daysUntil, formatRelativeDays,
} from '../format.js';
import { openEventForm, openTaskForm } from './event-form.js';
import { openExpenseForm, expenseRow, bindExpenseRows } from './expense-form.js';
import { openCompetitionForm, compRow } from './competition-form.js';

export function render(el, id) {
  const event = getEvent(id);
  if (!event) {
    el.innerHTML = `
      <div class="nav-bar"><a href="#/evenements">‹ Événements</a></div>
      <div class="empty"><div class="big">🤷</div>Cet événement n'existe plus.</div>`;
    return;
  }

  const s = state.settings;
  const place = [event.city, event.country].filter(Boolean).join(', ');
  const tasks = sortTasks(event.tasks);
  const pending = pendingTasks(event).length;
  const expenses = state.expenses
    .filter((x) => x.eventId === id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const comps = state.competitions.filter((c) => c.eventId === id);
  const rating = event.rating || {};
  const average = ratingAverage(event.rating);

  el.innerHTML = `
    <div class="nav-bar">
      <a href="#/evenements">‹ Événements</a>
      <button type="button" class="link-btn" data-edit>Modifier</button>
    </div>

    <header class="detail-header">
      <h1>${esc(event.name)}</h1>
      <div class="muted">${formatDateRange(event.startDate, event.endDate)}${place ? ` · ${esc(place)}` : ''}</div>
      <div class="tags">
        <span class="tag ${PARTICIPATION_COLOR[event.participation]}">${PARTICIPATION[event.participation]}</span>
        ${event.wsdcLevel ? `<span class="tag">${esc(event.wsdcLevel)}</span>` : ''}
        ${event.isSample ? '<span class="tag">Exemple</span>' : ''}
      </div>
    </header>

    <div class="section-title">Participation</div>
    <div class="list">
      <label class="row">
        <div class="row-main">Participation</div>
        <select data-field="participation">${options(PARTICIPATION, event.participation)}</select>
      </label>
      <label class="row">
        <div class="row-main">Pass</div>
        <select data-field="passType">${options(s.passTypes, event.passType, 'Aucun')}</select>
      </label>
      ${event.website ? `
        <a class="row" href="${esc(event.website)}" target="_blank" rel="noopener">
          <div class="row-main">Site web</div>
          <div class="row-value">${esc(hostname(event.website))}</div>
          <span class="row-chevron"></span>
        </a>` : ''}
    </div>

    <div class="section-title">Statuts</div>
    <div class="list">
      ${Object.entries(AREAS).map(([key, label]) => `
        <label class="row">
          <span class="dot bg-${STATUS_COLOR[event.statuses[key]]}"></span>
          <div class="row-main">${label}</div>
          <select data-status="${key}">${options(STATUS, event.statuses[key])}</select>
        </label>`).join('')}
    </div>

    <div class="section-title">Actions${pending ? ` · ${pending} en suspens` : ''}</div>
    <div class="list">
      ${tasks.map(taskRow).join('')}
      <button type="button" class="row action" data-add-task>＋ Ajouter une action</button>
    </div>

    <div class="section-title">Dépenses · ma part ${formatEuro(expenses.reduce((sum, x) => sum + myShare(x), 0))}</div>
    <div class="list">
      ${expenses.map((x) => expenseRow(x)).join('')}
      <button type="button" class="row action" data-add-expense>＋ Ajouter une dépense</button>
    </div>

    <div class="section-title">Compétitions${comps.length ? ` · ${comps.reduce((sum, c) => sum + (Number(c.points) || 0), 0)} pts` : ''}</div>
    <div class="list">
      ${comps.map((c) => compRow(c)).join('')}
      <button type="button" class="row action" data-add-comp>＋ Ajouter une compétition</button>
    </div>

    <div class="section-title">Évaluation</div>
    <div class="list">
      ${Object.entries(RATING_CRITERIA).map(([key, label]) => `
        <div class="row">
          <div class="row-main">${label}</div>
          <div class="stars" data-criterion="${key}">
            ${[1, 2, 3, 4, 5].map((n) => `
              <button type="button" data-value="${n}" class="${n <= (rating[key] || 0) ? 'on' : ''}" aria-label="${n} sur 5">★</button>`).join('')}
          </div>
        </div>`).join('')}
      <div class="row">
        <div class="row-main"><strong>Moyenne</strong></div>
        <div class="row-value"><strong>${average ? `${average.toFixed(1).replace('.', ',')} / 5` : '—'}</strong></div>
      </div>
      <div class="row">
        <div class="row-main">À refaire ?</div>
        <div class="segmented small">
          ${Object.entries(VERDICT).map(([key, label]) => `
            <button type="button" data-verdict="${key}" class="${rating.verdict === key ? 'on' : ''}">${label}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="section-footer">Touche à nouveau une étoile ou un verdict pour l'effacer.</div>

    <div class="section-title">Notes</div>
    <div class="list">
      <div class="row">
        <textarea class="input-plain" data-notes rows="4" placeholder="Hôtel, contacts, souvenirs…">${esc(event.notes)}</textarea>
      </div>
    </div>
  `;

  bind(el, id);
}

function taskRow(task) {
  const urgency = taskUrgency(task);
  let due = '';
  if (task.dueDate) {
    due = formatDayMonth(task.dueDate);
    if (!task.done) due += ` (${formatRelativeDays(daysUntil(task.dueDate))})`;
    if (urgency === 'overdue' || urgency === 'soon') due = `<span class="c-${URGENCY_COLOR[urgency]}">${due}</span>`;
    due = ` · ${due}`;
  }
  return `
    <div class="row task ${task.done ? 'done' : ''}">
      <button type="button" class="check ${task.done ? 'on' : ''}" data-toggle-task="${esc(task.id)}"
              aria-label="${task.done ? 'Marquer comme non fait' : 'Marquer comme fait'}"></button>
      <button type="button" class="row-main plain" data-edit-task="${esc(task.id)}">
        <div class="row-title">${esc(task.label)}</div>
        <div class="row-sub">${AREAS[task.area] || ''}${due}</div>
      </button>
    </div>`;
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function bind(el, id) {
  const current = () => getEvent(id);
  const update = async (patch, { rerender = true } = {}) => {
    await saveEvent({ ...current(), ...patch });
    if (rerender) refresh();
  };

  el.querySelector('[data-edit]').addEventListener('click', () => openEventForm(current()));

  el.querySelectorAll('[data-field]').forEach((select) => {
    select.addEventListener('change', () => update({ [select.dataset.field]: select.value }));
  });

  el.querySelectorAll('[data-status]').forEach((select) => {
    select.addEventListener('change', () => {
      update({ statuses: { ...current().statuses, [select.dataset.status]: select.value } });
    });
  });

  // Actions
  el.querySelector('[data-add-task]').addEventListener('click', () => openTaskForm(current()));
  el.querySelectorAll('[data-edit-task]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const event = current();
      openTaskForm(event, event.tasks.find((t) => t.id === btn.dataset.editTask));
    });
  });
  el.querySelectorAll('[data-toggle-task]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tasks = current().tasks.map((t) => (t.id === btn.dataset.toggleTask ? { ...t, done: !t.done } : t));
      await update({ tasks });
    });
  });

  // Dépenses
  el.querySelector('[data-add-expense]').addEventListener('click', () => openExpenseForm({ eventId: id }));
  bindExpenseRows(el);

  // Compétitions
  el.querySelector('[data-add-comp]').addEventListener('click', () => openCompetitionForm({ eventId: id }));

  // Évaluation : toucher l'étoile déjà choisie efface la note
  el.querySelectorAll('[data-criterion]').forEach((group) => {
    group.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rating = { ...(current().rating || {}) };
        const key = group.dataset.criterion;
        const value = Number(btn.dataset.value);
        rating[key] = rating[key] === value ? null : value;
        update({ rating });
      });
    });
  });
  el.querySelectorAll('[data-verdict]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const rating = { ...(current().rating || {}) };
      rating.verdict = rating.verdict === btn.dataset.verdict ? null : btn.dataset.verdict;
      update({ rating });
    });
  });

  // Notes : enregistrées pendant la frappe (sans redessiner l'écran)
  const notes = el.querySelector('[data-notes]');
  let timer = null;
  const saveNotes = (showToast) => {
    clearTimeout(timer);
    if (notes.value !== (current().notes || '')) {
      update({ notes: notes.value }, { rerender: false }).then(() => { if (showToast) toast('Notes enregistrées'); });
    }
  };
  notes.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => saveNotes(false), 1000); });
  notes.addEventListener('blur', () => saveNotes(true));
}
