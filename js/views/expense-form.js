/*
 * Dépenses :
 *  - openExpenseForm : créer / modifier / supprimer une dépense
 *  - expenseRow      : une ligne de dépense (utilisée dans la fiche événement et la liste)
 *  - bindExpenseRows : ouvre le formulaire quand on touche une ligne
 */
import { state, getEvent, saveExpense, deleteExpense, myShare, uid, isUpcoming } from '../store.js';
import { CATEGORIES, CATEGORY_ICONS } from '../labels.js';
import { esc, options, openSheet, refresh, toast } from '../ui.js';
import {
  todayISO, formatEuro, formatDayMonth, formatMonthYearShort, parseAmount, amountToInput,
} from '../format.js';

// Événement proposé par défaut : le prochain auquel je vais, sinon le plus récent.
function defaultEventId() {
  const active = state.events.filter((e) => e.participation !== 'no' && e.participation !== 'cancelled');
  const next = active.filter(isUpcoming).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  if (next) return next.id;
  const last = [...active].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  return last ? last.id : '';
}

// ---------------------------------------------------------------------------
// Formulaire
// ---------------------------------------------------------------------------
// openExpenseForm()                    → nouvelle dépense (événement proposé automatiquement)
// openExpenseForm({ eventId })         → nouvelle dépense pour cet événement
// openExpenseForm({ expense })         → modifier une dépense existante
export function openExpenseForm({ expense, eventId } = {}) {
  const x = expense || {
    eventId: eventId !== undefined ? eventId : defaultEventId(),
    category: 'pass',
    date: todayISO(),
    totalAmount: '',
    people: 1,
    kind: 'expense',
    comment: '',
  };

  const events = [...state.events].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const eventOptions = `<option value="" ${!x.eventId ? 'selected' : ''}>Hors événement</option>`
    + events.map((e) => `<option value="${esc(e.id)}" ${e.id === x.eventId ? 'selected' : ''}>
        ${esc(e.name)} (${formatMonthYearShort(e.startDate)})</option>`).join('');

  const body = `
    <div class="list">
      <label class="row"><div class="row-main">Événement</div><select name="eventId">${eventOptions}</select></label>
      <label class="row"><div class="row-main">Catégorie</div><select name="category">${options(CATEGORIES, x.category)}</select></label>
      <label class="row"><div class="row-main">Date</div><input type="date" name="date" value="${esc(x.date)}"></label>
    </div>

    <div class="segmented radio mt">
      <label><input type="radio" name="kind" value="expense" ${x.kind !== 'refund' ? 'checked' : ''}><span>Dépense</span></label>
      <label><input type="radio" name="kind" value="refund" ${x.kind === 'refund' ? 'checked' : ''}><span>Remboursement</span></label>
    </div>

    <div class="list mt">
      <label class="row">
        <div class="row-main">Montant total</div>
        <input type="text" class="amount" name="totalAmount" inputmode="decimal" placeholder="0,00"
               value="${esc(amountToInput(x.totalAmount))}" autocomplete="off">
        <span class="muted">€</span>
      </label>
      <div class="row">
        <div class="row-main">Nombre de personnes</div>
        <div class="stepper">
          <button type="button" data-step="-1" aria-label="Une personne de moins">−</button>
          <input type="number" name="people" inputmode="numeric" min="1" value="${Number(x.people) || 1}">
          <button type="button" data-step="1" aria-label="Une personne de plus">+</button>
        </div>
      </div>
      <div class="row">
        <div class="row-main"><strong>Ma part</strong></div>
        <div class="row-value" data-share>—</div>
      </div>
    </div>
    <div class="section-footer">Dépense partagée : saisis le montant total et le nombre de personnes, l'app calcule ta part.</div>

    <div class="list mt">
      <div class="row"><input class="input-plain" name="comment" placeholder="Commentaire (facultatif)" value="${esc(x.comment)}" autocomplete="off"></div>
    </div>`;

  const { form } = openSheet({
    title: expense ? 'Modifier la dépense' : 'Nouvelle dépense',
    saveLabel: expense ? 'Enregistrer' : 'Ajouter',
    body,
    onSave: async (f) => {
      const d = Object.fromEntries(new FormData(f));
      const amount = parseAmount(d.totalAmount);
      if (Number.isNaN(amount) || amount === 0) { alert('Indique un montant (ex. 45 ou 12,50).'); return false; }
      if (!d.date) { alert('Indique la date de la dépense.'); return false; }

      const saved = {
        id: expense ? expense.id : uid('exp'),
        eventId: d.eventId || null,
        category: d.category,
        date: d.date,
        totalAmount: Math.round(Math.abs(amount) * 100) / 100,
        people: Math.max(1, parseInt(d.people, 10) || 1),
        // Un montant négatif est compté comme un remboursement
        kind: amount < 0 ? 'refund' : d.kind,
        comment: d.comment.trim(),
        isSample: expense ? !!expense.isSample : false,
      };
      await saveExpense(saved);
      toast(expense ? 'Dépense enregistrée' : 'Dépense ajoutée');
      refresh();
    },
    onDelete: expense ? async () => {
      if (!confirm(`Supprimer cette dépense de ${formatEuro(myShare(expense))} ?`)) return false;
      await deleteExpense(expense.id);
      toast('Dépense supprimée');
      refresh();
    } : null,
    deleteLabel: 'Supprimer la dépense',
  });

  // Calcul de ma part en direct pendant la saisie
  const shareEl = form.querySelector('[data-share]');
  const updateShare = () => {
    const amount = parseAmount(form.totalAmount.value);
    const people = Math.max(1, parseInt(form.people.value, 10) || 1);
    if (Number.isNaN(amount)) { shareEl.textContent = '—'; return; }
    const kind = amount < 0 || form.kind.value === 'refund' ? 'refund' : 'expense';
    const share = myShare({ totalAmount: Math.abs(amount), people, kind });
    shareEl.textContent = formatEuro(share)
      + (people > 1 ? ` (total ${formatEuro(Math.abs(amount))} ÷ ${people})` : '');
    shareEl.classList.toggle('c-green', share < 0);
  };
  form.querySelectorAll('[data-step]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const people = (parseInt(form.people.value, 10) || 1) + Number(btn.dataset.step);
      form.people.value = Math.max(1, people);
      updateShare();
    });
  });
  form.addEventListener('input', updateShare);
  form.addEventListener('change', updateShare);
  updateShare();
}

// ---------------------------------------------------------------------------
// Ligne de dépense
// ---------------------------------------------------------------------------
export function expenseRow(x, { showEvent = false } = {}) {
  const share = myShare(x);
  const event = x.eventId ? getEvent(x.eventId) : null;
  const details = [
    showEvent ? (event ? event.name : 'Hors événement') : null,
    x.comment,
    formatDayMonth(x.date),
  ].filter(Boolean).map(esc).join(' · ');

  return `
    <button type="button" class="row" data-edit-expense="${esc(x.id)}">
      <span class="cat-icon">${CATEGORY_ICONS[x.category] || '💶'}</span>
      <div class="row-main">
        <div class="row-title">${CATEGORIES[x.category] || x.category}${x.kind === 'refund' ? ' · remboursement' : ''}</div>
        <div class="row-sub">${details}</div>
      </div>
      <div class="amount-col">
        <div class="${share < 0 ? 'c-green' : ''}">${formatEuro(share)}</div>
        ${x.people > 1 ? `<div class="row-sub">total ${formatEuro(x.totalAmount)} ÷ ${x.people}</div>` : ''}
      </div>
    </button>`;
}

export function bindExpenseRows(el) {
  el.querySelectorAll('[data-edit-expense]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const expense = state.expenses.find((x) => x.id === btn.dataset.editExpense);
      if (expense) openExpenseForm({ expense });
    });
  });
}
