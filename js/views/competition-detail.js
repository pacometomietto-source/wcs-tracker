/*
 * Écran « Fiche compétition » (#/competitions/<id>)
 */
import { state, getEvent, saveCompetition } from '../store.js';
import { COMP_TYPES, COMP_ICONS, ROLES, ROUNDS, MARKS } from '../labels.js';
import { esc, goBack, toast } from '../ui.js';
import { formatDateRange, ordinal } from '../format.js';
import { openCompetitionForm, openRoundForm } from './competition-form.js';

const ROUND_KEYS = Object.keys(ROUNDS);

export function render(el, id) {
  const comp = state.competitions.find((c) => c.id === id);
  if (!comp) {
    el.innerHTML = `
      <div class="nav-bar"><a href="#/competitions">‹ Compétitions</a></div>
      <div class="empty"><div class="big">🤷</div>Cette compétition n'existe plus.</div>`;
    return;
  }
  const event = getEvent(comp.eventId);
  // On affiche les tours jusqu'au tour atteint
  const rounds = ROUND_KEYS.slice(0, ROUND_KEYS.indexOf(comp.roundReached) + 1);

  el.innerHTML = `
    <div class="nav-bar">
      <button type="button" class="link-btn" data-back>‹ Retour</button>
      <button type="button" class="link-btn" data-edit>Modifier</button>
    </div>

    <header class="detail-header">
      <h1>${COMP_ICONS[comp.type]} ${COMP_TYPES[comp.type]} ${esc(comp.division)}</h1>
      <div class="muted">${event ? `${esc(event.name)} · ${formatDateRange(event.startDate, event.endDate)}` : 'Événement supprimé'}</div>
      <div class="tags">
        <span class="tag">${ROLES[comp.role]}</span>
        ${comp.placement ? `<span class="tag green">${ordinal(comp.placement)}</span>` : ''}
        ${comp.points ? `<span class="tag green">+${comp.points} pts WSDC</span>` : ''}
        ${comp.isSample ? '<span class="tag">Exemple</span>' : ''}
      </div>
    </header>

    <div class="section-title">Résultat</div>
    <div class="list">
      ${event ? `<a class="row" href="#/evenements/${esc(event.id)}">
        <div class="row-main">Événement</div><div class="row-value">${esc(event.name)}</div><span class="row-chevron"></span></a>` : ''}
      ${infoRow('Partenaire', comp.partner || '—')}
      ${infoRow('Tour atteint', ROUNDS[comp.roundReached])}
      ${infoRow('Placement final', comp.placement ? ordinal(comp.placement) : '—')}
      ${infoRow('Points WSDC', comp.points || 0)}
      ${comp.videoUrl ? `<a class="row" href="${esc(comp.videoUrl)}" target="_blank" rel="noopener">
        <div class="row-main">▶️ Voir la vidéo</div><span class="row-chevron"></span></a>` : ''}
    </div>

    ${rounds.map((round) => roundSection(comp, round)).join('')}

    <div class="section-title">Ressenti sur ma danse</div>
    <div class="list">
      <div class="row">
        <textarea class="input-plain" data-feeling rows="4"
          placeholder="Connexion, musicalité, ce qui a marché, ce qu'il faut travailler…">${esc(comp.feeling)}</textarea>
      </div>
    </div>
  `;

  el.querySelector('[data-back]').addEventListener('click', () => goBack('#/competitions'));
  el.querySelector('[data-edit]').addEventListener('click', () => {
    openCompetitionForm({ comp: state.competitions.find((c) => c.id === id) });
  });
  el.querySelectorAll('[data-edit-round]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openRoundForm(state.competitions.find((c) => c.id === id), btn.dataset.editRound);
    });
  });

  // Ressenti : enregistré pendant la frappe
  const textarea = el.querySelector('[data-feeling]');
  let timer = null;
  const save = (showToast) => {
    clearTimeout(timer);
    const current = state.competitions.find((c) => c.id === id);
    if (textarea.value === (current.feeling || '')) return;
    saveCompetition({ ...current, feeling: textarea.value }).then(() => { if (showToast) toast('Ressenti enregistré'); });
  };
  textarea.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => save(false), 1000); });
  textarea.addEventListener('blur', () => save(true));
}

function infoRow(label, value) {
  return `<div class="row"><div class="row-main">${label}</div><div class="row-value">${esc(value)}</div></div>`;
}

// Bloc « notes des juges » d'un tour
function roundSection(comp, round) {
  const results = (comp.rounds && comp.rounds[round]) || [];
  const isFinal = round === 'final';

  let summary = '';
  if (results.length && !isFinal) {
    summary = Object.keys(MARKS)
      .map((k) => [k, results.filter((r) => r.mark === k).length])
      .filter(([, n]) => n)
      .map(([k, n]) => `${n} ${MARKS[k]}`)
      .join(' · ');
  } else if (results.length) {
    summary = `${results.length} juge(s)`;
  }

  const rows = results.map((r) => `
    <div class="row">
      <div class="row-main">${esc(r.judge)}</div>
      ${isFinal
        ? `<span class="mark-chip m-place">${ordinal(r.place)}</span>`
        : `<span class="mark-chip m-${r.mark}">${MARKS[r.mark]}</span>`}
    </div>`).join('');

  return `
    <div class="section-title">${ROUNDS[round]}${summary ? ` · ${summary}` : ''}</div>
    <div class="list">
      ${rows}
      <button type="button" class="row action" data-edit-round="${round}">
        ${results.length ? 'Modifier les notes' : '＋ Saisir les notes des juges'}
      </button>
    </div>`;
}
