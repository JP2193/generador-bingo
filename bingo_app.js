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
  return { top: 32.1, left: 6.1, width: 88.4, height: 64.9, font: 11.5, borderColor: '#000000', borderAlpha: 1.0 };
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
  calib = { top: 32.1, left: 6.1, width: 88.4, height: 64.9, font: 11.5, borderColor: '#000000', borderAlpha: 1.0 };
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

function generarTarjeta() {
  const todas = generarFrases();
  if (!todas) return;
  buildGrid(todas);
  document.getElementById('previewArea').style.display = 'block';
  document.getElementById('previewArea').scrollIntoView({behavior:'smooth'});
}

// ── LOTE STEPPER ──
function cambiarLote(delta) {
  const el = document.getElementById('loteCount');
  if (!el) return;
  const val = Math.min(150, Math.max(10, (parseInt(el.textContent) || 50) + delta));
  el.textContent = val;
}

// ── EXPORTAR LOTE ──
async function generarLote() {
  if (!frasesXLS) { showError('Las frases no están cargadas aún.'); return; }

  const TOTAL = parseInt(document.getElementById('loteCount')?.textContent) || 50;
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
