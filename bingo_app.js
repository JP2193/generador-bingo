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

// ── ESTADO CALIBRACIÓN (con defaults o localStorage) ──
let calib = loadCalib();

function loadCalib() {
  try {
    const s = localStorage.getItem('bingo_calib');
    if (s) return JSON.parse(s);
  } catch(e) {}
  return { top: 29.5, left: 5.5, width: 89.0, height: 67.3, font: 9 };
}

function saveCalib(c) {
  try { localStorage.setItem('bingo_calib', JSON.stringify(c)); } catch(e) {}
}

// ── TABS ──
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('.tab-btn')[name === 'generate' ? 0 : 1].classList.add('active');
  if (name === 'calibrate') initCalib();
}

// ── CALIBRADOR ──
let calibVisible = true;

function initCalib() {
  document.getElementById('cTop').value    = calib.top;
  document.getElementById('cLeft').value   = calib.left;
  document.getElementById('cWidth').value  = calib.width;
  document.getElementById('cHeight').value = calib.height;
  document.getElementById('cFont').value   = calib.font;
  updateCalibDisplay();
  buildCalibGrid();
}

['cTop','cLeft','cWidth','cHeight','cFont'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    updateCalibFromSliders();
  });
});

function updateCalibFromSliders() {
  calib = {
    top:    parseFloat(document.getElementById('cTop').value),
    left:   parseFloat(document.getElementById('cLeft').value),
    width:  parseFloat(document.getElementById('cWidth').value),
    height: parseFloat(document.getElementById('cHeight').value),
    font:   parseFloat(document.getElementById('cFont').value),
  };
  updateCalibDisplay();
  buildCalibGrid();
}

function updateCalibDisplay() {
  document.getElementById('dTop').textContent    = calib.top.toFixed(1);
  document.getElementById('dLeft').textContent   = calib.left.toFixed(1);
  document.getElementById('dWidth').textContent  = calib.width.toFixed(1);
  document.getElementById('dHeight').textContent = calib.height.toFixed(1);
  document.getElementById('dFont').textContent   = calib.font;
  const g = document.getElementById('calibGrid');
  g.style.top    = calib.top + '%';
  g.style.left   = calib.left + '%';
  g.style.width  = calib.width + '%';
  g.style.height = calib.height + '%';
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

function toggleCalibGrid() {
  calibVisible = !calibVisible;
  document.getElementById('calibGrid').style.display = calibVisible ? 'grid' : 'none';
}

// ── APLICAR CALIBRACIÓN AL GENERADOR ──
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
}

// ── CARGA DESDE EXCEL ──
let frasesXLS = null; // { facil: [], medio: [], dificil: [] }

function cargarExcel(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      if (!wb.SheetNames.includes('frases')) {
        mostrarExcelError('El archivo no tiene una hoja llamada "frases".');
        return;
      }
      const ws = wb.Sheets['frases'];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rows.length === 0 || !('frase' in rows[0]) || !('nivel' in rows[0])) {
        mostrarExcelError('La hoja "frases" debe tener las columnas "frase" y "nivel".');
        return;
      }
      const facil   = rows.filter(r => String(r.nivel).trim() === 'facil').map(r => String(r.frase).trim()).filter(Boolean);
      const medio   = rows.filter(r => String(r.nivel).trim() === 'medio').map(r => String(r.frase).trim()).filter(Boolean);
      const dificil = rows.filter(r => String(r.nivel).trim() === 'dificil').map(r => String(r.frase).trim()).filter(Boolean);
      frasesXLS = { facil, medio, dificil };
      document.getElementById('excelError').style.display = 'none';
      const res = document.getElementById('excelResumen');
      res.textContent = `✓ ${facil.length} fáciles · ${medio.length} medias · ${dificil.length} difíciles — listo para generar`;
      res.style.display = 'block';
    } catch(err) {
      mostrarExcelError('No se pudo leer el archivo: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
  // Reset para poder reseleccionar el mismo archivo
  input.value = '';
}

function mostrarExcelError(msg) {
  frasesXLS = null;
  document.getElementById('excelResumen').style.display = 'none';
  const el = document.getElementById('excelError');
  el.textContent = msg; el.style.display = 'block';
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

// Retorna array de 24 frases mezcladas según la distribución, o null si hay error
function generarFrases() {
  if (!frasesXLS) { showError('Primero cargá el archivo Excel con las frases (Paso 1).'); return null; }
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

// Construye el DOM de la grilla con las frases dadas
function buildGrid(todas) {
  const o = document.getElementById('gridOverlay');
  o.style.top    = calib.top + '%';
  o.style.left   = calib.left + '%';
  o.style.width  = calib.width + '%';
  o.style.height = calib.height + '%';
  o.innerHTML = '';

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

// ── EXPORTAR LOTE ──
async function generarLote() {
  if (!frasesXLS) { showError('Primero cargá el archivo Excel con las frases (Paso 1).'); return; }

  const TOTAL = 50;
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

    // Esperar un frame para que el navegador pinte el DOM
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
    useCORS: true,
    scale: 2,
    backgroundColor: null,
    logging: false
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
};
