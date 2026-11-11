/*
 * Écran « Réglages »
 */
import {
  state, saveSettings, backupStatus, buildBackup, checkBackup, importBackup, setSampleData, APP_VERSION,
} from '../store.js';
import { esc, pageHeader, refresh, toast, bindCommon, isInstalled } from '../ui.js';
import { formatTimestamp, todayISO } from '../format.js';

export function render(el) {
  const s = state.settings;
  const backup = backupStatus();

  const backupText = backup.lastAt
    ? `${formatTimestamp(backup.lastAt)} (${backup.days === 0 ? "aujourd'hui" : `il y a ${backup.days} j`})`
    : 'Jamais';

  el.innerHTML = `
    ${pageHeader('Réglages', { season: false })}

    <div class="section-title">Sauvegarde</div>
    <div class="list">
      <div class="row">
        <div class="row-main">Dernière sauvegarde</div>
        <div class="row-value ${backup.overdue ? 'c-red' : ''}">${backup.overdue ? '⚠️ ' : ''}${backupText}</div>
      </div>
      <button class="row action" data-action="export">Exporter mes données</button>
      <button class="row action" data-action="import">Importer une sauvegarde…</button>
    </div>
    <input type="file" accept=".json,application/json" class="hidden" data-import-input>
    <div class="section-footer">
      L'export crée un fichier <strong>.json</strong> : sur iPhone, choisis « Enregistrer dans Fichiers »
      (dans iCloud Drive de préférence). Un rappel apparaît si ta dernière sauvegarde date de plus de 30 jours.
      L'import <strong>remplace</strong> toutes les données actuelles.
    </div>

    <div class="section-title">Ma division</div>
    <div class="list">
      <label class="row">
        <div class="row-main">Division actuelle (J&amp;J)</div>
        <select data-setting="myDivision">
          ${s.divisions.map((d) => `<option ${d === s.myDivision ? 'selected' : ''}>${esc(d)}</option>`).join('')}
        </select>
      </label>
    </div>

    <div class="section-title">Points WSDC de départ</div>
    <div class="list">
      ${s.divisions.map((d) => `
        <label class="row">
          <div class="row-main">${esc(d)}</div>
          <input type="number" inputmode="numeric" min="0" placeholder="0"
                 data-start-points="${esc(d)}" value="${s.startingPoints[d] ?? ''}">
        </label>`).join('')}
    </div>
    <div class="section-footer">
      Points Jack &amp; Jill obtenus <strong>avant</strong> d'utiliser l'app (voir ton profil sur le site du WSDC).
      Ils s'ajoutent aux points saisis dans tes compétitions.
    </div>

    <div class="section-title">Seuils de passage de division</div>
    ${s.thresholds.map((t, i) => `
      <div class="list" style="margin-top:${i ? 10 : 0}px">
        <div class="row"><div class="row-main"><strong>${esc(t.from)} → ${esc(t.to)}</strong></div></div>
        <label class="row">
          <div class="row-main">Je peux monter à</div>
          <input type="number" inputmode="numeric" min="0" data-threshold="${i}" data-field="allowed" value="${t.allowed}">
          <span class="muted">pts</span>
        </label>
        <label class="row">
          <div class="row-main">Je dois monter à</div>
          <input type="number" inputmode="numeric" min="0" data-threshold="${i}" data-field="required" value="${t.required}">
          <span class="muted">pts</span>
        </label>
      </div>`).join('')}
    <div class="section-footer">
      Points Jack &amp; Jill gagnés dans la division de départ. Les règles du WSDC évoluent :
      vérifie ces valeurs de temps en temps sur le site officiel.
    </div>

    ${listEditor('passTypes', 'Types de pass', 'Ex. Weekend pass')}
    ${listEditor('wsdcLevels', "Niveaux WSDC d'événement", 'Ex. Invitational')}
    ${listEditor('divisions', 'Divisions', 'Ex. Masters')}

    <div class="section-title">Données d'exemple</div>
    <div class="list">
      <label class="row">
        <div class="row-main">Afficher les exemples</div>
        <input type="checkbox" class="switch" data-sample ${s.sampleDataEnabled ? 'checked' : ''}>
      </label>
    </div>
    <div class="section-footer">
      Quelques faux événements, dépenses et compétitions pour voir le rendu de l'app.
      Les désactiver les supprime sans toucher à tes vraies données.
    </div>

    <div class="section-title">À propos</div>
    <div class="list">
      <div class="row"><div class="row-main">Version</div><div class="row-value">${APP_VERSION}</div></div>
      <div class="row"><div class="row-main">Ouverte depuis</div><div class="row-value">${isInstalled() ? "l'écran d'accueil" : 'le navigateur'}</div></div>
      <div class="row"><div class="row-main">Stockage protégé</div><div class="row-value" data-persisted>…</div></div>
    </div>
    <div class="section-footer">Tes données sont enregistrées uniquement sur cet appareil.</div>
  `;

  bindCommon(el);
  bindBackup(el);
  bindSettings(el);
  showPersisted(el);
}

// Bloc « liste modifiable » : une puce par valeur + un champ pour ajouter
function listEditor(key, title, placeholder) {
  const items = state.settings[key];
  return `
    <div class="section-title">${esc(title)}</div>
    <div class="list">
      <div class="chips">
        ${items.map((item, i) => `
          <span class="chip">${esc(item)}
            <button type="button" aria-label="Supprimer ${esc(item)}" data-list-remove="${key}" data-index="${i}">×</button>
          </span>`).join('') || '<span class="muted small">Liste vide</span>'}
      </div>
      <form class="row" data-list-add="${key}">
        <input class="input-plain" type="text" placeholder="${esc(placeholder)}" enterkeyhint="done">
        <button class="btn-small" type="submit">Ajouter</button>
      </form>
    </div>`;
}

// ---------------------------------------------------------------------------
// Export / import
// ---------------------------------------------------------------------------
function bindBackup(el) {
  el.querySelector('[data-action="export"]').addEventListener('click', exportData);

  const input = el.querySelector('[data-import-input]');
  el.querySelector('[data-action="import"]').addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const info = checkBackup(data);
      const ok = confirm(
        `Importer la sauvegarde du ${formatTimestamp(info.exportedAt) || 'date inconnue'} ?\n\n`
        + `${info.events} événement(s), ${info.expenses} dépense(s), ${info.competitions} compétition(s).\n\n`
        + "⚠️ Toutes les données actuelles de l'app seront remplacées."
      );
      if (!ok) return;
      await importBackup(data);
      toast('Sauvegarde importée ✅');
      refresh();
    } catch (err) {
      alert(err instanceof SyntaxError ? "Ce fichier n'est pas un fichier JSON valide." : err.message);
    }
  });
}

async function exportData() {
  // Le fichier est préparé immédiatement : l'iPhone exige que le partage
  // suive directement le toucher du bouton.
  const json = JSON.stringify(buildBackup(), null, 2);
  const file = new File([json], `wcs-tracker-sauvegarde-${todayISO()}.json`, { type: 'application/json' });
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  try {
    if (isTouchDevice && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Sauvegarde WCS Tracker' });
    } else {
      download(file);
    }
    await saveSettings({ lastBackupAt: new Date().toISOString() });
    toast('Sauvegarde exportée ✅');
    refresh();
  } catch (err) {
    if (err.name !== 'AbortError') alert(`Export impossible : ${err.message}`);
  }
}

function download(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Autres réglages
// ---------------------------------------------------------------------------
function bindSettings(el) {
  const s = state.settings;

  el.querySelector('[data-setting="myDivision"]').addEventListener('change', async (e) => {
    await saveSettings({ myDivision: e.target.value });
    toast('Division enregistrée');
  });

  el.querySelectorAll('[data-start-points]').forEach((input) => {
    input.addEventListener('change', async () => {
      const startingPoints = { ...s.startingPoints };
      const value = parseInt(input.value, 10);
      if (Number.isNaN(value) || value <= 0) delete startingPoints[input.dataset.startPoints];
      else startingPoints[input.dataset.startPoints] = value;
      await saveSettings({ startingPoints });
      toast('Points enregistrés');
    });
  });

  el.querySelectorAll('[data-threshold]').forEach((input) => {
    input.addEventListener('change', async () => {
      const value = parseInt(input.value, 10);
      if (Number.isNaN(value) || value < 0) { refresh(); return; }
      const thresholds = state.settings.thresholds.map((t) => ({ ...t }));
      thresholds[Number(input.dataset.threshold)][input.dataset.field] = value;
      await saveSettings({ thresholds });
      toast('Seuil enregistré');
    });
  });

  el.querySelectorAll('[data-list-remove]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.listRemove;
      const items = state.settings[key].filter((_, i) => i !== Number(btn.dataset.index));
      await saveSettings({ [key]: items });
      refresh();
    });
  });

  el.querySelectorAll('[data-list-add]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = form.dataset.listAdd;
      const value = form.querySelector('input').value.trim();
      if (!value) return;
      if (state.settings[key].some((x) => x.toLowerCase() === value.toLowerCase())) {
        toast('Déjà dans la liste');
        return;
      }
      await saveSettings({ [key]: [...state.settings[key], value] });
      refresh();
    });
  });

  el.querySelector('[data-sample]').addEventListener('change', async (e) => {
    await setSampleData(e.target.checked);
    toast(e.target.checked ? "Exemples ajoutés" : 'Exemples supprimés');
    refresh();
  });
}

async function showPersisted(el) {
  const cell = el.querySelector('[data-persisted]');
  try {
    const persisted = navigator.storage && navigator.storage.persisted
      ? await navigator.storage.persisted()
      : false;
    cell.textContent = persisted ? 'Oui ✅' : 'Non';
  } catch {
    cell.textContent = 'Inconnu';
  }
}
