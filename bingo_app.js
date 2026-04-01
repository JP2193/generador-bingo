// ── SUPABASE ──
const SUPABASE_URL = "https://xwywnaymonrawikfugvb.supabase.co";   // ej: https://abcdef.supabase.co
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eXduYXltb25yYXdpa2Z1Z3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDEzODEsImV4cCI6MjA4Nzk3NzM4MX0.uBsSze2surxMfg2xPrvRnjoXer2Z-O4qeOLYFGyOano";      // Settings → API → anon public
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let deletedIds = new Set();

// ── FRASES DE MUESTRA PARA EL CALIBRADOR ──
const frasesDemo = [
  "Usa anteojos","Tiene mascotas","Le gusta bailar","Toma mate",
  "Tiene hermanos","Le gusta el fútbol","Sabe cocinar algo rico",
  "Tiene pelo rizado","Nació en otra ciudad","Es fanático/a del cine",
  "Tiene más de 30 años","Le gusta la playa","","Conoce a los novios +10 años",
  "Vino desde otra ciudad","Viajó +5 países","Habla más de un idioma",
  "Toca instrumento","Vive solo/a","Cambió de carrera","Corrió maratón",
  "Tiene +2 hijos","Tiene un tatuaje","Es pelado/a"
];

// ── ESTADO CALIBRACIÓN ──
let calib = loadCalib();

function loadCalib() {
  try {
    const s = localStorage.getItem('bingo_calib');
    if (s) return JSON.parse(s);
  } catch(e) {}
  return { top: 32.1, left: 6.1, width: 88.4, height: 64.9, font: 11.5, borderColor: '#a8937a', borderAlpha: 0.15 };
}

function saveCalib(c) {
  try { localStorage.setItem('bingo_calib', JSON.stringify(c)); } catch(e) {}
}

// ── ESTADO FRASES ──
let frasesXLS = null; // { facil: [], medio: [], dificil: [] }

// Carga frases: Supabase primero, fallback a localStorage / JSON
async function cargarFrases() {
  let datos = null;
  try {
    const { data, error } = await db.from('frases').select('*').order('frase');
    if (error) throw error;
    datos = data;
  } catch(e) {
    // Fallback offline: localStorage o JSON estático
    try {
      const guardado = localStorage.getItem('bingo_frases');
      if (guardado) {
        datos = JSON.parse(guardado);
      } else {
        const res = await fetch('data/frases.json');
        datos = await res.json();
      }
    } catch(e2) {
      mostrarFrasesMsg('No se pudo cargar frases: ' + e2.message, 'error');
      return;
    }
  }
  aplicarDatos(datos);
  renderTablaFrases(datos);
}

function aplicarDatos(datos) {
  frasesXLS = {
    facil:   datos.filter(r => r.nivel === 'facil').map(r => r.frase).filter(Boolean),
    medio:   datos.filter(r => r.nivel === 'medio').map(r => r.frase).filter(Boolean),
    dificil: datos.filter(r => r.nivel === 'dificil').map(r => r.frase).filter(Boolean),
  };
  actualizarBadges();
}

function actualizarBadges() {
  if (!frasesXLS) return;
  const total = frasesXLS.facil.length + frasesXLS.medio.length + frasesXLS.dificil.length;
  const badge   = document.getElementById('frasesBadge');
  const totalEl = document.getElementById('totalFrases');
  if (badge)   badge.textContent   = `${frasesXLS.facil.length} fáciles · ${frasesXLS.medio.length} medias · ${frasesXLS.dificil.length} difíciles`;
  if (totalEl) totalEl.textContent = `Total frases: ${total}`;
}

// ── TABLA EDITABLE ──
const NIVEL_LABELS = { facil: 'Fácil', medio: 'Media', dificil: 'Difícil' };

function renderTablaFrases(datos) {
  const container = document.getElementById('tablaContainer');
  const tabla = document.createElement('table');
  tabla.className = 'frases-tabla';
  tabla.innerHTML = `
    <thead>
      <tr>
        <th>Frase</th>
        <th>Nivel</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="frasesBody"></tbody>`;
  container.innerHTML = '';
  container.appendChild(tabla);

  const tbody = document.getElementById('frasesBody');
  datos.forEach(row => agregarFilaDOM(tbody, row.frase, row.nivel, row.id));
}

function agregarFilaDOM(tbody, frase = '', nivel = 'facil', id = null) {
  const rowId = id || crypto.randomUUID();
  const tr = document.createElement('tr');
  tr.dataset.id = rowId;
  tr.innerHTML = `
    <td><input type="text" class="frase-input" value="${frase.replace(/"/g, '&quot;')}" placeholder="Escribí una frase..."></td>
    <td>
      <select class="nivel-select">
        <option value="facil"   ${nivel === 'facil'   ? 'selected' : ''}>Fácil</option>
        <option value="medio"   ${nivel === 'medio'   ? 'selected' : ''}>Media</option>
        <option value="dificil" ${nivel === 'dificil' ? 'selected' : ''}>Difícil</option>
      </select>
    </td>
    <td><button class="btn-eliminar" onclick="eliminarFila(this)" title="Eliminar">✕</button></td>`;
  tbody.appendChild(tr);
}

function agregarFila() {
  const tbody = document.getElementById('frasesBody');
  if (!tbody) return;
  agregarFilaDOM(tbody, '', 'facil');
  // Scroll y foco en la nueva fila
  const inputs = tbody.querySelectorAll('.frase-input');
  const ultimo = inputs[inputs.length - 1];
  ultimo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  ultimo.focus();
}

function eliminarFila(btn) {
  const tr = btn.closest('tr');
  const id = tr.dataset.id;
  if (id) deletedIds.add(id);
  tr.remove();
}

function leerTabla() {
  const filas = document.querySelectorAll('#frasesBody tr');
  return Array.from(filas).map(tr => ({
    id:    tr.dataset.id,
    frase: tr.querySelector('.frase-input').value.trim(),
    nivel: tr.querySelector('.nivel-select').value,
  })).filter(r => r.frase);
}

async function guardarFrases() {
  const btn = document.getElementById('btnGuardarFrases');
  const originalHTML = btn.innerHTML;

  btn.innerHTML = '<span class="btn-spinner"></span>';
  btn.classList.add('is-saving');

  const rows = leerTabla();
  const { error: upsertErr } = await db.from('frases').upsert(rows);
  if (upsertErr) {
    btn.innerHTML = originalHTML;
    btn.classList.remove('is-saving');
    mostrarFrasesMsg('Error al guardar: ' + upsertErr.message, 'error');
    return;
  }
  if (deletedIds.size > 0) {
    const { error: deleteErr } = await db.from('frases').delete().in('id', [...deletedIds]);
    if (deleteErr) {
      btn.innerHTML = originalHTML;
      btn.classList.remove('is-saving');
      mostrarFrasesMsg('Error al eliminar: ' + deleteErr.message, 'error');
      return;
    }
    deletedIds.clear();
  }
  aplicarDatos(rows);

  btn.classList.remove('is-saving');
  btn.classList.add('is-saved');
  btn.innerHTML = '✓ Cambios guardados';

  setTimeout(() => {
    btn.classList.remove('is-saved');
    btn.innerHTML = originalHTML;
  }, 2000);
}

async function resetearFrases() {
  if (!confirm('¿Recargar frases desde Supabase? Se perderán los cambios no guardados.')) return;
  deletedIds.clear();
  let datos;
  try {
    const { data, error } = await db.from('frases').select('*').order('frase');
    if (error) throw error;
    datos = data;
  } catch(e) {
    mostrarFrasesMsg('No se pudo conectar con Supabase: ' + e.message, 'error');
    return;
  }
  aplicarDatos(datos);
  renderTablaFrases(datos);
  mostrarFrasesMsg('↩ Frases recargadas desde Supabase', 'ok');
}

function mostrarFrasesMsg(msg, tipo) {
  const el = document.getElementById('frasesMsg');
  el.textContent = msg;
  el.style.display = 'block';
  el.style.background = tipo === 'ok' ? '#d4edda' : '#f8d7da';
  el.style.color      = tipo === 'ok' ? '#155724' : '#842029';
  setTimeout(() => el.style.display = 'none', 3000);
}

// ── TABS ──
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  const idx = { generate: 0, frases: 1, calibrate: 2 };
  document.querySelectorAll('.tab-btn')[idx[name]].classList.add('active');
  if (name === 'calibrate') initCalib();
}

// ── CALIBRADOR ──
let calibVisible = true;

function initCalib() {
  document.getElementById('cTop').value         = calib.top;
  document.getElementById('cLeft').value        = calib.left;
  document.getElementById('cWidth').value       = calib.width;
  document.getElementById('cHeight').value      = calib.height;
  document.getElementById('cFont').value        = calib.font;
  document.getElementById('cBorderColor').value = calib.borderColor || '#dc3232';
  document.getElementById('cBorderAlpha').value = calib.borderAlpha !== undefined ? calib.borderAlpha : 0.6;
  updateCalibDisplay();
  buildCalibGrid();
}

['cTop','cLeft','cWidth','cHeight','cFont','cBorderColor','cBorderAlpha'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    updateCalibFromSliders();
  });
});

function updateCalibFromSliders() {
  calib = {
    top:         parseFloat(document.getElementById('cTop').value),
    left:        parseFloat(document.getElementById('cLeft').value),
    width:       parseFloat(document.getElementById('cWidth').value),
    height:      parseFloat(document.getElementById('cHeight').value),
    font:        parseFloat(document.getElementById('cFont').value),
    borderColor: document.getElementById('cBorderColor').value,
    borderAlpha: parseFloat(document.getElementById('cBorderAlpha').value),
  };
  updateCalibDisplay();
  buildCalibGrid();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function updateCalibDisplay() {
  document.getElementById('dTop').textContent         = calib.top.toFixed(1);
  document.getElementById('dLeft').textContent        = calib.left.toFixed(1);
  document.getElementById('dWidth').textContent       = calib.width.toFixed(1);
  document.getElementById('dHeight').textContent      = calib.height.toFixed(1);
  document.getElementById('dFont').textContent        = calib.font;
  document.getElementById('dBorderAlpha').textContent = (calib.borderAlpha || 0.6).toFixed(2);
  const g = document.getElementById('calibGrid');
  g.style.top    = calib.top + '%';
  g.style.left   = calib.left + '%';
  g.style.width  = calib.width + '%';
  g.style.height = calib.height + '%';
  applyGridColor();
}

function buildCalibGrid() {
  const g = document.getElementById('calibGrid');
  g.innerHTML = '';
  let fi = 0;
  for (let i = 0; i < 25; i++) {
    const cell = document.createElement('div');
    if (i === 12) {
      cell.className = 'calib-cell centro';
      cell.textContent = '💍';
    } else {
      cell.className = 'calib-cell';
      cell.style.fontSize = calib.font + 'px';
      cell.textContent = frasesDemo[fi] || '';
      fi++;
    }
    g.appendChild(cell);
  }
}

function guardarCalib() {
  saveCalib(calib);
  const badge = document.getElementById('savedBadge');
  const msg   = document.getElementById('saveMsg');
  badge.style.display = 'inline-block';
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 2500);
  applyCalibToGenerator();
}

function resetearCalib() {
  calib = { top: 32.1, left: 6.1, width: 88.4, height: 64.9, font: 11.5, borderColor: '#a8937a', borderAlpha: 0.15 };
  initCalib();
  saveCalib(calib);
  applyCalibToGenerator();
  const msg = document.getElementById('saveMsg');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 2500);
}

function toggleCalibGrid() {
  calibVisible = !calibVisible;
  document.getElementById('calibGrid').style.display = calibVisible ? 'grid' : 'none';
}

let calibBorders = true;
function toggleCalibBorders() {
  calibBorders = !calibBorders;
  document.getElementById('calibGrid').classList.toggle('no-borders', !calibBorders);
}

function applyGridColor() {
  const o = document.getElementById('gridOverlay');
  if (!o) return;
  const color = calib.borderColor || '#000000';
  const alpha = calib.borderAlpha !== undefined ? calib.borderAlpha : 1.0;
  o.style.setProperty('--grid-color', hexToRgba(color, alpha));
}

function applyCalibToGenerator() {
  const o = document.getElementById('gridOverlay');
  if (!o) return;
  o.style.top    = calib.top + '%';
  o.style.left   = calib.left + '%';
  o.style.width  = calib.width + '%';
  o.style.height = calib.height + '%';
  document.querySelectorAll('#gridOverlay .grid-cell:not(.centro)').forEach(c => {
    c.style.fontSize = calib.font + 'px';
  });
  applyGridColor();
}

// ── GENERADOR ──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg; el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

function generarFrases() {
  if (!frasesXLS) { showError('Las frases no están cargadas aún.'); return null; }
  const faciles   = frasesXLS.facil;
  const medias    = frasesXLS.medio;
  const dificiles = frasesXLS.dificil;
  const nF = parseInt(document.getElementById('nFacil').value)   || 0;
  const nM = parseInt(document.getElementById('nMedia').value)   || 0;
  const nD = parseInt(document.getElementById('nDificil').value) || 0;
  const total = nF + nM + nD;

  if (total !== 24) { showError(`La distribución suma ${total}, necesitás exactamente 24.`); return null; }
  if (faciles.length   < nF) { showError(`Necesitás ${nF} frases fáciles, tenés ${faciles.length}.`);   return null; }
  if (medias.length    < nM) { showError(`Necesitás ${nM} frases medias, tenés ${medias.length}.`);     return null; }
  if (dificiles.length < nD) { showError(`Necesitás ${nD} frases difíciles, tenés ${dificiles.length}.`); return null; }

  return shuffle([
    ...shuffle(faciles).slice(0,nF),
    ...shuffle(medias).slice(0,nM),
    ...shuffle(dificiles).slice(0,nD)
  ]);
}

function buildGrid(todas) {
  const o = document.getElementById('gridOverlay');
  o.style.top    = calib.top + '%';
  o.style.left   = calib.left + '%';
  o.style.width  = calib.width + '%';
  o.style.height = calib.height + '%';
  o.innerHTML = '';
  applyGridColor();

  let fi = 0;
  for (let i = 0; i < 25; i++) {
    const cell = document.createElement('div');
    if (i === 12) {
      cell.className = 'grid-cell centro';
      const img = document.createElement('img');
      img.src = 'img/1.png';
      img.alt = 'anillos';
      img.onerror = () => { img.style.display='none'; cell.textContent='💍'; };
      cell.appendChild(img);
    } else {
      cell.className = 'grid-cell';
      cell.style.fontSize = calib.font + 'px';
      cell.textContent = todas[fi++] || '';
    }
    o.appendChild(cell);
  }
}

function getFormatoSalida() {
  const sel = document.querySelector('input[name="formatoSalida"]:checked');
  return sel ? sel.value : 'jpg';
}

function accionGenerar() {
  if (getFormatoSalida() === 'html') {
    generarHTML();
  } else {
    generarTarjeta();
  }
}

function generarTarjeta() {
  const todas = generarFrases();
  if (!todas) return;
  buildGrid(todas);
  document.getElementById('previewArea').style.display = 'block';
  document.getElementById('previewArea').scrollIntoView({behavior:'smooth'});
}

// ── GENERAR HTML GENÉRICO (4 cartones estilo app-carton) ──
function generarHTML() {
  if (!frasesXLS) { showError('Las frases no están cargadas aún.'); return; }

  // Generamos 4 sets de 24 frases (pueden repetirse entre cartones)
  const sets = [];
  for (let i = 0; i < 4; i++) {
    const frases = generarFrases();
    if (!frases) return;
    sets.push(frases);
  }

  // Convertir imagen a base64 para embeber en el HTML
  Promise.all([
    imgToBase64('img/4.png'),
    imgToBase64('img/5.png'),
    imgToBase64('img/6.png'),
  ]).then(([img4b64, img5b64, img6b64]) => {
    const htmlContent = buildCartonHTML(sets, img4b64, img5b64, img6b64);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cartones-bingo.html';
    link.click();
    URL.revokeObjectURL(link.href);
  }).catch(err => {
    showError('Error al generar el HTML: ' + err.message);
  });
}

function imgToBase64(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('No se pudo cargar ' + src));
    img.src = src + '?t=' + Date.now();
  });
}

function buildCartonSVG(frases, img5b64) {
  const cells = [];
  let fi = 0;
  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      cells.push(`<div class="celda centro"><img src="${img5b64}" alt="centro"></div>`);
    } else {
      const frase = frases[fi++] || '';
      cells.push(`<div class="celda"><span class="frase-txt">${escapeHtml(frase)}</span><div class="firma-linea"></div></div>`);
    }
  }
  return cells.join('\n');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildCartonHTML(sets, img4b64, img5b64, img6b64) {
  const cartones = sets.map((frases) => `
    <div class="carton-page">
      <div class="carton-wrap">

        <div class="floral-top">
          <img src="${img4b64}" alt="flores">
        </div>

        <div class="nombre-field">
          <span class="nombre-label">Tu nombre:</span>
          <span class="nombre-linea"></span>
        </div>

        <div class="carton-titulo">
          <span class="titulo-principal">Encontrá al invitado que...</span>
        </div>

        <div class="floral-corner floral-left">
          <img src="${img6b64}" alt="">
        </div>
        <div class="floral-corner floral-right">
          <img src="${img6b64}" alt="">
        </div>

        <div class="grid">
          ${buildCartonSVG(frases, img5b64)}
        </div>

      </div>
    </div>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cartones Bingo — Clara &amp; Javier</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #f2ebe0;
      font-family: 'Jost', sans-serif;
    }

    .print-sheet {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      width: 420mm;
      height: 594mm;
      margin: 0 auto;
      padding: 0;
      gap: 0;
    }

    @media print {
      body { background: white; }
      .print-sheet {
        width: 420mm;
        height: 594mm;
        margin: 0;
        padding: 0;
        page-break-after: always;
      }
    }

    .carton-page {
      position: relative;
      display: flex;
      flex-direction: column;
      background: #fdfaf5;
      overflow: hidden;
      border: 1px solid #dfd0b9;
    }

    .carton-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .floral-top {
      width: 100%;
      flex-shrink: 0;
      overflow: hidden;
      line-height: 0;
    }

    .floral-top img {
      width: 100%;
      display: block;
      object-fit: cover;
      object-position: top center;
      max-height: 40mm;
      filter: contrast(1.15) saturate(1.1);
    }

    .carton-titulo {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6mm 4mm 17mm;
      flex-shrink: 0;
    }

    .titulo-principal {
      font-family: 'Cormorant Garamond', serif;
      font-style: normal;
      font-weight: 700;
      font-size: 26pt;
      color: #6b4410;
      line-height: 1.1;
      max-width: 80%;
      text-align: center;
      margin: 1px 0;
    }

    .nombre-field {
      display: flex;
      align-items: baseline;
      padding: 8mm 5mm 6mm;
      gap: 2mm;
      flex-shrink: 0;
      max-width: 58%;
    }

    .nombre-label {
      font-family: 'Jost', sans-serif;
      font-size: 13.5pt;
      font-weight: 600;
      color: #3a2010;
      white-space: nowrap;
    }

    .nombre-linea {
      flex: 1;
      border-bottom: 0.8px solid #3d2b1f;
      min-width: 30mm;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      grid-template-rows: repeat(5, 1fr);
      flex: 1;
      background: transparent;
      gap: 1mm;
      border-top: none;
      margin: 3px 4mm 13mm;
      position: relative;
      z-index: 1;
    }

    .celda {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 2mm 2mm 1.5mm;
      text-align: center;
      background: #fdfaf5;
      border: 0.5px solid rgba(140, 100, 60, 0.75);
      border-radius: 2.5mm;
      overflow: hidden;
    }

    .celda.centro {
      justify-content: center;
      padding: 2mm;
      border: none;
    }

    .celda.centro img {
      max-width: 88%;
      max-height: 88%;
      width: auto;
      height: auto;
      display: block;
      filter: contrast(1.15) saturate(1.1);
    }

    .frase-txt {
      font-family: 'Jost', sans-serif;
      font-weight: 500;
      font-size: 14pt;
      color: #3a2010;
      line-height: 1.25;
      overflow-wrap: break-word;
      hyphens: auto;
      hyphenate-limit-chars: 11 4 4;
      max-width: 80%;
      padding-top: 1mm;
    }

    .firma-linea {
      width: 75%;
      border-bottom: 0.7px solid #8a6830;
      margin-top: auto;
      flex-shrink: 0;
      margin-bottom: 1.5mm;
    }

    .floral-corner {
      position: absolute;
      bottom: 0;
      overflow: hidden;
      pointer-events: none;
      width: 45mm;
      height: 26mm;
      line-height: 0;
      z-index: 0;
    }

    .floral-left { left: 0; }

    .floral-right {
      right: 0;
      transform: scaleX(-1);
      transform-origin: center;
    }

    .floral-corner img {
      width: 150%;
      height: auto;
      display: block;
    }

  </style>
</head>
<body>

<div class="print-sheet">
${cartones}
</div>

<script>
  window.onload = () => setTimeout(() => window.print(), 600);
<\/script>

</body>
</html>`;
}

// ── EXPORTAR LOTE PDF ──
// Dimensiones de plancha en px a 96dpi: A2 = 420×594mm
const SHEET_W = 1587;
const SHEET_H = 2244;

async function generarLoteHTML() {
  if (!frasesXLS) { showError('Las frases no están cargadas aún.'); return; }

  const TOTAL   = parseInt(document.getElementById('loteCount')?.value) || 50;
  const nSheets = Math.ceil(TOTAL / 4);
  const progress = document.getElementById('progressMsg');
  progress.style.display = 'block';
  progress.textContent = '⏳ Cargando imágenes...';

  let imgs;
  try {
    imgs = await Promise.all([
      imgToBase64('img/4.png'),
      imgToBase64('img/5.png'),
      imgToBase64('img/6.png'),
    ]);
  } catch(err) {
    showError('Error al cargar imágenes: ' + err.message);
    progress.style.display = 'none';
    return;
  }
  const [img4b64, img5b64, img6b64] = imgs;

  // Generar todos los sets de frases
  const allSets = [];
  for (let i = 0; i < nSheets * 4; i++) {
    const frases = generarFrases();
    if (!frases) { progress.style.display = 'none'; return; }
    allSets.push(frases);
  }

  // Contenedor temporal off-screen para renderizar cada plancha
  const tmp = document.createElement('div');
  tmp.style.cssText = `position:absolute;top:0;left:-${SHEET_W + 20}px;width:${SHEET_W}px;height:${SHEET_H}px;overflow:hidden;`;
  document.body.appendChild(tmp);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [420, 594] });

  for (let s = 0; s < nSheets; s++) {
    progress.textContent = `⏳ Renderizando plancha ${s + 1} de ${nSheets}...`;

    const grupo = allSets.slice(s * 4, s * 4 + 4);
    while (grupo.length < 4) grupo.push(grupo[0]);

    tmp.innerHTML = buildSheetDOM(grupo, img4b64, img5b64, img6b64);
    await new Promise(r => setTimeout(r, 80));

    const canvas = await html2canvas(tmp.firstChild, {
      useCORS: true,
      scale: 3,
      width: SHEET_W,
      height: SHEET_H,
      backgroundColor: '#fdfaf5',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (s > 0) pdf.addPage([420, 594], 'portrait');
    pdf.addImage(imgData, 'JPEG', 0, 0, 420, 594);
  }

  document.body.removeChild(tmp);

  progress.textContent = '📦 Generando PDF...';
  pdf.save(`cartones-bingo-${TOTAL}.pdf`);

  progress.textContent = `✅ ¡Listo! ${nSheets} planchas · ${TOTAL} cartones.`;
  setTimeout(() => { progress.style.display = 'none'; }, 3500);
}

function buildCellsInline(frases, img5b64) {
  let fi = 0;
  const cells = [];
  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      cells.push(`<div style="display:flex;align-items:center;justify-content:center;padding:4px;background:#fdfaf5;border:none;border-radius:9px;overflow:hidden;margin:2px;"><img src="${img5b64}" style="max-width:88%;max-height:88%;width:auto;height:auto;display:block;filter:contrast(1.15) saturate(1.1);"></div>`);
    } else {
      const frase = escapeHtml(frases[fi++] || '');
      cells.push(`<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:4px 4px 3px;text-align:center;background:#fdfaf5;border:0.5px solid rgba(140,100,60,0.75);border-radius:9px;overflow:hidden;margin:2px;"><span style="font-family:'Jost',sans-serif;font-weight:500;font-size:14pt;color:#3a2010;line-height:1.25;overflow-wrap:break-word;hyphens:auto;hyphenate-limit-chars:11 4 4;max-width:80%;padding-top:2px;">${frase}</span><div style="width:75%;border-bottom:0.7px solid #8a6830;margin-top:auto;flex-shrink:0;margin-bottom:3px;"></div></div>`);
    }
  }
  return cells.join('');
}

function buildSheetDOM(grupo, img4b64, img5b64, img6b64) {
  const cW = SHEET_W / 2;
  const cH = SHEET_H / 2;
  const cornerW = Math.round(cW * 0.19);
  const cornerH = Math.round(cH * 0.12);
  const gridMarginB = cornerH + 8;
  const floralH = Math.round(cH * 0.13);

  const cartones = grupo.map(frases => `
    <div style="position:relative;display:flex;flex-direction:column;width:${cW}px;height:${cH}px;background:#fdfaf5;overflow:hidden;border:1px solid #dfd0b9;">
      <div style="width:100%;flex-shrink:0;overflow:hidden;line-height:0;">
        <img src="${img4b64}" style="width:100%;display:block;object-fit:cover;object-position:top center;max-height:${floralH}px;filter:contrast(1.15) saturate(1.1);">
      </div>
      <div style="display:flex;align-items:flex-end;padding:22px 14px 16px;gap:6px;flex-shrink:0;max-width:58%;">
        <span style="font-family:'Jost',sans-serif;font-size:13.5pt;font-weight:600;color:#3a2010;white-space:nowrap;">Tu nombre:</span>
        <span style="flex:1;border-bottom:0.8px solid #3d2b1f;display:inline-block;height:16px;min-width:60px;"></span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;padding:18px 8px 42px;flex-shrink:0;">
        <span style="font-family:'Cormorant Garamond',serif;font-weight:700;font-size:26pt;color:#6b4410;text-align:center;max-width:80%;line-height:1.1;margin:1px 0;display:block;">Encontrá al invitado que...</span>
      </div>
      <div style="position:absolute;bottom:0;left:0;width:${cornerW}px;height:${cornerH}px;overflow:hidden;z-index:0;">
        <img src="${img6b64}" style="width:150%;height:auto;display:block;">
      </div>
      <div style="position:absolute;bottom:0;right:0;width:${cornerW}px;height:${cornerH}px;overflow:hidden;transform:scaleX(-1);z-index:0;">
        <img src="${img6b64}" style="width:150%;height:auto;display:block;">
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);flex:1;background:transparent;gap:0;margin:3px 8px ${Math.round(cornerH / 2)}px;position:relative;z-index:1;">
        ${buildCellsInline(frases, img5b64)}
      </div>
    </div>`).join('');

  return `<div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;width:${SHEET_W}px;height:${SHEET_H}px;background:#fdfaf5;">${cartones}</div>`;
}

// ── LOTE STEPPER ──
function cambiarLote(delta) {
  const el = document.getElementById('loteCount');
  if (!el) return;
  const val = Math.min(600, Math.max(4, (parseInt(el.value) || 50) + delta));
  el.value = val;
}

// ── EXPORTAR LOTE ──
async function generarLote() {
  if (getFormatoSalida() === 'html') {
    await generarLoteHTML();
    return;
  }
  if (!frasesXLS) { showError('Las frases no están cargadas aún.'); return; }

  const TOTAL = parseInt(document.getElementById('loteCount')?.value) || 50;
  const zip = new JSZip();
  const progress = document.getElementById('progressMsg');
  progress.style.display = 'block';
  document.getElementById('previewArea').style.display = 'block';

  const h2cOpts = { useCORS: true, scale: 2, backgroundColor: null, logging: false };
  const wrapper = document.getElementById('cardWrapper');

  for (let i = 1; i <= TOTAL; i++) {
    progress.textContent = `⏳ Generando ${i}/${TOTAL}...`;
    const todas = generarFrases();
    if (!todas) { progress.style.display = 'none'; return; }
    buildGrid(todas);
    await new Promise(r => setTimeout(r, 50));
    const canvas = await html2canvas(wrapper, h2cOpts);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    zip.file(`tarjeta-${String(i).padStart(2,'0')}.png`, blob);
  }

  progress.textContent = '📦 Empaquetando ZIP...';
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipBlob);
  link.download = 'bingo-tarjetas.zip';
  link.click();
  URL.revokeObjectURL(link.href);

  progress.textContent = '✅ ¡Listo! 50 tarjetas descargadas.';
  setTimeout(() => { progress.style.display = 'none'; }, 3000);
}

// ── GUARDAR IMAGEN ──
function guardarImagen() {
  const preview = document.getElementById('previewArea');
  if (!preview || preview.style.display === 'none') {
    showError('Primero generá una tarjeta.'); return;
  }
  const wrapper = document.getElementById('cardWrapper');
  const btn = event.currentTarget;
  btn.disabled = true;
  btn.textContent = '⏳ Guardando...';
  html2canvas(wrapper, {
    useCORS: true, scale: 2, backgroundColor: null, logging: false
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = 'bingo-tarjeta.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).finally(() => {
    btn.disabled = false;
    btn.textContent = '💾 Guardar imagen';
  });
}

// ── INIT ──
window.onload = () => {
  try {
    if (localStorage.getItem('bingo_calib')) {
      document.getElementById('savedBadge').style.display = 'inline-block';
    }
  } catch(e) {}
  cargarFrases();
};
