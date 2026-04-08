import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';

const STORAGE_KEY = 'course_orientation_sessions';

/** Date du jour au format YYYY-MM-DD (fuseau local) */
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadCourses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return migrateCoursesList(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

function saveCourses(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Sauvegarde courses orientation:', e);
  }
}

/** @param {string} prefix */
function newDamierId(prefix = 'dm') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Migrate ancien format (orientationGrid à la racine) → damiers[]
 * @param {object} course
 */
function migrateCourseToDamierts(course) {
  if (!course || typeof course !== 'object') return course;
  if (Array.isArray(course.damiers) && course.damiers.length > 0) {
    return course;
  }
  const legacyGrid = course.orientationGrid && typeof course.orientationGrid === 'object'
    ? { ...course.orientationGrid }
    : {};
  const { orientationGrid, ...rest } = course;
  return {
    ...rest,
    damiers: [
      {
        id: newDamierId('dm-legacy'),
        nom: 'PLAN',
        damierMode: 'plan',
        orientationGrid: legacyGrid,
      },
    ],
  };
}

/** Premier damier = mode plan (Position + Icon seulement) ; les suivants = mode complet. */
function migrateDamierModes(course) {
  if (!course || typeof course !== 'object' || !Array.isArray(course.damiers)) return course;
  const needs = course.damiers.some((d) => d.damierMode == null);
  if (!needs) return course;
  const damiers = course.damiers.map((d, i) => {
    if (d.damierMode != null) return d;
    if (i === 0) {
      const nom = d.nom && String(d.nom).trim() ? d.nom : 'PLAN';
      return { ...d, damierMode: 'plan', nom };
    }
    return { ...d, damierMode: 'full' };
  });
  return { ...course, damiers };
}

function migrateCoursesList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((c) => migrateDamierModes(migrateCourseToDamierts(c)));
}

/** @param {object} d
 * @param {number} index */
function damierDisplayName(d, index) {
  const n = d && typeof d.nom === 'string' ? d.nom.trim() : '';
  if (n) return n;
  if (d?.damierMode === 'plan' && index === 0) return 'PLAN';
  return `Damier ${index + 1}`;
}

/**
 * Duplication vers un nouveau damier : points noirs « Position », icônes, cas empilés,
 * Fin qui masquait une balise violette → restauration du violet ; Fin qui masquait un point noir seul →
 * restauration du point noir (voir TERMINOLOGIE_MAILLES). Le nouveau damier ne copie jamais la Fin. Pas de départ.
 * @param {object|null} prevGrid
 */
function clonePositionAndIconsFromGrid(prevGrid) {
  const g = ensureBaliseObjects({ ...(prevGrid || {}) });
  const out = { icons: [] };
  for (const key of Object.keys(g)) {
    if (key === 'icons' || key === 'debut') continue;
    const v = g[key];
    const kind = getCellKind(v);
    if (kind === 'balise') {
      out[key] = 'balise';
    } else if (
      kind === 'position' &&
      typeof v === 'object' &&
      v != null &&
      v.beneath === 'balise'
    ) {
      // Ancien damier : balise violette (type stocké `position`) au-dessus d’un point noir (type `balise`).
      // Nouveau damier : on ne copie pas le violet, on remet le point noir.
      out[key] = 'balise';
    } else if (kind === 'fin' && typeof v === 'object' && v != null && finReplacedBlackPosition(v)) {
      // La Fin avait remplacé un point noir (UI « Position ») : on le remet sur le nouveau damier.
      out[key] = 'balise';
    } else if (kind === 'fin' && typeof v === 'object' && v != null && finReplacedVioletBalise(v)) {
      // La Fin avait remplacé une balise violette : on remet la balise violette (même numéro) sur le nouveau damier.
      const hsRaw = finHiddenVioletBaliseSeq(v);
      const hs = hsRaw > 0 ? hsRaw : 1;
      if (finHadBlackPositionUnderViolet(v)) {
        out[key] = { type: 'position', seq: hs, beneath: 'balise' };
      } else {
        out[key] = { type: 'position', seq: hs };
      }
    }
  }
  if (Array.isArray(g.icons)) {
    const t = Date.now();
    out.icons = g.icons.map((ic, i) => ({
      id: `ic-${t}-${i}-${Math.random().toString(36).slice(2, 9)}`,
      stickerId: ic.stickerId,
      nx: ic.nx,
      ny: ic.ny,
    }));
  }
  return ensureBaliseObjects(out);
}

/**
 * PLAN = source de vérité pour :
 * - les points noirs « Position » (kind: 'balise')
 * - les stickers « Icon » (grid.icons)
 *
 * Quand le PLAN change, tous les autres damiers doivent refléter exactement ces 2 couches,
 * sans écraser leurs Balises violettes / Début / Fin.
 */
function extractPlanPositionsAndIcons(planGrid) {
  const g = ensureBaliseObjects({ ...(planGrid || {}) });
  const keys = new Set();
  for (const k of Object.keys(g)) {
    if (k === 'icons' || k === 'debut') continue;
    if (getCellKind(g[k]) === 'balise') keys.add(k);
  }
  const icons = Array.isArray(g.icons) ? g.icons.map((x) => ({ ...x })) : [];
  return { keys, icons };
}

function syncPlanPositionsAndIconsIntoGrid(targetGrid, planBase) {
  const g = ensureBaliseObjects({ ...(targetGrid || {}) });
  let changed = false;

  // Sync points noirs « Position » (balise)
  for (const k of Object.keys(g)) {
    if (k === 'icons' || k === 'debut') continue;
    const kind = getCellKind(g[k]);
    const inPlan = planBase.keys.has(k);

    if (kind === 'balise' && !inPlan) {
      delete g[k];
      changed = true;
      continue;
    }

    if (kind === 'position' && typeof g[k] === 'object' && g[k] != null) {
      const beneathWas = g[k].beneath;
      const beneathNext = inPlan ? 'balise' : undefined;
      if (beneathWas !== beneathNext) {
        if (beneathNext) g[k] = { ...g[k], beneath: beneathNext };
        else {
          const { beneath: _b, ...rest } = g[k];
          g[k] = rest;
        }
        changed = true;
      }
      continue;
    }
  }

  for (const k of planBase.keys) {
    const kind = getCellKind(g[k]);
    if (kind == null) {
      g[k] = 'balise';
      changed = true;
    } else if (kind === 'position' && typeof g[k] === 'object' && g[k] != null && g[k].beneath !== 'balise') {
      g[k] = { ...g[k], beneath: 'balise' };
      changed = true;
    }
    // fin / debut / autre : on ne touche pas
  }

  // Sync icons : exactement celles du plan
  const prevIcons = Array.isArray(g.icons) ? g.icons : [];
  const nextIcons = planBase.icons;
  const sameIcons =
    prevIcons.length === nextIcons.length &&
    prevIcons.every((ic, i) => ic?.stickerId === nextIcons[i]?.stickerId && ic?.nx === nextIcons[i]?.nx && ic?.ny === nextIcons[i]?.ny);
  if (!sameIcons) {
    g.icons = nextIcons.map((x) => ({ ...x }));
    changed = true;
  }

  return { grid: ensureBaliseObjects(g), changed };
}

/**
 * Grille carrée (N×N) : même écart centre-à-centre en horizontal et vertical.
 * Le gap unique garantit la même distance entre voisins dans les deux directions.
 */
const DAMIER_N = 22;
/** Espacement entre les mailles (px), identique H/V */
const DAMIER_GAP_PX = 0;

/** Damier plus grand que la fenêtre visible pour permettre le panoramique */
const INNER_SCALE = 1.85;

/** Début (triangle) — conserve un violet plus soutenu */
const MAUVE = '#7c3aed';

/** Violet pour balises violettes numérotées (UI « Balise ») et Fin — voir TERMINOLOGIE_MAILLES */
const VIOLET_ROSE_MAUVE = '#d946ef';

// Option « Inter-balise » supprimée (remplacée par « Icon »).

/** Point noir — UI « Position » ; dans les données : chaîne / cellule `balise` */
function IconBalise() {
  return <span className="inline-block w-2 h-2 rounded-full bg-black shrink-0" aria-hidden />;
}

/** Cercle violet numéroté — UI « Balise » ; dans les données : `{ type: 'position', seq }` */
function IconPosition() {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-full border-[3px] bg-fuchsia-500/12"
      style={{ borderColor: VIOLET_ROSE_MAUVE }}
      aria-hidden
    />
  );
}

function IconSticker() {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-xl border border-slate-200 bg-white"
      aria-hidden
    >
      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none">
        <path
          d="M7 7.5h10M7 12h6M7 16.5h10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function IconDebut() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      viewBox="0 0 24 24"
      aria-hidden
      style={{ color: VIOLET_ROSE_MAUVE }}
    >
      <path fill="currentColor" d="M12 3L22 21H2L12 3z" />
    </svg>
  );
}

/** Double cercle concentrique — intérieur proche de l’extérieur */
function IconFin() {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center w-9 h-9" aria-hidden>
      <span
        className="absolute rounded-full border-[3px] box-border w-9 h-9"
        style={{ borderColor: VIOLET_ROSE_MAUVE }}
      />
      <span
        className="absolute rounded-full border-[2.5px] box-border w-[30px] h-[30px]"
        style={{ borderColor: VIOLET_ROSE_MAUVE }}
      />
    </span>
  );
}

/**
 * TERMINOLOGIE_MAILLES (à ne pas confondre avec les noms techniques en base) :
 * - UI « Position » = points noirs → id de couche `balise`, valeur maille souvent `'balise'`.
 * - UI « Balise » = cercles violets numérotés → id de couche `position`, valeur `{ type: 'position', seq }`.
 */
const LAYER_ITEMS = [
  { id: 'balise', label: 'Position', Icon: IconBalise, placeable: true },
  { id: 'position', label: 'Balise', Icon: IconPosition, placeable: true },
  { id: 'debut', label: 'Début', Icon: IconDebut, placeable: true },
  { id: 'fin', label: 'Fin', Icon: IconFin, placeable: true },
  { id: 'icon', label: 'Icon', Icon: IconSticker, placeable: true },
];

const STICKER_COLORS = [
  { id: 'white', label: 'Blanc', fill: '#ffffff', stroke: '#111827' },
  { id: 'black', label: 'Noir', fill: '#111827', stroke: '#111827' },
  { id: 'blue', label: 'Bleu', fill: '#2563eb', stroke: '#2563eb' },
  { id: 'red', label: 'Rouge', fill: '#ef4444', stroke: '#ef4444' },
  { id: 'orange', label: 'Orange', fill: '#f97316', stroke: '#f97316' },
  { id: 'green', label: 'Vert', fill: '#22c55e', stroke: '#22c55e' },
];

const STICKER_SIZES = [
  { id: 's', label: 'Petit', px: 18, stroke: 2 },
  { id: 'm', label: 'Moyen', px: 26, stroke: 2.25 },
  { id: 'l', label: 'Grand', px: 34, stroke: 2.5 },
];

/** Affichage sur le damier : stickers géométriques + pictos un peu plus grands */
const STICKER_GRID_SCALE_SHAPE = 1.85;
const STICKER_GRID_SCALE_THEMATIC = 1.55;

function StickerCircle({ fill, stroke, sizePx, strokeWidth }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r="14" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </svg>
  );
}

function StickerTriangle({ fill, stroke, sizePx, strokeWidth }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 40 40" aria-hidden>
      <path
        d="M20 7 L35 33 H5 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Pictos remplis, contrastés (lisibles sur fond clair) */
function StickerBackpack({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1e40af"
        d="M8 8.5a4 4 0 018 0v1.2h1.2A1.8 1.8 0 0119 11.5v8.2A2.3 2.3 0 0116.7 22H7.3A2.3 2.3 0 015 19.7v-8.2a1.8 1.8 0 011.8-1.8H8V8.5z"
      />
      <path fill="#60a5fa" d="M9 9.2a3 3 0 016 0v.8H9v-.8z" />
      <path fill="#172554" d="M9 14.5h6v1.2H9z" opacity="0.35" />
      <path fill="#fbbf24" d="M11 6.5h2v3h-2z" />
    </svg>
  );
}

function StickerPen({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path fill="#ca8a04" d="M4 19.5l1.8-.5 9.2-9.2a2 2 0 000-2.5l-.8-.8a2 2 0 00-2.5 0L3.5 16.2 4 19.5z" />
      <path fill="#fde047" d="M13.2 6.8l4 4-1.2 1.2-4-4 1.2-1.2z" />
      <path fill="#713f12" d="M3.5 19.5h2.2l-.7-2.2-1.5 2.2z" />
    </svg>
  );
}

function StickerJacket({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#dc2626"
        d="M9 5l2.5 1.8L14 5l2.8 3.5-1.5 1.5V20H8V10l-1.5-1.5L9 5z"
      />
      <path fill="#991b1b" d="M12 7v13h-1.2V7H12z" />
      <path fill="#fecaca" d="M10.5 5.5h3L12 7l-1.5-1.5z" />
    </svg>
  );
}

function StickerNotebook({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path fill="#e2e8f0" d="M7 3h11a2 2 0 012 2v15a2 2 0 01-2 2H7a3 3 0 01-3-3V6a3 3 0 013-3z" />
      <path fill="#1e3a5f" d="M7 3v19" stroke="#0f172a" strokeWidth="0.5" />
      <path stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" d="M10 8h8M10 12h8M10 16h6" />
    </svg>
  );
}

function StickerBook({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path fill="#7c3aed" d="M5 5a3 3 0 013-3h10v18H8a3 3 0 00-3 3V5z" />
      <path fill="#a78bfa" d="M8 2v17.5" />
      <path fill="#ede9fe" d="M10 6h7v1.2h-7V6zm0 3.5h7v1.2h-7V9.5zm0 3.5h5v1.2h-5V13z" />
    </svg>
  );
}

function StickerApple({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#dc2626"
        d="M12 6.5c-2.8 0-5 2-5 5.2 0 3.5 2.5 6.3 5 6.3s5-2.8 5-6.3c0-3.2-2.2-5.2-5-5.2z"
      />
      <path fill="#16a34a" d="M11 5c.8-1.2 2.5-1.5 3.2-.8-.6 1-2 1.2-2.8.5-.5-.8-1.2-.5-.4.3z" />
      <path fill="#7f1d1d" opacity="0.25" d="M10 14c1.5.8 3.2.5 4.5-.5" />
    </svg>
  );
}

function StickerRuler({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" d="M4 18.5 18.5 4l2 2L6 20.5l-2-2z" />
      <path stroke="#92400e" strokeWidth="1" strokeLinecap="round" d="M7 16.5l1-1M9.5 14l1-1M12 11.5l1-1M14.5 9l1-1" />
    </svg>
  );
}

function StickerWaterBottle({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path fill="#0ea5e9" d="M9 3h6v3H9V3zm-1 5h8l1 12a2 2 0 01-2 2H9a2 2 0 01-2-2l1-12z" />
      <path fill="#e0f2fe" opacity="0.6" d="M10 10h4v8H10z" />
      <path fill="#0369a1" d="M10 4.5h4v1h-4z" />
    </svg>
  );
}

function StickerClock({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="13" r="8" fill="#f1f5f9" stroke="#334155" strokeWidth="1.5" />
      <path stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" d="M12 13V9M12 13l3 2" />
      <path fill="#64748b" d="M11 4h2v2.5h-2z" />
    </svg>
  );
}

function StickerBranch({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="#78350f"
        strokeWidth="2"
        strokeLinecap="round"
        d="M4 17c5-6 8 4 14-5"
      />
      <ellipse cx="15" cy="9" rx="3" ry="2" fill="#22c55e" opacity="0.9" />
      <ellipse cx="9" cy="15" rx="2.5" ry="1.8" fill="#16a34a" opacity="0.85" />
    </svg>
  );
}

function StickerTree({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path fill="#78350f" d="M11 16h2v6h-2z" />
      <path fill="#15803d" d="M12 2l-5 9h10l-5-9zm0 4l-3.5 6h7L12 6z" />
      <path fill="#22c55e" d="M12 7l-2.5 5h5L12 7z" />
    </svg>
  );
}

function StickerRock({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#94a3b8"
        stroke="#475569"
        strokeWidth="0.75"
        d="M6 12l2.5-4h7l2.5 3 2 7-3 3H5l-1-6 2.5-3z"
      />
      <path fill="#cbd5e1" opacity="0.5" d="M8 14h5v2H8z" />
    </svg>
  );
}

function StickerBush({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <ellipse cx="8" cy="16" rx="4" ry="3" fill="#22c55e" />
      <ellipse cx="12" cy="15" rx="5" ry="4" fill="#16a34a" />
      <ellipse cx="16" cy="16" rx="4" ry="3" fill="#15803d" />
    </svg>
  );
}

function StickerFlower({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="2.2" fill="#fbbf24" />
      <ellipse cx="12" cy="8" rx="2" ry="3" fill="#f472b6" />
      <ellipse cx="16" cy="12" rx="3" ry="2" fill="#ec4899" />
      <ellipse cx="12" cy="16" rx="2" ry="3" fill="#f472b6" />
      <ellipse cx="8" cy="12" rx="3" ry="2" fill="#ec4899" />
      <path stroke="#15803d" strokeWidth="1.5" d="M12 14v6" strokeLinecap="round" />
    </svg>
  );
}

function StickerHill({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path fill="#86efac" d="M2 18c4-5 8-6 12-3s6 3 10 0v6H2v-3z" />
      <path fill="#22c55e" opacity="0.6" d="M2 18h20v4H2z" />
    </svg>
  );
}

function StickerPath({ sizePx = 36 }) {
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="#a8a29e"
        strokeWidth="2.5"
        strokeLinecap="round"
        d="M4 18c3-6 6-8 10-10s6-4 6-6"
      />
      <circle cx="4" cy="18" r="1.5" fill="#78716c" />
      <circle cx="20" cy="2" r="1.5" fill="#78716c" />
    </svg>
  );
}

const THEMATIC_STICKER_PX = 36;

function thematicItem(id, group, label, render) {
  return {
    id,
    group,
    category: 'thematic',
    label,
    render,
  };
}

const STICKER_REGISTRY = (() => {
  const items = [];
  const circleRows = [];
  const triangleRows = [];

  for (const color of STICKER_COLORS) {
    const cRow = [];
    const tRow = [];
    for (const size of STICKER_SIZES) {
      const idC = `circle-${size.id}-${color.id}`;
      items.push({
        id: idC,
        group: 'Cercles',
        category: 'shape',
        label: `Cercle ${size.label} — ${color.label}`,
        render: () => (
          <StickerCircle
            fill={color.fill}
            stroke={color.stroke}
            sizePx={size.px}
            strokeWidth={size.stroke}
          />
        ),
      });
      cRow.push(items[items.length - 1]);

      const idT = `triangle-${size.id}-${color.id}`;
      items.push({
        id: idT,
        group: 'Triangles',
        category: 'shape',
        label: `Triangle ${size.label} — ${color.label}`,
        render: () => (
          <StickerTriangle
            fill={color.fill}
            stroke={color.stroke}
            sizePx={size.px}
            strokeWidth={size.stroke}
          />
        ),
      });
      tRow.push(items[items.length - 1]);
    }
    circleRows.push({ color, items: cRow });
    triangleRows.push({ color, items: tRow });
  }

  items.push(
    thematicItem('school-backpack', 'École', 'Sac', () => <StickerBackpack sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('school-pen', 'École', 'Stylo', () => <StickerPen sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('school-jacket', 'École', 'Veste', () => <StickerJacket sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('school-notebook', 'École', 'Cahier', () => <StickerNotebook sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('school-book', 'École', 'Livre', () => <StickerBook sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('school-apple', 'École', 'Pomme', () => <StickerApple sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('school-ruler', 'École', 'Règle', () => <StickerRuler sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('school-bottle', 'École', 'Gourde', () => <StickerWaterBottle sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('school-clock', 'École', 'Horloge', () => <StickerClock sizePx={THEMATIC_STICKER_PX} />),
  );

  items.push(
    thematicItem('map-branch', 'Carte', 'Branche', () => <StickerBranch sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('map-tree', 'Carte', 'Arbre', () => <StickerTree sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('map-rock', 'Carte', 'Pierre', () => <StickerRock sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('map-bush', 'Carte', 'Buisson', () => <StickerBush sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('map-flower', 'Carte', 'Fleur', () => <StickerFlower sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('map-hill', 'Carte', 'Colline', () => <StickerHill sizePx={THEMATIC_STICKER_PX} />),
    thematicItem('map-path', 'Carte', 'Sentier', () => <StickerPath sizePx={THEMATIC_STICKER_PX} />),
  );

  return { list: items, circleRows, triangleRows };
})();

/** Liste plate pour recherche par id (placement, migration) */
const STICKERS = STICKER_REGISTRY.list;

const STICKER_PICKER_SHAPE = {
  circleRows: STICKER_REGISTRY.circleRows,
  triangleRows: STICKER_REGISTRY.triangleRows,
};

/** @returns {string|null} */
function getCellKind(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v.type) return v.type;
  return null;
}

/**
 * Objet Fin : indique si la Fin a remplacé une balise violette (données `type: 'position'`).
 * Ancien format : `beneath === 'position'` (nom trompeur ; ce n’est pas le point noir « Position »).
 */
function finReplacedVioletBalise(v) {
  if (typeof v !== 'object' || v == null || getCellKind(v) !== 'fin') return false;
  if (v.replacesVioletBalise === true) return true;
  return v.beneath === 'position';
}

/** Numéro de la balise violette masquée par la Fin (migration : `hiddenPositionSeq`). */
function finHiddenVioletBaliseSeq(v) {
  const s = v.hiddenVioletBaliseSeq ?? v.hiddenPositionSeq;
  return Number.isFinite(s) ? s : 0;
}

/** La balise violette masquée avait-elle un point noir en dessous (données `beneath: 'balise'`) ? */
function finHadBlackPositionUnderViolet(v) {
  return v.hiddenBlackPositionUnderViolet === true || v.hiddenBeneathBalise === true;
}

/** La Fin a-t-elle remplacé un point noir seul (valeur de maille `balise`, UI « Position ») ? */
function finReplacedBlackPosition(v) {
  if (typeof v !== 'object' || v == null || getCellKind(v) !== 'fin') return false;
  return v.replacesBlackPosition === true;
}

/**
 * Retire une Fin à cette maille et restitue la balise violette ou le point noir mémorisé sur l’objet Fin.
 * @param {Record<string, unknown>} grid
 * @param {string} key
 * @param {unknown} rawFin
 */
function restoreUnderFinAtKey(grid, key, rawFin) {
  delete grid[key];
  if (finReplacedVioletBalise(rawFin)) {
    const seq = finHiddenVioletBaliseSeq(rawFin);
    const hadBlack = finHadBlackPositionUnderViolet(rawFin);
    if (seq > 0) {
      grid[key] = hadBlack
        ? { type: 'position', seq, beneath: 'balise' }
        : { type: 'position', seq };
    }
  } else if (finReplacedBlackPosition(rawFin)) {
    grid[key] = 'balise';
  }
}

/** Nouvelle balise violette (type stocké `position`) : si elle remplace un point noir (`balise`), mémoriser pour la restitution. */
function positionPayload(seq, prevKind) {
  if (prevKind === 'balise') {
    return { type: 'position', seq, beneath: 'balise' };
  }
  return { type: 'position', seq };
}

/** Renumérotation des balises violettes (type stocké `position`) en 1..n */
function renumberBalisesInPlace(grid) {
  const keys = Object.keys(grid).filter((k) => getCellKind(grid[k]) === 'position');
  keys.sort((a, b) => {
    const va = grid[a];
    const vb = grid[b];
    const sa = typeof va === 'object' && va != null && Number.isFinite(va.seq) ? va.seq : Number(a);
    const sb = typeof vb === 'object' && vb != null && Number.isFinite(vb.seq) ? vb.seq : Number(b);
    return sa - sb || Number(a) - Number(b);
  });
  keys.forEach((k, i) => {
    const prev = grid[k];
    const hadBeneath =
      typeof prev === 'object' && prev != null && prev.beneath === 'balise';
    grid[k] = hadBeneath
      ? { type: 'position', seq: i + 1, beneath: 'balise' }
      : { type: 'position', seq: i + 1 };
  });
  syncFinSeqFromBalises(grid);
}

/** Numéro de Fin = dernier rang balise + 1 (une seule Fin autorisée) */
function syncFinSeqFromBalises(grid) {
  const finKey = Object.keys(grid).find((k) => getCellKind(grid[k]) === 'fin');
  if (!finKey) return;
  const maxB = Math.max(
    0,
    ...Object.values(grid).map((v) =>
      typeof v === 'object' && v?.type === 'position' && Number.isFinite(v.seq) ? v.seq : 0,
    ),
  );
  const nextSeq = maxB + 1;
  const prev = grid[finKey];
  grid[finKey] =
    typeof prev === 'object' && prev != null && prev.type === 'fin'
      ? { ...prev, type: 'fin', seq: nextSeq }
      : { type: 'fin', seq: nextSeq };
}

function maxBaliseSeq(grid) {
  return Math.max(
    0,
    ...Object.values(grid).map((v) =>
      typeof v === 'object' && v?.type === 'position' && Number.isFinite(v.seq) ? v.seq : 0,
    ),
  );
}

/** Une seule Fin : garde la maille d’indice minimal ; migre la chaîne "fin" → objet */
function dedupeFinInPlace(grid) {
  const finKeys = Object.keys(grid)
    .filter((k) => getCellKind(grid[k]) === 'fin')
    .sort((a, b) => Number(a) - Number(b));
  finKeys.slice(1).forEach((k) => {
    delete grid[k];
  });
  const fk = finKeys[0];
  if (fk != null && grid[fk] === 'fin') {
    grid[fk] = { type: 'fin', seq: 0 };
  }
}

/** Prochain numéro de balise (cercle violet) */
function nextBaliseSeq(grid) {
  let max = 0;
  for (const v of Object.values(grid)) {
    if (typeof v === 'object' && v?.type === 'position' && Number.isFinite(v.seq)) {
      max = Math.max(max, v.seq);
    }
  }
  return max + 1;
}

/** Ancien format : icon sur une maille → liste `icons` en coords normalisées */
function migrateLegacyIconCellsToFree(out) {
  if (!out.icons || !Array.isArray(out.icons)) {
    out.icons = [];
  }
  for (const k of Object.keys(out)) {
    if (k === 'debut' || k === 'icons') continue;
    const v = out[k];
    if (getCellKind(v) !== 'icon') continue;
    const idx = Number(k);
    if (!Number.isFinite(idx)) continue;
    const col = idx % DAMIER_N;
    const row = Math.floor(idx / DAMIER_N);
    const nx = (col + 0.5) / DAMIER_N;
    const ny = (row + 0.5) / DAMIER_N;
    const stickerId =
      typeof v === 'object' && v != null && v.stickerId ? v.stickerId : STICKERS[0]?.id;
    out.icons.push({
      id: `mig-${k}-${Date.now()}`,
      stickerId,
      nx,
      ny,
    });
    delete out[k];
  }
}

/** Migre les anciennes valeurs string "position" et assure des objets { type, seq } */
function ensureBaliseObjects(grid) {
  if (!grid || typeof grid !== 'object') return {};
  const out = { ...grid };
  migrateLegacyIconCellsToFree(out);
  dedupeFinInPlace(out);
  if (out.debut && typeof out.debut === 'string') {
    delete out.debut;
  }

  if (!Object.values(out).some((v) => v === 'position')) {
    syncFinSeqFromBalises(out);
    return out;
  }
  for (const k of Object.keys(out)) {
    if (out[k] === 'position') {
      out[k] = { type: 'position', seq: 0 };
    }
  }
  renumberBalisesInPlace(out);
  return out;
}

function emptyDeleteToolsState() {
  return LAYER_ITEMS.reduce((acc, { id }) => ({ ...acc, [id]: false }), {});
}

const ORIENTATION_PRINT_DELETE_TOOLS = emptyDeleteToolsState();

const ORIENTATION_PRINT_COLS = 2;
const ORIENTATION_PRINT_ROWS = 4;
const ORIENTATION_PRINT_PER_PAGE = ORIENTATION_PRINT_COLS * ORIENTATION_PRINT_ROWS;
// En mode "vertical", on garde jusqu'à 3 damiers par page (1 à 3) : c'est le cas où l'utilisateur
// attend un empilement vertical avec un espacement visible entre les damiers.
const ORIENTATION_PRINT_VERTICAL_MAX_PER_PAGE = 3;
const ORIENTATION_PRINT_DAMIER_PX = 210;

const noopOrientationHandler = () => {};

/**
 * html2canvas ne supporte que rgb/rgba/hsl dans son parseur (pas oklch — Tailwind v4).
 * Chrome peut sérialiser getComputedStyle en oklch : on convertit via Canvas (fillStyle se résout en rgb)
 * et on retire les feuilles de style du clone pour éviter le parse des règles brutes.
 */
const H2C_UNSUPPORTED_COLOR = /oklch|lch\(|lab\(|color-mix\(|\bcolor\(/i;

function resolveCssColorForHtml2canvas(value) {
  if (value == null || value === '' || value === 'none' || value === 'transparent') return value;
  const t = String(value).trim();
  if (!H2C_UNSUPPORTED_COLOR.test(t)) return t;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = t;
      const resolved = ctx.fillStyle;
      if (typeof resolved === 'string' && !H2C_UNSUPPORTED_COLOR.test(resolved)) {
        return resolved;
      }
    }
  } catch {
    /* suite */
  }
  try {
    const probe = document.createElement('div');
    probe.style.color = t;
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    if (rgb && !H2C_UNSUPPORTED_COLOR.test(rgb)) return rgb;
  } catch {
    /* suite */
  }
  return '#000000';
}

function sanitizeStyleValueForHtml2canvas(prop, val) {
  if (val == null || val === '') return val;
  const t = String(val);
  if (!H2C_UNSUPPORTED_COLOR.test(t)) return t;
  if (/shadow$/i.test(prop)) return 'none';
  if (/background-image/i.test(prop)) return 'none';
  if (prop === 'border-image' || prop === 'border-image-source') return 'none';
  const probe = document.createElement('div');
  document.body.appendChild(probe);
  let out;
  try {
    probe.style.setProperty(prop, t);
    out = getComputedStyle(probe).getPropertyValue(prop);
  } catch {
    document.body.removeChild(probe);
    const r = resolveCssColorForHtml2canvas(t);
    if (/^background/i.test(prop) && r === '#000000') return '#ffffff';
    return r;
  }
  document.body.removeChild(probe);
  if (out && !H2C_UNSUPPORTED_COLOR.test(out)) return out;
  const resolved = resolveCssColorForHtml2canvas(t);
  if (/^background/i.test(prop) && resolved === '#000000') return '#ffffff';
  return resolved;
}

/** Retire Tailwind / CSS global du clone : le parseur interne d’html2canvas lit encore ces règles. */
function stripClonedDocumentStylesheets(clonedDoc) {
  if (!clonedDoc) return;
  clonedDoc.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"], style').forEach((el) => {
    el.remove();
  });
}

/**
 * html2canvas parse toujours le fond de documentElement et body du clone (iframe) ;
 * avec Tailwind v4, getComputedStyle peut renvoyer oklch → erreur avant le rendu du slot.
 */
function patchClonedIframeRootForHtml2canvas(clonedDoc) {
  stripClonedDocumentStylesheets(clonedDoc);
  const htmlEl = clonedDoc.documentElement;
  const bodyEl = clonedDoc.body;
  if (htmlEl) {
    htmlEl.style.setProperty('background-color', '#ffffff', 'important');
    htmlEl.style.setProperty('color', '#0f172a', 'important');
  }
  if (bodyEl) {
    bodyEl.style.setProperty('background-color', '#ffffff', 'important');
    bodyEl.style.setProperty('color', '#0f172a', 'important');
  }
}

function stripClassesFromCloneSubtree(clonedRoot) {
  clonedRoot.removeAttribute('class');
  clonedRoot.querySelectorAll('*').forEach((el) => el.removeAttribute('class'));
}

/**
 * Parcours DFS identique à la copie html2canvas : chaque nœud reçoit un id stable
 * pour recoller les styles calculés (l’ordre querySelectorAll('*') ≠ ordre clone → chevauchements).
 */
function stampPrintTreeForH2c(root) {
  let seq = 0;
  const walk = (el) => {
    el.setAttribute('data-print-h2c-id', String(seq));
    seq += 1;
    for (let i = 0; i < el.children.length; i += 1) {
      walk(el.children[i]);
    }
  };
  walk(root);
}

function clearPrintTreeH2cStamps(root) {
  const walk = (el) => {
    el.removeAttribute('data-print-h2c-id');
    for (let i = 0; i < el.children.length; i += 1) {
      walk(el.children[i]);
    }
  };
  walk(root);
}

function inlineComputedStylesForHtml2canvas(originalRoot, clonedRoot) {
  stripClassesFromCloneSubtree(clonedRoot);

  const origById = new Map();
  const collectOrig = (el) => {
    const id = el.getAttribute('data-print-h2c-id');
    if (id != null) origById.set(id, el);
    for (let i = 0; i < el.children.length; i += 1) {
      collectOrig(el.children[i]);
    }
  };
  collectOrig(originalRoot);

  const applyToClone = (el) => {
    const id = el.getAttribute('data-print-h2c-id');
    const o = id != null ? origById.get(id) : null;
    if (o) {
      const cs = window.getComputedStyle(o);
      for (let j = 0; j < cs.length; j += 1) {
        const prop = cs[j];
        let val = cs.getPropertyValue(prop);
        if (!val) continue;
        val = sanitizeStyleValueForHtml2canvas(prop, val);
        try {
          el.style.setProperty(prop, val, 'important');
        } catch {
          /* propriété non applicable sur ce nœud */
        }
      }
      if (H2C_UNSUPPORTED_COLOR.test(cs.getPropertyValue('background-image'))) {
        el.style.setProperty('background-image', 'none', 'important');
        const bgc = sanitizeStyleValueForHtml2canvas('background-color', cs.backgroundColor);
        el.style.setProperty('background-color', bgc, 'important');
      }
      el.style.setProperty('filter', 'none', 'important');
      el.style.setProperty('backdrop-filter', 'none', 'important');
    }
    for (let i = 0; i < el.children.length; i += 1) {
      applyToClone(el.children[i]);
    }
  };
  applyToClone(clonedRoot);
}

/**
 * Repli : html2canvas + patch oklch (voir helpers plus haut). Moins fidèle au navigateur.
 */
async function captureOrientationNodeWithHtml2canvas(element) {
  const html2canvas = (await import('html2canvas')).default;
  stampPrintTreeForH2c(element);
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      foreignObjectRendering: false,
      onclone: (clonedDoc, clonedSlot) => {
        patchClonedIframeRootForHtml2canvas(clonedDoc);
        inlineComputedStylesForHtml2canvas(element, clonedSlot);
      },
    });
    return canvas.toDataURL('image/png');
  } finally {
    clearPrintTreeH2cStamps(element);
  }
}

/**
 * Capture du viewport damier → PNG (data URL).
 * 1) **html-to-image** (`toPng`) : clone + SVG + canvas du navigateur — en général plus proche du rendu écran.
 * 2) Repli **html2canvas** si échec ou image vide.
 *
 * Pipeline PDF : même nœud `[data-print-capture-root]` puis grille 3×4 dans jsPDF.
 *
 * @param {HTMLElement} element - viewport (`overflow-hidden rounded-full`)
 */
async function captureOrientationNodeToPngDataUrl(element) {
  try {
    const { toPng } = await import('html-to-image');
    const rect = element.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      width: w,
      height: h,
    });
    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image') && dataUrl.length > 300) {
      return dataUrl;
    }
  } catch (e) {
    console.warn('html-to-image (PDF orientation), repli html2canvas:', e);
  }
  return captureOrientationNodeWithHtml2canvas(element);
}

/**
 * Modal : aperçu PDF (damiers en grille 3×4 par page) + téléchargement.
 */
function CourseOrientationPrintModal({
  isOpen,
  onClose,
  courseName,
  damiers,
  defaultDamierView,
  versionKey,
}) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [error, setError] = useState(null);
  const pdfBlobRef = useRef(null);
  const offscreenRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      pdfBlobRef.current = null;
      setPdfReady(false);
      setError(null);
      setGenerating(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (!damiers?.length) {
        setError('Aucun damier à imprimer');
        setGenerating(false);
        return;
      }

      setGenerating(true);
      setPdfReady(false);
      setError(null);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      pdfBlobRef.current = null;

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 100));

      try {
        const { jsPDF } = await import('jspdf');

        /** Viewport circulaire par damier (même nœud qu’à l’écran) → PNG. */
        const slots = offscreenRef.current?.querySelectorAll('[data-print-capture-root]');
        if (!slots?.length) throw new Error('Rendu des damiers indisponible');

        const images = [];
        for (let i = 0; i < slots.length; i++) {
          if (cancelled) return;
          images.push(await captureOrientationNodeToPngDataUrl(slots[i]));
        }

        if (cancelled) return;

        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pageW = 210;
        const pageH = 297;
        // Marges ultra faibles => damiers maximisés.
        const marginX = 0;
        const marginBottom = 0.5;

        // Titre PDF : nom du 1er damier (ex-PLAN) centré en haut.
        const titleText = damierDisplayName(damiers?.[0], 0);
        const hasTitle = Boolean((titleText || '').trim());
        const titleY = 7.5;
        const contentTop = hasTitle ? 10.5 : 4.5;

        const usableW = pageW - 2 * marginX;
        const usableH = pageH - contentTop - marginBottom;

        // Réserve sous chaque image : ligne d'underscores + marge basse (pour espacer, surtout en layout vertical).
        // Zone sous damier : marge (damier→underscores) + underscores + marge basse.
        // IMPORTANT: cette réserve DOIT être incluse dans les calculs de taille, sinon l'image "mange" l'espace
        // et la ligne "_" finit collée au damier.
        // Augmenter l'espace damier → underscores sans changer la taille du damier :
        // on redistribue la réserve sous-damier (top margin ↑, gap entre lignes ↓).
        const underscoresTopMarginMm = 5;
        const underscoreLineGapMm = 6.8;
        const underscoresMm = 3.0;
        const underscoresBottomMarginMm = 0.2;
        const reservedUnderDamierMm = underscoresTopMarginMm + (underscoresMm * 2) + underscoreLineGapMm + underscoresBottomMarginMm;

        // Moins de padding interne => damiers plus grands.
        const innerPad = 0;

        const drawPageTitle = () => {
          if (!hasTitle) return;
          pdf.setFontSize(16);
          pdf.setTextColor(15, 23, 42);
          pdf.text(titleText, pageW / 2, titleY, {
            align: 'center',
            maxWidth: usableW,
          });
        };

        const countVioletBalises = (damier) => {
          const grid = ensureBaliseObjects(damier?.orientationGrid || {});
          let n = 0;
          for (const k of Object.keys(grid)) {
            if (k === 'icons' || k === 'debut') continue;
            const kind = getCellKind(grid[k]);
            if (kind === 'position' || kind === 'fin') n += 1;
          }
          return n;
        };

        const damierCount = Array.isArray(damiers) ? damiers.length : 0;
        const useVerticalLayout = damierCount > 0 && damierCount <= ORIENTATION_PRINT_VERTICAL_MAX_PER_PAGE;

        // Objectif: damiers plus grands, mais sans exagérer.
        // - 1..3 damiers: empilement vertical (déjà géré)
        // - 4..5 damiers: 2×2 (4 par page)
        // - 6..10 damiers: 2×3 (6 par page)
        // - au-delà: 2×4 (historique)
        const gridPreset =
          damierCount <= 5 ? { cols: 2, rows: 2 }
          : damierCount <= 10 ? { cols: 2, rows: 3 }
          : { cols: ORIENTATION_PRINT_COLS, rows: ORIENTATION_PRINT_ROWS };

        const cols = useVerticalLayout ? 1 : gridPreset.cols;
        const rows = useVerticalLayout ? Math.min(ORIENTATION_PRINT_VERTICAL_MAX_PER_PAGE, damierCount) : gridPreset.rows;
        const perPage = cols * rows;

        // En mode grille, ajouter de vrais espacements verticaux entre rangées,
        // avec un gros "margin" après la 1ère ligne (sous les 2 premiers damiers).
        const gridRowGapMm = 0.1;
        const gridExtraGapAfterFirstRowMm = 18;
        const gridExtraGapAfterSecondRowMm = 18;
        const totalGridGapsMm = useVerticalLayout
          ? 0
          : Math.max(
              0,
              (rows - 1) * gridRowGapMm +
                (rows > 1 ? gridExtraGapAfterFirstRowMm : 0) +
                (rows > 2 ? gridExtraGapAfterSecondRowMm : 0),
            );

        const cellW = usableW / cols;
        const cellH = useVerticalLayout ? usableH / rows : Math.max(1, (usableH - totalGridGapsMm) / rows);

        // Mode "vertical" : espacement bien visible entre damiers.
        // 3 damiers: gap fort mais réaliste ; 1-2 damiers: gap très large.
        const verticalGapMinMm = rows >= 3 ? 30 : 66;
        const maxWVertical = usableW * (1 - 2 * innerPad);
        const gapCount = Math.max(0, rows - 1);
        const usableHForBlocks = Math.max(0, usableH - gapCount * verticalGapMinMm);
        const maxHVertical = (usableHForBlocks / rows) * (1 - 2 * innerPad) - reservedUnderDamierMm;
        const drawSizeVertical = Math.max(1, Math.min(maxWVertical, maxHVertical));
        const blockHVertical = drawSizeVertical + reservedUnderDamierMm;
        const remainingH = Math.max(0, usableHForBlocks - rows * blockHVertical);
        const gapBetweenVertical =
          gapCount > 0 ? verticalGapMinMm + remainingH / gapCount : 0;

        for (let i = 0; i < images.length; i++) {
          if (i === 0) drawPageTitle();
          if (i > 0 && i % perPage === 0) {
            pdf.addPage();
            drawPageTitle();
          }
          const slotOnPage = i % perPage;
          const col = slotOnPage % cols;
          const row = Math.floor(slotOnPage / cols);

          const cellLeft = marginX + col * cellW;
          const cellTop = useVerticalLayout
            ? contentTop + row * cellH
            : contentTop +
              row * cellH +
              row * gridRowGapMm +
              (row >= 1 ? gridExtraGapAfterFirstRowMm : 0) +
              (row >= 2 ? gridExtraGapAfterSecondRowMm : 0);

          const props = pdf.getImageProperties(images[i]);
          const isSquareish = Math.abs(props.width - props.height) < Math.max(props.width, props.height) * 0.08;

          let drawW;
          let drawH;
          let x;
          let y;
          let labelX;
          let labelY;
          let labelMaxW;

          if (useVerticalLayout) {
            // Un seul damier par ligne, répartis sur la hauteur utile.
            if (isSquareish) {
              drawW = drawSizeVertical;
              drawH = drawSizeVertical;
            } else {
              drawW = maxWVertical;
              drawH = (props.height / props.width) * drawW;
              if (drawH > maxHVertical) {
                drawH = maxHVertical;
                drawW = (props.width / props.height) * drawH;
              }
            }

            const yRowTop = contentTop + row * (blockHVertical + gapBetweenVertical);
            x = marginX + (usableW - drawW) / 2;
            y = yRowTop + Math.max(0, (drawSizeVertical - drawH) / 2);
            labelX = marginX + usableW / 2;
            labelY = Math.min(contentTop + usableH - 1.2, yRowTop + drawSizeVertical + 4.2);
            labelMaxW = usableW - 2;
          } else {
            // Grille historique (2×4) : centrage dans chaque cellule.
            const maxW = cellW * (1 - 2 * innerPad);
            const maxH = cellH * (1 - 2 * innerPad) - reservedUnderDamierMm;

            if (isSquareish) {
              const drawSize = Math.min(maxW, maxH);
              drawW = drawSize;
              drawH = drawSize;
            } else {
              drawW = maxW;
              drawH = (props.height / props.width) * drawW;
              if (drawH > maxH) {
                drawH = maxH;
                drawW = (props.width / props.height) * drawH;
              }
            }

            x = cellLeft + (cellW - drawW) / 2;
            y = cellTop + (cellH - reservedUnderDamierMm - drawH) / 2;
            labelX = cellLeft + cellW / 2;
            labelY = Math.min(cellTop + cellH - 1.2, y + drawH + 4);
            labelMaxW = cellW - 2;
          }

          pdf.addImage(images[i], 'PNG', x, y, drawW, drawH);
          // Underscores "_" sur UNE ligne (sans retour) : autant que de balises violettes ("position") sur ce damier.
          const baliseCount = countVioletBalises(damiers[i]);
          if (baliseCount > 0) {
            // Positionner la ligne d'underscores dans une zone réservée, en gardant une marge en dessous.
            const areaTop = y + drawH + underscoresTopMarginMm;
            const areaBottom = useVerticalLayout
              ? contentTop + (row + 1) * (blockHVertical + gapBetweenVertical) - gapBetweenVertical - 2
              : cellTop + cellH - 2;
            const yTextMax = areaBottom - underscoresBottomMarginMm;
            const yText = Math.min(yTextMax, Math.max(areaTop, areaTop + underscoresMm * 0.7));
            const yText2 = Math.min(yTextMax, yText + underscoreLineGapMm);

            // Traits un peu plus larges : "__" par balise, sur UNE seule ligne.
            const underscores = Array.from({ length: baliseCount }, () => '__').join('  ');

            pdf.setTextColor(71, 85, 105);
            pdf.setFont('helvetica', 'bold');
            let fontSize = 13;
            pdf.setFontSize(fontSize);
            const maxW = Math.max(10, labelMaxW);
            while (fontSize > 6 && pdf.getTextWidth(underscores) > maxW) {
              fontSize -= 1;
              pdf.setFontSize(fontSize);
            }

            pdf.text(underscores, labelX, yText, { align: 'center' });
            pdf.text(underscores, labelX, yText2, { align: 'center' });
            pdf.setFont('helvetica', 'normal');
          }
        }

        const blob = pdf.output('blob');
        if (cancelled) return;
        pdfBlobRef.current = blob;
        setPdfUrl(URL.createObjectURL(blob));
        setPdfReady(true);
      } catch (e) {
        console.error('PDF course orientation:', e);
        setError(e?.message || 'Impossible de générer le PDF');
      } finally {
        if (!cancelled) setGenerating(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, versionKey]);

  const handleDownload = useCallback(() => {
    const blob = pdfBlobRef.current;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const raw = (courseName || 'course').trim() || 'course';
    const safe = raw.replace(/[<>:"/\\|?*]/g, '_').slice(0, 120);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orientation-${safe}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [courseName]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imprimer les damiers" wide>
      <div className="space-y-4">
        {generating && (
          <p className="text-sm text-slate-600" role="status">
            Génération du document PDF…
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {pdfUrl && !generating && (
          <iframe
            src={pdfUrl}
            className="w-full min-h-[min(72vh,720px)] rounded-lg border border-slate-200 bg-slate-100"
            title="Aperçu du PDF"
          />
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Fermer
          </button>
          <button
            type="button"
            disabled={!pdfReady || generating}
            onClick={handleDownload}
            className="rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2d5a87] transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            Télécharger le PDF
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Mise en page : si vous avez 1 à 3 damiers, ils sont empilés verticalement sur une page A4 avec un espacement
          réparti. Au-delà, la mise en page repasse en grille (2 damiers par ligne, 4 par colonne).
        </p>
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={offscreenRef}
            className="fixed left-[-9999px] top-0 z-[2147483640] flex flex-col gap-3 p-2 bg-white pointer-events-none"
            aria-hidden
          >
            {damiers.map((d, i) => (
              <div
                key={d.id}
                className="inline-flex min-w-[220px] flex-col items-center gap-1.5 rounded-xl bg-white p-2 shadow-sm border border-slate-200"
              >
                {/** La capture PDF cible `data-print-capture-root` sur le viewport (voir OrientationDotGrid). */}
                <div className="shrink-0">
                  <OrientationDotGrid
                    embedWidthPx={ORIENTATION_PRINT_DAMIER_PX}
                    resetKey={`print-${d.id}-${versionKey}`}
                    cells={ensureBaliseObjects(d.orientationGrid || {})}
                    initialView={d.view ?? defaultDamierView}
                    addTool="balise"
                    deleteTools={ORIENTATION_PRINT_DELETE_TOOLS}
                    onCellPlace={noopOrientationHandler}
                    onDebutPlace={noopOrientationHandler}
                    onDebutDelete={noopOrientationHandler}
                    selectedStickerId={STICKERS[0]?.id || ''}
                    onIconPlace={noopOrientationHandler}
                    onIconDelete={noopOrientationHandler}
                    showCapture={false}
                  />
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </Modal>
  );
}

/**
 * Une seule case cochée à la fois sur tout le panneau (Ajouter ou Supprimer, toutes lignes).
 * « Icon » ouvre un pop-up de stickers.
 * PLAN : Position (noirs) + Icon seulement. Damier complet : Balise (violets), Début, Fin.
 */
function layerItemsForMode(planMode) {
  if (planMode) {
    return LAYER_ITEMS.filter((x) => x.id === 'balise' || x.id === 'icon');
  }
  return LAYER_ITEMS.filter((x) => x.id === 'position' || x.id === 'debut' || x.id === 'fin');
}

function OrientationLayerChecklist({
  addTool,
  onAddToolChange,
  deleteTools,
  onDeleteToolsChange,
  selectedStickerId,
  onOpenStickerPicker,
  planMode,
}) {
  const visibleLayerItems = useMemo(() => layerItemsForMode(planMode), [planMode]);

  const handleAddClick = (id, placeable) => {
    if (!placeable) return;
    onDeleteToolsChange(() => emptyDeleteToolsState());
    onAddToolChange((prev) => (prev === id ? null : id));
  };

  const handleDeleteClick = (id, placeable) => {
    if (!placeable) return;
    onAddToolChange(null);
    onDeleteToolsChange((prev) => {
      if (prev[id]) {
        return emptyDeleteToolsState();
      }
      const next = emptyDeleteToolsState();
      next[id] = true;
      return next;
    });
  };

  /** Colonnes alignées sur les cases rondes (plus larges pour cibles tactiles) */
  const colCheckClass = 'w-12 shrink-0 flex justify-center items-center';
  const checkInputClass =
    'h-7 w-7 sm:h-8 sm:w-8 shrink-0 appearance-none rounded-full border-2 border-slate-300 bg-white cursor-pointer checked:border-[#1e3a5f] checked:bg-[#1e3a5f] focus:outline-none focus:ring-0 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="w-full max-w-[300px] flex flex-col shrink-0 md:min-w-[260px] md:self-start">
      <div
        className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] gap-x-2 mb-2 items-end"
        aria-hidden
      >
        <div className={`${colCheckClass}`}>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-600 leading-none whitespace-nowrap text-center">
            Ajouter
          </span>
        </div>
        <span className="min-w-0" />
        <div className={`${colCheckClass}`}>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-600 leading-none whitespace-nowrap text-center">
            Supprimer
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {visibleLayerItems.map(({ id, label, Icon, placeable }) => {
          const addChecked = addTool === id;
          const delChecked = Boolean(deleteTools[id]);
          const disabled = !placeable;
          return (
            <li key={id}>
              <div
                className={`grid grid-cols-[3rem_minmax(0,1fr)_3rem] gap-x-2 items-center rounded-xl px-2 py-2.5 shadow-sm border transition-[box-shadow,border-color] ${
                  disabled
                    ? 'opacity-60 bg-slate-50 border-slate-100'
                    : 'bg-white border-slate-100'
                }`}
              >
                <label
                  className={`${colCheckClass} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  title={
                    disabled
                      ? 'Bientôt disponible'
                      : 'Activer l’ajout de cet élément sur le damier'
                  }
                >
                  <input
                    type="checkbox"
                    checked={addChecked}
                    disabled={disabled}
                    onChange={() => handleAddClick(id, placeable)}
                    className={checkInputClass}
                  />
                </label>
                {id === 'icon' ? (
                  <button
                    type="button"
                    onClick={() => onOpenStickerPicker()}
                    className="flex items-center justify-center gap-2.5 min-w-0 text-center rounded-lg px-1 py-0.5 hover:bg-slate-50 transition-colors"
                    title="Ouvrir le catalogue de stickers"
                  >
                    <Icon />
                    <span className="text-slate-800 font-medium text-sm sm:text-[15px]">{label}</span>
                    {selectedStickerId && (
                      <span className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[7rem]">
                        ({selectedStickerId})
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2.5 min-w-0 text-center">
                    <Icon />
                    <span className="text-slate-800 font-medium text-sm sm:text-[15px]">{label}</span>
                  </div>
                )}
                <label
                  className={`${colCheckClass} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  title={
                    disabled
                      ? 'Bientôt disponible'
                      : 'Retirer ce type en cliquant sur les mailles'
                  }
                >
                  <input
                    type="checkbox"
                    checked={delChecked}
                    disabled={disabled}
                    onChange={() => handleDeleteClick(id, placeable)}
                    className={checkInputClass}
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Au-delà de ce déplacement (px), l’action est un panoramique et non un clic sur une maille */
const CLICK_PAN_THRESHOLD_PX = 10;

function OrientationCellFace({ cellRaw, isHovered, isDragging, embedPrint = false }) {
  const kind = getCellKind(cellRaw);

  const dotSizeClass = embedPrint
    ? 'w-[2px] h-[2px]'
    : 'w-[4.5px] h-[4.5px] sm:w-[5px] sm:h-[5px]';
  const dotStyleClass = embedPrint ? 'bg-slate-500/70' : 'bg-slate-400/55';
  const dotShadowClass = embedPrint ? '' : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]';
  const baseDot = (
    <span
      className={`rounded-full ${dotStyleClass} shrink-0 ${dotShadowClass} transition-[transform,box-shadow] duration-150 ease-out ${dotSizeClass} ${
        isHovered && !isDragging && !embedPrint
          ? 'scale-[1.35] ring-2 ring-slate-400/75 ring-offset-[1px] ring-offset-transparent'
          : ''
      }`}
      aria-hidden
    />
  );

  if (!kind) return baseDot;

  if (kind === 'balise') {
    if (embedPrint) {
      return <span className="inline-block w-[3px] h-[3px] rounded-full bg-black" aria-hidden />;
    }
    return (
      <span className="inline-flex items-center justify-center min-w-[10px] min-h-[10px] scale-125">
        <IconBalise />
      </span>
    );
  }
  if (kind === 'position') {
    const seq =
      typeof cellRaw === 'object' && cellRaw != null && Number.isFinite(cellRaw.seq) ? cellRaw.seq : null;
    if (embedPrint) {
      return (
        <span className="relative inline-flex items-center justify-center min-w-[16px] min-h-[16px]">
          <span
            className="inline-flex items-center justify-center rounded-full border-2 bg-fuchsia-500/10 w-[14px] h-[14px]"
            style={{ borderColor: VIOLET_ROSE_MAUVE }}
            aria-hidden
          />
          {seq != null && (
            <span
              className="absolute -top-[3px] -right-[3px] font-bold tabular-nums leading-none pointer-events-none drop-shadow-[0_0_2px_rgba(255,255,255,0.95)] text-[7px]"
              style={{ color: VIOLET_ROSE_MAUVE }}
            >
              {seq}
            </span>
          )}
        </span>
      );
    }
    return (
      <span className="relative inline-flex items-center justify-center scale-110 min-w-[28px] min-h-[28px]">
        <IconPosition />
        {seq != null && (
          <span
            className={`absolute -top-px -right-px font-bold tabular-nums leading-none pointer-events-none drop-shadow-[0_0_2px_rgba(255,255,255,0.95)] ${
              embedPrint ? 'text-[10px]' : 'text-[9px] sm:text-[10px]'
            }`}
            style={{ color: VIOLET_ROSE_MAUVE }}
          >
            {seq}
          </span>
        )}
      </span>
    );
  }
  if (kind === 'fin') {
    const seq =
      typeof cellRaw === 'object' && cellRaw != null && Number.isFinite(cellRaw.seq) ? cellRaw.seq : null;
    if (embedPrint) {
      return (
        <span className="relative inline-flex items-center justify-center min-w-[18px] min-h-[18px]">
          <span className="relative inline-flex items-center justify-center w-[14px] h-[14px]" aria-hidden>
            <span
              className="absolute rounded-full border-2 box-border w-[14px] h-[14px]"
              style={{ borderColor: VIOLET_ROSE_MAUVE }}
            />
            <span
              className="absolute rounded-full border-2 box-border w-[9px] h-[9px]"
              style={{ borderColor: VIOLET_ROSE_MAUVE }}
            />
          </span>
          {seq != null && (
            <span
              className="absolute -top-[3px] -right-[3px] font-bold tabular-nums leading-none pointer-events-none drop-shadow-[0_0_2px_rgba(255,255,255,0.95)] text-[7px]"
              style={{ color: VIOLET_ROSE_MAUVE }}
            >
              {seq}
            </span>
          )}
        </span>
      );
    }
    return (
      <span className="relative inline-flex items-center justify-center scale-110 min-w-[32px] min-h-[32px]">
        <IconFin />
        {seq != null && (
          <span
            className={`absolute -top-px -right-px font-bold tabular-nums leading-none pointer-events-none drop-shadow-[0_0_2px_rgba(255,255,255,0.95)] ${
              embedPrint ? 'text-[10px]' : 'text-[9px] sm:text-[10px]'
            }`}
            style={{ color: VIOLET_ROSE_MAUVE }}
          >
            {seq}
          </span>
        )}
      </span>
    );
  }
  if (kind === 'debut') {
    if (embedPrint) {
      return (
        <svg className="w-[6px] h-[6px]" viewBox="0 0 24 24" aria-hidden style={{ color: VIOLET_ROSE_MAUVE }}>
          <path fill="currentColor" d="M12 3L22 21H2L12 3z" />
        </svg>
      );
    }
    return (
      <span className="inline-flex items-center justify-center scale-90">
        <IconDebut />
      </span>
    );
  }

  return baseDot;
}

function OrientationDotGrid({
  resetKey = 0,
  cells = {},
  addTool,
  deleteTools,
  onCellPlace,
  onDebutPlace,
  onDebutDelete,
  selectedStickerId,
  onIconPlace,
  onIconDelete,
  initialView,
  onCaptureView,
  showCapture = false,
  /** Taille fixe (px) : rendu statique sans interaction (export PDF / impression) */
  embedWidthPx = null,
}) {
  const isEmbed = embedWidthPx != null && embedWidthPx > 0;
  const dots = useMemo(
    () => Array.from({ length: DAMIER_N * DAMIER_N }, (_, i) => i),
    [],
  );

  /** Balises violettes (type stocké `position`), triées par numéro — tracé entre centres */
  const balisesOrdered = useMemo(() => {
    const list = [];
    for (const [k, v] of Object.entries(cells || {})) {
      if (getCellKind(v) !== 'position') continue;
      const seq = typeof v === 'object' && v?.seq != null ? v.seq : 0;
      const idx = Number(k);
      if (!Number.isFinite(idx) || seq <= 0) continue;
      list.push({ idx, seq });
    }
    list.sort((a, b) => a.seq - b.seq);
    return list;
  }, [cells]);

  const viewportRef = useRef(null);
  const innerRef = useRef(null);
  const panRef = useRef({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredDotIndex, setHoveredDotIndex] = useState(null);
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    pendingCellIndex: null,
    pendingDebutHit: false,
    pendingIconMarkerId: null,
    panStarted: false,
  });
  const [captureToastShown, setCaptureToastShown] = useState(false);
  const captureToastTimerRef = useRef(null);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    if (captureToastTimerRef.current != null) {
      clearTimeout(captureToastTimerRef.current);
      captureToastTimerRef.current = null;
    }
    setCaptureToastShown(false);
  }, [resetKey]);

  useEffect(() => {
    return () => {
      if (captureToastTimerRef.current != null) {
        clearTimeout(captureToastTimerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (isEmbed) {
      setViewportSize(embedWidthPx);
      return;
    }
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewportSize(el.clientWidth);
    });
    ro.observe(el);
    setViewportSize(el.clientWidth);
    return () => ro.disconnect();
  }, [isEmbed, embedWidthPx]);

  useEffect(() => {
    if (isEmbed) {
      /**
       * PDF / impression : appliquer la vue capturée si disponible.
       * La vue stockée est en pixels écran ; on la remet à l’échelle du viewport d’embed (px).
       */
      const nextZoom =
        initialView && Number.isFinite(initialView.zoom) ? initialView.zoom : 1 / INNER_SCALE;
      const z = Math.max(0.35, Math.min(2.2, nextZoom));
      setZoom(z);
      const baseW =
        initialView && Number.isFinite(initialView.viewportSize) && initialView.viewportSize > 0
          ? initialView.viewportSize
          : null;
      const scale = baseW ? embedWidthPx / baseW : 1;
      const nextPan =
        initialView &&
        Number.isFinite(initialView.panX) &&
        Number.isFinite(initialView.panY)
          ? { x: initialView.panX * scale, y: initialView.panY * scale }
          : { x: 0, y: 0 };
      const w = embedWidthPx;
      const l = w * INNER_SCALE * z;
      const m = Math.max(0, (l - w) / 2);
      setPan({
        x: Math.max(-m, Math.min(m, nextPan.x)),
        y: Math.max(-m, Math.min(m, nextPan.y)),
      });
      setHoveredDotIndex(null);
      setIsDragging(false);
      return;
    }
    const nextZoom =
      initialView && Number.isFinite(initialView.zoom) ? initialView.zoom : 1;
    setZoom(Math.max(0.7, Math.min(1.6, nextZoom)));
    const nextPan =
      initialView &&
      Number.isFinite(initialView.panX) &&
      Number.isFinite(initialView.panY)
        ? { x: initialView.panX, y: initialView.panY }
        : { x: 0, y: 0 };
    setPan(nextPan);
    setHoveredDotIndex(null);
    setIsDragging(false);
  }, [resetKey, initialView, isEmbed, embedWidthPx]);

  const maxPan = useMemo(() => {
    const w = viewportSize;
    if (!w) return 0;
    const l = w * INNER_SCALE * zoom;
    return (l - w) / 2;
  }, [viewportSize, zoom]);

  const clampPan = useCallback(
    (x, y) => {
      const m = maxPan;
      return {
        x: Math.max(-m, Math.min(m, x)),
        y: Math.max(-m, Math.min(m, y)),
      };
    },
    [maxPan],
  );

  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    const el = viewportRef.current;
    if (!el) return;

    const cellEl = typeof e.target.closest === 'function' ? e.target.closest('[data-dot-index]') : null;
    const raw = cellEl?.getAttribute('data-dot-index');
    const idx = raw != null ? Number(raw) : null;
    const pendingCellIndex = idx != null && Number.isFinite(idx) ? idx : null;
    const debutEl = typeof e.target.closest === 'function' ? e.target.closest('[data-debut-marker]') : null;
    const pendingDebutHit = Boolean(debutEl);
    const iconMarkerEl =
      typeof e.target.closest === 'function' ? e.target.closest('[data-icon-marker]') : null;
    const pendingIconMarkerId = iconMarkerEl?.getAttribute?.('data-icon-id') ?? null;

    setHoveredDotIndex(null);
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: panRef.current.x,
      originY: panRef.current.y,
      pendingCellIndex,
      pendingDebutHit,
      pendingIconMarkerId,
      panStarted: false,
    };
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const dist = Math.hypot(dx, dy);

    if (!dragRef.current.panStarted && dist > CLICK_PAN_THRESHOLD_PX) {
      dragRef.current.panStarted = true;
      dragRef.current.pendingCellIndex = null;
      dragRef.current.pendingDebutHit = false;
      dragRef.current.pendingIconMarkerId = null;
      setIsDragging(true);
    }

    if (dragRef.current.panStarted) {
      setPan(
        clampPan(dragRef.current.originX + dx, dragRef.current.originY + dy),
      );
    }
  };

  const endDrag = (e) => {
    if (!dragRef.current.active) return;
    if (e.pointerId !== undefined && dragRef.current.pointerId !== e.pointerId) return;

    const { panStarted, pendingCellIndex, pendingDebutHit, pendingIconMarkerId } = dragRef.current;
    const anyDelete = Object.values(deleteTools || {}).some(Boolean);

    if (!panStarted) {
      if (
        pendingIconMarkerId &&
        deleteTools?.icon &&
        typeof onIconDelete === 'function'
      ) {
        onIconDelete(pendingIconMarkerId);
      } else if (pendingDebutHit && deleteTools?.debut && typeof onDebutDelete === 'function') {
        onDebutDelete();
      } else if (
        addTool === 'debut' &&
        !anyDelete &&
        typeof onDebutPlace === 'function'
      ) {
        const inner = innerRef.current;
        if (inner) {
          const r = inner.getBoundingClientRect();
          const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
          const y = Math.max(0, Math.min(r.height, e.clientY - r.top));
          const nx = r.width > 0 ? x / r.width : 0.5;
          const ny = r.height > 0 ? y / r.height : 0.5;
          onDebutPlace({ nx, ny });
        }
      } else if (
        addTool === 'icon' &&
        !anyDelete &&
        selectedStickerId &&
        typeof onIconPlace === 'function'
      ) {
        const inner = innerRef.current;
        if (inner) {
          const r = inner.getBoundingClientRect();
          const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
          const y = Math.max(0, Math.min(r.height, e.clientY - r.top));
          const nx = r.width > 0 ? x / r.width : 0.5;
          const ny = r.height > 0 ? y / r.height : 0.5;
          onIconPlace({ nx, ny });
        }
      } else if (pendingCellIndex !== null && typeof onCellPlace === 'function') {
        onCellPlace(pendingCellIndex);
      }
    }

    dragRef.current.active = false;
    dragRef.current.pointerId = null;
    dragRef.current.panStarted = false;
    setIsDragging(false);
    const el = viewportRef.current;
    if (el && e.pointerId !== undefined) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  /**
   * Diamètre = plus petit côté de l’écran, moins marges.
   * Ne pas utiliser % ici : dans un parent `w-fit`, `min(100%, …)` peut se résoudre à 0
   * et faire disparaître tout le damier.
   */
  const circleSize = isEmbed
    ? `${embedWidthPx}px`
    : 'min(100vw - 2rem, calc(min(100vw, 100vh, 100dvw, 100dvh) - 5.5rem))';

  const w = viewportSize;
  const lRaw = w > 0 ? w * INNER_SCALE * zoom : 0;
  /**
   * En export PDF (embed), des tailles fractionnaires (sous-pixels) peuvent faire “écraser”
   * certains ronds à la rasterisation (anti-aliasing). On force donc un carré interne en px entiers.
   */
  const l = isEmbed ? Math.round(lRaw) : lRaw;
  /** En impression/PDF, garder la même géométrie que l’écran pour fidélité du cadrage. */
  const embedGapPx = DAMIER_GAP_PX;
  const embedCellPx =
    isEmbed && l > 0
      ? Math.max(0, (l - (DAMIER_N - 1) * embedGapPx) / DAMIER_N)
      : 0;

  /** Balises violettes dans l’ordre, puis la Fin (relie la dernière balise violette à l’arrivée) */
  const routePolylinePoints = useMemo(() => {
    if (l <= 0) return null;
    const cell = l / DAMIER_N;
    const pts = [];
    balisesOrdered.forEach(({ idx }) => {
      const col = idx % DAMIER_N;
      const row = Math.floor(idx / DAMIER_N);
      pts.push(`${(col + 0.5) * cell},${(row + 0.5) * cell}`);
    });
    for (const [k, v] of Object.entries(cells || {})) {
      if (getCellKind(v) !== 'fin') continue;
      const idx = Number(k);
      if (!Number.isFinite(idx)) continue;
      const col = idx % DAMIER_N;
      const row = Math.floor(idx / DAMIER_N);
      pts.push(`${(col + 0.5) * cell},${(row + 0.5) * cell}`);
      break;
    }
    if (pts.length < 2) return null;
    return pts.join(' ');
  }, [balisesOrdered, cells, l]);

  /** Segment du marqueur Début (coords normalisées) vers le centre de la balise n°1 */
  const debutToFirstLine = useMemo(() => {
    if (l <= 0) return null;
    const debut = cells?.debut;
    if (getCellKind(debut) !== 'debut') return null;
    const nx = typeof debut === 'object' && Number.isFinite(debut.nx) ? debut.nx : 0.5;
    const ny = typeof debut === 'object' && Number.isFinite(debut.ny) ? debut.ny : 0.5;
    const first = balisesOrdered.find((b) => b.seq === 1) ?? null;
    if (!first) return null;
    const cell = l / DAMIER_N;
    const col = first.idx % DAMIER_N;
    const row = Math.floor(first.idx / DAMIER_N);
    return {
      x1: nx * l,
      y1: ny * l,
      x2: (col + 0.5) * cell,
      y2: (row + 0.5) * cell,
    };
  }, [balisesOrdered, cells, l]);

  const baliseStrokeW = l > 0 ? Math.max(1.5, (l / DAMIER_N) * 0.08) : 1.5;

  const applyZoom = useCallback(
    (nextZoom) => {
      const z = Math.max(0.7, Math.min(1.6, nextZoom));
      setZoom(z);
      // Re-clamp pan after zoom change (next render updates maxPan; clamp using current maxPan as best effort)
      setPan((p) => clampPan(p.x, p.y));
    },
    [clampPan],
  );

  return (
    <div
      className={`flex shrink-0 w-auto max-w-[100vw] box-border ${isEmbed ? 'pointer-events-none select-none' : ''}`}
    >
      <div
        className={
          isEmbed
            ? 'relative rounded-full border-2 border-slate-400 bg-white shadow-sm aspect-square box-border touch-none select-none'
            : 'relative rounded-full border border-slate-200/80 bg-slate-50/90 shadow-sm aspect-square box-border touch-none select-none'
        }
        style={{
          width: circleSize,
          touchAction: isEmbed ? 'none' : undefined,
          ...(isEmbed ? { backgroundColor: '#ffffff' } : {}),
        }}
      >
        <div
          ref={viewportRef}
          {...(isEmbed ? { 'data-print-capture-root': 'true' } : {})}
          className={`relative w-full h-full overflow-hidden rounded-full ${
            isEmbed ? 'cursor-default pointer-events-none bg-white' : isDragging ? 'cursor-grabbing' : 'cursor-default'
          }`}
          style={isEmbed ? { backgroundColor: '#ffffff' } : undefined}
          onPointerDown={isEmbed ? undefined : onPointerDown}
          onPointerMove={isEmbed ? undefined : onPointerMove}
          onPointerUp={isEmbed ? undefined : endDrag}
          onPointerCancel={isEmbed ? undefined : endDrag}
          role="img"
          aria-label="Damier de repères pour la course d'orientation — glisser pour se déplacer"
        >
          {w > 0 && l > 0 && (
            <div
              ref={innerRef}
              className="absolute left-0 top-0 z-0 min-h-0 min-w-0"
              style={{
                width: l,
                height: l,
                left: (w - l) / 2 + pan.x,
                top: (w - l) / 2 + pan.y,
              }}
            >
              {/* SVG en dehors de la grille : un enfant full-span cassait le placement des 22×22 mailles */}
              {(routePolylinePoints || debutToFirstLine) && (
                <svg
                  className="pointer-events-none absolute inset-0 z-0 size-full"
                  viewBox={`0 0 ${l} ${l}`}
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  {routePolylinePoints && (
                    <polyline
                      points={routePolylinePoints}
                      fill="none"
                      stroke={VIOLET_ROSE_MAUVE}
                      strokeWidth={baliseStrokeW}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.92}
                    />
                  )}
                  {debutToFirstLine && (
                    <line
                      x1={debutToFirstLine.x1}
                      y1={debutToFirstLine.y1}
                      x2={debutToFirstLine.x2}
                      y2={debutToFirstLine.y2}
                      stroke={VIOLET_ROSE_MAUVE}
                      strokeWidth={baliseStrokeW}
                      strokeLinecap="round"
                      opacity={0.95}
                    />
                  )}
                </svg>
              )}
              <div
                className="relative z-[1] grid min-h-0 min-w-0"
                style={
                  isEmbed && embedCellPx > 0
                    ? {
                        width: l,
                        height: l,
                        gap: `${embedGapPx}px`,
                        gridTemplateColumns: `repeat(${DAMIER_N}, ${embedCellPx}px)`,
                        gridTemplateRows: `repeat(${DAMIER_N}, ${embedCellPx}px)`,
                      }
                    : {
                        width: '100%',
                        height: '100%',
                        gap: `${DAMIER_GAP_PX}px`,
                        gridTemplateColumns: `repeat(${DAMIER_N}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${DAMIER_N}, minmax(0, 1fr))`,
                      }
                }
              >
                {dots.map((i) => {
                  const isHovered = hoveredDotIndex === i && !isDragging;
                  const cellRaw = cells[String(i)] ?? cells[i];
                  return (
                    <div
                      key={i}
                      data-dot-index={i}
                      className={`relative flex min-h-0 min-w-0 items-center justify-center ${
                        isEmbed ? 'pointer-events-none' : 'pointer-events-auto'
                      }`}
                      onMouseEnter={() => {
                        if (!isEmbed && !isDragging) setHoveredDotIndex(i);
                      }}
                      onMouseLeave={() => setHoveredDotIndex(null)}
                    >
                      <OrientationCellFace
                        cellRaw={cellRaw}
                        isHovered={isHovered}
                        isDragging={isDragging}
                        embedPrint={isEmbed}
                      />
                    </div>
                  );
                })}
              </div>
              {Array.isArray(cells?.icons) &&
                cells.icons.map((ic) => {
                  const sticker = STICKERS.find((s) => s.id === ic.stickerId);
                  const sid = ic.stickerId;
                  const cat =
                    sticker?.category ??
                    (typeof sid === 'string' &&
                    (sid.startsWith('circle-') || sid.startsWith('triangle-'))
                      ? 'shape'
                      : 'thematic');
                  const gridScale =
                    cat === 'shape' ? STICKER_GRID_SCALE_SHAPE : STICKER_GRID_SCALE_THEMATIC;
                  const printScaleFactor = isEmbed ? 0.42 : 1;
                  const nx = Number.isFinite(ic.nx) ? ic.nx : 0.5;
                  const ny = Number.isFinite(ic.ny) ? ic.ny : 0.5;
                  return (
                    <div
                      key={ic.id}
                      data-icon-marker
                      data-icon-id={ic.id}
                      className={`absolute z-[2] ${isEmbed ? 'pointer-events-none' : 'pointer-events-auto'}`}
                      style={{
                        left: `${nx * l}px`,
                        top: `${ny * l}px`,
                        transform: `translate(-50%, -50%) scale(${gridScale * printScaleFactor})`,
                      }}
                      aria-hidden
                    >
                      <span
                        className={`inline-flex items-center justify-center ${
                          isEmbed ? '' : 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
                        }`}
                      >
                        {sticker ? sticker.render() : <IconSticker />}
                      </span>
                    </div>
                  );
                })}
              {(() => {
                const debut = cells?.debut;
                const kind = getCellKind(debut);
                if (kind !== 'debut') return null;
                const nx = typeof debut === 'object' && Number.isFinite(debut.nx) ? debut.nx : 0.5;
                const ny = typeof debut === 'object' && Number.isFinite(debut.ny) ? debut.ny : 0.5;

                const x = nx * l;
                const y = ny * l;
                const first = balisesOrdered.find((b) => b.seq === 1) ?? balisesOrdered[0] ?? null;
                let angleDeg = 0;
                if (first) {
                  const cell = l / DAMIER_N;
                  const col = first.idx % DAMIER_N;
                  const row = Math.floor(first.idx / DAMIER_N);
                  const tx = (col + 0.5) * cell;
                  const ty = (row + 0.5) * cell;
                  angleDeg = (Math.atan2(ty - y, tx - x) * 180) / Math.PI + 90;
                }

                return (
                  <div
                    data-debut-marker
                    className={`absolute z-[3] ${isEmbed ? 'pointer-events-none' : 'pointer-events-auto'}`}
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
                      transformOrigin: 'center',
                    }}
                    aria-label="Début"
                  >
                    <span className="inline-flex items-center justify-center">
                      <svg
                        className={
                          isEmbed
                            ? 'h-5 w-5'
                            : 'w-9 h-9 sm:w-10 sm:h-10 drop-shadow-[0_0_2px_rgba(255,255,255,0.85)]'
                        }
                        viewBox="0 0 24 24"
                        aria-hidden
                        style={{ color: VIOLET_ROSE_MAUVE }}
                      >
                        <path fill="currentColor" d="M12 3L22 21H2L12 3z" />
                      </svg>
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        {w > 0 && !isEmbed && (
          <div className="absolute inset-0 z-20 flex items-start justify-between px-2.5 pt-2.5 pointer-events-none">
            <div className="pointer-events-auto">
              {showCapture && typeof onCaptureView === 'function' && (
                <div className="relative inline-flex shrink-0 items-center justify-center">
                  {captureToastShown && (
                    <span
                      role="status"
                      aria-live="polite"
                      className="pointer-events-none absolute left-[calc(100%-14px)] top-1/2 z-[1] -translate-y-1/2 whitespace-nowrap rounded-full border border-slate-700/40 bg-slate-900 px-2.5 py-1 pl-5 text-[11px] font-semibold text-white shadow-lg"
                    >
                      captured !
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (typeof onCaptureView !== 'function') return;
                      onCaptureView({
                        panX: panRef.current.x,
                        panY: panRef.current.y,
                        zoom,
                        viewportSize,
                      });
                      if (captureToastTimerRef.current != null) {
                        clearTimeout(captureToastTimerRef.current);
                      }
                      setCaptureToastShown(true);
                      captureToastTimerRef.current = window.setTimeout(() => {
                        setCaptureToastShown(false);
                        captureToastTimerRef.current = null;
                      }, 2000);
                    }}
                    className="relative z-[2] inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/95 border border-slate-200 shadow-md hover:bg-white transition-colors"
                    title="Capturer la vue"
                    aria-label="Capturer la vue"
                  >
                    <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M4 7a2 2 0 012-2h2l1-1h6l1 1h2a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 17a4 4 0 100-8 4 4 0 000 8z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  applyZoom(zoom - 0.1);
                }}
                className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/95 border border-slate-200 shadow-md hover:bg-white transition-colors"
                title="Dézoomer"
                aria-label="Dézoomer"
              >
                <span className="text-lg leading-none text-slate-800">−</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  applyZoom(zoom + 0.1);
                }}
                className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/95 border border-slate-200 shadow-md hover:bg-white transition-colors"
                title="Zoomer"
                aria-label="Zoomer"
              >
                <span className="text-lg leading-none text-slate-800">+</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Module Course d'orientation — création et damier de points
 */
function CourseOrientation() {
  const [courses, setCourses] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ nom: '', date: todayISO() });
  const [selectedId, setSelectedId] = useState(null);
  /** Damier actif à l’intérieur de la course sélectionnée */
  const [selectedDamierId, setSelectedDamierId] = useState(null);
  /** Case « Ajouter » : un seul type à la fois (Début : pas encore) */
  const [addTool, setAddTool] = useState('balise');
  /** Cases « Supprimer » : indépendantes par type */
  const [deleteTools, setDeleteTools] = useState(emptyDeleteToolsState);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState(STICKERS[0]?.id || null);
  const [renamingDamierId, setRenamingDamierId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteConfirmDamierId, setDeleteConfirmDamierId] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printRefreshSeq, setPrintRefreshSeq] = useState(0);
  const renameInputRef = useRef(null);

  /**
   * Après une suppression sur une maille, bloque un tout prochain « ajout » automatique
   * sur la même maille (double événement pointer / navigateur).
   */
  const postDeleteEmptyCellGuardRef = useRef({ key: null, at: 0 });

  useEffect(() => {
    const list = loadCourses();
    setCourses(list);
    if (list.length && !selectedId) {
      setSelectedId(list[list.length - 1].id);
    }
  }, []);

  const selectedCourse = courses.find((c) => c.id === selectedId) ?? null;
  const damiers = selectedCourse?.damiers ?? [];
  const selectedDamier =
    damiers.find((d) => d.id === selectedDamierId) ?? damiers[0] ?? null;
  const isPlanDamierSelected = selectedDamier?.damierMode === 'plan';
  const damierIdsKey = damiers.map((d) => d.id).join(',');
  const printVersionKey = `${selectedId ?? ''}-${damierIdsKey}-${printRefreshSeq}`;
  const deleteConfirmIndex =
    deleteConfirmDamierId != null ? damiers.findIndex((d) => d.id === deleteConfirmDamierId) : -1;
  const deleteConfirmLabel =
    deleteConfirmIndex >= 0 ? damierDisplayName(damiers[deleteConfirmIndex], deleteConfirmIndex) : '';

  useEffect(() => {
    if (!selectedCourse?.damiers?.length) {
      setSelectedDamierId(null);
      return;
    }
    const list = selectedCourse.damiers;
    setSelectedDamierId((prev) => {
      if (prev && list.some((d) => d.id === prev)) return prev;
      return list[list.length - 1].id;
    });
  }, [selectedId, damierIdsKey, selectedCourse?.damiers?.length]);

  useEffect(() => {
    setDeleteTools(emptyDeleteToolsState());
    postDeleteEmptyCellGuardRef.current = { key: null, at: 0 };
  }, [selectedId, selectedDamierId]);

  useEffect(() => {
    if (!selectedId || !selectedDamierId) return;
    setAddTool(isPlanDamierSelected ? 'balise' : 'position');
  }, [selectedId, selectedDamierId, isPlanDamierSelected]);

  useEffect(() => {
    setRenamingDamierId(null);
  }, [selectedId, damierIdsKey]);

  const persist = useCallback((list) => {
    setCourses(list);
    saveCourses(list);
  }, []);

  const handleCellPlace = useCallback(
    (index) => {
      if (!selectedId || !selectedDamierId) return;
      const key = String(index);
      setCourses((prev) => {
        const next = prev.map((c) => {
          if (c.id !== selectedId) return c;
          let courseChanged = false;
          let planGridAfterChange = null;
          const updatedDamierts = (c.damiers || []).map((d) => {
            if (d.id !== selectedDamierId) return d;
            const isPlanDamier = d.damierMode === 'plan';
            if (
              isPlanDamier &&
              (addTool === 'position' || addTool === 'fin' || addTool === 'debut')
            ) {
              return d;
            }
            if (!isPlanDamier && (addTool === 'balise' || addTool === 'icon')) {
              return d;
            }
            let grid = ensureBaliseObjects({ ...(d.orientationGrid || {}) });
            const raw = grid[key];
            const kind = getCellKind(raw);

            if (kind && deleteTools[kind]) {
              const nextGrid = { ...grid };
              if (kind === 'fin') {
                restoreUnderFinAtKey(nextGrid, key, raw);
                if (finReplacedVioletBalise(raw) && finHiddenVioletBaliseSeq(raw) > 0) {
                  renumberBalisesInPlace(nextGrid);
                } else if (finReplacedBlackPosition(raw)) {
                  syncFinSeqFromBalises(nextGrid);
                }
                postDeleteEmptyCellGuardRef.current = { key, at: Date.now() };
                courseChanged = true;
                if (isPlanDamier) planGridAfterChange = nextGrid;
                return { ...d, orientationGrid: nextGrid };
              }
              const restoreBalise =
                kind === 'position' &&
                typeof raw === 'object' &&
                raw != null &&
                raw.beneath === 'balise';
              delete nextGrid[key];
              if (kind === 'position') {
                renumberBalisesInPlace(nextGrid);
              }
              if (restoreBalise) {
                nextGrid[key] = 'balise';
                postDeleteEmptyCellGuardRef.current = { key: null, at: Date.now() };
              } else {
                postDeleteEmptyCellGuardRef.current = { key, at: Date.now() };
              }
              courseChanged = true;
              if (isPlanDamier) planGridAfterChange = nextGrid;
              return { ...d, orientationGrid: nextGrid };
            }

            const suppressionSeule = Object.values(deleteTools).some(Boolean);
            if (suppressionSeule) {
              return d;
            }

            if (addTool && addTool !== 'debut') {
              const nextGrid = { ...grid };
              const prevKind = getCellKind(nextGrid[key]);
              const guard = postDeleteEmptyCellGuardRef.current;
              if (
                addTool === 'balise' &&
                prevKind == null &&
                guard.key === key &&
                Date.now() - guard.at < 500
              ) {
                return d;
              }

              if (addTool === 'position') {
                let preservedBeneath = false;
                if (prevKind === 'position') {
                  preservedBeneath =
                    typeof nextGrid[key] === 'object' && nextGrid[key]?.beneath === 'balise';
                  delete nextGrid[key];
                  renumberBalisesInPlace(nextGrid);
                } else if (prevKind === 'fin') {
                  delete nextGrid[key];
                }
                const seq = nextBaliseSeq(nextGrid);
                if (preservedBeneath) {
                  nextGrid[key] = { type: 'position', seq, beneath: 'balise' };
                } else {
                  nextGrid[key] = positionPayload(seq, prevKind);
                }
                courseChanged = true;
                return { ...d, orientationGrid: nextGrid };
              }

              if (addTool === 'fin') {
                Object.keys(nextGrid).forEach((k) => {
                  if (k === 'debut' || k === 'icons') return;
                  if (getCellKind(nextGrid[k]) !== 'fin') return;
                  restoreUnderFinAtKey(nextGrid, k, nextGrid[k]);
                });
                renumberBalisesInPlace(nextGrid);

                const cellBeforeFin = nextGrid[key];
                const kindBeforeFin = getCellKind(cellBeforeFin);
                let finMeta = {};
                if (
                  kindBeforeFin === 'position' &&
                  typeof cellBeforeFin === 'object' &&
                  cellBeforeFin != null
                ) {
                  finMeta = {
                    replacesVioletBalise: true,
                    hiddenVioletBaliseSeq: Number.isFinite(cellBeforeFin.seq)
                      ? cellBeforeFin.seq
                      : 0,
                    hiddenBlackPositionUnderViolet: cellBeforeFin.beneath === 'balise',
                  };
                } else if (kindBeforeFin === 'balise') {
                  finMeta = { replacesBlackPosition: true };
                }
                const prevKindAfterRestore = kindBeforeFin;
                if (prevKindAfterRestore === 'position') {
                  delete nextGrid[key];
                  renumberBalisesInPlace(nextGrid);
                }
                const seqFin = maxBaliseSeq(nextGrid) + 1;
                nextGrid[key] = { type: 'fin', seq: seqFin, ...finMeta };
                courseChanged = true;
                return { ...d, orientationGrid: nextGrid };
              }

              if (prevKind === 'position') {
                delete nextGrid[key];
                renumberBalisesInPlace(nextGrid);
              } else if (prevKind === 'fin') {
                delete nextGrid[key];
              }
              nextGrid[key] = addTool;
              courseChanged = true;
              if (isPlanDamier) planGridAfterChange = nextGrid;
              return { ...d, orientationGrid: nextGrid };
            }

            return d;
          });
          if (planGridAfterChange) {
            const planBase = extractPlanPositionsAndIcons(planGridAfterChange);
            let anySynced = false;
            const synced = updatedDamierts.map((d) => {
              if (d.damierMode === 'plan') return d;
              const res = syncPlanPositionsAndIconsIntoGrid(d.orientationGrid || {}, planBase);
              if (!res.changed) return d;
              anySynced = true;
              return { ...d, orientationGrid: res.grid };
            });
            if (anySynced) {
              courseChanged = true;
              return { ...c, damiers: synced };
            }
          }
          if (!courseChanged) return c;
          return { ...c, damiers: updatedDamierts };
        });
        saveCourses(next);
        return next;
      });
    },
    [selectedId, selectedDamierId, addTool, deleteTools],
  );

  const handleIconPlace = useCallback(
    ({ nx, ny }) => {
      if (!selectedId || !selectedDamierId || !selectedStickerId) return;
      setCourses((prev) => {
        let planGridAfterChange = null;
        const next = prev.map((c) => {
          if (c.id !== selectedId) return c;
          const planDm = (c.damiers || []).find((d) => d.id === selectedDamierId);
          const isPlan = planDm?.damierMode === 'plan';
          return {
            ...c,
            damiers: (c.damiers || []).map((d) => {
              if (d.id !== selectedDamierId) return d;
              const grid = ensureBaliseObjects({ ...(d.orientationGrid || {}) });
              const icons = Array.isArray(grid.icons) ? [...grid.icons] : [];
              icons.push({
                id: `ic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                stickerId: selectedStickerId,
                nx,
                ny,
              });
              const nextGrid = { ...grid, icons };
              if (isPlan) planGridAfterChange = nextGrid;
              return { ...d, orientationGrid: nextGrid };
            }),
          };
        });
        if (selectedId) {
          const course = next.find((x) => x.id === selectedId);
          const dm = course?.damiers?.find((d) => d.id === selectedDamierId);
          if (dm?.damierMode === 'plan') {
            const planGrid = ensureBaliseObjects({ ...(dm.orientationGrid || {}) });
            const planBase = extractPlanPositionsAndIcons(planGridAfterChange || planGrid);
            const synced = course.damiers.map((d) => {
              if (d.damierMode === 'plan') return d;
              const res = syncPlanPositionsAndIconsIntoGrid(d.orientationGrid || {}, planBase);
              return res.changed ? { ...d, orientationGrid: res.grid } : d;
            });
            const next2 = next.map((c) => (c.id === selectedId ? { ...c, damiers: synced } : c));
            saveCourses(next2);
            return next2;
          }
        }
        saveCourses(next);
        return next;
      });
    },
    [selectedId, selectedDamierId, selectedStickerId],
  );

  const handleIconDelete = useCallback(
    (iconId) => {
      if (!selectedId || !selectedDamierId || !iconId) return;
      setCourses((prev) => {
        let planGridAfterChange = null;
        const next = prev.map((c) => {
          if (c.id !== selectedId) return c;
          const planDm = (c.damiers || []).find((d) => d.id === selectedDamierId);
          const isPlan = planDm?.damierMode === 'plan';
          return {
            ...c,
            damiers: (c.damiers || []).map((d) => {
              if (d.id !== selectedDamierId) return d;
              const grid = ensureBaliseObjects({ ...(d.orientationGrid || {}) });
              const icons = Array.isArray(grid.icons) ? grid.icons.filter((x) => x.id !== iconId) : [];
              const nextGrid = { ...grid, icons };
              if (isPlan) planGridAfterChange = nextGrid;
              return { ...d, orientationGrid: nextGrid };
            }),
          };
        });
        if (selectedId) {
          const course = next.find((x) => x.id === selectedId);
          const dm = course?.damiers?.find((d) => d.id === selectedDamierId);
          if (dm?.damierMode === 'plan') {
            const planGrid = ensureBaliseObjects({ ...(dm.orientationGrid || {}) });
            const planBase = extractPlanPositionsAndIcons(planGridAfterChange || planGrid);
            const synced = course.damiers.map((d) => {
              if (d.damierMode === 'plan') return d;
              const res = syncPlanPositionsAndIconsIntoGrid(d.orientationGrid || {}, planBase);
              return res.changed ? { ...d, orientationGrid: res.grid } : d;
            });
            const next2 = next.map((c) => (c.id === selectedId ? { ...c, damiers: synced } : c));
            saveCourses(next2);
            return next2;
          }
        }
        saveCourses(next);
        return next;
      });
    },
    [selectedId, selectedDamierId],
  );

  const handleDebutPlace = useCallback(
    ({ nx, ny }) => {
      if (!selectedId || !selectedDamierId) return;
      setCourses((prev) => {
        const course = prev.find((x) => x.id === selectedId);
        const dm = course?.damiers?.find((x) => x.id === selectedDamierId);
        if (dm?.damierMode === 'plan') return prev;
        const next = prev.map((c) => {
          if (c.id !== selectedId) return c;
          return {
            ...c,
            damiers: (c.damiers || []).map((d) => {
              if (d.id !== selectedDamierId) return d;
              const grid = ensureBaliseObjects({ ...(d.orientationGrid || {}) });
              const nextGrid = { ...grid, debut: { type: 'debut', nx, ny } };
              return { ...d, orientationGrid: nextGrid };
            }),
          };
        });
        saveCourses(next);
        return next;
      });
    },
    [selectedId, selectedDamierId],
  );

  const handleDebutDelete = useCallback(() => {
    if (!selectedId || !selectedDamierId) return;
    setCourses((prev) => {
      const course = prev.find((x) => x.id === selectedId);
      const dm = course?.damiers?.find((x) => x.id === selectedDamierId);
      if (dm?.damierMode === 'plan') return prev;
      const next = prev.map((c) => {
        if (c.id !== selectedId) return c;
        return {
          ...c,
          damiers: (c.damiers || []).map((d) => {
            if (d.id !== selectedDamierId) return d;
            const grid = ensureBaliseObjects({ ...(d.orientationGrid || {}) });
            if (!grid.debut) return d;
            const nextGrid = { ...grid };
            delete nextGrid.debut;
            return { ...d, orientationGrid: nextGrid };
          }),
        };
      });
      saveCourses(next);
      return next;
    });
  }, [selectedId, selectedDamierId]);

  const handleAddDamier = useCallback(() => {
    if (!selectedId) return;
    let newDmId = null;
    setCourses((prev) => {
      const next = prev.map((c) => {
        if (c.id !== selectedId) return c;
        const list = Array.isArray(c.damiers) ? c.damiers : [];
        const planDamier = list.find((d) => d?.damierMode === 'plan') ?? (list.length ? list[0] : null);
        const grid = planDamier ? clonePositionAndIconsFromGrid(planDamier.orientationGrid) : {};
        newDmId = newDamierId('dm');
        const dv = c.defaultDamierView;
        const viewFromPlan =
          dv &&
          typeof dv === 'object' &&
          Number.isFinite(dv.panX) &&
          Number.isFinite(dv.panY) &&
          Number.isFinite(dv.zoom)
            ? { panX: dv.panX, panY: dv.panY, zoom: dv.zoom }
            : undefined;
        return {
          ...c,
          damiers: [
            ...list,
            {
              id: newDmId,
              damierMode: 'full',
              orientationGrid: grid,
              ...(viewFromPlan ? { view: viewFromPlan } : {}),
            },
          ],
        };
      });
      saveCourses(next);
      return next;
    });
    if (newDmId) setSelectedDamierId(newDmId);
  }, [selectedId]);

  const commitDamierRename = useCallback(
    (damierId, draft, index) => {
      if (!selectedId || !damierId) return;
      const trimmed = (draft ?? '').trim();
      setCourses((prev) => {
        const next = prev.map((c) => {
          if (c.id !== selectedId) return c;
          return {
            ...c,
            damiers: (c.damiers || []).map((d, idx) => {
              if (d.id !== damierId) return d;
              const defaultLabel =
                idx === 0 && d.damierMode === 'plan' ? 'PLAN' : `Damier ${idx + 1}`;
              if (!trimmed || trimmed === defaultLabel) {
                const { nom: _n, ...rest } = d;
                return rest;
              }
              return { ...d, nom: trimmed };
            }),
          };
        });
        saveCourses(next);
        return next;
      });
      setRenamingDamierId(null);
    },
    [selectedId],
  );

  const handleConfirmDeleteDamier = useCallback(() => {
    if (!selectedId || !deleteConfirmDamierId) return;
    const toRemove = deleteConfirmDamierId;
    setCourses((prev) => {
      const next = prev.map((c) => {
        if (c.id !== selectedId) return c;
        const list = Array.isArray(c.damiers) ? c.damiers : [];
        if (list.length <= 1) return c;
        const target = list.find((d) => d.id === toRemove);
        if (target?.damierMode === 'plan') return c;
        return { ...c, damiers: list.filter((d) => d.id !== toRemove) };
      });
      saveCourses(next);
      setSelectedDamierId((prevSel) => {
        if (prevSel !== toRemove) return prevSel;
        const course = next.find((x) => x.id === selectedId);
        const dlist = course?.damiers || [];
        return dlist[dlist.length - 1]?.id ?? null;
      });
      return next;
    });
    setDeleteConfirmDamierId(null);
  }, [selectedId, deleteConfirmDamierId]);

  useEffect(() => {
    if (!renamingDamierId) return;
    const id = requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [renamingDamierId]);

  const openCreate = () => {
    setForm({ nom: '', date: todayISO() });
    setCreateOpen(true);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const nom = form.nom.trim();
    if (!nom) return;
    const id = `co-${Date.now()}`;
    const entry = {
      id,
      nom,
      date: form.date || todayISO(),
      damiers: [
        {
          id: newDamierId('dm'),
          nom: 'PLAN',
          damierMode: 'plan',
          orientationGrid: {},
        },
      ],
    };
    const next = [...courses, entry];
    persist(next);
    setSelectedId(id);
    setCreateOpen(false);
    setForm({ nom: '', date: todayISO() });
  };

  /** Affichage : migre les anciennes balises string et numérote */
  const orientationGridDisplay = useMemo(
    () => ensureBaliseObjects(selectedDamier?.orientationGrid || {}),
    [selectedDamier?.orientationGrid],
  );
  const initialDamierView = useMemo(
    () => selectedDamier?.view ?? selectedCourse?.defaultDamierView ?? null,
    [selectedDamier?.view, selectedCourse?.defaultDamierView],
  );

  const handleCaptureDamierView = useCallback(
    ({ panX, panY, zoom, viewportSize }) => {
      if (!selectedId || !selectedDamierId) return;
      const view = {
        panX,
        panY,
        zoom,
        ...(Number.isFinite(viewportSize) && viewportSize > 0 ? { viewportSize } : {}),
      };
      setCourses((prev) => {
        const next = prev.map((c) => {
          if (c.id !== selectedId) return c;
          const sel = (c.damiers || []).find((d) => d.id === selectedDamierId);
          const isPlanCapture = sel?.damierMode === 'plan';
          if (isPlanCapture) {
            return {
              ...c,
              defaultDamierView: view,
              damiers: (c.damiers || []).map((d) => ({ ...d, view })),
            };
          }
          return {
            ...c,
            damiers: (c.damiers || []).map((d) =>
              d.id !== selectedDamierId ? d : { ...d, view },
            ),
          };
        });
        saveCourses(next);
        return next;
      });
      setPrintRefreshSeq((s) => s + 1);
    },
    [selectedId, selectedDamierId],
  );
  /** École & Carte uniquement (Cercles / Triangles affichés par couleur dans le modal) */
  const stickerThematicGroups = useMemo(() => {
    const grouped = new Map();
    STICKERS.forEach((s) => {
      if (s.group === 'Cercles' || s.group === 'Triangles') return;
      if (!grouped.has(s.group)) grouped.set(s.group, []);
      grouped.get(s.group).push(s);
    });
    return Array.from(grouped.entries());
  }, []);

  const openStickerPicker = useCallback(() => {
    setStickerPickerOpen(true);
  }, []);

  const formatDateFr = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    try {
      return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-10 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/enseignant/application"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#1e3a5f] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux applications
        </Link>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-7 h-7 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 13L9 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Course d&apos;orientation</h1>
              {selectedCourse && (
                <p className="text-sm text-slate-500 mt-0.5 capitalize">{formatDateFr(selectedCourse.date)}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#1e3a5f] hover:bg-[#2d5a87] transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Créer une course d&apos;orientation
          </button>
        </div>

        {courses.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {courses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  c.id === selectedId
                    ? 'bg-[#1e3a5f] text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {c.nom}
              </button>
            ))}
          </div>
        )}

        {selectedCourse ? (
          <div className="mt-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">{selectedCourse.nom}</h2>
              <p className="text-sm text-slate-500 mt-1">{formatDateFr(selectedCourse.date)}</p>
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <p className="text-slate-600 mb-4">
              Créez une course d&apos;orientation pour afficher le damier de points.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="px-5 py-2.5 rounded-xl font-semibold text-[#1e3a5f] bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Nouvelle course
            </button>
          </div>
        )}
      </div>

      {selectedCourse && selectedDamier && (
        <div className="mt-6 w-full flex justify-center px-4">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-start gap-4 xl:gap-5 w-full max-w-[100rem] xl:justify-center">
            <aside
              className="flex flex-col w-full xl:w-56 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm min-h-[200px] xl:min-h-[360px]"
              aria-label="Liste des damiers"
            >
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Damiers
              </h3>
              <div className="flex flex-row xl:flex-col gap-2 overflow-x-auto xl:overflow-y-auto xl:flex-1 xl:min-h-0 pb-1 xl:pb-0 -mx-1 px-1 xl:mx-0 xl:px-0">
                {damiers.map((d, i) => {
                  const label = damierDisplayName(d, i);
                  const isSelected = d.id === selectedDamierId;
                  const isEditing = renamingDamierId === d.id;
                  const canDelete = damiers.length > 1;
                  const isPlanRow = d.damierMode === 'plan';
                  const canRename = true;
                  const canDeleteRow = canDelete && !(isPlanRow && i === 0);
                  return (
                    <div
                      key={d.id}
                      className={`flex shrink-0 xl:w-full items-stretch gap-0.5 rounded-xl border transition-colors min-w-[140px] xl:min-w-0 ${
                        isPlanRow
                          ? isSelected
                            ? 'border-orange-500 bg-orange-500 shadow-sm'
                            : 'border-orange-200 bg-orange-50/95 hover:border-orange-300'
                          : isSelected
                            ? 'border-[#1e3a5f] bg-[#1e3a5f] shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isEditing && canRename ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={() => commitDamierRename(d.id, renameDraft, i)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitDamierRename(d.id, renameDraft, i);
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setRenamingDamierId(null);
                            }
                          }}
                          className={`flex-1 min-w-0 rounded-l-lg px-2 py-2 text-sm font-medium text-slate-900 bg-white border-0 outline-none focus:ring-2 focus:ring-inset ${
                            isPlanRow ? 'focus:ring-orange-500' : 'focus:ring-[#1e3a5f]'
                          }`}
                          aria-label="Nom du damier"
                          maxLength={80}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedDamierId(d.id)}
                          onDoubleClick={(e) => {
                            if (!canRename) return;
                            e.preventDefault();
                            setRenameDraft(label);
                            setRenamingDamierId(d.id);
                          }}
                          title="Double-cliquer pour renommer"
                          className={`flex-1 min-w-0 text-left px-2.5 py-2.5 text-sm font-semibold rounded-l-[10px] select-none ${
                            isSelected
                              ? 'text-white'
                              : isPlanRow
                                ? 'text-orange-900'
                                : 'text-slate-700'
                          }`}
                        >
                          {label}
                        </button>
                      )}
                      {!canDeleteRow ? null : (
                        <button
                          type="button"
                          title={canDelete ? 'Supprimer ce damier' : 'Impossible : au moins un damier'}
                          onMouseDown={(e) => {
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmDamierId(d.id);
                          }}
                          className={`shrink-0 flex items-center justify-center w-9 rounded-r-[10px] transition-colors ${
                            isSelected
                              ? 'text-white/90 hover:bg-white/15'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-red-600'
                          }`}
                          aria-label="Supprimer ce damier"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleAddDamier}
                className="mt-4 inline-flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/90 px-3 py-2.5 text-sm font-semibold text-[#1e3a5f] hover:bg-slate-100 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter un damier
              </button>
              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="mt-2 inline-flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-[#1e3a5f] shadow-sm hover:bg-slate-50 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2h-1m-2-4H7m2 4v10m0-10V5a2 2 0 012-2h3.5a2 2 0 012 2v3M7 7h10"
                  />
                </svg>
                Imprimer
              </button>
            </aside>
            <div className="flex flex-col items-center md:flex-row md:items-start gap-4 md:gap-3 w-fit max-w-full mx-auto xl:mx-0">
              <OrientationDotGrid
                resetKey={`${selectedId}-${selectedDamierId}`}
                cells={orientationGridDisplay}
                addTool={addTool}
                deleteTools={deleteTools}
                onCellPlace={handleCellPlace}
                onDebutPlace={handleDebutPlace}
                onDebutDelete={handleDebutDelete}
                selectedStickerId={selectedStickerId}
                onIconPlace={handleIconPlace}
                onIconDelete={handleIconDelete}
                initialView={initialDamierView}
                onCaptureView={handleCaptureDamierView}
                showCapture
              />
              <OrientationLayerChecklist
                key={`${selectedId}-${selectedDamierId}`}
                addTool={addTool}
                onAddToolChange={setAddTool}
                deleteTools={deleteTools}
                onDeleteToolsChange={setDeleteTools}
                selectedStickerId={selectedStickerId}
                onOpenStickerPicker={openStickerPicker}
                planMode={isPlanDamierSelected}
              />
            </div>
          </div>
        </div>
      )}

      <CourseOrientationPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        courseName={selectedCourse?.nom}
        damiers={damiers}
        defaultDamierView={selectedCourse?.defaultDamierView}
        versionKey={printVersionKey}
      />

      <Modal
        isOpen={stickerPickerOpen}
        onClose={() => setStickerPickerOpen(false)}
        title="Choisir un sticker"
        wide
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            Clique sur un sticker pour le sélectionner. Coche « Ajouter » sur la ligne Icon, puis clique n’importe où sur
            le damier (même entre les points) pour placer le sticker.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Cercles</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">Par couleur — 3 tailles (petit, moyen, grand)</p>
              <div className="space-y-4">
                {STICKER_PICKER_SHAPE.circleRows.map(({ color, items }) => (
                  <div key={`c-${color.id}`} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border border-slate-200 shrink-0 shadow-inner"
                        style={{
                          backgroundColor: color.fill,
                          boxShadow:
                            color.id === 'white' ? 'inset 0 0 0 1px rgba(15,23,42,0.12)' : undefined,
                        }}
                      />
                      <span className="text-xs font-semibold text-slate-700">{color.label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-w-[220px]">
                      {items.map((s) => {
                        const selectedSticker = selectedStickerId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStickerId(s.id);
                              setStickerPickerOpen(false);
                            }}
                            title={s.label}
                            className={`flex items-center justify-center rounded-xl border p-2.5 bg-white transition-colors min-h-[52px] ${
                              selectedSticker
                                ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/25'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-slate-800 inline-flex">{s.render()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">Triangles</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">Par couleur — 3 tailles (petit, moyen, grand)</p>
              <div className="space-y-4">
                {STICKER_PICKER_SHAPE.triangleRows.map(({ color, items }) => (
                  <div key={`t-${color.id}`} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0" aria-hidden>
                        <path
                          d="M9 2 L16 15 H2 Z"
                          fill={color.fill}
                          stroke={color.stroke}
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-xs font-semibold text-slate-700">{color.label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-w-[220px]">
                      {items.map((s) => {
                        const selectedSticker = selectedStickerId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStickerId(s.id);
                              setStickerPickerOpen(false);
                            }}
                            title={s.label}
                            className={`flex items-center justify-center rounded-xl border p-2.5 bg-white transition-colors min-h-[52px] ${
                              selectedSticker
                                ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/25'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-slate-800 inline-flex">{s.render()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {stickerThematicGroups.map(([group, stickers]) => (
            <div key={group} className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">{group}</h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {stickers.map((s) => {
                  const selectedSticker = selectedStickerId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStickerId(s.id);
                        setStickerPickerOpen(false);
                      }}
                      title={s.label}
                      className={`flex items-center justify-center rounded-xl border p-2.5 bg-white transition-colors min-h-[52px] ${
                        selectedSticker
                          ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/25'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-slate-800 inline-flex scale-110">{s.render()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle course d'orientation">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label htmlFor="co-nom" className="block text-sm font-medium text-slate-700 mb-1">
              Nom de la course *
            </label>
            <input
              id="co-nom"
              type="text"
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              placeholder="Ex : Course du 29 mars"
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="co-date" className="block text-sm font-medium text-slate-700 mb-1">
              Date
            </label>
            <input
              id="co-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d5a87] transition-colors"
            >
              Créer
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirmDamierId != null}
        title="Supprimer ce damier ?"
        message={
          deleteConfirmLabel
            ? `Le damier « ${deleteConfirmLabel} » et tout son contenu seront supprimés. Cette action est irréversible.`
            : ''
        }
        onConfirm={handleConfirmDeleteDamier}
        onCancel={() => setDeleteConfirmDamierId(null)}
      />
    </div>
  );
}

export default CourseOrientation;
