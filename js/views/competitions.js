/*
 * Écran « Compétitions » — version étape 0 (provisoire).
 * La version complète arrive à l'étape 3.
 */
import { competitionsInSeason } from '../store.js';
import { pageHeader, bindCommon } from '../ui.js';

export function render(el) {
  const n = competitionsInSeason().length;
  el.innerHTML = `
    ${pageHeader('Compétitions')}
    <div class="empty">
      <div class="big">🏆</div>
      ${n} compétition(s) enregistrée(s) pour cette sélection.<br>
      Cet écran arrive à l'étape 3.
    </div>
  `;
  bindCommon(el);
}
