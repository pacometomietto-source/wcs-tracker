/*
 * charts.js — petits graphiques dessinés en SVG/HTML, sans bibliothèque.
 * Les couleurs viennent du CSS (--series-1…, --grid, …) : le mode sombre
 * est donc automatique.
 *
 * Chaque graphique est placé dans un bloc [data-chart] qui contient une ligne
 * .chart-tip : toucher une barre ou un point y affiche le détail.
 */
import { esc } from './ui.js';

const W = 340; // largeur de dessin (le SVG s'adapte ensuite à l'écran)

// Pas « rond » pour les graduations : 1, 2, 5, 10, 20, 50…
function niceStep(raw) {
  if (raw <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

function yScale(maxValue, steps = 3) {
  const step = niceStep(maxValue / steps);
  const top = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  return { top, ticks };
}

// Enveloppe commune : le graphique + la ligne de détail
function wrap(svg, hint, label) {
  return `<div class="chart" data-chart>
    ${svg.replace('<svg ', `<svg role="img" aria-label="${esc(label)}" `)}
    <div class="chart-tip" data-default="${esc(hint)}">${esc(hint)}</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Courbe en escalier (points cumulés) : la valeur monte d'un coup à chaque événement
// points : [{ t: timestamp, y: nombre, tip: "texte", marker: true/false }]
// xTicks : [{ t, label }]
// ---------------------------------------------------------------------------
export function stepLineChart({ points, xTicks, formatY, label, hint, height = 180 }) {
  const pad = { l: 36, r: 16, t: 14, b: 26 };
  const t0 = points[0].t;
  const t1 = Math.max(points[points.length - 1].t, t0 + 86400000);
  const { top, ticks } = yScale(Math.max(...points.map((p) => p.y)));
  const sx = (t) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const sy = (y) => pad.t + (1 - y / top) * (height - pad.t - pad.b);
  const base = sy(0);

  const grid = ticks.map((v) => `
    <line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${sy(v)}" y2="${sy(v)}"/>
    <text class="axis-label" x="${pad.l - 6}" y="${sy(v) + 4}" text-anchor="end">${esc(formatY(v))}</text>`).join('');

  const xLabels = xTicks.filter((x) => x.t >= t0 && x.t <= t1).map((x) => `
    <text class="axis-label" x="${sx(x.t)}" y="${height - 8}" text-anchor="middle">${esc(x.label)}</text>`).join('');

  let line = `M${sx(points[0].t)},${sy(points[0].y)}`;
  points.slice(1).forEach((p) => { line += ` H${sx(p.t)} V${sy(p.y)}`; });
  const last = points[points.length - 1];
  const area = `${line} V${base} H${sx(points[0].t)} Z`;

  const markers = points.filter((p) => p.marker).map((p) => `
    <g data-tip="${esc(p.tip)}">
      <circle class="hit" cx="${sx(p.t)}" cy="${sy(p.y)}" r="16"/>
      <circle class="dot" cx="${sx(p.t)}" cy="${sy(p.y)}" r="4.5"/>
    </g>`).join('');

  const svg = `<svg viewBox="0 0 ${W} ${height}">
    ${grid}
    <line class="baseline" x1="${pad.l}" x2="${W - pad.r}" y1="${base}" y2="${base}"/>
    <path class="area" d="${area}"/>
    <path class="line" d="${line}"/>
    ${markers}
    <text class="value-label" x="${Math.min(sx(last.t), W - pad.r)}" y="${sy(last.y) - 10}" text-anchor="end">${esc(formatY(last.y))}</text>
    ${xLabels}
  </svg>`;
  return wrap(svg, hint, label);
}

// ---------------------------------------------------------------------------
// Colonnes (une par mois)
// items : [{ label: "J", value: nombre, tip: "texte" }]
// ---------------------------------------------------------------------------
export function columnChart({ items, formatY, label, hint, height = 170 }) {
  const pad = { l: 44, r: 8, t: 18, b: 24 };
  const maxValue = Math.max(0, ...items.map((i) => i.value));
  const { top, ticks } = yScale(maxValue || 1);
  const slot = (W - pad.l - pad.r) / items.length;
  const bw = Math.max(4, Math.min(24, slot * 0.62));
  const sy = (y) => pad.t + (1 - y / top) * (height - pad.t - pad.b);
  const base = sy(0);
  const maxIndex = items.findIndex((i) => i.value === maxValue);

  const grid = ticks.map((v) => `
    <line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${sy(v)}" y2="${sy(v)}"/>
    <text class="axis-label" x="${pad.l - 6}" y="${sy(v) + 4}" text-anchor="end">${esc(formatY(v))}</text>`).join('');

  const cols = items.map((item, i) => {
    const cx = pad.l + slot * i + slot / 2;
    const x = cx - bw / 2;
    const v = Math.max(0, item.value);
    const h = base - sy(v);
    const r = Math.min(4, h, bw / 2);
    // Barre arrondie en haut, carrée sur la ligne de base
    const bar = h > 0.5
      ? `<path class="col" d="M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + bw - r} Q${x + bw},${base - h} ${x + bw},${base - h + r} V${base} Z"/>`
      : '';
    // On n'écrit la valeur que sur la plus haute colonne (le reste : toucher la colonne)
    const valueLabel = i === maxIndex && maxValue > 0
      ? `<text class="value-label" x="${cx}" y="${base - h - 6}" text-anchor="middle">${esc(formatY(item.value))}</text>`
      : '';
    return `<g data-tip="${esc(item.tip)}">
      <rect class="hit" x="${pad.l + slot * i}" y="${pad.t}" width="${slot}" height="${height - pad.t}"/>
      ${bar}${valueLabel}
      ${item.label ? `<text class="axis-label" x="${cx}" y="${height - 8}" text-anchor="middle">${esc(item.label)}</text>` : ''}
    </g>`;
  }).join('');

  const svg = `<svg viewBox="0 0 ${W} ${height}">
    ${grid}
    ${cols}
    <line class="baseline" x1="${pad.l}" x2="${W - pad.r}" y1="${base}" y2="${base}"/>
  </svg>`;
  return wrap(svg, hint, label);
}

// ---------------------------------------------------------------------------
// Barre segmentée (répartition d'un total en parts)
// parts : [{ label, value, color: "var(--series-1)", ink: "var(--on-series-1)", tip }]
// ---------------------------------------------------------------------------
export function segmentedBar({ parts, label, hint }) {
  const visible = parts.filter((p) => p.value > 0);
  const total = visible.reduce((s, p) => s + p.value, 0);
  if (!total) return '';
  const blocks = visible.map((p) => {
    const share = p.value / total;
    // Le pourcentage n'est écrit dans le bloc que s'il y a la place
    const text = share >= 0.13 ? `<span style="color:${p.ink}">${Math.round(share * 100)} %</span>` : '';
    return `<div class="seg" data-tip="${esc(p.tip)}" style="flex-grow:${p.value};background:${p.color}">${text}</div>`;
  }).join('');
  return `<div class="chart" data-chart>
    <div class="seg-bar" role="img" aria-label="${esc(label)}">${blocks}</div>
    <div class="chart-tip" data-default="${esc(hint)}">${esc(hint)}</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Toucher (ou survoler) une barre / un point affiche son détail sous le graphique
// ---------------------------------------------------------------------------
export function bindChartTips(root) {
  root.querySelectorAll('[data-chart]').forEach((chart) => {
    const tip = chart.querySelector('.chart-tip');
    const targets = chart.querySelectorAll('[data-tip]');
    const show = (target) => {
      targets.forEach((t) => t.classList.toggle('is-active', t === target));
      chart.classList.add('has-active');
      tip.textContent = target.dataset.tip;
      tip.classList.add('on');
    };
    targets.forEach((t) => {
      t.addEventListener('pointerenter', () => show(t));
      t.addEventListener('click', () => show(t));
    });
    chart.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return; // sur iPhone, le détail reste affiché
      targets.forEach((t) => t.classList.remove('is-active'));
      chart.classList.remove('has-active');
      tip.textContent = tip.dataset.default;
      tip.classList.remove('on');
    });
  });
}
