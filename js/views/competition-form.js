/*
 * Compétitions :
 *  - openCompetitionForm : créer / modifier / supprimer une compétition
 *  - openRoundForm       : saisir les notes des juges d'un tour
 *  - compRow             : une ligne de compétition (liste, fiche événement)
 */
import {
  state, getEvent, saveCompetition, deleteCompetition, saveSettings, uid, eventYear,
  knownPartners, knownJudges,
} from '../store.js';
import { COMP_TYPES, COMP_ICONS, ROLES, ROUNDS, MARKS_SHORT } from '../labels.js';
import { esc, options, openSheet, refresh, toast, datalist } from '../ui.js';
import { formatMonthYearShort, ordinal, normalizeUrl, todayISO } from '../format.js';

const ROUND_KEYS = Object.keys(ROUNDS); // prelims, quarters, semis, final

// Événement proposé par défaut : le plus récent déjà commencé (sinon le plus récent tout court).
function defaultEventId() {
  const sorted = [...state.events].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const started = sorted.find((e) => e.startDate <= todayISO() && e.participation === 'confirmed');
  return (started || sorted[0] || {}).id || '';
}

// Rôle proposé par défaut : celui de ma dernière compétition.
function defaultRole() {
  const last = [...state.competitions].sort((a, b) => {
    const da = (getEvent(a.eventId) || {}).startDate || '';
    const db = (getEvent(b.eventId) || {}).startDate || '';
    return db.localeCompare(da);
  })[0];
  return last ? last.role : 'leader';
}

// Radio boutons affichés comme un contrôle segmenté
function radios(name, values, selected) {
  return `<div class="segmented radio">${Object.entries(values).map(([k, label]) => `
    <label><input type="radio" name="${name}" value="${k}" ${k === selected ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('')}
  </div>`;
}

// ---------------------------------------------------------------------------
// Compétition
// ---------------------------------------------------------------------------
// openCompetitionForm()              → nouvelle compétition
// openCompetitionForm({ eventId })   → nouvelle compétition dans cet événement
// openCompetitionForm({ comp })      → modifier
export function openCompetitionForm({ comp, eventId } = {}) {
  if (!state.events.length) {
    alert("Crée d'abord l'événement dans l'onglet Événements.");
    return;
  }
  const s = state.settings;
  const c = comp || {
    eventId: eventId || defaultEventId(),
    type: 'jj',
    division: s.myDivision,
    role: defaultRole(),
    partner: '',
    roundReached: 'prelims',
    placement: null,
    points: 0,
    videoUrl: '',
  };

  const events = [...state.events].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const eventOptions = events.map((e) => `<option value="${esc(e.id)}" ${e.id === c.eventId ? 'selected' : ''}>
    ${esc(e.name)} (${formatMonthYearShort(e.startDate)})</option>`).join('');

  const body = `
    ${datalist('partners-list', knownPartners())}
    <div class="list">
      <label class="row"><div class="row-main">Événement</div><select name="eventId">${eventOptions}</select></label>
    </div>

    <div class="mt">${radios('type', COMP_TYPES, c.type)}</div>

    <div class="list mt">
      <label class="row"><div class="row-main">Division</div><select name="division">${options(s.divisions, c.division)}</select></label>
      <div class="row"><div class="row-main">Rôle</div>${radios('role', ROLES, c.role)}</div>
      <div class="row"><input class="input-plain" name="partner" list="partners-list" autocomplete="off"
        autocapitalize="words" placeholder="Partenaire (facultatif)" value="${esc(c.partner)}"></div>
    </div>

    <div class="list mt">
      <label class="row"><div class="row-main">Tour atteint</div><select name="roundReached">${options(ROUNDS, c.roundReached)}</select></label>
      <label class="row"><div class="row-main">Placement final</div>
        <input type="number" name="placement" inputmode="numeric" min="1" placeholder="—" value="${c.placement ?? ''}"></label>
      <label class="row"><div class="row-main">Points WSDC gagnés</div>
        <input type="number" name="points" inputmode="numeric" min="0" placeholder="0" value="${c.points || ''}"></label>
    </div>

    <div class="list mt">
      <div class="row"><input class="input-plain" type="url" name="videoUrl" inputmode="url" autocapitalize="off"
        placeholder="Lien vidéo (facultatif)" value="${esc(c.videoUrl)}"></div>
    </div>
    <div class="section-footer">Les notes des juges et ton ressenti se saisissent ensuite dans la fiche de la compétition.</div>`;

  openSheet({
    title: comp ? 'Modifier la compétition' : 'Nouvelle compétition',
    saveLabel: comp ? 'Enregistrer' : 'Ajouter',
    body,
    onSave: async (form) => {
      const d = Object.fromEntries(new FormData(form));
      const placement = parseInt(d.placement, 10);
      const points = parseInt(d.points, 10);
      // Le partenaire reprend l'orthographe déjà connue (« léa » → « Léa »)
      const partnerTyped = d.partner.trim();
      const partner = knownPartners().find((p) => p.toLowerCase() === partnerTyped.toLowerCase()) || partnerTyped;

      const saved = {
        id: uid('cmp'),
        tier: null,
        rounds: { prelims: [], quarters: [], semis: [], final: [] },
        feeling: '',
        isSample: false,
        ...(comp || {}),
        eventId: d.eventId,
        type: d.type,
        division: d.division,
        role: d.role,
        partner,
        roundReached: d.roundReached,
        placement: Number.isNaN(placement) ? null : placement,
        points: Number.isNaN(points) ? 0 : Math.max(0, points),
        videoUrl: normalizeUrl(d.videoUrl),
      };
      await saveCompetition(saved);

      // Bascule sur la saison de l'événement si besoin
      const event = getEvent(saved.eventId);
      const season = state.settings.season;
      if (event && season !== 'all' && season !== eventYear(event)) await saveSettings({ season: eventYear(event) });

      if (comp) {
        toast('Compétition enregistrée');
        refresh();
      } else {
        toast('Compétition ajoutée');
        location.hash = `#/competitions/${saved.id}`;
      }
    },
    onDelete: comp ? async () => {
      if (!confirm('Supprimer cette compétition et ses notes de juges ?')) return false;
      await deleteCompetition(comp.id);
      toast('Compétition supprimée');
      location.hash = '#/competitions';
    } : null,
    deleteLabel: 'Supprimer la compétition',
  });
}

// ---------------------------------------------------------------------------
// Notes des juges d'un tour
// ---------------------------------------------------------------------------
export function openRoundForm(comp, round) {
  const isFinal = round === 'final';
  const existing = (comp.rounds && comp.rounds[round]) || [];
  // Tour précédent qui a des juges (pour proposer de reprendre les mêmes noms)
  const previous = ROUND_KEYS.slice(0, ROUND_KEYS.indexOf(round)).reverse()
    .find((r) => (comp.rounds[r] || []).length);

  const rows = existing.length ? existing : Array.from({ length: 5 }, () => ({ judge: '' }));

  const body = `
    ${datalist('judges-list', knownJudges())}
    <div data-rows>${rows.map((r) => judgeRow(r, isFinal)).join('')}</div>
    <div class="list mt">
      <button type="button" class="row action" data-add-judge>＋ Ajouter un juge</button>
      ${previous ? `<button type="button" class="row action" data-copy>Reprendre les juges des ${ROUNDS[previous]}</button>` : ''}
    </div>
    <div class="section-footer">
      ${isFinal ? 'Indique la place donnée par chaque juge.' : 'Touche Y (Yes), A1/A2/A3 (Alternate) ou N (No) pour chaque juge.'}
      Une ligne sans nom ou sans note est ignorée.
    </div>`;

  const { form } = openSheet({
    title: `Notes · ${ROUNDS[round]}`,
    saveLabel: 'Enregistrer',
    body,
    onSave: async (f) => {
      const judges = knownJudges();
      const results = [...f.querySelectorAll('[data-row]')].map((row) => {
        const typed = row.querySelector('[data-judge]').value.trim();
        const judge = judges.find((j) => j.toLowerCase() === typed.toLowerCase()) || typed;
        if (isFinal) {
          const place = parseInt(row.querySelector('[data-place]').value, 10);
          return judge && place ? { judge, place } : null;
        }
        return judge && row.dataset.mark ? { judge, mark: row.dataset.mark } : null;
      }).filter(Boolean);

      const current = state.competitions.find((x) => x.id === comp.id);
      await saveCompetition({ ...current, rounds: { ...current.rounds, [round]: results } });
      toast('Notes enregistrées');
      refresh();
    },
  });

  const rowsEl = form.querySelector('[data-rows]');
  const bindRow = (row) => {
    row.querySelectorAll('[data-mark]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const same = row.dataset.mark === btn.dataset.mark;
        row.dataset.mark = same ? '' : btn.dataset.mark;
        row.querySelectorAll('[data-mark]').forEach((b) => b.classList.toggle('on', !same && b === btn));
      });
    });
    row.querySelector('[data-remove]').addEventListener('click', () => row.remove());
  };
  rowsEl.querySelectorAll('[data-row]').forEach(bindRow);

  const addRow = (data) => {
    rowsEl.insertAdjacentHTML('beforeend', judgeRow(data, isFinal));
    const row = rowsEl.lastElementChild;
    bindRow(row);
    return row;
  };
  form.querySelector('[data-add-judge]').addEventListener('click', () => {
    addRow({ judge: '' }).querySelector('[data-judge]').focus();
  });
  const copyBtn = form.querySelector('[data-copy]');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      // Remplace les lignes vides par les juges du tour précédent
      rowsEl.querySelectorAll('[data-row]').forEach((row) => {
        if (!row.querySelector('[data-judge]').value.trim()) row.remove();
      });
      const present = [...rowsEl.querySelectorAll('[data-judge]')].map((i) => i.value.trim().toLowerCase());
      comp.rounds[previous].forEach((r) => {
        if (!present.includes(r.judge.toLowerCase())) addRow({ judge: r.judge });
      });
    });
  }
}

function judgeRow(r, isFinal) {
  const second = isFinal
    ? `<label class="row"><div class="row-main">Place donnée</div>
         <select data-place>${['', ...Array.from({ length: 15 }, (_, i) => i + 1)]
           .map((n) => `<option value="${n}" ${Number(r.place) === n ? 'selected' : ''}>${n ? ordinal(n) : '—'}</option>`).join('')}
         </select></label>`
    : `<div class="row"><div class="marks">${Object.entries(MARKS_SHORT).map(([k, label]) => `
         <button type="button" data-mark="${k}" class="m-${k} ${r.mark === k ? 'on' : ''}">${label}</button>`).join('')}
       </div></div>`;
  return `
    <div class="list judge-row" data-row data-mark="${esc(r.mark || '')}">
      <div class="row">
        <input class="input-plain" data-judge list="judges-list" autocomplete="off" autocapitalize="words"
               placeholder="Nom du juge" value="${esc(r.judge)}">
        <button type="button" class="remove-x" data-remove aria-label="Retirer ce juge">×</button>
      </div>
      ${second}
    </div>`;
}

// ---------------------------------------------------------------------------
// Ligne de compétition
// ---------------------------------------------------------------------------
export function compRow(c, { showEvent = false } = {}) {
  const event = getEvent(c.eventId);
  const details = [
    showEvent && event ? event.name : null,
    ROLES[c.role],
    c.partner ? `avec ${c.partner}` : null,
    ROUNDS[c.roundReached],
  ].filter(Boolean).map(esc).join(' · ');

  return `
    <a class="row" href="#/competitions/${esc(c.id)}">
      <span class="cat-icon">${COMP_ICONS[c.type]}</span>
      <div class="row-main">
        <div class="row-title">${COMP_TYPES[c.type]} ${esc(c.division)}</div>
        <div class="row-sub">${details}</div>
      </div>
      <div class="amount-col">
        ${c.placement ? `<div class="place-big">${ordinal(c.placement)}</div>` : ''}
        ${c.points ? `<div class="row-sub c-green">+${c.points} pts</div>` : ''}
      </div>
      <span class="row-chevron"></span>
    </a>`;
}
