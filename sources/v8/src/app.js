/* ALCO One, présentation v8 : lecteur d'écrans, animations autonomes, démonstrations, demande de démo.
   Tous les chiffres des démonstrations sont d'illustration. */
(function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nombre = (v, d = 0) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
const signe = (v, d = 0) => (v > 0 ? '+' : '') + nombre(v, d);
const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const racine = document.documentElement;

const CONTACTS = { a: 'contact@heymannsinc.com' };
/* Adresse du service qui reçoit les demandes (POST en JSON). Vide : la messagerie du visiteur prend le relais. */
const ENVOI_URL = '';

/* ---- Moteur des animations : une tâche par écran, jouée seulement quand il est actif ---- */
const TACHES = {};
const ENTREES = {};
let enPause = calme;
const chaque = (ms, f) => { let dernier = null; return (t) => { if (dernier === null) { dernier = t; return; } if ((t - dernier) * 1000 >= ms) { dernier = t; f(); } }; };
const balayage = (bas, haut, periode) => (t) => bas + (haut - bas) * (.5 - .5 * Math.cos(t * 2 * Math.PI / periode));

/* ---- Les treize modules ---- */
const MODULES = [
  { id: 'analyse', nom: 'Analyse du bilan', fam: 'bilan', dit: 'Dix vues de l’arrêté et ses contrôles de cohérence, avant toute projection.' },
  { id: 'ecoulement', nom: 'Écoulement', fam: 'bilan', dit: 'Le bilan en flux datés, ses gaps et la décomposition de leurs variations.' },
  { id: 'liquidite', nom: 'Liquidité', fam: 'bilan', dit: 'Les ratios réglementaires de la zone, calculés sur son propre référentiel.' },
  { id: 'irrbb', nom: 'IRRBB', fam: 'bilan', dit: 'La sensibilité de la valeur économique et de la marge d’intérêts aux taux.' },
  { id: 'tci', nom: 'TCI / FTP', fam: 'bilan', dit: 'Le taux de cession interne, les marges et le RAROC de chaque opération.' },
  { id: 'projection', nom: 'Projection dynamique', fam: 'bilan', dit: 'Le bilan et le plan à moyen terme, projetés par les moteurs de l’arrêté.' },
  { id: 'stress', nom: 'Stress test', fam: 'risques', dit: 'Sept familles de chocs, l’horizon de survie qu’ils laissent et le plan qui le rétablit.' },
  { id: 'risk', nom: 'Risk Management', fam: 'risques', dit: 'Crédit, marché et opérationnel au pilier 1, solvabilité, ICAAP et FODEP.' },
  { id: 'change', nom: 'Risque de change', fam: 'risques', dit: 'Les positions par devise et leur sensibilité aux cours.' },
  { id: 'ilaap', nom: 'ILAAP', fam: 'risques', dit: 'L’adéquation de la liquidité, lue sur les calculs des modules, en projection et sous stress.' },
  { id: 'gpo', nom: 'Portefeuille obligataire', fam: 'portefeuille', dit: 'La valorisation des titres, leur risque de taux et la simulation d’un achat.' },
  { id: 'rapports', nom: 'Rapports', fam: 'reporting', dit: 'Du rapport standard au dossier du comité, versionné, revu puis validé.' },
  { id: 'etats', nom: 'États réglementaires', fam: 'reporting', dit: 'Les états de votre zone, avec leur circuit de remise.' },
];
const SCENE_DE = { bilan: 's-bilan', risques: 's-risques', portefeuille: 's-portefeuille', reporting: 's-reporting' };
const choisis = new Set();

function majChoix() {
  $$('[data-ajout]').forEach((b) => {
    const dedans = choisis.has(b.dataset.ajout);
    b.setAttribute('aria-pressed', String(dedans));
    const seul = MODULES.find((m) => m.id === b.dataset.ajout);
    if (!b.dataset.base) b.dataset.base = b.textContent;
    b.textContent = !dedans ? b.dataset.base : (b.dataset.base === 'Ajouter à ma démo' ? '✓ Dans ma démo' : `✓ ${seul.nom} dans ma démo`);
  });
  $$('#choixForm .chip').forEach((c) => c.setAttribute('aria-pressed', String(choisis.has(c.dataset.id))));
  const n = choisis.size, compteur = $('#compteur');
  compteur.hidden = n === 0;
  compteur.textContent = n;
  const nb = $('#nbChoisis');
  if (nb) nb.textContent = n ? `(${n})` : '';
}
const boutonAjout = (id) => `<button type="button" class="btn ajout" data-ajout="${id}">Ajouter à ma démo</button>`;

/* ---- Lecteur d'écrans ---- */
const scenes = $$('.scene');
let rang = -1;
const estDeck = () => racine.classList.contains('deck');
/* Le module que le bouton de la ligne du décompte ajoute, écran par écran. */
const COURANT = { 's-portefeuille': 'gpo' };
function majBarre() {
  const s = scenes[rang], id = s && COURANT[s.id], b = $('#ajoutBarre');
  b.hidden = !id;
  if (id) b.dataset.ajout = id; else delete b.dataset.ajout;
  majChoix();
}
function ajuster(s) {
  if (!estDeck()) return;
  const p = $('.page', s);
  p.style.transform = 'none';
  const cs = getComputedStyle(s);
  const dispo = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const k = Math.min(1, dispo / p.offsetHeight);
  p.style.transform = k < 1 ? `scale(${k})` : '';
  s.dataset.echelle = k.toFixed(3);
}
const toutAjuster = () => scenes.forEach(ajuster);
function montrer(i, sansHash) {
  i = Math.max(0, Math.min(scenes.length - 1, i));
  if (i === rang) return;
  const avant = scenes[rang];
  if (avant) { avant.classList.remove('active'); avant.classList.remove('vu'); }
  rang = i;
  const s = scenes[i];
  s.classList.add('active');
  void s.offsetWidth;
  s.classList.add('vu');
  ajuster(s);
  if (ENTREES[s.id]) ENTREES[s.id]();
  majBarre();
  $('#rang').textContent = i + 1;
  $('#prec').disabled = i === 0;
  $('#suiv').disabled = i === scenes.length - 1;
  $('#progres').style.transform = `scaleX(${i / (scenes.length - 1)})`;
  $$('.nav button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.aller === s.id)));
  if (!sansHash) { try { history.replaceState(null, '', `#${s.id}`); } catch (e) { /* adresse figée : sans effet */ } }
}
function allerA(id) {
  const i = scenes.findIndex((s) => s.id === id);
  if (i < 0) return;
  if (estDeck()) montrer(i); else scenes[i].scrollIntoView({ behavior: calme ? 'auto' : 'smooth' });
}
$('#total').textContent = scenes.length;
$('#prec').addEventListener('click', () => montrer(rang - 1));
$('#suiv').addEventListener('click', () => montrer(rang + 1));
const ICONES = { pause: '<svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="1" width="2.4" height="8"/><rect x="6.1" y="1" width="2.4" height="8"/></svg>', lecture: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1l7 4-7 4z"/></svg>' };
function majLecture() {
  const b = $('#lecture');
  b.innerHTML = enPause ? ICONES.lecture : ICONES.pause;
  const texte = enPause ? 'Relancer les animations' : 'Mettre les animations en pause';
  b.setAttribute('aria-label', texte);
  b.title = texte;
  b.setAttribute('aria-pressed', String(enPause));
}
$('#lecture').addEventListener('click', () => {
  enPause = !enPause;
  majLecture();
  document.body.classList.toggle('a-l-arret', enPause);
});
majLecture();

document.addEventListener('click', (e) => {
  const ajout = e.target.closest('[data-ajout]');
  if (ajout) { const id = ajout.dataset.ajout; if (choisis.has(id)) choisis.delete(id); else choisis.add(id); majChoix(); }
  const aller = e.target.closest('[data-aller]');
  if (aller) allerA(aller.dataset.aller);
  const copier = e.target.closest('[data-copier]');
  if (copier) copierTexte(copier.dataset.copier, copier);
});
function copierTexte(t, bouton) {
  const fait = () => { const b = bouton.textContent; bouton.textContent = 'Copié'; setTimeout(() => { bouton.textContent = b; }, 1500); };
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(fait).catch(() => {});
}

addEventListener('keydown', (e) => {
  if (!estDeck() || !$('#intro').classList.contains('partie')) return;
  const cibleC = e.target.closest ? e.target : document.body;
  if (cibleC.closest('input, textarea, select')) return;
  const dansBouton = cibleC.closest('button, a');
  if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !dansBouton)) { e.preventDefault(); montrer(rang + 1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); montrer(rang - 1); }
  else if (e.key === 'Home') { e.preventDefault(); montrer(0); }
  else if (e.key === 'End') { e.preventDefault(); montrer(scenes.length - 1); }
});
let verrou = 0, cumul = 0;
addEventListener('wheel', (e) => {
  if (!estDeck() || !$('#intro').classList.contains('partie')) return;
  const zone = e.target.closest ? e.target.closest('.tb, .merci pre') : null;
  if (zone && zone.scrollHeight > zone.clientHeight) return;
  const now = performance.now();
  if (now < verrou) return;
  cumul += e.deltaY;
  if (Math.abs(cumul) < 40) return;
  montrer(rang + (cumul > 0 ? 1 : -1));
  cumul = 0;
  verrou = now + 850;
}, { passive: true });
let toucher = null;
addEventListener('touchstart', (e) => { if (!estDeck() || e.target.closest('input, button, a, .rail, .seg, .bascules, .form')) { toucher = null; return; } toucher = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
addEventListener('touchend', (e) => {
  if (!toucher) return;
  const dx = e.changedTouches[0].clientX - toucher[0], dy = e.changedTouches[0].clientY - toucher[1];
  toucher = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 60) return;
  const axe = Math.abs(dx) > Math.abs(dy) ? dx : dy;
  montrer(rang + (axe < 0 ? 1 : -1));
}, { passive: true });

/* ---- Outils de démonstration ---- */
function curseur(hote, { id, label, min, max, pas, val, fmt }, rappel) {
  const d = document.createElement('div');
  d.className = 'curseur';
  d.innerHTML = `<label for="${id}">${label}<output id="${id}V"></output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${pas}" value="${val}">`;
  hote.append(d);
  const input = $('input', d);
  const maj = () => {
    input.style.setProperty('--a', `${(input.value - min) / (max - min) * 100}%`);
    $('output', d).textContent = fmt(Number(input.value));
    rappel();
  };
  input.addEventListener('input', maj);
  return {
    valeur: () => Number(input.value),
    maj,
    poser(v) { const avant = input.value; input.value = v; if (input.value !== avant) maj(); },
  };
}
/* Sur téléphone, les onglets défilent au doigt : celui qui devient actif revient au centre. */
function centrer(el) {
  const zone = el.closest('.rail, .zoneC');
  if (!zone || zone.scrollWidth <= zone.clientWidth) return;
  const z = zone.getBoundingClientRect(), r = el.getBoundingClientRect();
  zone.scrollTo({ left: zone.scrollLeft + r.left - z.left - (z.width - r.width) / 2, behavior: calme ? 'auto' : 'smooth' });
}
function segment(hote, libelles, rappel, depart = 0) {
  hote.innerHTML = libelles.map((l, i) => `<button type="button" aria-pressed="${i === depart}">${l}</button>`).join('');
  const poser = (i) => $$('button', hote).forEach((x, j) => { x.setAttribute('aria-pressed', String(j === i)); if (j === i) centrer(x); });
  $$('button', hote).forEach((b, i) => b.addEventListener('click', () => { poser(i); rappel(i); }));
  return (i) => { poser(i); rappel(i); };
}
function taille(svg) {
  const r = svg.getBoundingClientRect();
  const W = Math.max(280, Math.round(svg.clientWidth || r.width)), H = Math.max(140, Math.round(svg.clientHeight || r.height));
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  return { W, H };
}
const teteDemo = (extra = '') => `<div class="demo-t"><div class="zoneC">${extra}</div><span class="note-i">Valeurs d’illustration</span></div>`;
const REDESSINS = new Set();

/* ---- Gaps ---- */
const GAPS = { libelles: ['≤ 1 mois', '1 à 3 mois', '3 à 12 mois', '1 à 5 ans', '> 5 ans'], gap: [15, -15, 5, 60, -65], cumul: [15, 0, 5, 65, 0] };
function poserGaps(hote, serie) {
  if (!hote.children.length) hote.innerHTML = GAPS.libelles.map((l, k) => `<div class="col" style="--k:${k}"><i></i><em></em><span>${l}</span></div>`).join('');
  const zero = 42, echelle = 30 / 70;
  $$('.col', hote).forEach((c, i) => {
    const v = serie[i], h = Math.max(Math.abs(v) * echelle, v === 0 ? .6 : 0), t = v >= 0 ? zero - h : zero;
    const barre = $('i', c), val = $('em', c);
    barre.style.top = `${t}%`; barre.style.height = `${h}%`;
    barre.className = v < 0 ? 'n' : '';
    val.textContent = signe(v);
    val.className = v < 0 ? 'bad' : '';
    val.style.top = v >= 0 ? `calc(${t}% - 1.45rem)` : `calc(${t + h}% + .2rem)`;
  });
}
const CASCADE = { depart: 43, arrivee: 60, max: 70, pas: [['Vieillissement', -9, 'var(--acc)'], ['Volume', 25, 'var(--mauve)'], ['Structure', 2, 'var(--mauve)'], ['Résidus', -1, 'var(--faint)']] };
function htmlCascade() {
  const pct = (v) => `${(v / CASCADE.max * 100).toFixed(2)}%`;
  const ligne = (nom, d, l, val, c) => `<div class="marche"><span>${nom}</span><span class="piste"><i style="--d:${pct(d)};--l:${pct(l)};--c:${c}"></i></span><b>${val}</b></div>`;
  let cumulC = CASCADE.depart;
  let h = ligne('Premier arrêté', 0, cumulC, cumulC, 'var(--acc-lo)');
  CASCADE.pas.forEach(([n, v, c]) => { const a = cumulC; cumulC += v; h += ligne(n, Math.min(a, cumulC), Math.abs(v), signe(v), c); });
  return `<div class="casc">${h}${ligne('Second arrêté', 0, CASCADE.arrivee, CASCADE.arrivee, 'var(--acc-lo)')}</div><p class="reboucle">✓ Écart +17 Md, inexpliqué 0 : la décomposition reboucle exactement.</p>`;
}

/* ---- Données de démonstration ---- */
const VUES = [
  ['Synthèse', [['Total du bilan', '690', 'Md'], ['Équilibre', 'Écart nul', '', 'ok'], ['Contrôles', '1 en échec', '', 'bad']]],
  ['Structure', [['Crédits à la clientèle', '61 %', 'actif'], ['Dépôts de la clientèle', '86 %', 'passif'], ['Fonds propres', '14,5 %', 'passif']]],
  ['Indicateurs', [['ROE', '11,8 %', '', 'ok'], ['Crédits sur dépôts', '71 %', '', 'ok'], ['Créances en souffrance', '6,2 %', '', 'bad']]],
  ['Réserves', [['Exigence', '17', 'Md'], ['Couverture', '112 %', '', 'ok'], ['Seuil d’alerte', '105 %']]],
  ['Évolution', [['Total du bilan', '+4,1 %'], ['Crédits', '+6,3 %'], ['Dépôts', '+2,8 %']]],
  ['Concentration', [['Dix premiers déposants', '18 %'], ['Vingt premiers emprunteurs', '27 %'], ['Indice HHI', '0,04']]],
  ['Maturités', [['Durée moyenne des crédits', '3,4', 'ans'], ['Durée moyenne des DAT', '11', 'mois'], ['Échéances dépassées', '0,8 %']]],
  ['Indicateurs projetés', [['Horizon', '2027'], ['Total projeté', '747', 'Md'], ['Croissance', '+8,3 %']]],
  ['Indicateurs stressés', [['Liquidité stressée', '78 %', '', 'warn'], ['Solvabilité stressée', '12,1 %', '', 'ok'], ['Scénario', 'Sévère']]],
  ['Contrôles', [['En échec', '1', '', 'bad'], ['À examiner', '2', '', 'warn'], ['Conformes', '24', '', 'ok']]],
];
const RATIOS = {
  UMOA: [['Coefficient de liquidité', 92, 75, 322, 'actifs disponibles et réalisables à un mois', 350, 'passifs exigibles à un mois'], ['Couverture des emplois à moyen et long terme', 57, 50, 194, 'ressources stables', 340, 'emplois à moyen et long terme'], ['LCR', 131, 100, 220, 'actifs liquides de haute qualité', 168, 'sorties nettes à 30 jours'], ['NSFR', 108, 100, 540, 'financement stable disponible', 500, 'financement stable exigé'], ['Couverture des réserves obligatoires', 112, 100, 19, 'avoirs à la banque centrale', 17, 'réserves exigées']],
  CEMAC: [['Rapport de liquidité à un mois', 118, 100, 413, 'disponible et réalisable à un mois', 350, 'exigible à un mois'], ['Coefficient de transformation à long terme', 64, 50, 54, 'ressources permanentes', 85, 'emplois à plus de cinq ans']],
};
const court = (t) => 250 * Math.exp(-t / 4), long = (t) => 100 * (1 - Math.exp(-t / 4));
const CHOCS = [
  ['Parallèle haussier', -11.2, -2.4, () => 200], ['Parallèle baissier', 7.9, 1.9, () => -200],
  ['Pentification', -5, .8, (t) => -.65 * court(t) + .9 * long(t)], ['Aplatissement', 3.2, -.6, (t) => .8 * court(t) - .6 * long(t)],
  ['Hausse des taux courts', -4, -1.6, (t) => court(t)], ['Baisse des taux courts', 2.8, 1.2, (t) => -court(t)],
];
const MATS = Array.from({ length: 61 }, (_, i) => i / 3);
const courbe = (t) => 4.4 + 2.4 * (1 - Math.exp(-t / 6));
const LIQ = { coussin: 150, depots: 590, duree: 18, sorties: .25, vue: 120, plafond: 365 };
const position = (t, f, c) => c - f / 100 * LIQ.depots * (1 - Math.exp(-t / LIQ.duree)) - LIQ.sorties * t;
function horizon(f, c) {
  if (position(LIQ.plafond, f, c) > 0) return Infinity;
  let a = 0, b = LIQ.plafond;
  for (let k = 0; k < 50; k++) { const m = (a + b) / 2; if (position(m, f, c) > 0) a = m; else b = m; }
  return b;
}
const FAMS = [['Liquidité', 0, 0], ['Taux d’intérêt', 0, 0], ['Spread de crédit', -7.5, 0], ['Notation', -10, -.2], ['Macroéconomie', 0, -.7], ['ESG et climat', 0, -.35], ['Change', 0, -.25]];

/* ---- Démonstrations : chacune rend sa tâche autonome ---- */
const DEMOS = {
  analyse(h) {
    const SEUILS = [['Crédits sur dépôts', 71, 100, '71 %', 'var(--ok)'], ['Créances en souffrance', 6.2, 5, '6,2 %', 'var(--bad)'], ['Couverture des réserves', 112, 105, '112 %', 'var(--ok)']];
    h.innerHTML = `${teteDemo('<div class="seg" id="vues"></div>')}<div class="duo">
      <div class="colonne"><div class="tuiles" id="vueT"></div><p class="phrase">Une alerte vue ici évite qu’un déséquilibre se propage dans tout l’écoulement.</p></div>
      <div class="colonne"><p class="sous-t">Indicateurs face à leurs seuils</p><div class="barres">${SEUILS.map(([n, v, s, x, c]) => { const m = Math.max(v, s) * 1.25; return `<div class="seuil large"><span>${n}</span><span class="rail-s"><i class="etire" style="--l:${v / m * 100}%;--c:${c}"></i><u style="--s:${s / m * 100}%"></u></span><strong>${x}</strong></div>`; }).join('')}</div><p class="sous-t">Contrôles de cohérence : 24 conformes, 2 à examiner, 1 en échec</p><div class="bande"><i style="flex:24;background:var(--ok)"></i><i style="flex:2;background:var(--warn)"></i><i style="flex:1;background:var(--bad)"></i></div></div></div>`;
    const voir = (i) => { $('#vueT').innerHTML = VUES[i][1].map(([l, v, u, c]) => `<div class="tuile fondu"><span>${l}</span><b class="${c || ''}">${v}${u ? `<small>${u}</small>` : ''}</b></div>`).join(''); };
    const poser = segment($('#vues'), VUES.map((v) => v[0]), voir);
    voir(0);
    let i = 0;
    return chaque(2600, () => { i = (i + 1) % VUES.length; poser(i); });
  },
  ecoulement(h) {
    h.innerHTML = `${teteDemo('<div class="seg" id="ecoS"></div>')}<div id="ecoZ" class="plein"></div>`;
    const voir = (i) => {
      const z = $('#ecoZ');
      if (i === 2) { z.innerHTML = htmlCascade(); return; }
      if (!$('.gaps', z)) z.innerHTML = '<div class="gaps" id="ecoG" style="--h:21rem"></div><p class="phrase">Le dernier gap cumulé revient à zéro : le bilan s’équilibre.</p>';
      poserGaps($('#ecoG'), i ? GAPS.cumul : GAPS.gap);
    };
    const poser = segment($('#ecoS'), ['Gaps, Md FCFA', 'Gap cumulé', 'Variation du gap'], voir);
    voir(0);
    let i = 0;
    return chaque(3200, () => { i = (i + 1) % 3; poser(i); });
  },
  liquidite(h) {
    h.innerHTML = `${teteDemo('<div class="seg" id="zoneS"></div>')}<div class="duo"><div class="colonne"><div class="ratios" id="ratios"></div><p class="phrase" id="ratioP"></p></div><div class="colonne"><p class="sous-t">Le ratio sélectionné, sur cinq arrêtés</p><svg class="g" id="gRatio" style="--h:11.5rem" role="img" aria-label="Évolution du ratio sélectionné sur cinq arrêtés"></svg></div></div>`;
    let zone = 'UMOA', sel = 0;
    const svg = $('#gRatio');
    const serie = () => {
      if (!svg.isConnected) { REDESSINS.delete(serie); return; }
      const r = RATIOS[zone][sel], val = [.9, .95, .91, .97, 1].map((k) => r[1] * k), bas = Math.min(r[2], ...val) * .85, haut = Math.max(r[2], ...val) * 1.08;
      const { W, H } = taille(svg), X = (i) => 44 + i / 4 * (W - 56), Y = (v) => H - 22 - (v - bas) / (haut - bas) * (H - 34);
      const pts = val.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
      svg.innerHTML = `<line class="zero" x1="44" x2="${W - 12}" y1="${Y(r[2])}" y2="${Y(r[2])}" stroke-dasharray="4 4"/><text x="38" y="${Y(r[2]) + 4}" text-anchor="end">${r[2]} %</text>${['12/24', '03/25', '06/25', '09/25', '12/25'].map((d, i) => `<text x="${X(i)}" y="${H - 5}" text-anchor="${i === 4 ? 'end' : i ? 'middle' : 'start'}">${d}</text>`).join('')}<polyline class="trace tracee" pathLength="1" points="${pts}"/><circle class="fin-pt" cx="${X(4)}" cy="${Y(val[4])}" r="4.5"/>`;
    };
    const detail = (i) => { sel = i; const r = RATIOS[zone][i]; $('#ratioP').innerHTML = `<b>${r[3]}</b> Md de ${r[4]}, sur <b>${r[5]}</b> Md de ${r[6]}.`; $$('#ratios .ratio').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i))); serie(); };
    REDESSINS.add(serie);
    const voir = () => {
      $('#ratios').innerHTML = RATIOS[zone].map((r) => `<button type="button" class="ratio fondu"><span>${r[0]}</span><b>${r[1]} %</b><small>norme ${r[2]} %</small></button>`).join('');
      $$('#ratios .ratio').forEach((b, i) => b.addEventListener('click', () => detail(i)));
      detail(0);
    };
    const poser = segment($('#zoneS'), ['UMOA', 'CEMAC'], (i) => { zone = i ? 'CEMAC' : 'UMOA'; voir(); });
    voir();
    return chaque(2400, () => {
      if (sel + 1 < RATIOS[zone].length) detail(sel + 1);
      else poser(zone === 'UMOA' ? 1 : 0);
    });
  },
  irrbb(h) {
    h.innerHTML = `${teteDemo()}<div class="cote"><svg class="g" id="gChoc" style="--h:23rem" role="img" aria-label="Courbe des taux avant et après le choc"></svg><div class="colonne"><div class="liste-b" id="chocs"></div><div class="cle"><span>ΔEVE sur Tier 1</span><b id="kEve"></b><p id="kMni"></p></div><p class="reboucle" id="kEtat"></p></div></div>`;
    let i = 0, deltas = MATS.map((t) => CHOCS[0][3](t) / 100), image = 0;
    const svg = $('#gChoc');
    const dessin = () => {
      if (!svg.isConnected) { REDESSINS.delete(dessin); return; }
      const { W, H } = taille(svg);
      const X = (t) => 36 + t / 20 * (W - 46), Y = (v) => H - 24 - (v - 1) / 8.5 * (H - 34);
      const pts = (f) => MATS.map((t, k) => `${X(t).toFixed(1)},${Y(f(t, k)).toFixed(1)}`);
      const a = pts((t) => courbe(t)), b = pts((t, k) => courbe(t) + deltas[k]);
      let s = '';
      [2, 4, 6, 8].forEach((v) => { s += `<line class="tr" x1="36" x2="${W - 10}" y1="${Y(v)}" y2="${Y(v)}"/><text x="30" y="${Y(v) + 4}" text-anchor="end">${v} %</text>`; });
      [0, 10, 20].forEach((t) => { s += `<text x="${X(t)}" y="${H - 6}" text-anchor="${t === 20 ? 'end' : t ? 'middle' : 'start'}">${t ? `${t} ans` : 'Court terme'}</text>`; });
      svg.innerHTML = `${s}<polygon class="aire" points="${a.concat(b.slice().reverse()).join(' ')}"/><polyline class="base" points="${a.join(' ')}"/><polyline class="trace" points="${b.join(' ')}"/>`;
    };
    const infos = () => {
      const [, eve, mni] = CHOCS[i];
      $('#kEve').textContent = `${signe(eve, 1)} %`;
      $('#kMni').textContent = `ΔMNI à un an : ${signe(mni, 1)} %`;
      $('#kEtat').textContent = eve < 0 ? '✓ Sous le seuil de 15 % du test des valeurs extrêmes.' : '✓ Gain de valeur économique.';
      $$('#chocs button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    };
    const choisir = (j) => {
      const dep = deltas, cib = MATS.map((t) => CHOCS[j][3](t) / 100);
      i = j; infos(); cancelAnimationFrame(image);
      if (calme) { deltas = cib; dessin(); return; }
      const t0 = performance.now();
      const pas = (t) => { const u = Math.min((t - t0) / 700, 1), l = 1 - Math.pow(1 - u, 3); deltas = dep.map((d, k) => d + (cib[k] - d) * l); if (svg.isConnected) { dessin(); if (u < 1) image = requestAnimationFrame(pas); } };
      image = requestAnimationFrame(pas);
    };
    $('#chocs').innerHTML = CHOCS.map((c) => `<button type="button">${c[0]}</button>`).join('');
    $$('#chocs button').forEach((b, j) => b.addEventListener('click', () => choisir(j)));
    infos(); dessin(); REDESSINS.add(dessin);
    return chaque(2400, () => choisir((i + 1) % CHOCS.length));
  },
  tci(h) {
    h.innerHTML = `${teteDemo('<div class="seg" id="tciP"></div>')}<div class="duo"><div class="colonne"><div class="pile-g" id="tciC"></div><div class="cle"><span>RAROC de l’opération</span><b id="tciR"></b><p id="tciS"></p></div></div><div class="colonne"><p class="sous-t">Du taux de cession interne au taux client</p><div class="barres" id="tciCompo"></div><p class="phrase">Le taux client se lit tout de suite face au TCI, au coût du risque et au seuil de rentabilité.</p></div></div>`;
    const PROD = [[1.2, 1], [.6, .5], [1.8, 1]];
    let p = 0, d, t;
    const calcul = () => {
      if (!d || !t) return;
      const [ri, po] = PROD[p], du = d.valeur(), ta = t.valeur();
      const pivot = 4 + 2.2 * (1 - Math.exp(-du / 4)), liq = .25 + .08 * du, res = .15, tci = pivot + liq + res;
      const plancher = tci + ri + 1, raroc = (ta - plancher) / (11.5 * po) * 100, ok = raroc >= 15;
      $('#tciCompo').innerHTML = [['Composante taux', pivot, 'var(--acc-hi)'], ['Composante liquidité', liq, 'var(--mauve)'], ['Réserves obligatoires', res, 'var(--faint)'], ['Taux plancher', plancher, 'var(--text)'], ['Taux client', ta, 'var(--ok)']].map(([n, v, co]) => `<div class="seuil large"><span>${n}</span><span class="rail-s"><i style="--l:${v / 14 * 100}%;--c:${co}"></i></span><strong>${nombre(v, 2)} %</strong></div>`).join('');
      const r = $('#tciR'); r.textContent = `${nombre(raroc, 1)} %`; r.className = ok ? 'ok' : 'bad';
      $('#tciS').textContent = ok ? 'au-dessus du seuil de 15 %' : 'sous le seuil de 15 %';
    };
    const c = $('#tciC');
    d = curseur(c, { id: 'tD', label: 'Durée', min: 1, max: 15, pas: 1, val: 5, fmt: (v) => `${v} an${v > 1 ? 's' : ''}` }, calcul);
    const m = curseur(c, { id: 'tM', label: 'Montant', min: 50, max: 2000, pas: 50, val: 500, fmt: (v) => `${nombre(v)} M FCFA` }, () => {});
    t = curseur(c, { id: 'tT', label: 'Taux client', min: 6, max: 14, pas: .05, val: 10.5, fmt: (v) => `${nombre(v, 2)} %` }, calcul);
    segment($('#tciP'), ['Crédit aux entreprises', 'Crédit immobilier', 'Trésorerie des PME'], (i) => { p = i; calcul(); });
    d.maj(); m.maj(); t.maj();
    const b = balayage(8, 13, 7);
    return (x) => t.poser(b(x));
  },
  projection(h) {
    h.innerHTML = `${teteDemo()}<div class="cote"><svg class="g" id="gProj" style="--h:21rem" role="img" aria-label="Encours projeté sur trois ans"></svg><div class="colonne"><div class="cle"><span>Encours à trois ans</span><b id="pK"></b><p id="pP"></p></div><div id="pC"></div><p class="phrase">Production nouvelle : hypothèses sur les postes, plan importé avec le classeur, ou atelier PMT en huit étapes.</p></div></div>`;
    const svg = $('#gProj');
    let c;
    const dessin = () => {
      if (!c) return;
      if (!svg.isConnected) { REDESSINS.delete(dessin); return; }
      const prod = c.valeur(), s = Array.from({ length: 13 }, (_, t) => { let n = 0; for (let g = 1; g <= t; g++) n += prod * Math.pow(.94, t - g); return { st: 420 * Math.pow(.94, t), n }; });
      const { W, H } = taille(svg), X = (t) => 38 + t / 12 * (W - 46), Y = (v) => H - 22 - v / 800 * (H - 32);
      const st = s.map((p, t) => `${X(t).toFixed(1)},${Y(p.st).toFixed(1)}`), to = s.map((p, t) => `${X(t).toFixed(1)},${Y(p.st + p.n).toFixed(1)}`);
      let g = '';
      [0, 400, 800].forEach((v) => { g += `<line class="tr" x1="38" x2="${W - 8}" y1="${Y(v)}" y2="${Y(v)}"/><text x="32" y="${Y(v) + 4}" text-anchor="end">${v}</text>`; });
      [0, 4, 8, 12].forEach((t) => { g += `<text x="${X(t)}" y="${H - 5}" text-anchor="${t === 12 ? 'end' : t ? 'middle' : 'start'}">${t ? `${t / 4} an${t > 4 ? 's' : ''}` : 'Arrêté'}</text>`; });
      svg.innerHTML = `${g}<polygon class="aire" points="${X(0)},${Y(0)} ${st.join(' ')} ${X(12)},${Y(0)}"/><polygon class="aire2" points="${st.concat(to.slice().reverse()).join(' ')}"/><polyline class="trace" points="${to.join(' ')}"/>`;
      const fin = s[12];
      $('#pK').innerHTML = `${nombre(fin.st + fin.n)}<small>Md FCFA</small>`;
      $('#pP').textContent = `La production nouvelle porte ${nombre(fin.n / (fin.st + fin.n) * 100)} % de l’encours.`;
    };
    c = curseur($('#pC'), { id: 'pV', label: 'Production nouvelle par trimestre', min: 0, max: 60, pas: 2, val: 30, fmt: (v) => `${v} Md FCFA` }, dessin);
    c.maj(); REDESSINS.add(dessin);
    const b = balayage(10, 54, 9);
    return (x) => c.poser(b(x));
  },
  stress(h) {
    h.innerHTML = `${teteDemo('<div class="bascules" id="stF"></div>')}<div class="cote"><svg class="g" id="gSt" style="--h:20rem" role="img" aria-label="Position de liquidité sous stress"></svg><div class="colonne"><div class="cle"><span>Horizon de survie</span><b id="stH"></b><p id="stS"></p></div><div id="stC"></div><button type="button" class="btn" id="stPlan" aria-pressed="false">Activer le plan</button><p class="phrase" id="stP"></p></div></div>`;
    const act = new Set([0]);
    let plan = false, c;
    const svg = $('#gSt');
    const dessin = () => {
      if (!c) return;
      if (!svg.isConnected) { REDESSINS.delete(dessin); return; }
      const fuite = act.has(0) ? c.valeur() : 0;
      const base = LIQ.coussin + [...act].reduce((s, i) => s + FAMS[i][1], 0);
      const besoin = Math.max(0, fuite / 100 * LIQ.depots * (1 - Math.exp(-90 / LIQ.duree)) + LIQ.sorties * 90 - base);
      const mobilise = plan ? Math.min(besoin, 200) : 0;
      const co = base + mobilise, hz = horizon(fuite, co);
      const { W, H } = taille(svg), X = (t) => 38 + t / LIQ.vue * (W - 46), Y = (v) => H - 22 - (v + 125) / 290 * (H - 32);
      const ts = Array.from({ length: 121 }, (_, i) => i);
      let g = '';
      [-100, 100].forEach((v) => { g += `<line class="tr" x1="38" x2="${W - 8}" y1="${Y(v)}" y2="${Y(v)}"/><text x="32" y="${Y(v) + 4}" text-anchor="end">${signe(v)}</text>`; });
      g += `<line class="zero" x1="38" x2="${W - 8}" y1="${Y(0)}" y2="${Y(0)}"/><text x="32" y="${Y(0) + 4}" text-anchor="end">0</text>`;
      [0, 30, 60, 90, 120].forEach((t) => { g += `<text x="${X(t)}" y="${H - 5}" text-anchor="${t === 120 ? 'end' : t ? 'middle' : 'start'}">${t ? `${t} j` : 'Arrêté'}</text>`; });
      const yy = (t) => Math.max(Math.min(Y(position(t, fuite, co)), H - 22), 4).toFixed(1);
      if (hz <= LIQ.vue) {
        const sous = ts.filter((t) => t > hz).map((t) => `${X(t).toFixed(1)},${yy(t)}`);
        g += `<polygon class="sous" points="${X(hz).toFixed(1)},${Y(0)} ${sous.join(' ')} ${X(LIQ.vue)},${Y(0)}"/><circle class="pt" cx="${X(hz).toFixed(1)}" cy="${Y(0)}" r="5"/>`;
      }
      g += `<polyline class="trace" points="${ts.map((t) => `${X(t).toFixed(1)},${yy(t)}`).join(' ')}"/>`;
      svg.innerHTML = g;
      const v = $('#stH');
      v.innerHTML = Number.isFinite(hz) ? `${nombre(Math.round(hz))}<small>jours</small>` : 'Plus d’un an';
      v.className = hz >= 90 ? 'ok' : 'bad';
      const solva = 13 + [...act].reduce((s, i) => s + FAMS[i][2], 0);
      $('#stS').textContent = `Solvabilité stressée : ${nombre(solva, 1)} %`;
      $('#stP').textContent = plan ? `Le plan mobilise ${nombre(mobilise, 1)} Md, l’action la moins chère d’abord, pour viser 90 jours.` : (besoin > 0 ? `Il manque ${nombre(besoin, 1)} Md pour tenir 90 jours.` : 'La position tient 90 jours sans action.');
    };
    $('#stF').innerHTML = FAMS.map((f, i) => `<button type="button" class="chip petit" aria-pressed="${i === 0}" data-i="${i}">${f[0]}</button>`).join('');
    $$('#stF button').forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.i); if (act.has(i)) act.delete(i); else act.add(i); b.setAttribute('aria-pressed', String(act.has(i))); dessin(); }));
    const bPlan = $('#stPlan');
    const poserPlan = (x) => { plan = x; bPlan.setAttribute('aria-pressed', String(x)); bPlan.textContent = x ? 'Retirer le plan' : 'Activer le plan'; dessin(); };
    bPlan.addEventListener('click', () => poserPlan(!plan));
    c = curseur($('#stC'), { id: 'stV', label: 'Fuite des dépôts', min: 0, max: 50, pas: 1, val: 25, fmt: (v) => `${v} %` }, dessin);
    c.maj(); REDESSINS.add(dessin);
    const b = balayage(14, 42, 9);
    const bascule = chaque(4500, () => poserPlan(!plan));
    return (x) => { c.poser(b(x)); bascule(x); };
  },
  risk(h) {
    h.innerHTML = `${teteDemo()}<div class="duo"><div class="colonne"><div id="rC"></div><div class="curseur"><label>Pondération du risque</label><div class="seg" id="rP"></div></div><div class="barres" id="rR"></div><p class="phrase">Seuils du dispositif prudentiel de l’UMOA, coussin de conservation compris.</p></div><div class="colonne"><div class="cle"><span>Exposition sur le Tier 1</span><b id="rE"></b><p id="rT"></p></div><p class="sous-t">Solvabilité selon le montant du prêt</p><svg class="g" id="gRisk" style="--h:13rem" role="img" aria-label="Solvabilité selon le montant du prêt, face au seuil"></svg></div></div>`;
    let po = 1, c;
    const calc = () => {
      if (!c) return;
      const m = c.valeur(), rwa = 800 + m * po;
      $('#rR').innerHTML = [['CET1', 92, 7.5], ['Tier 1', 96, 8.5], ['Solvabilité', 104, 11.5]].map(([n, f, s]) => { const r = f / rwa * 100, ok = r >= s; return `<div class="seuil"><span>${n}</span><span class="rail-s"><i style="--l:${Math.min(r / 20, 1) * 100}%;--c:${ok ? 'var(--ok)' : 'var(--bad)'}"></i><u style="--s:${s / 20 * 100}%"></u></span><strong>${nombre(r, 1)} %</strong></div>`; }).join('');
      const part = m / 96 * 100;
      const e = $('#rE'); e.textContent = `${nombre(part)} %`; e.className = part > 25 ? 'bad' : part >= 10 ? 'warn' : 'ok';
      $('#rT').textContent = part > 25 ? 'au-delà de la limite de 25 %' : part >= 10 ? 'grand risque, au-delà de 10 %' : 'sous le seuil de grand risque, 10 %';
      dessinR();
    };
    const svgR = $('#gRisk');
    const dessinR = () => {
      if (!c) return;
      if (!svgR.isConnected) { REDESSINS.delete(dessinR); return; }
      const m = c.valeur(), f = (x) => 104 / (800 + x * po) * 100;
      const { W, H } = taille(svgR), X = (x) => 62 + x / 40 * (W - 74), Y = (v) => H - 22 - (v - 11) / 2.5 * (H - 34);
      const pts = Array.from({ length: 41 }, (_, x) => `${X(x).toFixed(1)},${Y(f(x)).toFixed(1)}`).join(' ');
      svgR.innerHTML = `<line class="zero" x1="62" x2="${W - 12}" y1="${Y(11.5)}" y2="${Y(11.5)}" stroke-dasharray="4 4"/><text x="56" y="${Y(11.5) + 4}" text-anchor="end">11,5 %</text><text x="56" y="${Y(13) + 4}" text-anchor="end">13 %</text>${[0, 20, 40].map((x) => `<text x="${X(x)}" y="${H - 5}" text-anchor="${x === 40 ? 'end' : x ? 'middle' : 'start'}">${x} Md</text>`).join('')}<polyline class="trace" points="${pts}"/><circle class="fin-pt" cx="${X(m)}" cy="${Y(f(m))}" r="5.5"/>`;
    };
    REDESSINS.add(dessinR);
    segment($('#rP'), ['20 %', '50 %', '100 %', '150 %'], (i) => { po = [.2, .5, 1, 1.5][i]; calc(); }, 2);
    c = curseur($('#rC'), { id: 'rV', label: 'Montant du nouveau prêt', min: 1, max: 40, pas: 1, val: 20, fmt: (v) => `${v} Md FCFA` }, calc);
    c.maj();
    const b = balayage(4, 36, 8);
    return (x) => c.poser(b(x));
  },
  change(h) {
    h.innerHTML = `${teteDemo()}<div class="duo"><div class="colonne"><div class="barres" id="chP"></div><div id="chC"></div><div class="cle"><span>Effet sur le résultat</span><b id="chE"></b><p>Position en dollars, revalorisée au cours choqué.</p></div></div><div class="colonne"><p class="sous-t">Effet selon la variation du dollar, Md FCFA</p><svg class="g" id="gCh" style="--h:13rem" role="img" aria-label="Effet sur le résultat selon la variation du dollar"></svg><p class="phrase">Chaque arrêté de l’étude garde sa position : la série se lit d’un comité à l’autre.</p></div></div>`;
    const P = [['Euro', 18], ['Dollar américain', 12], ['Yuan', -3], ['Autres devises', 2]];
    $('#chP').innerHTML = P.map(([n, v]) => `<div class="seuil large"><span>${n}</span><span class="rail-s"><i style="--l:${Math.abs(v) / 18 * 100}%;--c:${v < 0 ? 'var(--bad)' : 'var(--acc)'}"></i></span><strong>${signe(v)} Md</strong></div>`).join('');
    const svgC = $('#gCh');
    const dessinC = () => {
      if (!svgC.isConnected) { REDESSINS.delete(dessinC); return; }
      const v = Number($('#chV').value);
      const { W, H } = taille(svgC), X = (x) => 44 + (x + 20) / 40 * (W - 56), Y = (y) => H - 22 - (y + 3) / 6 * (H - 34);
      svgC.innerHTML = `<line class="tr" x1="44" x2="${W - 12}" y1="${Y(2)}" y2="${Y(2)}"/><text x="38" y="${Y(2) + 4}" text-anchor="end">+2</text><line class="tr" x1="44" x2="${W - 12}" y1="${Y(-2)}" y2="${Y(-2)}"/><text x="38" y="${Y(-2) + 4}" text-anchor="end">−2</text><line class="zero" x1="44" x2="${W - 12}" y1="${Y(0)}" y2="${Y(0)}"/><text x="38" y="${Y(0) + 4}" text-anchor="end">0</text>${[-20, 0, 20].map((x) => `<text x="${X(x)}" y="${H - 5}" text-anchor="${x === 20 ? 'end' : x ? 'middle' : 'start'}">${signe(x)} %</text>`).join('')}<polyline class="trace" points="${X(-20)},${Y(-2.4)} ${X(20)},${Y(2.4)}"/><circle class="fin-pt" cx="${X(v)}" cy="${Y(12 * v / 100)}" r="5.5"/>`;
    };
    REDESSINS.add(dessinC);
    const c = curseur($('#chC'), { id: 'chV', label: 'Variation du dollar face au franc CFA', min: -20, max: 20, pas: 1, val: -10, fmt: (v) => `${signe(v)} %` }, () => {
      const e = 12 * Number($('#chV').value) / 100, x = $('#chE');
      x.innerHTML = `${signe(e, 1)}<small>Md FCFA</small>`; x.className = e < 0 ? 'bad' : 'ok';
      dessinC();
    });
    c.maj();
    const b = balayage(-16, 16, 8);
    return (x) => c.poser(b(x));
  },
  ilaap(h) {
    h.innerHTML = `<div class="demo-t"><span class="mono" style="font-size:.8125rem;color:var(--muted)">Ce que l’ILAAP lit pour chaque indicateur</span><span class="note-i">Valeurs d’illustration</span></div><div class="duo duo-i"><div class="tb"><table id="tIlaap"><thead><tr><th></th><th>L’arrêté</th><th>La projection centrale</th><th>Chaque scénario de stress</th></tr></thead><tbody>
      <tr><td><b>Approche normative</b></td><td>Coefficient de liquidité, emplois à moyen et long terme, LCR, NSFR</td><td>Les mêmes ratios, projetés</td><td>Les mêmes ratios sous stress, face à la base</td></tr>
      <tr><td><b>Approche économique</b></td><td>Gaps de l’écoulement statique, bloc liquidité du bilan</td><td>Gap dynamique, bilan projeté</td><td>Horizon de survie, ressources perdues, décollecte du stock</td></tr>
      <tr><td><b>Synthèse</b></td><td>Le point de départ</td><td>Le point clé de l’horizon et sa date</td><td>Le point clé, et la base à la même date</td></tr></tbody></table></div><div class="colonne"><p class="sous-t">LCR projeté : la valeur la plus défavorable de l’horizon</p><svg class="g" id="gI" style="--h:12.5rem" role="img" aria-label="LCR projeté en central et sous stress, avec le point le plus défavorable"></svg></div></div>`;
    const svgI = $('#gI');
    const dessinI = () => {
      if (!svgI.isConnected) { REDESSINS.delete(dessinI); return; }
      const C = [131, 128, 125, 127, 129, 130, 132], R = [131, 118, 106, 98, 101, 106, 110];
      const { W, H } = taille(svgI), X = (i) => 44 + i / 6 * (W - 56), Y = (v) => H - 22 - (v - 85) / 55 * (H - 34);
      const l = (s) => s.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
      svgI.innerHTML = `<line class="zero" x1="44" x2="${W - 12}" y1="${Y(100)}" y2="${Y(100)}" stroke-dasharray="4 4"/><text x="38" y="${Y(100) + 4}" text-anchor="end">100 %</text>${[[0, 'Arrêté'], [2, '1 an'], [4, '2 ans'], [6, '3 ans']].map(([i, d]) => `<text x="${X(i)}" y="${H - 5}" text-anchor="${i === 6 ? 'end' : i ? 'middle' : 'start'}">${d}</text>`).join('')}<polyline class="base" points="${l(C)}"/><polyline class="trace tracee" pathLength="1" points="${l(R)}"/><circle class="pt" cx="${X(3)}" cy="${Y(98)}" r="5"/><text x="${X(3) + 9}" y="${Y(98) + 16}">Point clé : 98 %</text><text x="${X(6)}" y="${Y(132) - 7}" text-anchor="end">Projection centrale</text>`;
    };
    dessinI(); REDESSINS.add(dessinI);
    const lignes = $$('#tIlaap tbody tr');
    let i = 0;
    lignes[0].classList.add('on');
    return chaque(2600, () => { lignes[i].classList.remove('on'); i = (i + 1) % lignes.length; lignes[i].classList.add('on'); });
  },
};

const PANNEAUX = {
  bilan: ['s-bilan', [
    ['analyse', 'Repérez un bilan incohérent avant de le projeter', ['Dix vues de l’arrêté', 'Contrôles de cohérence en diagnostic', 'Seuils et limites de la banque']],
    ['ecoulement', 'Expliquez chaque variation de gap devant le comité', ['Gaps par time bucket', 'Lois d’écoulement réglées par la banque', 'Variations entre deux arrêtés']],
    ['liquidite', 'Suivez les ratios de votre zone sur son référentiel', ['Référentiels UMOA et CEMAC', 'Détail poste par poste', 'États DEC rapprochés de la balance']],
    ['irrbb', 'Mesurez la valeur économique et la marge sous six chocs', ['Chocs issus de BCBS d368', 'Test des valeurs extrêmes à 15 % du Tier 1', 'Ventilation et duration']],
    ['tci', 'Tarifez chaque opération en connaissant sa rentabilité', ['Courbes TCI, composantes et réserves', 'Décomposition de la marge d’intérêts', 'Simulateur de tarification et RAROC']],
    ['projection', 'Testez votre plan à moyen terme avant de le présenter', ['Stock écoulé et production nouvelle', 'PMT importé, ou atelier en huit étapes', 'Une projection de référence pour les autres modules']],
  ]],
  risques: ['s-risques', [
    ['stress', 'Sachez combien de jours vous tenez sous stress', ['Sept familles de chocs à combiner', 'Campagnes de scénarios avec validation', 'Résultats lus dans chaque module concerné']],
    ['risk', 'Mesurez l’effet d’un prêt avant de l’accorder', ['Crédit, marché et opérationnel', 'Solvabilité face aux seuils', 'ICAAP, capital planning et FODEP']],
    ['change', 'Voyez ce qu’une variation de cours coûte au résultat', ['Position par devise', 'Indicateurs à seuils', 'Une série qui se lit d’un comité à l’autre']],
    ['ilaap', 'Réunissez l’adéquation de la liquidité sans ressaisie', ['Lu sur les calculs des modules', 'Approches normative et économique', 'Valeur la plus défavorable de l’horizon']],
  ]],
};
const DUREE_MODULE = 7;
const MONTES = {};
function panneau(cle, hote) {
  const [sceneId, liste] = PANNEAUX[cle];
  hote.innerHTML = `<div class="gain" id="gain-${cle}"></div><div class="rail" role="group" aria-label="Modules">${liste.map(([id]) => `<button type="button" data-m="${id}">${MODULES.find((m) => m.id === id).nom}</button>`).join('')}</div><div class="scenette"><div class="demo" id="demo-${cle}"></div></div>`;
  const e = { rotation: true, t0: null, tache: null, id: liste[0][0] };
  const ouvrir = (id) => {
    const [, titre, gains] = liste.find((l) => l[0] === id);
    e.id = id; e.t0 = null;
    $$('.rail button', hote).forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.m === id)); b.style.setProperty('--p', 0); if (b.dataset.m === id) centrer(b); });
    $(`#gain-${cle}`).innerHTML = `<div class="fondu"><h2>${titre}</h2><ul>${gains.map((g) => `<li>${g}</li>`).join('')}</ul><div class="actions">${boutonAjout(id)}</div></div>`;
    e.tache = DEMOS[id]($(`#demo-${cle}`));
    COURANT[sceneId] = id;
    majBarre();
  };
  $$('.rail button', hote).forEach((b) => b.addEventListener('click', () => ouvrir(b.dataset.m)));
  const arreter = () => { e.rotation = false; $$('.rail button', hote).forEach((b) => b.style.setProperty('--p', 0)); };
  $('.rail', hote).addEventListener('pointerdown', arreter);
  $('.rail', hote).addEventListener('keydown', arreter);
  const main = () => { arreter(); e.tache = null; };
  $(`#demo-${cle}`).addEventListener('pointerdown', main);
  $(`#demo-${cle}`).addEventListener('keydown', main);
  $(`#gain-${cle}`).addEventListener('pointerdown', arreter);
  TACHES[sceneId] = (t) => {
    if (e.rotation) {
      if (e.t0 === null) e.t0 = t;
      const p = (t - e.t0) / DUREE_MODULE;
      const actif = $('.rail button[aria-pressed="true"]', hote);
      if (actif) actif.style.setProperty('--p', Math.min(p, 1));
      if (p >= 1) { const i = liste.findIndex((l) => l[0] === e.id); ouvrir(liste[(i + 1) % liste.length][0]); }
    }
    if (e.tache) e.tache(t);
  };
  ENTREES[sceneId] = () => { e.t0 = null; REDESSINS.forEach((f) => f()); };
  MONTES[cle] = (id) => { arreter(); ouvrir(id); };
  ouvrir(liste[0][0]);
}
panneau('bilan', $('#modBilan'));
panneau('risques', $('#modRisques'));

/* ---- Portefeuille obligataire ---- */
(function () {
  const h = $('#demoGpo');
  h.innerHTML = `${teteDemo()}<div class="duo"><div class="colonne"><div class="pile-g" id="gC"></div><p class="sous-t">Portefeuille par maturité, Md de nominal</p><svg class="g" id="gB" style="--h:12rem" role="img" aria-label="Nominal du portefeuille par maturité, achat simulé compris"></svg></div><div class="colonne"><div class="tb"><table class="num" id="gT"></table></div><p class="phrase">Valorisation sur la courbe de l’arrêté ; VaR paramétrique à 99 % sur 10 jours.</p></div></div>`;
  const oblig = (c, y, n) => { let p = 0, d = 0; for (let t = 1; t <= n; t++) { const a = (t === n ? 100 + c : c) / Math.pow(1 + y, t); p += a; d += t * a; } return { p, dm: d / p / (1 + y) }; };
  const TIT = [[2, 5.9, 25], [3, 6, 40], [5, 6.5, 60], [7, 6.75, 35]];
  const agr = (ts) => {
    const l = ts.filter((t) => t[2] > 0).map(([n, c, q]) => { const y = (5.8 + .18 * n) / 100, o = oblig(c, y, n); return { y, dm: o.dm, v: q * o.p / 100 }; });
    const v = l.reduce((s, x) => s + x.v, 0), m = (k) => l.reduce((s, x) => s + x.v * x[k], 0) / v, dm = m('dm');
    return { v, y: m('y') * 100, dm, dv: dm * v * .0001 * 1000, var: 2.326 * .0007 * Math.sqrt(10) * dm * v };
  };
  let a, b, c;
  const calc = () => {
    if (!a || !b || !c) return;
    const av = agr(TIT), ap = agr([...TIT, [a.valeur(), b.valeur(), c.valeur()]]);
    $('#gT').innerHTML = `<thead><tr><th></th><th>Avant</th><th>Après l’achat</th><th>Écart</th></tr></thead><tbody>${[['Valeur actualisée, Md', 'v', 1], ['Rendement moyen, %', 'y', 2], ['Duration modifiée', 'dm', 2], ['DV01, M', 'dv', 1], ['VaR 99 % à 10 jours, Md', 'var', 2]].map(([n, k, d]) => `<tr><td>${n}</td><td>${nombre(av[k], d)}</td><td class="ap">${nombre(ap[k], d)}</td><td>${signe(ap[k] - av[k], d)}</td></tr>`).join('')}</tbody>`;
    barres();
  };
  const svgB = $('#gB');
  const barres = () => {
    if (!a || !b || !c) return;
    const { W, H } = taille(svgB), base = H - 22, n = 15, l = (W - 12) / n, m = a.valeur(), q = c.valeur();
    const hauteur = (v) => v / 130 * (H - 34);
    let s = `<line class="zero" x1="4" x2="${W - 4}" y1="${base}" y2="${base}"/>`;
    for (let k = 1; k <= n; k++) {
      const stock = TIT.filter((x) => x[0] === k).reduce((S, x) => S + x[2], 0), neuf = k === m ? q : 0, x = 6 + (k - 1) * l, w = l * .68;
      if (stock) s += `<rect class="b-stock" x="${x}" y="${base - hauteur(stock)}" width="${w}" height="${hauteur(stock)}"/>`;
      if (neuf) s += `<rect class="b-neuf" x="${x}" y="${base - hauteur(stock + neuf)}" width="${w}" height="${hauteur(neuf)}"/>`;
      if (k % 2 === 1) s += `<text x="${x + w / 2}" y="${H - 5}" text-anchor="middle">${k} a</text>`;
    }
    svgB.innerHTML = s;
  };
  REDESSINS.add(barres);
  const z = $('#gC');
  a = curseur(z, { id: 'gN', label: 'Maturité', min: 1, max: 15, pas: 1, val: 7, fmt: (v) => `${v} an${v > 1 ? 's' : ''}` }, calc);
  b = curseur(z, { id: 'gK', label: 'Coupon', min: 4, max: 9, pas: .25, val: 6.75, fmt: (v) => `${nombre(v, 2)} %` }, calc);
  c = curseur(z, { id: 'gQ', label: 'Nominal', min: 5, max: 100, pas: 5, val: 35, fmt: (v) => `${v} Md` }, calc);
  a.maj(); b.maj(); c.maj();
  let actif = true;
  h.addEventListener('pointerdown', () => { actif = false; });
  h.addEventListener('keydown', () => { actif = false; });
  const bal = balayage(15, 90, 9);
  TACHES['s-portefeuille'] = (t) => { if (actif) c.poser(bal(t)); };
})();

/* ---- La maison des modules ---- */
function voirModule(id) {
  const m = MODULES.find((x) => x.id === id);
  $$('.maison .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.id === id)));
  $('#detailMod').innerHTML = `<div class="fondu"><b>${m.nom}</b><p>${m.dit}</p></div><div class="actions"><button type="button" class="btn" id="voirM">Voir ce module</button>${boutonAjout(id)}</div>`;
  $('#voirM').addEventListener('click', () => { if (MONTES[m.fam]) MONTES[m.fam](id); allerA(SCENE_DE[m.fam]); });
  COURANT['s-modules'] = id;
  majBarre();
}
$$('[data-famille]').forEach((z) => {
  z.innerHTML = MODULES.filter((m) => m.fam === z.dataset.famille).map((m) => `<button type="button" class="chip" data-id="${m.id}">${m.nom}</button>`).join('');
});
(function () {
  let auto = true, i = 0;
  const stop = () => { auto = false; };
  $$('.maison .chip').forEach((c) => {
    c.addEventListener('click', () => { stop(); voirModule(c.dataset.id); });
    c.addEventListener('mouseenter', () => { stop(); voirModule(c.dataset.id); });
  });
  $('#detailMod').addEventListener('pointerdown', stop);
  voirModule(MODULES[0].id);
  const pas = chaque(2200, () => { i = (i + 1) % MODULES.length; voirModule(MODULES[i].id); });
  TACHES['s-modules'] = (t) => { if (auto) pas(t); };
})();

/* ---- Écrans simples : un repère qui avance seul ---- */
(function () {
  const l = $$('#cmp .cmp-l');
  let i = 0;
  l[0].classList.add('on');
  TACHES['s-avant'] = chaque(2200, () => { l[i].classList.remove('on'); i = (i + 1) % l.length; l[i].classList.add('on'); });
})();
(function () {
  const n = $$('#marches .niv');
  let i = 0;
  n[0].classList.add('on');
  TACHES['s-reporting'] = chaque(1800, () => { n[i].classList.remove('on'); i = (i + 1) % n.length; n[i].classList.add('on'); });
})();
(function () {
  const e = $('#etapes'), l = $$('li', e);
  let i = 0;
  const poser = () => { l.forEach((x, k) => x.classList.toggle('on', k <= i)); e.style.setProperty('--avance', i / (l.length - 1)); };
  poser();
  TACHES['s-confiance'] = chaque(1500, () => { i = (i + 1) % l.length; poser(); });
})();

/* ---- Captures de l'application ---- */
(function () {
  const img = $$('#cadreI img'), o = $$('#ongletsC button');
  let i = 0, auto = true, t0 = null;
  const poser = (k) => {
    i = k; t0 = null;
    img.forEach((x, j) => x.classList.toggle('on', j === k));
    o.forEach((x, j) => { x.setAttribute('aria-pressed', String(j === k)); x.style.setProperty('--p', 0); });
  };
  o.forEach((b, k) => b.addEventListener('click', () => { auto = false; poser(k); }));
  poser(0);
  TACHES['s-appli'] = (t) => {
    if (!auto) return;
    if (t0 === null) t0 = t;
    const p = (t - t0) / 4;
    o[i].style.setProperty('--p', Math.min(p, 1));
    if (p >= 1) poser((i + 1) % img.length);
  };
})();

/* ---- Accueil : le cockpit change de scénario tout seul ---- */
(function () {
  const S = [
    [0, 25, [15, -15, 5, 60, -65], 131],
    [1, 15, [10, -12, 8, 52, -58], 138],
    [2, 22, [18, -20, 2, 64, -64], 127],
    [4, 30, [12, -8, 6, 48, -58], 119],
  ];
  const hz = $('#heroHz'), eve = $('#heroEve'), lcr = $('#heroLcr'), nom = $('#heroScenario'), g = $('#gapsHero');
  let i = 0, anim = 0;
  const tween = (el, de, a, d, suf) => {
    const t0 = performance.now();
    const pas = (t) => { const u = Math.min((t - t0) / 800, 1), l = 1 - Math.pow(1 - u, 3); el.textContent = nombre(de + (a - de) * l, d) + suf; if (u < 1) requestAnimationFrame(pas); };
    requestAnimationFrame(pas);
  };
  const etat = { l: 131, e: -11.2, h: 49 };
  const poser = (k) => {
    const [c, f, gaps, l] = S[k];
    const h = Math.round(horizon(f, LIQ.coussin));
    const e = CHOCS[c][1];
    nom.textContent = `${CHOCS[c][0]}, fuite de ${f} %`;
    poserGaps(g, gaps);
    if (calme) { lcr.textContent = `${l} %`; eve.textContent = `${nombre(e, 1)} %`; hz.textContent = `${h} j`; return; }
    tween(lcr, etat.l, l, 0, ' %'); tween(eve, etat.e, e, 1, ' %'); tween(hz, etat.h, h, 0, ' j');
    etat.l = l; etat.e = e; etat.h = h;
    anim += 1;
  };
  poser(0);
  TACHES['s-accueil'] = chaque(3600, () => { i = (i + 1) % S.length; poser(i); });
})();

/* ---- Demande de démo : la messagerie du visiteur envoie, la page ne conserve rien ---- */
$('#choixForm').innerHTML = MODULES.map((m) => `<button type="button" class="chip petit" data-id="${m.id}">${m.nom}</button>`).join('');
$$('#choixForm .chip').forEach((c) => c.addEventListener('click', () => { const i = c.dataset.id; if (choisis.has(i)) choisis.delete(i); else choisis.add(i); majChoix(); }));
if (ENVOI_URL) {
  $('#fEnvoyer').textContent = 'Envoyer ma demande';
  $('#zoneAccord').hidden = false;
  $('#fNote').textContent = 'Vos informations sont transmises à Heymann’s pour préparer la démonstration.';
}
async function envoyerDirect(donnees) {
  const bouton = $('#fEnvoyer'), echec = $('#eEnvoi');
  echec.textContent = '';
  bouton.disabled = true;
  bouton.textContent = 'Envoi en cours…';
  const delai = new AbortController();
  const minuterie = setTimeout(() => delai.abort(), 15000);
  try {
    const reponse = await fetch(ENVOI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(donnees), signal: delai.signal });
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    const corps = await reponse.json().catch(() => ({}));
    if (corps.success === false || corps.success === 'false') throw new Error('refus du service');
    $('#form').innerHTML = `<div class="merci fondu" role="status"><h3>Votre demande est envoyée</h3><p>Merci. Nous revenons vers vous à l’adresse indiquée pour préparer la démonstration.</p><div class="recap"></div></div>`;
    const recap = $('#form .recap');
    [['Établissement', donnees.etablissement], ['Contact', `${donnees.nom_fonction}, ${donnees.email}`], ['Zone', donnees.zone], ['Modules', donnees.modules]].forEach(([l, v]) => {
      const ligne = document.createElement('span');
      const titre = document.createElement('b');
      titre.textContent = `${l} : `;
      ligne.append(titre, v);
      recap.append(ligne);
    });
    ajuster(scenes[scenes.length - 1]);
  } catch (err) {
    echec.textContent = `L’envoi n’a pas abouti. Vérifiez votre connexion et réessayez, ou écrivez à ${CONTACTS.a}.`;
    bouton.disabled = false;
    bouton.textContent = 'Réessayer l’envoi';
    ajuster(scenes[scenes.length - 1]);
  } finally {
    clearTimeout(minuterie);
  }
}
let zoneF = 'UMOA';
segment($('#fZone'), ['UMOA', 'CEMAC', 'Autre'], (i) => { zoneF = ['UMOA', 'CEMAC', 'Autre'][i]; });
$('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  const verif = [['fEtab', 'eEtab', (v) => v.trim(), 'Indiquez votre établissement.'], ['fNom', 'eNom', (v) => v.trim(), 'Indiquez votre nom et votre fonction.'], ['fMail', 'eMail', (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Indiquez un e-mail valide, comme nom@banque.com.']];
  let ok = true;
  verif.forEach(([c, m, t, x]) => { const i = document.getElementById(c), bon = t(i.value); i.setAttribute('aria-invalid', String(!bon)); document.getElementById(m).textContent = bon ? '' : x; ok = ok && !!bon; });
  if (ENVOI_URL) {
    const accord = $('#fAccord').checked;
    $('#eAccord').textContent = accord ? '' : 'Cochez cette case pour que nous puissions vous recontacter.';
    ok = ok && accord;
  }
  if (!ok) return;
  const noms = MODULES.filter((m) => choisis.has(m.id)).map((m) => m.nom);
  const etab = $('#fEtab').value.trim(), nom = $('#fNom').value.trim(), mail = $('#fMail').value.trim();
  const objet = `Demande de démonstration ALCO One : ${etab}`;
  const corps = `Bonjour,\n\nJe souhaite une démonstration d’ALCO One.\n\nÉtablissement : ${etab}\nZone : ${zoneF}\nModules à voir : ${noms.length ? noms.join(', ') : 'à définir ensemble'}\nContact : ${nom}, ${mail}\n\nCordialement,\n${nom}`;
  if (ENVOI_URL) {
    if ($('#fSite').value) return;
    envoyerDirect({ objet, etablissement: etab, nom_fonction: nom, email: mail, zone: zoneF, modules: noms.length ? noms.join(', ') : 'à définir ensemble', accord_recontact: true });
    return;
  }
  const lien = `mailto:${CONTACTS.a}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`;
  const form = $('#form');
  form.innerHTML = `<div class="merci fondu"><h3>Votre demande est prête</h3><p>Votre messagerie doit s’ouvrir avec ce message : il ne nous parvient qu’une fois envoyé. Si elle ne s’ouvre pas, copiez-le vers <b>${CONTACTS.a}</b>.</p><pre id="corps"></pre><div class="actions"><a class="btn pri" href="${lien}">Ouvrir ma messagerie</a><button type="button" class="btn" id="copierCorps">Copier le message</button></div></div>`;
  $('#corps').textContent = `À : ${CONTACTS.a}\nObjet :${objet}\n\n${corps}`;
  $('#copierCorps').addEventListener('click', (ev) => copierTexte($('#corps').textContent, ev.currentTarget));
  ajuster(scenes[scenes.length - 1]);
  location.href = lien;
});
majChoix();

/* ---- Ouverture ---- */
const intro = $('#intro'), video = $('#introVideo');
let lancee = false;
function demarrer() {
  if (lancee) return;
  lancee = true;
  toutAjuster();
  if (!estDeck()) { observerDefilement(); }
}
function fermerIntro() {
  if (intro.classList.contains('partie')) return;
  intro.classList.add('partie');
  try { video.pause(); } catch (e) { /* sans effet */ }
  setTimeout(() => { video.remove(); intro.hidden = true; }, 900);
  demarrer();
  const s = scenes[Math.max(rang, 0)];
  s.classList.remove('vu'); void s.offsetWidth; s.classList.add('vu');
}
function logoNet() {
  if (intro.classList.contains('net')) return;
  intro.classList.add('net');
  setTimeout(fermerIntro, 1700);
}
$('#introPasser').addEventListener('click', fermerIntro);
const hash = location.hash.slice(1);
const cible = scenes.findIndex((s) => s.id === hash);
if (estDeck()) montrer(cible >= 0 ? cible : 0, true);
if (cible >= 0 || calme) { intro.classList.add('partie'); intro.hidden = true; video.remove(); demarrer(); } else {
  /* Le logo net prend le relais avant les derniers instants de la vidéo, où apparaissent ses repères. */
  video.addEventListener('timeupdate', () => { if (video.currentTime >= 2.7) logoNet(); });
  video.addEventListener('ended', logoNet);
  video.addEventListener('error', logoNet);
  const lecture = video.play();
  if (lecture && lecture.catch) lecture.catch(logoNet);
  setTimeout(logoNet, 6000);
  addEventListener('keydown', (e) => { if (!intro.classList.contains('partie') && ['Enter', ' ', 'Escape', 'ArrowRight'].includes(e.key)) { e.preventDefault(); fermerIntro(); } });
}

/* ---- Sur téléphone : les écrans défilent, et seul celui à l'écran s'anime ---- */
let courante = null;
function observerDefilement() {
  scenes.forEach((s) => s.classList.add('active'));
  const obs = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { courante = e.target; e.target.classList.add('vu'); if (ENTREES[e.target.id]) ENTREES[e.target.id](); }
  }), { rootMargin: '-45% 0px -50% 0px' });
  scenes.forEach((s) => obs.observe(s));
  const max = () => document.documentElement.scrollHeight - innerHeight;
  addEventListener('scroll', () => { $('#progres').style.transform = `scaleX(${max() > 0 ? scrollY / max() : 0})`; }, { passive: true });
}

/* ---- Boucle d'animation ---- */
function boucle(now) {
  const s = estDeck() ? scenes[rang] : courante;
  const f = s && TACHES[s.id];
  if (f && !enPause && intro.classList.contains('partie')) f(now / 1000);
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);

addEventListener('resize', () => {
  if ((innerWidth <= 860) !== racine.classList.contains('mobile')) { location.reload(); return; }
  // Le clavier d'un téléphone réduit la fenêtre : on n'ajuste pas l'écran pendant la saisie.
  if (document.activeElement && document.activeElement.matches('input')) return;
  toutAjuster();
  REDESSINS.forEach((f) => f());
});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { toutAjuster(); REDESSINS.forEach((f) => f()); });
})();
