/*
 * Formulaires (fiches qui glissent depuis le bas) :
 *  - openEventForm : créer / modifier / supprimer un événement
 *  - openTaskForm  : créer / modifier / supprimer une action en suspens
 */
import { state, saveEvent, deleteEvent, saveSettings, uid, eventYear } from '../store.js';
import { PARTICIPATION, AREAS } from '../labels.js';
import { esc, options, openSheet, refresh, toast } from '../ui.js';
import { todayISO, normalizeUrl } from '../format.js';

// ---------------------------------------------------------------------------
// Événement
// ---------------------------------------------------------------------------
export function openEventForm(existing) {
  const s = state.settings;
  const e = existing || {
    name: '', city: '', country: 'France', startDate: todayISO(), endDate: '',
    website: '', wsdcLevel: '', participation: 'considered', passType: '',
  };

  const body = `
    <div class="list">
      <div class="row"><input class="input-plain" name="name" placeholder="Nom de l'événement" value="${esc(e.name)}" autocomplete="off"></div>
      <div class="row"><input class="input-plain" name="city" placeholder="Ville" value="${esc(e.city)}" autocomplete="off"></div>
      <div class="row"><input class="input-plain" name="country" placeholder="Pays" value="${esc(e.country)}" autocomplete="off"></div>
    </div>

    <div class="list mt">
      <label class="row"><div class="row-main">Début</div><input type="date" name="startDate" value="${esc(e.startDate)}"></label>
      <label class="row"><div class="row-main">Fin</div><input type="date" name="endDate" value="${esc(e.endDate)}"></label>
    </div>

    <div class="list mt">
      <div class="row"><input class="input-plain" type="url" name="website" inputmode="url" autocapitalize="off"
        placeholder="Site web (facultatif)" value="${esc(e.website)}"></div>
      <label class="row"><div class="row-main">Niveau WSDC</div>
        <select name="wsdcLevel">${options(s.wsdcLevels, e.wsdcLevel, 'Inconnu')}</select></label>
    </div>

    <div class="list mt">
      <label class="row"><div class="row-main">Participation</div>
        <select name="participation">${options(PARTICIPATION, e.participation)}</select></label>
      <label class="row"><div class="row-main">Pass</div>
        <select name="passType">${options(s.passTypes, e.passType, 'Aucun')}</select></label>
    </div>`;

  openSheet({
    title: existing ? "Modifier l'événement" : 'Nouvel événement',
    saveLabel: existing ? 'Enregistrer' : 'Ajouter',
    body,
    onSave: async (form) => {
      const d = Object.fromEntries(new FormData(form));
      const name = d.name.trim();
      if (!name) { alert("Donne un nom à l'événement."); return false; }
      if (!d.startDate) { alert('Indique la date de début.'); return false; }
      if (d.endDate && d.endDate < d.startDate) { alert('La date de fin est avant la date de début.'); return false; }

      const event = {
        // Valeurs par défaut d'un nouvel événement
        id: uid('evt'),
        statuses: { registration: 'todo', lodging: 'todo', transport: 'todo', competitions: 'todo' },
        tasks: [],
        rating: null,
        notes: '',
        isSample: false,
        // On garde le reste de l'existant (statuts, actions…) en cas de modification
        ...(existing || {}),
        name,
        city: d.city.trim(),
        country: d.country.trim(),
        startDate: d.startDate,
        endDate: d.endDate || d.startDate,
        website: normalizeUrl(d.website),
        wsdcLevel: d.wsdcLevel,
        participation: d.participation,
        passType: d.passType,
      };
      await saveEvent(event);

      // Si l'événement est dans une autre saison que celle affichée, on bascule dessus.
      const season = state.settings.season;
      if (season !== 'all' && season !== eventYear(event)) await saveSettings({ season: eventYear(event) });

      if (existing) {
        toast('Événement enregistré');
        refresh();
      } else {
        toast('Événement ajouté');
        location.hash = `#/evenements/${event.id}`;
      }
    },
    onDelete: existing ? async () => {
      const nExp = state.expenses.filter((x) => x.eventId === existing.id).length;
      const nComp = state.competitions.filter((c) => c.eventId === existing.id).length;
      const extra = nExp || nComp ? `\n\nSes ${nExp} dépense(s) et ${nComp} compétition(s) seront aussi supprimées.` : '';
      if (!confirm(`Supprimer « ${existing.name} » ?${extra}\n\nCette action est définitive.`)) return false;
      await deleteEvent(existing.id);
      toast('Événement supprimé');
      location.hash = '#/evenements';
    } : null,
    deleteLabel: "Supprimer l'événement",
  });
}

// ---------------------------------------------------------------------------
// Action en suspens
// ---------------------------------------------------------------------------
export function openTaskForm(event, existing) {
  const t = existing || { label: '', area: 'registration', dueDate: '', done: false };

  const body = `
    <div class="list">
      <div class="row"><input class="input-plain" name="label" placeholder="Ex. Réserver le train" value="${esc(t.label)}" autocomplete="off"></div>
    </div>
    <div class="list mt">
      <label class="row"><div class="row-main">Volet</div><select name="area">${options(AREAS, t.area)}</select></label>
      <label class="row"><div class="row-main">Date limite</div><input type="date" name="dueDate" value="${esc(t.dueDate)}"></label>
      <label class="row"><div class="row-main">Fait</div><input type="checkbox" class="switch" name="done" ${t.done ? 'checked' : ''}></label>
    </div>`;

  // Enregistre l'événement avec sa liste d'actions modifiée
  const saveTasks = async (tasks) => {
    const current = state.events.find((x) => x.id === event.id);
    await saveEvent({ ...current, tasks });
    refresh();
  };

  openSheet({
    title: existing ? "Modifier l'action" : 'Nouvelle action',
    saveLabel: existing ? 'Enregistrer' : 'Ajouter',
    body,
    onSave: async (form) => {
      const d = Object.fromEntries(new FormData(form));
      const label = d.label.trim();
      if (!label) { alert("Donne un intitulé à l'action."); return false; }
      const task = { id: existing ? existing.id : uid('task'), label, area: d.area, dueDate: d.dueDate, done: d.done === 'on' };
      const tasks = existing
        ? event.tasks.map((x) => (x.id === existing.id ? task : x))
        : [...(event.tasks || []), task];
      await saveTasks(tasks);
      toast(existing ? 'Action enregistrée' : 'Action ajoutée');
    },
    onDelete: existing ? async () => {
      if (!confirm(`Supprimer l'action « ${existing.label} » ?`)) return false;
      await saveTasks(event.tasks.filter((x) => x.id !== existing.id));
      toast('Action supprimée');
    } : null,
    deleteLabel: "Supprimer l'action",
  });
}
