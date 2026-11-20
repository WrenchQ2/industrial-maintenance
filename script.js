/* ============================================================
   SERVMOTION CONTROL — Interfaz del Técnico
   Aplicación frontend de demostración · HTML5 + CSS3 + JS ES6+
   Sin dependencias, sin fetch, sin módulos ES: funciona con file://
   ------------------------------------------------------------
   El archivo es una IIFE (función autoejecutable) que encapsula
   todo el estado y la lógica para no contaminar el ámbito global.
   Orden de lectura:
   1) Configuración, utilidades y datos de demostración.
   2) Estado en localStorage y consultas del dominio.
   3) Componentes de interfaz y armazón (shell).
   4) Router y vistas (inicio, equipos, expediente, diagnósticos,
      historial, documentos y configuración).
   5) Formulario de diagnóstico, validación y finalización.
   6) Manejadores de eventos e inicialización.
   ============================================================ */
(() => {
  'use strict';

  /* ------------------------------------------------------------
     1. Configuración y catálogos
     Constantes inmutables que gobiernan la demo: claves de almacenamiento, límites, estados de equipos y diagnósticos, prioridades, tipos de encoder, filas de sincronía y rutas.
     ------------------------------------------------------------ */
  const CONFIG = Object.freeze({
    storageKey: 'servmotion.control.v1',
    schemaVersion: 1,
    techId: 'TEC-001',
    maxPoles: 64,
    maxImageBytes: 5 * 1024 * 1024,
    autosaveMs: 750,
    imageMaxDimension: 1400,
    avatarMaxDimension: 256,
    notificationDays: 30
  });

  /* Catálogo de estados del equipo con etiqueta, tono visual e icono. */
  const EQUIPMENT_STATUS = Object.freeze({
    assigned: { key: 'assigned', label: 'Asignado', tone: 'blue', icon: 'clock' },
    diagnosing: { key: 'diagnosing', label: 'En diagnóstico', tone: 'amber', icon: 'edit' },
    diagnosed: { key: 'diagnosed', label: 'Diagnosticado', tone: 'cyan', icon: 'check-circle' },
    repair: { key: 'repair', label: 'Por reparar', tone: 'violet', icon: 'settings' },
    finished: { key: 'finished', label: 'Finalizado', tone: 'green', icon: 'check-circle' }
  });

  /* Estados que forman la cola activa del técnico: diagnóstico y reparación. */
  const WORK_QUEUE_STATUSES = Object.freeze(['assigned', 'diagnosing', 'repair']);

  /* Estados posibles de un registro de diagnóstico: borrador o finalizado. */
  const DIAG_STATUS = Object.freeze({
    draft: { key: 'draft', label: 'Borrador', tone: 'amber' },
    finished: { key: 'finished', label: 'Finalizado', tone: 'green' }
  });

  /* Prioridades de trabajo y su color de insignia. */
  const PRIORITY = Object.freeze({
    high: { key: 'high', label: 'Alta', tone: 'red' },
    medium: { key: 'medium', label: 'Media', tone: 'amber' },
    low: { key: 'low', label: 'Baja', tone: 'gray' }
  });

  /* Tipos de encoder admitidos y ayuda mostrada en el formulario. */
  const ENCODER_TYPES = Object.freeze([
    { value: 'resolver', label: 'Resolver', hint: 'Señales seno, coseno y referencia' },
    { value: 'incremental', label: 'Incremental', hint: 'Pulsos A, B y Z' },
    { value: 'absoluto', label: 'Absoluto', hint: 'Posición codificada' },
    { value: 'otro', label: 'Otro', hint: 'Parámetros por definir' }
  ]);

  /* Filas fijas de la tabla de sincronía (pares de fases). */
  const SYNC_ROWS = Object.freeze(['U-V', 'U-W', 'V-W', 'V-U', 'W-V', 'W-U']);

  /* Bloques del formulario editable y etiqueta corta usada en las pestañas. */
  const DIAG_BLOCKS = Object.freeze([
    { key: 'A', title: 'Evaluación' },
    { key: 'B', title: 'Retroalimentación' },
    { key: 'C', title: 'Pinout y sincronía' },
    { key: 'D', title: 'Conclusiones' }
  ]);

  /* Metadatos de las rutas principales: título de página y módulo activo del sidebar. */
  const ROUTE_META = Object.freeze({
    inicio: { title: 'Inicio', nav: 'inicio' },
    equipos: { title: 'Equipos', nav: 'equipos' },
    expediente: { title: 'Expediente digital', nav: 'equipos' },
    diagnosticos: { title: 'Diagnósticos', nav: 'diagnosticos' },
    historial: { title: 'Historial', nav: 'historial' },
    documentos: { title: 'Documentos', nav: 'documentos' },
    configuracion: { title: 'Configuración', nav: 'configuracion' }
  });

  /* Claves auxiliares de localStorage; se usa para respaldar datos corruptos. */
  const STORAGE_KEYS = Object.freeze({
    corruptPrefix: 'servmotion.control.corrupt.'
  });

  /* ------------------------------------------------------------
     2. Referencias del documento
     Caché de los nodos fijos del HTML (shell, buscador, notificaciones, modales y toasts) y atajos $ / $$ para consultar el DOM.
     ------------------------------------------------------------ */
  /* Referencias cacheadas de los elementos fijos del documento. */
  const refs = {
    app: document.getElementById('app'),
    pageTitle: document.getElementById('page-title'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    sidebarClose: document.getElementById('sidebar-close'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    logoutBtn: document.getElementById('logout-btn'),
    globalSearch: document.getElementById('global-search'),
    globalSearchInput: document.getElementById('global-search-input'),
    globalResults: document.getElementById('global-results'),
    notifBtn: document.getElementById('notif-btn'),
    notifBadge: document.getElementById('notif-badge'),
    notifPanel: document.getElementById('notif-panel'),
    userMenuBtn: document.getElementById('user-menu-btn'),
    userDropdown: document.getElementById('user-dropdown'),
    topbarAvatar: document.getElementById('topbar-avatar'),
    topbarUserName: document.getElementById('topbar-user-name'),
    topbarUserRole: document.getElementById('topbar-user-role'),
    storageBanner: document.getElementById('storage-banner'),
    modalRoot: document.getElementById('modal-root'),
    toastRoot: document.getElementById('toast-root'),
    liveRegion: document.getElementById('live-region')
  };

  /* Atajos de consulta del DOM: $ devuelve el primer nodo y $$ un array. */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* ------------------------------------------------------------
     3. Utilidades generales
     Funciones puras de apoyo: escape de HTML, fechas, normalización de texto, rutas de objetos, lectura y compresión de imágenes, descargas y metadatos de estado.
     ------------------------------------------------------------ */
  /* Utilidades de texto: escapan HTML/atributos para insertar datos de forma segura. */
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const escapeAttr = escapeHtml;
  const icon = (name, className = '') => `<svg class="icon ${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const uid = (prefix = 'ID') => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const nowIso = () => new Date().toISOString();
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const isFiniteNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number);
  };
  const normalize = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const truncate = (value, length = 90) => {
    const text = String(value ?? '');
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  };
  const initials = (name) => String(name || 'Técnico')
    .trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
  const htmlValue = (value, fallback = '—') => {
    const text = String(value ?? '').trim();
    return text ? escapeHtml(text) : `<span class="missing">${escapeHtml(fallback)}</span>`;
  };
  const setByPath = (object, path, value) => {
    const parts = path.split('.');
    let cursor = object;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) cursor[part] = value;
      else {
        if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
        cursor = cursor[part];
      }
    });
  };
  const getByPath = (object, path) => path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), object);

  /* Utilidades de fecha y hora: formatean en español y calculan tiempos relativos. */
  const pad = (number) => String(number).padStart(2, '0');
  const daysAgo = (days, hour = 9, minute = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };
  const formatDate = (iso, fallback = '—') => {
    if (!iso) return fallback;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return fallback;
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  };
  const formatDateTime = (iso, fallback = '—') => {
    if (!iso) return fallback;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return fallback;
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };
  const formatTime = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(date);
  };
  const formatLongDate = (date = new Date()) => {
    const text = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  const timeAgo = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff)) return '';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'hace un momento';
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days} d`;
    const months = Math.floor(days / 30);
    if (months < 12) return `hace ${months} mes${months === 1 ? '' : 'es'}`;
    return formatDate(iso);
  };
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };
  const debounce = (fn, wait = 200) => {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };
  const sortByDateDesc = (items, field = 'date') => [...items].sort((a, b) => new Date(b[field] || 0) - new Date(a[field] || 0));

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const svgDataUrl = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  const safeFilename = (name) => String(name || 'documento').replace(/[\\/:*?"<>|]+/g, '-');

  /* Utilidades de archivos e imágenes: leen un File, cargan la imagen y generan descargas. */
  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No fue posible leer el archivo.'));
    reader.readAsDataURL(file);
  });

  const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No fue posible procesar la imagen.'));
    image.src = src;
  });

  /* Valida el tipo y tamaño de una imagen, la redimensiona en canvas y reduce la calidad hasta que
     el dataURL cabe en localStorage. Devuelve dataUrl, nombre y dimensiones.
     */
  async function compressImage(file, maxDimension = CONFIG.imageMaxDimension) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!file || !validTypes.includes(file.type)) {
      throw new Error('Selecciona una imagen JPG, PNG o WebP.');
    }
    if (file.size > CONFIG.maxImageBytes) {
      throw new Error('La imagen supera el límite de 5 MB.');
    }
    const source = await readFileAsDataUrl(file);
    const image = await loadImage(source);
    const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    let width = Math.max(1, Math.round((image.naturalWidth || image.width) * ratio));
    let height = Math.max(1, Math.round((image.naturalHeight || image.height) * ratio));
    let quality = 0.84;
    let result = '';
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      result = canvas.toDataURL('image/jpeg', quality);
      if (result.length <= 720000) break;
      if (attempt === 1) {
        width = Math.max(1, Math.round(width * 0.8));
        height = Math.max(1, Math.round(height * 0.8));
      }
      quality = Math.max(0.55, quality - 0.1);
    }
    return {
      dataUrl: result,
      fileName: file.name || 'pinout.jpg',
      width,
      height,
      originalBytes: file.size
    };
  }

  /* Descarga un texto como archivo usando un Blob y un enlace temporal; libera la URL al terminar. */
  function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeFilename(filename);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* Metadatos y ayudas de presentación: etiquetas de encoder, estado, prioridad e iconos de
     historial.
     */
  const encoderLabel = (value) => ENCODER_TYPES.find((item) => item.value === value)?.label || '—';
  const statusMeta = (key) => EQUIPMENT_STATUS[key] || EQUIPMENT_STATUS.assigned;
  const priorityMeta = (key) => PRIORITY[key] || PRIORITY.low;
  const diagStatusMeta = (key) => DIAG_STATUS[key] || DIAG_STATUS.draft;
  const historyIcon = (type) => {
    if (type === 'assignment') return { icon: 'cpu', tone: 'blue' };
    if (type === 'diagnosis_started') return { icon: 'edit', tone: 'amber' };
    if (type === 'diagnosis_finished') return { icon: 'check-circle', tone: 'green' };
    if (type === 'equipment_finished') return { icon: 'shield', tone: 'cyan' };
    return { icon: 'history', tone: 'blue' };
  };

  /* ------------------------------------------------------------
     4. Ilustraciones internas y datos de demostración
     Generación de imágenes SVG embebidas y buildSeed(), que crea el estado ficticio inicial con técnico, clientes, tres equipos, diagnósticos, historial y documentos.
     ------------------------------------------------------------ */
  /* Genera una ilustración SVG (data URL) del servomotor para las fotografías de recepción de la
     demo.
     */
  function equipmentPhoto(manufacturer, model, variant = 'blue') {
    const accent = variant === 'cyan' ? '#22d3ee' : '#60a5fa';
    const glow = variant === 'cyan' ? 'rgba(34,211,238,.22)' : 'rgba(96,165,250,.22)';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#071a31"/><stop offset="1" stop-color="#123a63"/>
        </linearGradient>
        <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e8f0fb"/><stop offset=".55" stop-color="#b9cbe2"/><stop offset="1" stop-color="#8fa8c4"/>
        </linearGradient>
        <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#294b73"/><stop offset="1" stop-color="#122b49"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="45%" r="55%">
          <stop offset="0" stop-color="${glow}"/><stop offset="1" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill="url(#bg)"/>
      <circle cx="430" cy="240" r="270" fill="url(#glow)"/>
      <g stroke="#7dd3fc" stroke-width="1" opacity=".13">
        <path d="M0 100h800M0 200h800M0 300h800M0 400h800M100 0v500M200 0v500M300 0v500M400 0v500M500 0v500M600 0v500M700 0v500"/>
      </g>
      <g opacity=".55" fill="none" stroke="${accent}" stroke-width="2">
        <path d="M80 80h60M80 80v60M720 420h-60M720 420v-60"/>
      </g>
      <g transform="translate(238 168)">
        <rect x="0" y="36" width="340" height="150" rx="22" fill="url(#dark)" stroke="#486d98" stroke-width="2"/>
        <g fill="#0a1d34" stroke="#5d83ad" stroke-width="1.4">
          <rect x="22" y="18" width="14" height="36" rx="4"/><rect x="46" y="18" width="14" height="36" rx="4"/>
          <rect x="70" y="18" width="14" height="36" rx="4"/><rect x="94" y="18" width="14" height="36" rx="4"/>
          <rect x="118" y="18" width="14" height="36" rx="4"/><rect x="142" y="18" width="14" height="36" rx="4"/>
          <rect x="166" y="18" width="14" height="36" rx="4"/><rect x="190" y="18" width="14" height="36" rx="4"/>
          <rect x="214" y="18" width="14" height="36" rx="4"/><rect x="238" y="18" width="14" height="36" rx="4"/>
          <rect x="262" y="18" width="14" height="36" rx="4"/><rect x="286" y="18" width="14" height="36" rx="4"/>
        </g>
        <rect x="57" y="76" width="145" height="78" rx="10" fill="url(#metal)" stroke="#f4f8ff" stroke-width="1.5"/>
        <circle cx="129" cy="115" r="27" fill="url(#dark)" stroke="#d7e4f3" stroke-width="2"/>
        <circle cx="129" cy="115" r="10" fill="${accent}" opacity=".9"/>
        <path d="M226 93h32M226 115h32M226 137h32" stroke="#7f9ab8" stroke-width="3" stroke-linecap="round"/>
        <rect x="340" y="92" width="76" height="42" rx="7" fill="url(#metal)" stroke="#eef5ff" stroke-width="1.5"/>
        <rect x="416" y="103" width="48" height="20" rx="4" fill="#d7e4f3" stroke="#f8fbff"/>
        <rect x="12" y="186" width="316" height="14" rx="7" fill="#071a31" opacity=".7"/>
      </g>
      <g font-family="Segoe UI, Arial, sans-serif">
        <text x="54" y="62" fill="${accent}" font-size="15" font-weight="700" letter-spacing="3">SERVMOTION · DEMOSTRACIÓN</text>
        <text x="54" y="428" fill="#ffffff" font-size="29" font-weight="700">${manufacturer}</text>
        <text x="54" y="456" fill="#b9d2ec" font-size="17" font-family="Consolas, monospace">${model}</text>
        <text x="746" y="456" fill="#7fa1c4" font-size="12" text-anchor="end">IMAGEN ILUSTRATIVA</text>
      </g>
    </svg>`;
    return svgDataUrl(svg);
  }

  /* Genera el SVG de ejemplo del conector circular usado como pinout de demostración. */
  function pinoutDemoImage() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 540">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fbff"/><stop offset="1" stop-color="#e7eef8"/></linearGradient>
        <radialGradient id="metal" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#cfdae8"/><stop offset="1" stop-color="#aebed2"/></radialGradient>
      </defs>
      <rect width="900" height="540" fill="url(#bg)"/>
      <g stroke="#cbd8e8" stroke-width="1" opacity=".7">
        <path d="M0 90h900M0 180h900M0 270h900M0 360h900M0 450h900M150 0v540M300 0v540M450 0v540M600 0v540M750 0v540"/>
      </g>
      <text x="45" y="58" fill="#0b2545" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="700">PINOUT DE RETROALIMENTACIÓN · DEMO</text>
      <text x="45" y="82" fill="#64748b" font-family="Segoe UI, Arial, sans-serif" font-size="13">Conector circular · vista frontal · referencia J4 / CON-A</text>
      <circle cx="450" cy="290" r="152" fill="url(#metal)" stroke="#8199b5" stroke-width="3"/>
      <circle cx="450" cy="290" r="116" fill="#e8eef6" stroke="#a9bad0" stroke-width="2"/>
      <circle cx="450" cy="290" r="56" fill="#c7d5e5" stroke="#91a7c0" stroke-width="2"/>
      <g font-family="Consolas, monospace" font-size="13" font-weight="700" fill="#0b2545" text-anchor="middle">
        <g><circle cx="450" cy="196" r="16" fill="#155eef" stroke="#0b3fae"/><text x="450" y="201" fill="#fff">1</text><text x="450" y="164">SEN</text></g>
        <g><circle cx="530" cy="222" r="16" fill="#0891b2" stroke="#0e7490"/><text x="530" y="227" fill="#fff">2</text><text x="566" y="210">COS</text></g>
        <g><circle cx="554" cy="310" r="16" fill="#b45309" stroke="#92400e"/><text x="554" y="315" fill="#fff">3</text><text x="588" y="314">REF</text></g>
        <g><circle cx="500" cy="386" r="16" fill="#15803d" stroke="#166534"/><text x="500" y="391" fill="#fff">4</text><text x="500" y="420">0V</text></g>
        <g><circle cx="400" cy="386" r="16" fill="#b91c1c" stroke="#991b1b"/><text x="400" y="391" fill="#fff">5</text><text x="400" y="420">+5V</text></g>
        <g><circle cx="346" cy="310" r="16" fill="#475569" stroke="#334155"/><text x="346" y="315" fill="#fff">6</text><text x="310" y="314">SHLD</text></g>
        <g><circle cx="370" cy="222" r="16" fill="#7c3aed" stroke="#5b21b6"/><text x="370" y="227" fill="#fff">7</text><text x="334" y="210">TEMP</text></g>
      </g>
      <g font-family="Segoe UI, Arial, sans-serif">
        <text x="45" y="500" fill="#64748b" font-size="12">Documento de demostración · No usar para conexión real</text>
        <text x="855" y="500" fill="#94a3b8" font-size="12" text-anchor="end">SERVMOTION CONTROL</text>
      </g>
    </svg>`;
    return svgDataUrl(svg);
  }

  /* Vendedores ficticios asociados a los equipos de la demostración. */
  const DEMO_SELLERS = Object.freeze({
    'EQ-001': 'Mariana Cortés',
    'EQ-002': 'Diego Fuentes',
    'EQ-003': 'Mariana Cortés'
  });

  /* Equipo de demostración ya autorizado por el vendedor y con materiales completos, por lo que la
     cola del técnico lo muestra como "Por reparar".
     */
  function seedRepairEquipment() {
    return {
      id: 'EQ-003',
      order: 'SM-2026-0151',
      clientId: 'CLI-002',
      seller: DEMO_SELLERS['EQ-003'],
      manufacturer: 'FANUC',
      model: 'A06B-0075-B403',
      serial: 'FAN-A06-5514',
      receptionDate: daysAgo(16, 10, 10),
      priority: 'medium',
      status: 'repair',
      technicianId: CONFIG.techId,
      assignmentDate: daysAgo(15, 9, 30),
      receivedBy: 'Mtro. Jorge Salinas',
      receptionNotes: 'Equipo autorizado por el vendedor y con materiales completos. Se asigna al técnico para iniciar la reparación.',
      accessories: ['Cable de potencia 3 m', 'Conector de encoder', 'Placa de montaje'],
      reportedFailure: 'Pérdida de posición y ruido mecánico. El cliente autorizó la reparación del encoder y la validación en banco.',
      photos: [
        equipmentPhoto('FANUC', 'A06B-0075-B403', 'blue'),
        equipmentPhoto('FANUC', 'Vista de conector', 'cyan')
      ]
    };
  }

  /* Diagnóstico ficticio ya finalizado de EQ-003. Se muestra como referencia bloqueada al iniciar
     la reparación; el técnico puede consultarlo, pero no editarlo.
     */
  function seedRepairDiagnostic(id = 'DIA-0002') {
    return {
      id,
      equipmentId: 'EQ-003',
      order: 'SM-2026-0151',
      technicianAssignedId: CONFIG.techId,
      capturedById: CONFIG.techId,
      status: 'finished',
      createdAt: daysAgo(13, 10, 0),
      updatedAt: daysAgo(12, 17, 30),
      finalizedAt: daysAgo(12, 17, 30),
      assessment: {
        visualCondition: 'Conector de encoder con desgaste',
        safetyCheck: 'Verificado',
        initialObservations: 'Se recibió el equipo con el conector de retroalimentación flojo y presencia de polvo. Se revisó la placa de características y se confirmó que no hay daños estructurales.'
      },
      encoder: {
        type: 'absoluto',
        impedanceSine: '121.4',
        impedanceCosine: '120.8',
        impedanceReference: '60.2'
      },
      pinout: {
        image: pinoutDemoImage(),
        fileName: 'pinout-fanuc-a06b.svg',
        manufacturer: 'FANUC',
        manual: 'Manual de mantenimiento A06B Serie αi',
        page: '112',
        connectorRef: 'JF1 / CON-B'
      },
      poles: 8,
      syncStored: 'no',
      syncValues: {
        'U-V': ['0.81', '0.82', '0.80', '0.83', '0.82', '0.81', '0.84', '0.82'],
        'U-W': ['0.83', '0.82', '0.84', '0.81', '0.83', '0.82', '0.81', '0.83'],
        'V-W': ['0.82', '0.84', '0.81', '0.83', '0.82', '0.84', '0.83', '0.81'],
        'V-U': ['0.80', '0.81', '0.83', '0.82', '0.81', '0.83', '0.82', '0.84'],
        'W-V': ['0.83', '0.82', '0.81', '0.84', '0.83', '0.81', '0.82', '0.83'],
        'W-U': ['0.81', '0.83', '0.82', '0.80', '0.84', '0.82', '0.83', '0.82']
      },
      conclusion: {
        rootCause: 'Desgaste del conector de retroalimentación y variación de la señal del encoder absoluto, compatible con la pérdida de posición reportada.',
        actionsPerformed: 'Se inspeccionó el arnés, se midieron impedancias y se validó la tabla de sincronía con ocho polos en banco. Se confirmó la necesidad de sustituir el conector y recalibrar el encoder.',
        finalResult: 'Requiere intervención',
        notes: 'Diagnóstico de referencia para la reparación. Sustituir el conector, revisar el arnés y validar la posición absoluta al energizar. Registro bloqueado: el técnico no puede modificarlo.'
      }
    };
  }

  /* Construye el estado inicial completo de la demostración: técnico, clientes, equipos,
     diagnósticos, historial, documentos y preferencias.
     */
  function buildSeed() {
    const tech = {
      id: CONFIG.techId,
      name: 'Carlos Mendoza',
      role: 'Técnico',
      email: 'carlos.mendoza@servmotion.mx',
      avatar: null
    };

    const clients = [
      {
        id: 'CLI-001',
        company: 'Aceros del Norte S.A. de C.V.',
        contact: 'Ing. Laura Ríos',
        phone: '+52 81 8123 4455',
        email: 'laura.rios@acerosnorte.mx',
        address: 'Parque Industrial Santa Catarina, N.L.'
      },
      {
        id: 'CLI-002',
        company: 'Automotriz Bajío S.A. de C.V.',
        contact: 'Mtro. Jorge Salinas',
        phone: '+52 442 118 9032',
        email: 'jorge.salinas@autobajio.mx',
        address: 'Querétaro, Qro.'
      }
    ];

    const equipment = [
      {
        id: 'EQ-001',
        order: 'SM-2026-0142',
        clientId: 'CLI-001',
        seller: DEMO_SELLERS['EQ-001'],
        manufacturer: 'Siemens',
        model: '1FK7063-2AF71-1RG1',
        serial: 'SIE-1FK-8842',
        receptionDate: daysAgo(4, 9, 20),
        priority: 'high',
        status: 'assigned',
        technicianId: CONFIG.techId,
        assignmentDate: daysAgo(3, 10, 20),
        receivedBy: 'Ing. Laura Ríos',
        receptionNotes: 'Equipo recibido en rack de transporte, sin golpes visibles. Se entrega con acoplamiento y conector de encoder.',
        accessories: ['Cable de potencia 4 m', 'Conector de encoder', 'Acoplamiento rígido'],
        reportedFailure: 'Pérdida de posición intermitente y alarma de retroalimentación durante el ciclo de maquinado. El cliente reporta que la falla aparece después de 20 minutos de operación continua.',
        photos: [
          equipmentPhoto('SIEMENS', '1FK7063-2AF71-1RG1', 'blue'),
          equipmentPhoto('SIEMENS', 'Vista de conector', 'cyan')
        ]
      },
      {
        id: 'EQ-002',
        order: 'SM-2026-0137',
        clientId: 'CLI-002',
        seller: DEMO_SELLERS['EQ-002'],
        manufacturer: 'Allen-Bradley',
        model: 'MPL-B430P-MK72AA',
        serial: 'AB-MPL-2291',
        receptionDate: daysAgo(11, 8, 45),
        priority: 'medium',
        status: 'finished',
        technicianId: CONFIG.techId,
        assignmentDate: daysAgo(10, 9, 5),
        finishedDate: daysAgo(5, 11, 0),
        receivedBy: 'Mtro. Jorge Salinas',
        receptionNotes: 'Recibido con marcas menores en la carcasa. Se documentó el estado en el certificado de recepción.',
        accessories: ['Cable de retroalimentación', 'Kit de montaje'],
        reportedFailure: 'Sobrecalentamiento y ruido en el eje tras el cambio de drive. El equipo opera con vibración en el rango alto de velocidad.',
        photos: [
          equipmentPhoto('ALLEN-BRADLEY', 'MPL-B430P-MK72AA', 'cyan'),
          equipmentPhoto('ALLEN-BRADLEY', 'Vista de placa', 'blue')
        ]
      },
      seedRepairEquipment()
    ];

    const diagnostics = [
      {
        id: 'DIA-0001',
        equipmentId: 'EQ-002',
        order: 'SM-2026-0137',
        technicianAssignedId: CONFIG.techId,
        capturedById: CONFIG.techId,
        status: 'finished',
        createdAt: daysAgo(8, 8, 15),
        updatedAt: daysAgo(6, 16, 20),
        finalizedAt: daysAgo(6, 16, 20),
        assessment: {
          visualCondition: 'Sin daños visibles',
          safetyCheck: 'Verificado',
          initialObservations: 'Se recibió el equipo en el rack de transporte, sin golpes ni humedad. Se verificó el estado del conector de retroalimentación y la placa de características antes de iniciar la revisión.'
        },
        encoder: {
          type: 'resolver',
          impedanceSine: '118.5',
          impedanceCosine: '117.9',
          impedanceReference: '59.8'
        },
        pinout: {
          image: pinoutDemoImage(),
          fileName: 'pinout-abb-mpl.svg',
          manufacturer: 'Allen-Bradley',
          manual: 'Manual de instalación MPL-Series',
          page: '47',
          connectorRef: 'J4 / CON-A'
        },
        poles: 4,
        syncStored: 'no',
        syncValues: {
          'U-V': ['0.82', '0.83', '0.81', '0.84'],
          'U-W': ['0.84', '0.82', '0.83', '0.82'],
          'V-W': ['0.83', '0.84', '0.82', '0.81'],
          'V-U': ['0.81', '0.83', '0.84', '0.83'],
          'W-V': ['0.82', '0.81', '0.83', '0.84'],
          'W-U': ['0.84', '0.83', '0.81', '0.82']
        },
        conclusion: {
          rootCause: 'Desgaste del aislamiento en el bobinado de fase W y variación de la señal de referencia del resolver. El sobrecalentamiento reportado es consistente con el incremento de impedancia detectado.',
          actionsPerformed: 'Se midieron impedancias de seno, coseno y referencia. Se revisó el pinout contra el manual del fabricante y se validó la tabla de sincronía con cuatro polos en el banco de verificación.',
          finalResult: 'Requiere intervención',
          notes: 'Se recomienda sustituir el arnés de retroalimentación y repetir la medición de sincronía después del cambio. El equipo queda diagnosticado para continuar con el proceso administrativo correspondiente.'
        }
      },
      seedRepairDiagnostic()
    ];

    const history = [
      {
        id: 'HIS-0005',
        equipmentId: 'EQ-002',
        order: 'SM-2026-0137',
        type: 'equipment_finished',
        activity: 'Equipo finalizado',
        executedBy: 'Cierre administrativo externo',
        registeredBy: 'Sistema',
        date: daysAgo(5, 11, 0),
        previousStatus: 'Diagnosticado',
        newStatus: 'Finalizado',
        observations: 'Cierre administrativo del expediente después del diagnóstico técnico.'
      },
      {
        id: 'HIS-0004',
        equipmentId: 'EQ-002',
        order: 'SM-2026-0137',
        type: 'diagnosis_finished',
        activity: 'Diagnóstico finalizado',
        executedBy: 'Carlos Mendoza',
        registeredBy: 'Carlos Mendoza',
        date: daysAgo(6, 16, 20),
        previousStatus: 'En diagnóstico',
        newStatus: 'Diagnosticado',
        observations: 'Diagnóstico DIA-0001 finalizado. El equipo cambió a Diagnosticado.'
      },
      {
        id: 'HIS-0003',
        equipmentId: 'EQ-002',
        order: 'SM-2026-0137',
        type: 'diagnosis_started',
        activity: 'Diagnóstico iniciado',
        executedBy: 'Carlos Mendoza',
        registeredBy: 'Carlos Mendoza',
        date: daysAgo(8, 8, 15),
        previousStatus: 'Asignado',
        newStatus: 'En diagnóstico',
        observations: 'Se inició la captura del diagnóstico técnico.'
      },
      {
        id: 'HIS-0002',
        equipmentId: 'EQ-002',
        order: 'SM-2026-0137',
        type: 'assignment',
        activity: 'Equipo asignado',
        executedBy: 'Asignación automática',
        registeredBy: 'Sistema',
        date: daysAgo(10, 9, 5),
        previousStatus: 'Sin asignar',
        newStatus: 'Asignado',
        observations: 'Asignación de carga de trabajo al técnico Carlos Mendoza.'
      },
      {
        id: 'HIS-0001',
        equipmentId: 'EQ-001',
        order: 'SM-2026-0142',
        type: 'assignment',
        activity: 'Equipo asignado',
        executedBy: 'Asignación automática',
        registeredBy: 'Sistema',
        date: daysAgo(3, 10, 20),
        previousStatus: 'Sin asignar',
        newStatus: 'Asignado',
        observations: 'Asignación de carga de trabajo al técnico Carlos Mendoza.'
      }
    ];

    const documents = [
      {
        id: 'DOC-001',
        name: 'Manual de instalación Siemens 1FK7',
        type: 'Manual',
        equipmentId: 'EQ-001',
        order: 'SM-2026-0142',
        date: daysAgo(4, 10, 0),
        version: '2.1',
        reference: 'SIE-1FK7-MAN',
        file: {
          name: 'manual-siemens-1fk7.txt',
          mime: 'text/plain;charset=utf-8',
          content: 'SERVMOTION CONTROL · DOCUMENTO DE DEMOSTRACIÓN\n\nManual de instalación · Siemens 1FK7\nVersión 2.1 · Referencia SIE-1FK7-MAN\n\n1. Verificar el estado del embalaje antes de la recepción.\n2. Confirmar la placa de características contra la orden de servicio.\n3. Revisar el conector de retroalimentación y el pinout del fabricante.\n4. Registrar impedancias de señales seno, coseno y referencia.\n5. Documentar cualquier anomalía antes de energizar el equipo.\n\nEste archivo es ficticio y forma parte del entorno de demostración.'
        }
      },
      {
        id: 'DOC-002',
        name: 'Pinout del conector de retroalimentación',
        type: 'Pinout',
        equipmentId: 'EQ-001',
        order: 'SM-2026-0142',
        date: daysAgo(4, 10, 15),
        version: '1.0',
        reference: 'SIE-1FK7-PIN',
        file: {
          name: 'pinout-siemens-1fk7.txt',
          mime: 'text/plain;charset=utf-8',
          content: 'PINOUT DE DEMOSTRACIÓN · SIEMENS 1FK7\n\nReferencia del conector: J4 / CON-A\nPágina del manual: 47\n\nPin 1 · SEN\nPin 2 · COS\nPin 3 · REF\nPin 4 · 0V\nPin 5 · +5V\nPin 6 · SHLD\nPin 7 · TEMP\n\nNo usar esta información para conexión real.'
        }
      },
      {
        id: 'DOC-003',
        name: 'Ficha técnica Allen-Bradley MPL',
        type: 'Ficha técnica',
        equipmentId: 'EQ-002',
        order: 'SM-2026-0137',
        date: daysAgo(10, 12, 0),
        version: '1.3',
        reference: 'AB-MPL-DAT',
        file: {
          name: 'ficha-allen-bradley-mpl.txt',
          mime: 'text/plain;charset=utf-8',
          content: 'SERVMOTION CONTROL · FICHA TÉCNICA DE DEMOSTRACIÓN\n\nAllen-Bradley MPL-B430P-MK72AA\nFamilia: MPL Servo Motor\nRetroalimentación: absoluta multifuncional\nTensión de bus: 400 V\nGrado de protección: IP65\n\nDatos ficticios para demostración. No usar para selección de equipo.'
        }
      },
      {
        id: 'DOC-004',
        name: 'Certificado de recepción EQ-002',
        type: 'Certificado',
        equipmentId: 'EQ-002',
        order: 'SM-2026-0137',
        date: daysAgo(11, 9, 10),
        version: '1.0',
        reference: 'AB-REC-0137',
        file: {
          name: 'certificado-recepcion-eq-002.txt',
          mime: 'text/plain;charset=utf-8',
          content: 'SERVMOTION CONTROL · CERTIFICADO DE RECEPCIÓN DE DEMOSTRACIÓN\n\nOrden de servicio: SM-2026-0137\nEquipo: Allen-Bradley MPL-B430P-MK72AA\nSerie: AB-MPL-2291\nCliente: Automotriz Bajío S.A. de C.V.\n\nEstado de recepción: marcas menores en la carcasa, documentadas en el expediente.\nAccesorios recibidos: cable de retroalimentación y kit de montaje.\n\nDocumento ficticio sin validez legal.'
        }
      }
    ];

    return {
      schemaVersion: CONFIG.schemaVersion,
      tech,
      clients,
      equipment,
      diagnostics,
      history,
      documents,
      preferences: {
        density: 'comfortable',
        textSize: 'normal',
        notifications: true,
        reducedMotion: false
      },
      ui: {
        sidebarCollapsed: false
      }
    };
  }

  /* ------------------------------------------------------------
     5. Estado, almacenamiento y recuperación
     Variables de estado en memoria, preferencias de interfaz, lectura/validación de localStorage, respaldo de datos corruptos y aviso de cuota o almacenamiento no disponible.
     ------------------------------------------------------------ */
  /* Estado global en memoria. state se hidrata desde localStorage y ui guarda datos efímeros de la
     sesión.
     */
  let state = null;
  let storageReady = true;
  let lastStorageError = null;
  let bootNotices = [];
  let autosaveTimer = null;
  let activeDraftId = null;
  let activeDiagTab = 'A';

  const ui = {
    modalOpen: false,
    modalReturnFocus: null,
    diagErrors: [],
    expedienteTab: 'resumen'
  };

  /* Comprueba que el objeto recuperado tiene la versión de esquema esperada y todas las
     colecciones necesarias.
     */
  function isValidState(value) {
    return Boolean(
      value && typeof value === 'object' &&
      value.schemaVersion === CONFIG.schemaVersion &&
      value.tech && typeof value.tech.id === 'string' &&
      Array.isArray(value.clients) && Array.isArray(value.equipment) &&
      Array.isArray(value.diagnostics) && Array.isArray(value.history) &&
      Array.isArray(value.documents) && value.preferences && value.ui
    );
  }

  /* Devuelve un estado nuevo a partir del seed de demostración. */
  function freshState() {
    return buildSeed();
  }

  /* Guarda una copia del JSON inválido en una clave temporal antes de reiniciar los datos. */
  function backupCorruptPayload(raw) {
    try {
      localStorage.setItem(`${STORAGE_KEYS.corruptPrefix}${Date.now()}`, raw);
    } catch (error) {
      console.warn('No fue posible respaldar el almacenamiento corrupto.', error);
    }
  }

  /* Completa estados guardados con versiones anteriores: añade el vendedor y el equipo EQ-003
     sin borrar diagnósticos ni borradores existentes.
     */
  function ensureDemoState(data) {
    let changed = false;
    data.equipment.forEach((item) => {
      if (!item.seller) {
        item.seller = DEMO_SELLERS[item.id] || 'Sin vendedor';
        changed = true;
      }
    });
    if (!data.equipment.some((item) => item.id === 'EQ-003')) {
      data.equipment.push(seedRepairEquipment());
      changed = true;
    }
    if (!data.diagnostics.some((item) => item.equipmentId === 'EQ-003')) {
      data.diagnostics.push(seedRepairDiagnostic(nextSequentialId('DIA', data.diagnostics)));
      changed = true;
    }
    if (changed) {
      try {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
      } catch (error) {
        console.warn('No se pudo guardar la actualización de la demo; se aplicará solo en esta sesión.', error);
      }
    }
    return data;
  }

  /* Lee y valida localStorage; si no existe, está corrupto o es incompatible, respalda lo posible
     y devuelve el seed, registrando avisos de arranque.
     */
  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) {
        const seed = freshState();
        try {
          localStorage.setItem(CONFIG.storageKey, JSON.stringify(seed));
        } catch (error) {
          storageReady = false;
          lastStorageError = error;
        }
        return seed;
      }
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        backupCorruptPayload(raw);
        bootNotices.push({ type: 'warning', title: 'Datos locales restaurados', message: 'El almacenamiento estaba dañado. Se creó una copia de respaldo y se cargó la demostración.' });
        const seed = freshState();
        try {
          localStorage.setItem(CONFIG.storageKey, JSON.stringify(seed));
        } catch (writeError) {
          storageReady = false;
          lastStorageError = writeError;
        }
        return seed;
      }
      if (!isValidState(parsed)) {
        backupCorruptPayload(raw);
        bootNotices.push({ type: 'warning', title: 'Datos incompatibles', message: 'La información guardada no corresponde a esta versión. Se conservó un respaldo y se reinició la demostración.' });
        const seed = freshState();
        try {
          localStorage.setItem(CONFIG.storageKey, JSON.stringify(seed));
        } catch (writeError) {
          storageReady = false;
          lastStorageError = writeError;
        }
        return seed;
      }
      return ensureDemoState(parsed);
    } catch (error) {
      storageReady = false;
      lastStorageError = error;
      return freshState();
    }
  }

  /* Serializa el estado en localStorage y gestiona errores de cuota o almacenamiento bloqueado
     mostrando el banner correspondiente.
     */
  function persist() {
    if (!storageReady) {
      showStorageBanner('El navegador no permite almacenamiento local. Los cambios permanecerán solo en esta pestaña y se perderán al recargar.');
      return false;
    }
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
      lastStorageError = null;
      hideStorageBanner();
      return true;
    } catch (error) {
      lastStorageError = error;
      const quota = error && (error.name === 'QuotaExceededError' || error.code === 22);
      showStorageBanner(quota
        ? 'No hay espacio suficiente en el almacenamiento del navegador. Elimina una imagen o evidencia para continuar guardando.'
        : 'No fue posible guardar la información en el navegador. Revisa la configuración de almacenamiento.');
      return false;
    }
  }

  /* Muestra el aviso global de almacenamiento con un botón para reintentar el guardado. */
  function showStorageBanner(message) {
    if (!refs.storageBanner) return;
    refs.storageBanner.innerHTML = `${icon('alert-triangle')}<div><strong>Almacenamiento no disponible.</strong> ${escapeHtml(message)}</div><button class="btn btn-sm btn-secondary" type="button" id="storage-retry">Reintentar</button>`;
    refs.storageBanner.hidden = false;
    const retry = document.getElementById('storage-retry');
    if (retry) {
      retry.addEventListener('click', () => {
        if (persist()) toast('Almacenamiento restablecido', 'La información se guardó correctamente.', 'success');
      });
    }
  }

  /* Oculta y limpia el aviso de almacenamiento. */
  function hideStorageBanner() {
    if (refs.storageBanner) {
      refs.storageBanner.hidden = true;
      refs.storageBanner.innerHTML = '';
    }
  }

  /* ------------------------------------------------------------
     6. Consultas del dominio
     Getters y filtros de solo lectura para equipos, clientes, diagnósticos, documentos e historial; también calcula métricas, acciones disponibles y notificaciones.
     ------------------------------------------------------------ */
  /* Consultas básicas del dominio: técnico actual y búsquedas por id. */
  const tech = () => state.tech;
  const ownEquipment = () => state.equipment.filter((item) => item.technicianId === state.tech.id);
  /* Cola activa del técnico: asignados, en diagnóstico y por reparar. */
  const queueEquipment = () => ownEquipment().filter((item) => WORK_QUEUE_STATUSES.includes(item.status));
  const getEquipment = (id) => state.equipment.find((item) => item.id === id) || null;
  const getClient = (id) => state.clients.find((item) => item.id === id) || null;
  const getDiagnostic = (id) => state.diagnostics.find((item) => item.id === id) || null;
  const getDocument = (id) => state.documents.find((item) => item.id === id) || null;
  const equipmentClient = (equipment) => equipment ? getClient(equipment.clientId) : null;

  /* Devuelve los diagnósticos de un equipo ordenados por fecha de creación descendente. */
  function diagnosticsForEquipment(equipmentId) {
    return sortByDateDesc(state.diagnostics.filter((item) => item.equipmentId === equipmentId), 'createdAt');
  }

  /* Localiza el borrador activo de un equipo, si existe. */
  function draftForEquipment(equipmentId) {
    return state.diagnostics.find((item) => item.equipmentId === equipmentId && item.status === 'draft') || null;
  }

  /* Devuelve el diagnóstico más reciente de un equipo. */
  function latestDiagnosticForEquipment(equipmentId) {
    return diagnosticsForEquipment(equipmentId)[0] || null;
  }

  /* Devuelve los documentos del equipo ordenados por fecha. */
  function documentsForEquipment(equipmentId) {
    return sortByDateDesc(state.documents.filter((item) => item.equipmentId === equipmentId), 'date');
  }

  /* Devuelve el historial del equipo ordenado por fecha descendente. */
  function historyForEquipment(equipmentId) {
    return sortByDateDesc(state.history.filter((item) => item.equipmentId === equipmentId), 'date');
  }

  /* Calcula las métricas del dashboard: equipos asignados, diagnósticos en borrador y equipos
     finalizados.
     */
  function indicators() {
    const equipment = ownEquipment();
    return {
      assigned: equipment.length,
      pendingDiagnostics: state.diagnostics.filter((item) => item.status === 'draft').length,
      finished: equipment.filter((item) => item.status === 'finished').length
    };
  }

  /* Obtiene el equipo asociado a un diagnóstico. */
  function getDiagnosticEquipment(diagnostic) {
    return diagnostic ? getEquipment(diagnostic.equipmentId) : null;
  }

  /* Comprueba que el diagnóstico pertenece a un equipo asignado al técnico actual. */
  function isOwnDiagnostic(diagnostic) {
    const equipment = getDiagnosticEquipment(diagnostic);
    return Boolean(equipment && equipment.technicianId === state.tech.id);
  }

  /* Devuelve el último diagnóstico finalizado de un equipo según su fecha de cierre. */
  function latestFinalizedDiagnostic(equipmentId) {
    return state.diagnostics
      .filter((item) => item.equipmentId === equipmentId && item.status === 'finished')
      .sort((a, b) => new Date(b.finalizedAt || b.updatedAt || 0) - new Date(a.finalizedAt || a.updatedAt || 0))[0] || null;
  }

  /* Calcula qué acciones permite el estado del equipo: iniciar, continuar o consultar un
     diagnóstico.
     */
  function actionsForEquipment(equipment) {
    const draft = draftForEquipment(equipment.id);
    const finalized = latestFinalizedDiagnostic(equipment.id);
    return {
      canStart: equipment.status === 'assigned' && !draft,
      canContinue: Boolean(draft),
      canView: Boolean(finalized) || equipment.status === 'diagnosed' || equipment.status === 'repair' || equipment.status === 'finished',
      draft,
      finalized
    };
  }

  /* Genera la lista de notificaciones a partir de borradores activos, equipos pendientes y
     diagnósticos finalizados.
     */
  function notificationItems() {
    const items = [];
    ownEquipment().forEach((equipment) => {
      const draft = draftForEquipment(equipment.id);
      if (draft) {
        items.push({
          id: `draft-${draft.id}`,
          date: draft.updatedAt || draft.createdAt,
          icon: 'edit',
          title: `Diagnóstico en borrador · ${equipment.order}`,
          subtitle: `${equipment.manufacturer} ${equipment.model} · ${timeAgo(draft.updatedAt || draft.createdAt)}`,
          route: `#/diagnosticos/${draft.id}`
        });
        return;
      }
      if (equipment.status === 'assigned') {
        items.push({
          id: `pending-${equipment.id}`,
          date: equipment.assignmentDate || equipment.receptionDate,
          icon: 'cpu',
          title: `Equipo pendiente de diagnóstico · ${equipment.order}`,
          subtitle: `${equipment.manufacturer} ${equipment.model} · ${timeAgo(equipment.assignmentDate)}`,
          route: `#/expediente/${equipment.id}/diagnostico`
        });
        return;
      }
      if (equipment.status === 'diagnosed') {
        const finalized = latestFinalizedDiagnostic(equipment.id);
        items.push({
          id: `diagnosed-${equipment.id}`,
          date: finalized?.finalizedAt || finalized?.updatedAt || equipment.assignmentDate,
          icon: 'check-circle',
          title: `Diagnóstico finalizado · ${equipment.order}`,
          subtitle: `${equipment.manufacturer} ${equipment.model} · pendiente de autorización`,
          route: finalized ? `#/diagnosticos/${finalized.id}` : `#/expediente/${equipment.id}`
        });
        return;
      }
      if (equipment.status === 'repair') {
        const finalized = latestFinalizedDiagnostic(equipment.id);
        items.push({
          id: `repair-${equipment.id}`,
          date: equipment.assignmentDate || equipment.receptionDate,
          icon: 'settings',
          title: `Equipo por reparar · ${equipment.order}`,
          subtitle: `${equipment.manufacturer} ${equipment.model} · pendiente de reparación`,
          route: finalized ? `#/diagnosticos/${finalized.id}` : `#/expediente/${equipment.id}`
        });
      }
    });
    return sortByDateDesc(items, 'date');
  }

  /* ------------------------------------------------------------
     7. Componentes de interfaz: toasts y modales
     Bloques de UI reutilizables: notificaciones flotantes, región aria-live, trampa de foco, modales, confirmaciones, badges, avatares y cabeceras de página.
     ------------------------------------------------------------ */
  /* Crea una notificación flotante con icono y cierre automático, limita la pila y anuncia el
     mensaje a lectores de pantalla.
     */
  function toast(title, message = '', type = 'success', duration = 4200) {
    if (!refs.toastRoot) return;
    const toast = document.createElement('div');
    const iconName = type === 'error' ? 'alert-circle' : type === 'warning' ? 'alert-triangle' : type === 'info' ? 'info' : 'check-circle';
    toast.className = `toast ${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.innerHTML = `
      <span class="toast-icon">${icon(iconName)}</span>
      <div class="toast-body"><strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ''}</div>
      <button class="toast-close" type="button" aria-label="Cerrar notificación">${icon('x')}</button>`;
    refs.toastRoot.appendChild(toast);
    const close = () => {
      if (!toast.isConnected) return;
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 190);
    };
    toast.querySelector('.toast-close')?.addEventListener('click', close);
    if (refs.toastRoot.children.length > 4) refs.toastRoot.firstElementChild?.remove();
    if (duration > 0) setTimeout(close, duration);
    announce(`${title}. ${message}`);
  }

  /* Escribe un mensaje temporal en la región aria-live para accesibilidad. */
  function announce(message) {
    if (!refs.liveRegion) return;
    refs.liveRegion.textContent = '';
    setTimeout(() => { refs.liveRegion.textContent = message; }, 30);
  }

  /* Devuelve los elementos enfocables visibles de un contenedor para implementar la trampa de foco
     del modal.
     */
  function getFocusable(root) {
    return $$('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  /* Abre un modal accesible: construye el HTML, conecta acciones, cierra con Escape o clic en la
     cortina y mantiene el foco dentro.
     */
  function openModal({ title, subtitle = '', content = '', size = '', actions = [], onClose = null, initialFocus = null }) {
    if (!refs.modalRoot) return;
    if (ui.modalOpen) closeModal(true);
    ui.modalReturnFocus = document.activeElement;
    refs.modalRoot.innerHTML = `
      <div class="modal-overlay" data-modal-overlay></div>
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="${subtitle ? 'modal-subtitle' : 'modal-title'}">
        <div class="modal-head">
          <div><h2 id="modal-title">${escapeHtml(title)}</h2>${subtitle ? `<p id="modal-subtitle">${escapeHtml(subtitle)}</p>` : ''}</div>
          <button class="icon-btn modal-close" type="button" data-modal-close aria-label="Cerrar">${icon('x')}</button>
        </div>
        <div class="modal-body">${content}</div>
        ${actions.length ? `<div class="modal-foot">${actions.map((action, index) => `<button class="btn ${action.variant || 'btn-secondary'}" type="button" data-modal-action="${index}">${action.icon ? icon(action.icon) : ''}${escapeHtml(action.label)}</button>`).join('')}</div>` : ''}
      </div>`;
    refs.modalRoot.hidden = false;
    ui.modalOpen = true;
    document.body.classList.add('no-scroll');

    const modal = $('.modal', refs.modalRoot);
    const close = () => closeModal();
    $('[data-modal-close]', refs.modalRoot)?.addEventListener('click', close);
    $('[data-modal-overlay]', refs.modalRoot)?.addEventListener('click', close);
    $$('[data-modal-action]', refs.modalRoot).forEach((button) => {
      button.addEventListener('click', () => {
        const action = actions[Number(button.dataset.modalAction)];
        if (!action) return;
        let result;
        try { result = action.onClick ? action.onClick() : undefined; }
        catch (error) { console.error(error); toast('Error inesperado', 'No fue posible completar la acción.', 'error'); return; }
        if (result !== false) close();
      });
    });
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable(modal);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    const focusTarget = initialFocus ? $(initialFocus, refs.modalRoot) : $('[data-modal-close]', refs.modalRoot);
    setTimeout(() => focusTarget?.focus(), 50);
    if (onClose) modal.dataset.hasOnClose = 'true';
    modal._onClose = onClose;
  }

  /* Cierra el modal, ejecuta su callback onClose y restaura el foco al elemento que lo abrió. */
  function closeModal(silent = false) {
    if (!refs.modalRoot || !ui.modalOpen) return;
    const modal = $('.modal', refs.modalRoot);
    const onClose = modal ? modal._onClose : null;
    refs.modalRoot.hidden = true;
    refs.modalRoot.innerHTML = '';
    ui.modalOpen = false;
    document.body.classList.remove('no-scroll');
    if (!silent && typeof onClose === 'function') onClose();
    if (ui.modalReturnFocus && typeof ui.modalReturnFocus.focus === 'function') {
      const target = ui.modalReturnFocus;
      setTimeout(() => target.focus(), 30);
    }
    ui.modalReturnFocus = null;
  }

  /* Abre un modal de confirmación reutilizable con mensaje, detalles y acción principal. */
  function confirmModal({ title, message, details = [], confirmLabel = 'Confirmar', confirmVariant = 'btn-primary', onConfirm, danger = false }) {
    const detailHtml = details.length ? `<ul>${details.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
    openModal({
      title,
      content: `<div class="confirm-copy">${message}${detailHtml}</div>`,
      actions: [
        { label: 'Cancelar', variant: 'btn-secondary' },
        { label: confirmLabel, variant: danger ? 'btn-danger' : confirmVariant, onClick: onConfirm }
      ],
      initialFocus: '[data-modal-action="1"]'
    });
  }

  /* Genera el HTML de un estado vacío con icono, título, texto y acción opcional. */
  function emptyState({ icon: iconName = 'file-text', title, text, action = '' }) {
    return `<div class="empty-state"><div class="empty-icon">${icon(iconName)}</div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p>${action}</div>`;
  }

  /* Devuelve la insignia visual de un estado de equipo. */
  function statusBadge(statusKey) {
    const meta = statusMeta(statusKey);
    return `<span class="badge badge-${meta.tone}"><span class="dot"></span>${escapeHtml(meta.label)}</span>`;
  }

  /* Devuelve la insignia visual del estado de un diagnóstico. */
  function diagnosticBadge(statusKey) {
    const meta = diagStatusMeta(statusKey);
    return `<span class="badge badge-${meta.tone}"><span class="dot"></span>${escapeHtml(meta.label)}</span>`;
  }

  /* Devuelve la insignia visual de la prioridad. */
  function priorityBadge(priorityKey) {
    const meta = priorityMeta(priorityKey);
    return `<span class="badge badge-${meta.tone}">${escapeHtml(meta.label)}</span>`;
  }

  /* Devuelve un avatar con imagen o iniciales; usa un signo de interrogación si falta la persona. */
  function avatarHtml(person, size = 'avatar-sm', extraClass = '') {
    if (!person) return `<span class="avatar ${size} ${extraClass}">?</span>`;
    if (person.avatar) return `<span class="avatar ${size} ${extraClass}"><img src="${escapeAttr(person.avatar)}" alt="Avatar de ${escapeAttr(person.name)}"></span>`;
    return `<span class="avatar ${size} ${extraClass}" aria-hidden="true">${escapeHtml(initials(person.name))}</span>`;
  }

  /* Construye la cabecera estándar de una vista con kicker, título, descripción, acciones y enlace
     de regreso opcional.
     */
  function pageHeader({ kicker = '', title, lead = '', actions = '', back = null }) {
    return `<div class="page-head">
      <div class="page-head-copy">
        ${back ? `<a class="back-link" href="${escapeAttr(back.href)}">${icon('arrow-left')}${escapeHtml(back.label)}</a>` : ''}
        ${kicker ? `<span class="kicker">${escapeHtml(kicker)}</span>` : ''}
        <h1>${escapeHtml(title)}</h1>
        ${lead ? `<p class="lead">${escapeHtml(lead)}</p>` : ''}
      </div>
      ${actions ? `<div class="head-actions">${actions}</div>` : ''}
    </div>`;
  }

  /* ------------------------------------------------------------
     8. Preferencias, shell y barra superior
     Aplica densidad/tamaño/movimiento, pinta el usuario y las notificaciones, y controla sidebar, buscador, paneles flotantes y cierre de sesión informativo.
     ------------------------------------------------------------ */
  /* Aplica densidad, tamaño de texto, movimiento reducido y notificaciones al documento y repinta
     la campana.
     */
  function applyPreferences() {
    const prefs = state.preferences;
    document.documentElement.dataset.density = prefs.density === 'compact' ? 'compact' : 'comfortable';
    document.documentElement.dataset.textsize = prefs.textSize === 'large' ? 'large' : 'normal';
    document.documentElement.classList.toggle('reduce-motion', Boolean(prefs.reducedMotion));
    const topbar = $('.topbar');
    if (topbar) topbar.classList.toggle('disabled-notifs', !prefs.notifications);
    renderNotifications();
  }

  /* Marca el módulo activo del sidebar y actualiza aria-current. */
  function setActiveNav(navKey) {
    $$('.nav-item[data-nav]').forEach((item) => {
      const active = item.dataset.nav === navKey;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  /* Actualiza el título de la barra superior y el título de la pestaña del navegador. */
  function setPageTitle(title) {
    if (refs.pageTitle) refs.pageTitle.textContent = title;
    document.title = `${title} · SERVMOTION CONTROL`;
  }

  /* Pinta avatar, nombre, rol y menú del técnico, y prepara los tooltips del sidebar. */
  function renderUserChrome() {
    if (!state) return;
    const person = state.tech;
    if (refs.topbarAvatar) refs.topbarAvatar.outerHTML = avatarHtml(person, 'avatar-sm').replace('class="avatar avatar-sm"', 'class="avatar avatar-sm" id="topbar-avatar"');
    if (refs.topbarUserName) refs.topbarUserName.textContent = person.name;
    if (refs.topbarUserRole) refs.topbarUserRole.textContent = person.role;
    refs.topbarAvatar = document.getElementById('topbar-avatar');
    if (refs.userDropdown) {
      refs.userDropdown.innerHTML = `
        <div class="user-dropdown-head">
          ${avatarHtml(person, 'avatar-md')}
          <div><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(person.role)} · ${escapeHtml(person.id)}</span></div>
        </div>
        <a class="menu-item" href="#/configuracion" role="menuitem">${icon('settings')}Configuración</a>
        <button class="menu-item danger" type="button" role="menuitem" data-user-logout>${icon('log-out')}Cerrar sesión</button>`;
    }
    $$('.nav-item[data-nav]').forEach((item) => {
      const label = $('span', item)?.textContent || '';
      if (label) { item.dataset.tooltip = label; item.title = label; }
    });
  }

  /* Repinta el panel y el contador de notificaciones según las preferencias y el estado actual. */
  function renderNotifications() {
    if (!refs.notifPanel || !refs.notifBadge) return;
    if (!state.preferences.notifications) {
      refs.notifBadge.hidden = true;
      refs.notifPanel.innerHTML = `
        <div class="notif-head"><strong>Notificaciones</strong><span class="badge badge-gray">Desactivadas</span></div>
        <div class="notif-empty">${icon('bell')}<p>Las notificaciones están desactivadas.</p><a class="btn btn-sm btn-secondary" href="#/configuracion">Abrir configuración</a></div>`;
      return;
    }
    const items = notificationItems();
    refs.notifBadge.hidden = items.length === 0;
    refs.notifBadge.textContent = items.length > 99 ? '99+' : String(items.length);
    if (!items.length) {
      refs.notifPanel.innerHTML = `
        <div class="notif-head"><strong>Notificaciones</strong><span class="badge badge-green">Al día</span></div>
        <div class="notif-empty">${icon('check-circle')}<p>No hay notificaciones pendientes.</p></div>`;
      return;
    }
    refs.notifPanel.innerHTML = `
      <div class="notif-head"><strong>Notificaciones</strong><span class="badge badge-blue">${items.length}</span></div>
      <div class="notif-list">
        ${items.map((item) => `<button class="notif-item" type="button" data-route="${escapeAttr(item.route)}">
          <span class="notif-item-icon">${icon(item.icon)}</span>
          <span class="notif-item-body"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.subtitle)}</span></span>
        </button>`).join('')}
      </div>
      <div class="notif-foot"><a class="btn btn-sm btn-ghost" href="#/historial">${icon('history')}Ver historial completo</a></div>`;
    $$('[data-route]', refs.notifPanel).forEach((button) => {
      button.addEventListener('click', () => {
        closeNotifications();
        navigateTo(button.dataset.route);
      });
    });
  }

  /* Indica si la ventana está en el breakpoint móvil de 900 px, el mismo que usa el CSS. */
  function isMobileMenu() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  /* Abre el sidebar deslizante en móvil y sincroniza la cortina y aria-expanded. */
  function openSidebar() {
    document.body.classList.add('sidebar-open');
    if (refs.sidebarOverlay) refs.sidebarOverlay.hidden = false;
    if (refs.sidebarToggle) refs.sidebarToggle.setAttribute('aria-expanded', 'true');
  }

  /* Cierra el sidebar móvil o restaura el estado contraído del escritorio. */
  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    if (refs.sidebarOverlay) refs.sidebarOverlay.hidden = true;
    if (refs.sidebarToggle) refs.sidebarToggle.setAttribute('aria-expanded', isMobileMenu() ? 'false' : String(!state.ui.sidebarCollapsed));
  }

  /* Alterna el sidebar: en móvil abre/cierra el panel y en escritorio lo contrae, guardando la
     preferencia.
     */
  function toggleSidebar() {
    if (isMobileMenu()) {
      if (document.body.classList.contains('sidebar-open')) closeSidebar();
      else openSidebar();
      return;
    }
    state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
    document.body.classList.toggle('sidebar-collapsed', state.ui.sidebarCollapsed);
    refs.sidebarToggle?.setAttribute('aria-expanded', String(!state.ui.sidebarCollapsed));
    refs.sidebarToggle?.setAttribute('aria-label', state.ui.sidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral');
    persist();
  }

  /* Cierra el panel de resultados del buscador global. */
  function closeSearch() {
    if (!refs.globalResults) return;
    refs.globalResults.hidden = true;
    refs.globalSearchInput?.setAttribute('aria-expanded', 'false');
  }

  /* Cierra el panel de notificaciones. */
  function closeNotifications() {
    if (!refs.notifPanel) return;
    refs.notifPanel.hidden = true;
    refs.notifBtn?.setAttribute('aria-expanded', 'false');
  }

  /* Cierra el menú desplegable del usuario. */
  function closeUserMenu() {
    if (!refs.userDropdown) return;
    refs.userDropdown.hidden = true;
    refs.userMenuBtn?.setAttribute('aria-expanded', 'false');
  }

  /* Cierra los paneles flotantes salvo el que se indique, para que solo uno esté abierto a la vez. */
  function closeAllPopovers(except = '') {
    if (except !== 'search') closeSearch();
    if (except !== 'notifications') closeNotifications();
    if (except !== 'user') closeUserMenu();
  }

  /* Abre o cierra el panel de notificaciones y lo repinta al abrir. */
  function toggleNotifications() {
    if (!refs.notifPanel) return;
    const willOpen = refs.notifPanel.hidden;
    closeAllPopovers('notifications');
    refs.notifPanel.hidden = !willOpen;
    refs.notifBtn?.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) renderNotifications();
  }

  /* Abre o cierra el menú del usuario. */
  function toggleUserMenu() {
    if (!refs.userDropdown) return;
    const willOpen = refs.userDropdown.hidden;
    closeAllPopovers('user');
    refs.userDropdown.hidden = !willOpen;
    refs.userMenuBtn?.setAttribute('aria-expanded', String(willOpen));
  }

  /* Muestra un modal informativo que aclara que el prototipo no tiene una sesión autenticada real. */
  function openLogoutModal() {
    closeAllPopovers();
    openModal({
      title: 'Cerrar sesión',
      subtitle: 'Entorno de demostración',
      content: `<div class="confirm-copy">
        <p>Esta aplicación es un prototipo frontend y <strong>no existe una sesión autenticada</strong> que cerrar.</p>
        <p style="margin-top:10px">Puedes cerrar esta pestaña del navegador cuando termines de revisar la demostración. Los datos ficticios permanecen guardados en este navegador.</p>
      </div>`,
      actions: [{ label: 'Entendido', variant: 'btn-primary' }],
      initialFocus: '[data-modal-action="0"]'
    });
  }

  /* Navega a una ruta hash; si ya es la actual, fuerza el renderizado de nuevo. */
  function navigateTo(route) {
    const target = route.startsWith('#') ? route : `#${route}`;
    if (location.hash === target) handleRoute();
    else location.hash = target;
  }

  /* ------------------------------------------------------------
     9. Router, búsqueda global y utilidades de navegación
     Interpreta el hash, valida el acceso a expedientes y diagnósticos, monta la vista correspondiente, fuerza autoguardados pendientes y ofrece búsqueda global agrupada.
     ------------------------------------------------------------ */
  /* Interpreta el hash de la URL, valida el acceso del técnico y devuelve la ruta, el título y el
     módulo activo.
     */
  function parseRoute() {
    const raw = String(location.hash || '').replace(/^#\/?/, '').split('?')[0];
    const parts = raw.split('/').filter(Boolean);
    const name = parts[0] || 'inicio';

    if (name === 'expediente') {
      const equipment = getEquipment(parts[1]);
      if (!equipment || equipment.technicianId !== state.tech.id) {
        return { name: 'notfound', title: 'Expediente no encontrado', nav: 'equipos' };
      }
      const allowedTabs = ['resumen', 'diagnostico', 'historial', 'documentos'];
      const tab = allowedTabs.includes(parts[2]) ? parts[2] : 'resumen';
      return {
        name: 'expediente', id: equipment.id, tab,
        title: `Expediente · ${equipment.order}`, nav: 'equipos'
      };
    }

    if (name === 'reparacion') {
      const equipment = getEquipment(parts[1]);
      if (!equipment || equipment.technicianId !== state.tech.id || equipment.status !== 'repair') {
        return { name: 'notfound', title: 'Reparación no encontrada', nav: 'equipos' };
      }
      return {
        name: 'reparacion', id: equipment.id,
        title: `Reparación · ${equipment.order}`, nav: 'equipos'
      };
    }

    if (name === 'diagnosticos' && parts[1]) {
      const diagnostic = getDiagnostic(parts[1]);
      if (!diagnostic || !isOwnDiagnostic(diagnostic)) {
        return { name: 'notfound', title: 'Diagnóstico no encontrado', nav: 'diagnosticos' };
      }
      return {
        name: 'diagnostico', id: diagnostic.id,
        title: 'Diagnóstico', nav: 'diagnosticos'
      };
    }

    if (ROUTE_META[name]) {
      const meta = ROUTE_META[name];
      return { name, title: meta.title, nav: meta.nav };
    }
    return { name: 'notfound', title: 'Página no encontrada', nav: '' };
  }

  /* Fuerza el guardado del borrador activo si hay un autoguardado pendiente antes de cambiar de
     vista o cerrar.
     */
  function flushPendingAutosave() {
    if (!autosaveTimer) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
    const diagnostic = activeDraftId ? getDiagnostic(activeDraftId) : null;
    if (diagnostic && diagnostic.status === 'draft') {
      diagnostic.updatedAt = nowIso();
      persist();
    }
  }

  /* Router principal: renderiza la vista según el hash, enlaza el formulario de diagnóstico y
     aplica filtros y scroll.
     */
  function handleRoute() {
    flushPendingAutosave();
    activeDraftId = null;
    activeDiagTab = 'A';
    const route = parseRoute();
    setActiveNav(route.nav);
    setPageTitle(route.title);
    closeAllPopovers();
    closeSidebar();

    let html = '';
    if (route.name === 'notfound') html = renderNotFound(route.title);
    else if (route.name === 'inicio') html = renderInicio();
    else if (route.name === 'equipos') html = renderEquipos();
    else if (route.name === 'reparacion') html = renderReparacion(route.id);
    else if (route.name === 'expediente') html = renderExpediente(route.id, route.tab);
    else if (route.name === 'diagnosticos') html = renderDiagnosticos();
    else if (route.name === 'diagnostico') html = renderDiagnosticoDetail(route.id);
    else if (route.name === 'historial') html = renderHistorial();
    else if (route.name === 'documentos') html = renderDocumentos();
    else if (route.name === 'configuracion') html = renderConfiguracion();
    else html = renderNotFound(route.title);

    if (refs.app) refs.app.innerHTML = html;
    if (route.name === 'diagnostico') {
      const diagnostic = getDiagnostic(route.id);
      activeDraftId = diagnostic && diagnostic.status === 'draft' ? diagnostic.id : null;
      if (activeDraftId) bindDiagnosticForm();
    }
    if (route.name === 'equipos') filterEquipmentTable();
    if (route.name === 'diagnosticos') filterDiagnosticsTable();
    if (route.name === 'historial') filterHistoryTimeline();
    if (route.name === 'documentos') filterDocumentsTable();

    if (route.name !== 'diagnostico' || !activeDraftId) {
      window.scrollTo({ top: 0, behavior: state.preferences.reducedMotion ? 'auto' : 'smooth' });
    }
  }

  /* Devuelve la vista de página no encontrada. */
  function renderNotFound(title = 'Página no encontrada') {
    return `<div class="view">${pageHeader({
      kicker: 'Navegación',
      title,
      lead: 'La ruta solicitada no existe o no pertenece a los equipos asignados a este técnico.'
    })}<div class="card">${emptyState({
      icon: 'alert-circle',
      title: 'No encontramos esta página',
      text: 'Regresa al panel principal o revisa el listado de equipos asignados.',
      action: '<a class="btn btn-primary" href="#/inicio">Volver al inicio</a>'
    })}</div></div>`;
  }

  /* Utilidades de búsqueda global y nombres cortos. */
  const firstName = (fullName) => String(fullName || 'Técnico').trim().split(/\s+/)[0];
  const equipmentName = (equipment) => equipment ? `${equipment.manufacturer} ${equipment.model}` : 'Equipo';
  const equipmentSeller = (equipment) => equipment?.seller || 'Sin vendedor';
  const equipmentSearchText = (equipment) => {
    const client = equipmentClient(equipment);
    return normalize([
      equipment.id, equipment.order, equipment.manufacturer, equipment.model,
      equipment.serial, equipmentSeller(equipment), statusMeta(equipment.status).label,
      client?.company, client?.contact
    ].filter(Boolean).join(' '));
  };

  /* Busca coincidencias normalizadas en equipos, diagnósticos, documentos e historial y las agrupa
     para el buscador global.
     */
  function searchGroups(query) {
    const term = normalize(query);
    if (!term) return [];
    const groups = [];
    const equipmentMatches = ownEquipment().filter((equipment) => equipmentSearchText(equipment).includes(term)).slice(0, 6);
    if (equipmentMatches.length) {
      groups.push({
        title: 'Equipos',
        items: equipmentMatches.map((equipment) => ({
          icon: 'cpu',
          title: `${equipment.order} · ${equipment.manufacturer} ${equipment.model}`,
          subtitle: `${equipmentClient(equipment)?.company || 'Cliente'} · ${statusMeta(equipment.status).label}`,
          route: `#/expediente/${equipment.id}`
        }))
      });
    }

    const diagnosticMatches = state.diagnostics
      .filter((diagnostic) => isOwnDiagnostic(diagnostic))
      .filter((diagnostic) => {
        const equipment = getEquipment(diagnostic.equipmentId);
        const searchable = normalize([
          diagnostic.id, diagnostic.order, equipment?.manufacturer, equipment?.model,
          diagnostic.assessment?.initialObservations, diagnostic.conclusion?.rootCause,
          diagStatusMeta(diagnostic.status).label
        ].filter(Boolean).join(' '));
        return searchable.includes(term);
      })
      .slice(0, 6);
    if (diagnosticMatches.length) {
      groups.push({
        title: 'Diagnósticos',
        items: diagnosticMatches.map((diagnostic) => {
          const equipment = getEquipment(diagnostic.equipmentId);
          return {
            icon: 'clipboard',
            title: `${diagnostic.order} · ${diagnostic.id}`,
            subtitle: `${equipmentName(equipment)} · ${diagStatusMeta(diagnostic.status).label}`,
            route: `#/diagnosticos/${diagnostic.id}`
          };
        })
      });
    }

    const documentMatches = state.documents
      .filter((document) => {
        const equipment = getEquipment(document.equipmentId);
        if (!equipment || equipment.technicianId !== state.tech.id) return false;
        return normalize([document.name, document.type, document.reference, document.order, equipment.model].filter(Boolean).join(' ')).includes(term);
      })
      .slice(0, 6);
    if (documentMatches.length) {
      groups.push({
        title: 'Documentos',
        items: documentMatches.map((document) => ({
          icon: 'file-text',
          title: document.name,
          subtitle: `${document.type} · ${document.order}`,
          docId: document.id
        }))
      });
    }

    const historyMatches = state.history
      .filter((entry) => {
        const equipment = getEquipment(entry.equipmentId);
        if (!equipment || equipment.technicianId !== state.tech.id) return false;
        return normalize([entry.order, entry.activity, entry.observations, entry.executedBy, entry.previousStatus, entry.newStatus].filter(Boolean).join(' ')).includes(term);
      })
      .slice(0, 5);
    if (historyMatches.length) {
      groups.push({
        title: 'Historial',
        items: historyMatches.map((entry) => ({
          icon: 'history',
          title: entry.activity,
          subtitle: `${entry.order} · ${formatDateTime(entry.date)}`,
          route: `#/expediente/${entry.equipmentId}/historial`
        }))
      });
    }
    return groups;
  }

  /* Pinta los resultados agrupados del buscador o el mensaje de sin resultados. */
  function renderGlobalSearch(query) {
    if (!refs.globalResults || !refs.globalSearchInput) return;
    const term = String(query || '').trim();
    if (!term) {
      refs.globalResults.innerHTML = '';
      closeSearch();
      return;
    }
    const groups = searchGroups(term);
    if (!groups.length) {
      refs.globalResults.innerHTML = `<div class="search-group"><div class="search-group-title">Sin resultados</div><div class="search-empty">No se encontraron coincidencias para “${escapeHtml(term)}”.</div></div>`;
    } else {
      refs.globalResults.innerHTML = groups.map((group) => `
        <div class="search-group">
          <div class="search-group-title">${escapeHtml(group.title)}</div>
          ${group.items.map((item) => `<button class="search-item" type="button" role="option" ${item.route ? `data-search-route="${escapeAttr(item.route)}"` : `data-search-doc="${escapeAttr(item.docId)}"`}>
            <span class="search-item-icon">${icon(item.icon)}</span>
            <span class="search-item-body"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.subtitle)}</span></span>
          </button>`).join('')}
        </div>`).join('');
    }
    refs.globalResults.hidden = false;
    refs.globalSearchInput.setAttribute('aria-expanded', 'true');
  }

  /* Abre la ruta o el documento seleccionado desde los resultados de búsqueda. */
  function activateSearchItem(button) {
    if (!button) return;
    if (button.dataset.searchRoute) {
      closeSearch();
      refs.globalSearchInput?.blur();
      navigateTo(button.dataset.searchRoute);
    } else if (button.dataset.searchDoc) {
      closeSearch();
      refs.globalSearchInput?.blur();
      previewDocument(button.dataset.searchDoc);
    }
  }

  /* ------------------------------------------------------------
     10. Acciones compartidas de equipos y diagnósticos
     Generación de IDs, estructura de un borrador, botones contextuales por estado y el flujo de inicio de diagnóstico con confirmación y rollback si falla el guardado.
     ------------------------------------------------------------ */
  /* Calcula el siguiente id secuencial de una colección con formato PREFIJO-0000. */
  function nextSequentialId(prefix, collection) {
    const max = collection.reduce((highest, item) => {
      const numeric = Number.parseInt(String(item.id || '').replace(/\D+/g, ''), 10);
      return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
    }, 0);
    return `${prefix}-${String(max + 1).padStart(4, '0')}`;
  }

  /* Crea un objeto con una fila vacía por cada par de fases de sincronía. */
  function emptySyncValues() {
    return SYNC_ROWS.reduce((accumulator, row) => {
      accumulator[row] = [];
      return accumulator;
    }, {});
  }

  /* Construye la estructura completa de un diagnóstico en borrador asociado a un equipo. */
  function createDraftDiagnostic(equipment) {
    const timestamp = nowIso();
    return {
      id: nextSequentialId('DIA', state.diagnostics),
      equipmentId: equipment.id,
      order: equipment.order,
      technicianAssignedId: state.tech.id,
      capturedById: state.tech.id,
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp,
      finalizedAt: null,
      assessment: { visualCondition: '', safetyCheck: '', initialObservations: '' },
      encoder: { type: '', impedanceSine: '', impedanceCosine: '', impedanceReference: '' },
      pinout: { image: '', fileName: '', manufacturer: '', manual: '', page: '', connectorRef: '' },
      poles: null,
      syncStored: '',
      syncValues: emptySyncValues(),
      conclusion: { rootCause: '', actionsPerformed: '', finalResult: '', notes: '' }
    };
  }

  /* Genera los botones contextuales de un equipo: continuar, iniciar, ver diagnóstico o abrir
     expediente.
     */
  function equipmentActions(equipment) {
    const actions = actionsForEquipment(equipment);
    const buttons = [];
    if (actions.canContinue) {
      buttons.push(`<a class="btn btn-sm btn-primary" href="#/diagnosticos/${actions.draft.id}">${icon('edit')}Continuar</a>`);
    } else if (equipment.status === 'assigned' && actions.canStart) {
      buttons.push(`<button class="btn btn-sm btn-primary" type="button" data-action="start-diagnostic" data-id="${escapeAttr(equipment.id)}">${icon('play')}Iniciar diagnóstico</button>`);
    }
    if (equipment.status === 'repair') {
      buttons.push(`<a class="btn btn-sm btn-primary" href="#/reparacion/${equipment.id}">${icon('settings')}Iniciar reparación</a>`);
    } else if (actions.finalized) {
      buttons.push(`<a class="btn btn-sm btn-secondary" href="#/diagnosticos/${actions.finalized.id}">${icon('eye')}Ver diagnóstico</a>`);
    }
    buttons.push(`<a class="btn btn-sm btn-ghost" href="#/expediente/${equipment.id}">${icon('file-text')}Expediente</a>`);
    return buttons.join('');
  }

  /* Devuelve la tarjeta de equipo del inicio con identidad, metadatos y acciones contextuales. */
  function equipmentWorkItem(equipment) {
    const client = equipmentClient(equipment);
    const meta = statusMeta(equipment.status);
    const actions = actionsForEquipment(equipment);
    const noteIcon = equipment.status === 'finished' ? 'check-circle' : equipment.status === 'repair' ? 'settings' : 'clock';
    const note = equipment.status === 'finished' && actions.finalized?.finalizedAt
      ? `Cierre registrado el ${formatDate(actions.finalized.finalizedAt)}`
      : equipment.status === 'diagnosed'
        ? 'Pendiente de autorización del vendedor'
        : equipment.status === 'repair'
          ? 'Pendiente de reparación'
          : `Asignado el ${formatDate(equipment.assignmentDate || equipment.receptionDate)}`;
    return `<article class="dashboard-equipment tone-${meta.tone}">
      <div class="dashboard-equipment-head">
        <span class="dashboard-equipment-icon">${icon(meta.icon)}</span>
        <div class="dashboard-equipment-title">
          <div class="dashboard-equipment-order">
            <span>${escapeHtml(equipment.order)}</span>
            ${statusBadge(equipment.status)}
          </div>
          <strong>${escapeHtml(equipmentName(equipment))}</strong>
        </div>
        ${priorityBadge(equipment.priority)}
      </div>
      <div class="dashboard-equipment-meta">
        <span>${icon('building')}${escapeHtml(client?.company || 'Cliente')}</span>
        <span>${icon('cpu')}Serie ${escapeHtml(equipment.serial)}</span>
        <span>${icon('calendar')}Ingreso ${escapeHtml(formatDate(equipment.receptionDate))}</span>
      </div>
      <div class="dashboard-equipment-foot">
        <span class="dashboard-equipment-note">${icon(noteIcon)}${escapeHtml(note)}</span>
        <div class="dashboard-equipment-actions">${equipmentActions(equipment)}</div>
      </div>
    </article>`;
  }

  /* Abre una imagen ampliada dentro de un modal. */
  function openImageModal(src, title, subtitle = '') {
    if (!src) return;
    openModal({
      title,
      subtitle,
      size: 'modal-lg',
      content: `<img class="modal-image" src="${escapeAttr(src)}" alt="${escapeAttr(title)}">`,
      actions: [{ label: 'Cerrar', variant: 'btn-secondary' }],
      initialFocus: '[data-modal-close]'
    });
  }

  /* Valida el equipo, pide confirmación, crea el borrador, cambia el estado e inserta el evento de
     historial; revierte todo si falla el guardado.
     */
  function startDiagnostic(equipmentId) {
    const equipment = getEquipment(equipmentId);
    if (!equipment || equipment.technicianId !== state.tech.id) {
      toast('Equipo no disponible', 'El equipo no pertenece a tu carga de trabajo.', 'error');
      return;
    }
    const actions = actionsForEquipment(equipment);
    if (actions.draft) {
      navigateTo(`#/diagnosticos/${actions.draft.id}`);
      return;
    }
    if (equipment.status !== 'assigned') {
      toast('No es posible iniciar', 'El equipo ya no se encuentra en estado Asignado.', 'warning');
      return;
    }
    confirmModal({
      title: 'Iniciar diagnóstico',
      message: `<p>Se creará un <strong>borrador de diagnóstico</strong> para la orden <strong>${escapeHtml(equipment.order)}</strong> y el equipo pasará al estado <strong>En diagnóstico</strong>.</p>`,
      details: [
        'El avance se guarda en el almacenamiento local del navegador.',
        'Podrás guardar, previsualizar y finalizar el diagnóstico cuando todos los campos estén completos.',
        'Los datos de esta demostración son ficticios.'
      ],
      confirmLabel: 'Iniciar diagnóstico',
      onConfirm: () => {
        const snapshot = JSON.stringify(state);
        const diagnostic = createDraftDiagnostic(equipment);
        state.diagnostics.push(diagnostic);
        equipment.status = 'diagnosing';
        state.history.push({
          id: nextSequentialId('HIS', state.history),
          equipmentId: equipment.id,
          order: equipment.order,
          type: 'diagnosis_started',
          activity: 'Diagnóstico iniciado',
          executedBy: state.tech.name,
          registeredBy: state.tech.name,
          date: nowIso(),
          previousStatus: 'Asignado',
          newStatus: 'En diagnóstico',
          observations: `Se inició el borrador ${diagnostic.id} desde la interfaz del técnico.`
        });
        if (!persist()) {
          state = JSON.parse(snapshot);
          toast('No se pudo iniciar', 'El navegador no permitió guardar el borrador. No se realizaron cambios.', 'error');
          return false;
        }
        renderNotifications();
        toast('Diagnóstico iniciado', `Se creó el borrador ${diagnostic.id}.`, 'success');
        navigateTo(`#/diagnosticos/${diagnostic.id}`);
        return true;
      }
    });
  }

  /* ------------------------------------------------------------
     11. Panel de inicio
     Dashboard con saludo, métricas, equipos asignados, acceso para continuar el trabajo y actividad reciente.
     ------------------------------------------------------------ */
  /* Devuelve los eventos de historial de los equipos del técnico. */
  function ownHistoryEntries() {
    const ownIds = new Set(ownEquipment().map((equipment) => equipment.id));
    return state.history.filter((entry) => ownIds.has(entry.equipmentId));
  }

  /* Devuelve los últimos eventos de historial de los equipos del técnico. */
  function recentOwnHistory(limit = 4) {
    return sortByDateDesc(ownHistoryEntries(), 'date').slice(0, limit);
  }

  /* Agrupa los eventos de las últimas cuatro semanas para el gráfico compacto del inicio. */
  function weeklyActivity(entries) {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return [3, 2, 1, 0].map((weeksAgo) => {
      const end = now - weeksAgo * weekMs;
      const start = end - weekMs;
      return entries.filter((entry) => {
        const time = new Date(entry.date).getTime();
        return Number.isFinite(time) && time > start && time <= end;
      }).length;
    });
  }

  /* Construye el degradado cónico de una gráfica circular con segmentos proporcionales. */
  function conicChart(parts) {
    const total = parts.reduce((sum, part) => sum + part.value, 0);
    if (!total) return 'conic-gradient(var(--chart-track) 0% 100%)';
    let accumulated = 0;
    const stops = [];
    parts.forEach((part) => {
      if (!part.value) return;
      const start = Math.round((accumulated / total) * 10000) / 100;
      accumulated += part.value;
      const end = Math.round((accumulated / total) * 10000) / 100;
      stops.push(`${part.color} ${start}% ${end}%`);
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  /* Genera una fila de actividad reciente para el dashboard. */
  function activityItem(entry) {
    const meta = historyIcon(entry.type);
    const transition = entry.previousStatus && entry.newStatus
      ? `<span class="dashboard-activity-state"><span>${escapeHtml(entry.previousStatus)}</span>${icon('arrow-right')}<strong>${escapeHtml(entry.newStatus)}</strong></span>`
      : '';
    return `<article class="dashboard-activity-item">
      <span class="dashboard-activity-icon tone-${meta.tone}">${icon(meta.icon)}</span>
      <div class="dashboard-activity-body">
        <div class="dashboard-activity-top">
          <strong>${escapeHtml(entry.activity)}</strong>
          <time datetime="${escapeAttr(entry.date)}">${escapeHtml(timeAgo(entry.date))}</time>
        </div>
        <p><span class="mono">${escapeHtml(entry.order)}</span> · ${escapeHtml(truncate(entry.observations, 108))}</p>
        ${transition}
      </div>
    </article>`;
  }

  /* Renderiza el panel de inicio con saludo, resumen de carga, métricas, equipos, trabajo
     pendiente, actividad y accesos rápidos.
     */
  function renderInicio() {
    const person = tech();
    const equipment = ownEquipment();
    const counts = indicators();
    const activeDraft = state.diagnostics.find((item) => item.status === 'draft' && isOwnDiagnostic(item));
    const historyEntries = recentOwnHistory(4);
    const draftProgress = activeDraft ? diagnosticProgress(activeDraft) : null;
    const draftEquipment = activeDraft ? getDiagnosticEquipment(activeDraft) : null;
    const draftClient = draftEquipment ? equipmentClient(draftEquipment) : null;
    const pendingEquipment = equipment.find((item) => item.status === 'assigned' && !draftForEquipment(item.id));
    const pendingClient = equipmentClient(pendingEquipment);
    const repairEquipment = equipment.find((item) => item.status === 'repair');
    const repairClient = equipmentClient(repairEquipment);
    const activeEquipment = Math.max(equipment.length - counts.finished, 0);
    const completionPercent = equipment.length ? Math.round((counts.finished / equipment.length) * 100) : 0;
    const monthStart = Date.now() - (28 * 24 * 60 * 60 * 1000);
    const monthlyActivity = ownHistoryEntries().filter((entry) => {
      const time = new Date(entry.date).getTime();
      return Number.isFinite(time) && time >= monthStart;
    });
    const activityWeeks = weeklyActivity(monthlyActivity);
    const statusBreakdown = Object.keys(EQUIPMENT_STATUS)
      .map((key) => ({ ...statusMeta(key), count: equipment.filter((item) => item.status === key).length }))
      .filter((item) => item.count > 0);
    const statusSummaryLabel = statusBreakdown.length
      ? statusBreakdown.map((item) => `${item.count} ${item.label.toLowerCase()}`).join(', ')
      : 'sin equipos asignados';
    const statusLegend = statusBreakdown.length
      ? statusBreakdown.map((item) => `<span class="dashboard-legend-item"><span class="dashboard-legend-dot dashboard-tone-${item.tone}"></span>${item.count} ${escapeHtml(item.label.toLowerCase())}</span>`).join('')
      : '<span class="dashboard-legend-item">Sin equipos asignados</span>';
    const pendingClosures = Math.max(equipment.length - counts.finished, 0);
    const statusChart = conicChart(statusBreakdown.map((item) => ({ value: item.count, color: `var(--chart-${item.tone})` })));
    const progressChart = conicChart([
      { value: counts.finished, color: 'var(--chart-green)' },
      { value: pendingClosures, color: 'var(--chart-track)' }
    ]);
    const activityChart = conicChart(activityWeeks.map((value, index) => ({ value, color: `var(--chart-week-${index + 1})` })));
    const statusMetricLegend = statusBreakdown.length
      ? statusBreakdown.map((item) => `<span class="metric-legend-item"><span class="metric-legend-dot dashboard-tone-${item.tone}"></span>${item.count} ${escapeHtml(item.label.toLowerCase())}</span>`).join('')
      : '<span class="metric-legend-item"><span class="metric-legend-dot is-muted"></span>Sin equipos</span>';
    const diagnosticsLegend = `<span class="metric-legend-item"><span class="metric-legend-dot dashboard-tone-green"></span>${counts.finished} con cierre</span>${pendingClosures
      ? `<span class="metric-legend-item"><span class="metric-legend-dot is-muted"></span>${pendingClosures} pendiente${pendingClosures === 1 ? '' : 's'}</span>`
      : ''}`;
    const activityLegend = activityWeeks.map((value, index) => `<span class="metric-legend-item"><span class="metric-legend-dot chart-week-${index + 1}"></span>S${index + 1} <strong>${value}</strong></span>`).join('');
    const closuresMeta = equipment.length
      ? `${counts.finished} de ${equipment.length} equipos con cierre`
      : 'Sin equipos registrados';
    const activityMeta = activityWeeks[3] || activityWeeks[2]
      ? `${activityWeeks[3]} esta semana · ${activityWeeks[2]} la anterior`
      : 'Sin eventos en las últimas semanas';

    let heroAction = `<a class="dashboard-cta" href="#/equipos">${icon('cpu')}<span class="dashboard-cta-copy"><strong>Revisar equipos</strong><small>Consulta tu carga de trabajo</small></span>${icon('arrow-right')}</a>`;
    if (activeDraft) {
      heroAction = `<a class="dashboard-cta" href="#/diagnosticos/${activeDraft.id}">${icon('edit')}<span class="dashboard-cta-copy"><strong>Continuar diagnóstico</strong><small>${escapeHtml(activeDraft.order)} · ${draftProgress.percent}% capturado</small></span>${icon('arrow-right')}</a>`;
    } else if (pendingEquipment) {
      heroAction = `<button class="dashboard-cta" type="button" data-action="start-diagnostic" data-id="${escapeAttr(pendingEquipment.id)}">${icon('play')}<span class="dashboard-cta-copy"><strong>Iniciar diagnóstico</strong><small>${escapeHtml(pendingEquipment.order)} · ${escapeHtml(equipmentName(pendingEquipment))}</small></span>${icon('arrow-right')}</button>`;
    } else if (repairEquipment) {
      heroAction = `<a class="dashboard-cta" href="#/reparacion/${repairEquipment.id}">${icon('settings')}<span class="dashboard-cta-copy"><strong>Iniciar reparación</strong><small>${escapeHtml(repairEquipment.order)} · ${escapeHtml(equipmentName(repairEquipment))}</small></span>${icon('arrow-right')}</a>`;
    }

    let focusContent = '';
    if (activeDraft) {
      focusContent = `<div class="dashboard-focus-banner">
          <span class="dashboard-focus-icon">${icon('edit')}</span>
          <div class="dashboard-focus-copy">
            <span>Borrador activo</span>
            <strong>${escapeHtml(activeDraft.order)}</strong>
            <p>${escapeHtml(draftEquipment ? equipmentName(draftEquipment) : 'Equipo asignado')}</p>
          </div>
        </div>
        <div class="dashboard-focus-facts">
          <div><span>Cliente</span><strong>${escapeHtml(draftClient?.company || 'Cliente')}</strong></div>
          <div><span>Prioridad</span><strong>${escapeHtml(priorityMeta(draftEquipment?.priority).label)}</strong></div>
          <div><span>Ingreso</span><strong>${escapeHtml(formatDate(draftEquipment?.receptionDate))}</strong></div>
        </div>
        <div class="dashboard-focus-progress">
          <div class="dashboard-focus-gauge" style="--focus-progress:${draftProgress.percent}%" role="img" aria-label="Avance del diagnóstico: ${draftProgress.percent}%">
            <span aria-hidden="true">${draftProgress.percent}%</span>
          </div>
          <div class="dashboard-focus-progress-copy">
            <span>Avance del diagnóstico</span>
            <strong>${draftProgress.completed} de ${draftProgress.total} campos obligatorios</strong>
          </div>
        </div>
        <a class="btn btn-primary btn-block" href="#/diagnosticos/${activeDraft.id}">${icon('arrow-right')}Continuar diagnóstico</a>
        <p class="dashboard-focus-note">${icon('save')}El avance se guarda automáticamente en este navegador.</p>`;
    } else if (pendingEquipment) {
      focusContent = `<div class="dashboard-focus-banner">
          <span class="dashboard-focus-icon">${icon('play')}</span>
          <div class="dashboard-focus-copy">
            <span>Equipo pendiente</span>
            <strong>${escapeHtml(pendingEquipment.order)}</strong>
            <p>${escapeHtml(equipmentName(pendingEquipment))}</p>
          </div>
          ${statusBadge(pendingEquipment.status)}
        </div>
        <div class="dashboard-focus-facts">
          <div><span>Cliente</span><strong>${escapeHtml(pendingClient?.company || 'Cliente')}</strong></div>
          <div><span>Prioridad</span><strong>${escapeHtml(priorityMeta(pendingEquipment.priority).label)}</strong></div>
          <div><span>Ingreso</span><strong>${escapeHtml(formatDate(pendingEquipment.receptionDate))}</strong></div>
        </div>
        <div class="dashboard-focus-checklist">
          <span>${icon('check-circle')}Recepción y accesorios registrados</span>
          <span>${icon('clock')}Diagnóstico listo para iniciar</span>
        </div>
        <button class="btn btn-primary btn-block" type="button" data-action="start-diagnostic" data-id="${escapeAttr(pendingEquipment.id)}">${icon('play')}Iniciar diagnóstico</button>
        <p class="dashboard-focus-note">${icon('info')}Se creará un borrador y el equipo pasará a En diagnóstico.</p>`;
    } else if (repairEquipment) {
      focusContent = `<div class="dashboard-focus-banner">
          <span class="dashboard-focus-icon">${icon('settings')}</span>
          <div class="dashboard-focus-copy">
            <span>Equipo por reparar</span>
            <strong>${escapeHtml(repairEquipment.order)}</strong>
            <p>${escapeHtml(equipmentName(repairEquipment))}</p>
          </div>
          ${statusBadge(repairEquipment.status)}
        </div>
        <div class="dashboard-focus-facts">
          <div><span>Cliente</span><strong>${escapeHtml(repairClient?.company || 'Cliente')}</strong></div>
          <div><span>Vendedor</span><strong>${escapeHtml(equipmentSeller(repairEquipment))}</strong></div>
          <div><span>Ingreso</span><strong>${escapeHtml(formatDate(repairEquipment.receptionDate))}</strong></div>
        </div>
        <div class="dashboard-focus-checklist">
          <span>${icon('check-circle')}Autorización del vendedor registrada</span>
          <span>${icon('check-circle')}Materiales completos</span>
        </div>
        <a class="btn btn-primary btn-block" href="#/reparacion/${repairEquipment.id}">${icon('settings')}Iniciar reparación</a>
        <p class="dashboard-focus-note">${icon('lock')}Equipo autorizado y con materiales listos. Diagnóstico de solo lectura.</p>`;
    } else {
      focusContent = `<div class="dashboard-focus-banner is-done">
          <span class="dashboard-focus-icon">${icon('check-circle')}</span>
          <div class="dashboard-focus-copy">
            <span>Todo al día</span>
            <strong>Sin trabajo pendiente</strong>
            <p>No hay borradores activos ni equipos por iniciar o reparar.</p>
          </div>
        </div>
        <a class="btn btn-secondary btn-block" href="#/equipos">${icon('cpu')}Revisar equipos</a>`;
    }

    return `<div class="view dashboard-view">
      <section class="dashboard-hero" aria-labelledby="dashboard-title">
        <div class="dashboard-hero-copy">
          <span class="kicker dashboard-kicker">Panel del técnico</span>
          <h1 id="dashboard-title">${escapeHtml(greeting())}, ${escapeHtml(firstName(person.name))}</h1>
          <p class="lead">Revisa tu carga, retoma el diagnóstico pendiente y mantén la trazabilidad de cada equipo desde un solo lugar.</p>
          <div class="dashboard-hero-actions">${heroAction}</div>
        </div>
        <div class="dashboard-hero-side">
          <span class="date-chip">${icon('calendar')}${escapeHtml(formatLongDate())}</span>
          <div class="dashboard-overview">
            <div class="dashboard-ring" style="--dash-progress:${completionPercent}%" role="img" aria-label="${counts.finished} de ${equipment.length} equipos finalizados">
              <span><strong>${completionPercent}%</strong><small>completado</small></span>
            </div>
            <div class="dashboard-overview-copy">
              <span class="dashboard-overview-label">Resumen de carga</span>
              <strong>${counts.finished} de ${equipment.length} equipos finalizados</strong>
              <div class="dashboard-legend" aria-label="Distribución por estado: ${escapeAttr(statusSummaryLabel)}">${statusLegend}</div>
            </div>
          </div>
        </div>
      </section>

      <div class="metrics-grid">
        <a class="metric-card blue" href="#/equipos">
          <div class="metric-top">
            <span class="metric-icon">${icon('cpu')}</span>
            <span class="metric-link">Ver equipos ${icon('arrow-right')}</span>
          </div>
          <div class="metric-viz">
            <div class="metric-donut" style="--donut:${escapeAttr(statusChart)}" role="img" aria-label="Distribución por estado: ${escapeAttr(statusSummaryLabel)}">
              <span class="metric-donut-center" aria-hidden="true"><strong>${equipment.length}</strong><small>equipos</small></span>
            </div>
            <div class="metric-viz-copy">
              <span class="metric-label">Equipos en carga</span>
              <span class="metric-meta">${activeEquipment} ${activeEquipment === 1 ? 'activo' : 'activos'} · ${counts.finished} ${counts.finished === 1 ? 'finalizado' : 'finalizados'}</span>
              <div class="metric-legend">${statusMetricLegend}</div>
            </div>
          </div>
        </a>
        <a class="metric-card green" href="#/diagnosticos">
          <div class="metric-top">
            <span class="metric-icon">${icon('check-circle')}</span>
            <span class="metric-link">Ver diagnósticos ${icon('arrow-right')}</span>
          </div>
          <div class="metric-viz">
            <div class="metric-donut" style="--donut:${escapeAttr(progressChart)}" role="img" aria-label="${counts.finished} de ${equipment.length} equipos finalizados, ${completionPercent}% de avance">
              <span class="metric-donut-center" aria-hidden="true"><strong>${completionPercent}%</strong><small>avance</small></span>
            </div>
            <div class="metric-viz-copy">
              <span class="metric-label">Diagnósticos finalizados</span>
              <span class="metric-meta">${closuresMeta}</span>
              <div class="metric-legend">${diagnosticsLegend}</div>
            </div>
          </div>
        </a>
        <a class="metric-card cyan" href="#/historial">
          <div class="metric-top">
            <span class="metric-icon">${icon('history')}</span>
            <span class="metric-link">Ver historial ${icon('arrow-right')}</span>
          </div>
          <div class="metric-viz">
            <div class="metric-donut" style="--donut:${escapeAttr(activityChart)}" role="img" aria-label="Actividad de las últimas cuatro semanas: ${escapeAttr(activityWeeks.join(', '))} eventos">
              <span class="metric-donut-center" aria-hidden="true"><strong>${monthlyActivity.length}</strong><small>eventos</small></span>
            </div>
            <div class="metric-viz-copy">
              <span class="metric-label">Actividad del mes</span>
              <span class="metric-meta">${activityMeta}</span>
              <div class="metric-legend">${activityLegend}</div>
            </div>
          </div>
        </a>
      </div>

      <div class="dashboard-grid">
        <section class="card dashboard-equipment-card" aria-labelledby="dashboard-equipment-title">
          <div class="card-head">
            <div>
              <span class="dashboard-eyebrow">Carga de trabajo</span>
              <h2 id="dashboard-equipment-title">Equipos</h2>
              <p>${equipment.length} ${equipment.length === 1 ? 'equipo' : 'equipos'} bajo tu responsabilidad.</p>
            </div>
            <a class="btn btn-sm btn-secondary" href="#/equipos">Ver pendientes ${icon('arrow-right')}</a>
          </div>
          <div class="card-body">
            ${equipment.length ? `<div class="dashboard-equipment-list">${equipment.map(equipmentWorkItem).join('')}</div>` : emptyState({ icon: 'cpu', title: 'Sin equipos asignados', text: 'Cuando recibas una orden, aparecerá en este panel.' })}
          </div>
        </section>

        <section class="card dashboard-focus" aria-labelledby="dashboard-focus-title">
          <div class="card-head">
            <div>
              <span class="dashboard-eyebrow">Siguiente paso</span>
              <h2 id="dashboard-focus-title">Continuar trabajo</h2>
              <p>Retoma el diagnóstico, inicia el equipo pendiente o revisa la reparación.</p>
            </div>
          </div>
          <div class="card-body">${focusContent}</div>
        </section>
      </div>

      <div class="dashboard-lower-grid">
        <section class="card dashboard-activity-card" aria-labelledby="dashboard-activity-title">
          <div class="card-head">
            <div>
              <span class="dashboard-eyebrow">Trazabilidad</span>
              <h2 id="dashboard-activity-title">Actividad reciente</h2>
              <p>Movimientos de tus equipos registrados en el historial.</p>
            </div>
            <a class="btn btn-sm btn-ghost" href="#/historial">${icon('history')}Ver historial</a>
          </div>
          <div class="card-body">
            ${historyEntries.length ? `<div class="dashboard-activity-list">${historyEntries.map(activityItem).join('')}</div>` : emptyState({ icon: 'history', title: 'Sin actividad', text: 'Todavía no hay eventos registrados para tus equipos.' })}
          </div>
        </section>

        <section class="card dashboard-quick-card" aria-labelledby="dashboard-quick-title">
          <div class="card-head">
            <div>
              <span class="dashboard-eyebrow">Atajos</span>
              <h2 id="dashboard-quick-title">Accesos rápidos</h2>
              <p>Entra directamente a los módulos de la demostración.</p>
            </div>
          </div>
          <div class="card-body">
            <div class="dashboard-quick-list">
              <a class="dashboard-quick-link" href="#/diagnosticos"><span class="dashboard-quick-icon quick-tone-blue">${icon('clipboard')}</span><span class="dashboard-quick-copy"><strong>Diagnósticos</strong><span>Revisar registros y borradores</span></span><span class="dashboard-quick-arrow">${icon('arrow-right')}</span></a>
              <a class="dashboard-quick-link" href="#/documentos"><span class="dashboard-quick-icon quick-tone-cyan">${icon('file-text')}</span><span class="dashboard-quick-copy"><strong>Documentos</strong><span>Consultar archivos de demostración</span></span><span class="dashboard-quick-arrow">${icon('arrow-right')}</span></a>
              <a class="dashboard-quick-link" href="#/historial"><span class="dashboard-quick-icon quick-tone-green">${icon('history')}</span><span class="dashboard-quick-copy"><strong>Historial</strong><span>Trazabilidad de tus equipos</span></span><span class="dashboard-quick-arrow">${icon('arrow-right')}</span></a>
            </div>
            <div class="dashboard-quick-note">${icon('shield')}<span>Entorno de demostración: la información se guarda solo en este navegador.</span></div>
          </div>
        </section>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------
     12. Equipos
     Cola del técnico con búsqueda, filtro por estado y acciones para iniciar, continuar o consultar el diagnóstico.
     ------------------------------------------------------------ */
  /* Devuelve el texto del contador con el plural correcto. */
  function equipmentCountLabel(visible, total) {
    return `Mostrando ${visible} de ${total} ${total === 1 ? 'equipo' : 'equipos'}`;
  }

  /* Genera una fila vacía para la tabla de equipos. */
  function equipmentEmptyRow(message) {
    return `<tr><td colspan="6"><div class="table-empty">${icon('search')}<p>${escapeHtml(message)}</p></div></td></tr>`;
  }

  /* Genera una fila de la tabla de equipos con sus datos y acciones. */
  function equipmentTableRow(equipment) {
    const client = equipmentClient(equipment);
    return `<tr data-equipment-row data-search="${escapeAttr(equipmentSearchText(equipment))}">
      <td><div class="cell-main"><strong>${escapeHtml(equipment.order)}</strong><span>${escapeHtml(equipmentName(equipment))}</span><span class="mono">${escapeHtml(equipment.serial)}</span></div></td>
      <td><div class="cell-main"><strong>${escapeHtml(client?.company || 'Cliente')}</strong><span>${escapeHtml(client?.contact || 'Sin contacto')}</span></div></td>
      <td>${escapeHtml(equipmentSeller(equipment))}</td>
      <td><div class="row">${statusBadge(equipment.status)}${priorityBadge(equipment.priority)}</div></td>
      <td class="nowrap">${escapeHtml(formatDate(equipment.receptionDate))}</td>
      <td><div class="cell-actions">${equipmentActions(equipment)}</div></td>
    </tr>`;
  }

  /* Renderiza la cola de Equipos con buscador, filtro por estado y tabla. */
  function renderEquipos() {
    const equipment = queueEquipment();
    const statusOptions = WORK_QUEUE_STATUSES
      .map((key) => `<option value="${escapeAttr(key)}">${escapeHtml(statusMeta(key).label)}</option>`)
      .join('');
    return `<div class="view">
      ${pageHeader({
        kicker: 'Carga de trabajo',
        title: 'Equipos',
        lead: 'Consulta los equipos asignados, en diagnóstico o pendientes de reparación, abre su expediente y da seguimiento al trabajo técnico.',
        actions: '<a class="btn btn-secondary" href="#/diagnosticos">' + icon('clipboard') + 'Ir a diagnósticos</a>'
      })}
      <section class="card table-card">
        <div class="table-toolbar">
          <div class="search-field" data-search-field>
            ${icon('search')}
            <label class="sr-only" for="equipment-search">Buscar equipos por orden, cliente, vendedor, fabricante o serie</label>
            <input id="equipment-search" type="search" placeholder="Buscar orden, cliente, vendedor, fabricante o serie..." autocomplete="off">
            <button class="search-clear" type="button" data-action="clear-equipment-search" aria-label="Limpiar búsqueda">${icon('x')}</button>
          </div>
          <div class="select-field">
            <label for="equipment-status-filter">Estado</label>
            <select id="equipment-status-filter">
              <option value="all">Todos</option>
              ${statusOptions}
            </select>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table equipment-table">
            <caption class="sr-only">Equipos pendientes asignados al técnico</caption>
            <thead><tr><th scope="col">Orden / Equipo</th><th scope="col">Cliente</th><th scope="col">Vendedor</th><th scope="col">Estado</th><th scope="col">Ingreso</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody id="equipment-table-body">${equipment.length ? equipment.map(equipmentTableRow).join('') : equipmentEmptyRow('No hay equipos pendientes de diagnóstico o reparación.')}</tbody>
          </table>
        </div>
        <div class="table-foot"><span class="table-count" id="equipment-table-count">${equipmentCountLabel(equipment.length, equipment.length)}</span><span>Datos ficticios de demostración</span></div>
      </section>
      <div class="info-box">${icon('info')}<div>Solo se muestran equipos <strong>asignados, en diagnóstico o por reparar</strong>. Los diagnosticados esperan autorización del vendedor; los finalizados se consultan en Diagnósticos e Historial.</div></div>
    </div>`;
  }

  /* Filtra en el cliente la tabla de equipos por texto y estado y actualiza el contador. */
  function filterEquipmentTable() {
    const tbody = document.getElementById('equipment-table-body');
    if (!tbody) return;
    const query = normalize(document.getElementById('equipment-search')?.value || '');
    const status = document.getElementById('equipment-status-filter')?.value || 'all';
    const searchField = document.querySelector('[data-search-field]');
    if (searchField) searchField.classList.toggle('has-value', Boolean(query));
    const queue = queueEquipment();
    const total = queue.length;
    const rows = queue.filter((equipment) => {
      const matchesQuery = !query || equipmentSearchText(equipment).includes(query);
      const matchesStatus = status === 'all' || equipment.status === status;
      return matchesQuery && matchesStatus;
    });
    tbody.innerHTML = rows.length
      ? rows.map(equipmentTableRow).join('')
      : equipmentEmptyRow('No hay equipos que coincidan con el filtro.');
    const count = document.getElementById('equipment-table-count');
    if (count) count.textContent = equipmentCountLabel(rows.length, total);
  }

  /* ------------------------------------------------------------
     13. Expediente digital y pestañas
     Ficha completa del equipo: resumen (equipo, cliente, recepción, falla y fotos), diagnóstico, historial y documentos, con pestañas navegables por hash.
     ------------------------------------------------------------ */
  /* Devuelve la clase visual de un tipo de documento. */
  function documentTypeClass(type) {
    const value = normalize(type);
    if (value.includes('manual')) return 'manual';
    if (value.includes('pinout')) return 'pinout';
    if (value.includes('certificado')) return 'cert';
    return '';
  }

  /* Devuelve el icono adecuado para cada tipo de documento. */
  function documentTypeIcon(type) {
    const value = normalize(type);
    if (value.includes('certificado')) return 'shield';
    if (value.includes('pinout')) return 'cpu';
    if (value.includes('ficha')) return 'file';
    return 'file-text';
  }

  /* Genera la insignia con icono y nombre del tipo de documento. */
  function documentTypeBadge(document) {
    return `<span class="doc-type-badge ${documentTypeClass(document.type)}">${icon(documentTypeIcon(document.type))}${escapeHtml(document.type)}</span>`;
  }

  /* Genera los botones de vista previa y descarga de un documento. */
  function documentActions(document, compact = false) {
    const size = compact ? 'btn-sm' : '';
    return `<div class="doc-actions">
      <button class="btn ${size} btn-secondary" type="button" data-action="preview-doc" data-id="${escapeAttr(document.id)}">${icon('eye')}Vista previa</button>
      <button class="btn ${size} btn-ghost" type="button" data-action="download-doc" data-id="${escapeAttr(document.id)}">${icon('download')}Descargar</button>
    </div>`;
  }

  /* Devuelve la tabla de documentos de un equipo. */
  function documentTable(documents) {
    return `<div class="table-scroll"><table class="data-table">
      <caption class="sr-only">Documentos del equipo</caption>
      <thead><tr><th scope="col">Documento</th><th scope="col">Tipo</th><th scope="col">Referencia</th><th scope="col">Fecha</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
      <tbody>${documents.map((document) => `<tr>
        <td><div class="cell-main"><strong>${escapeHtml(document.name)}</strong><span>${escapeHtml(document.file?.name || 'Sin archivo de demostración')}</span></div></td>
        <td>${documentTypeBadge(document)}</td>
        <td><div class="cell-main"><span class="mono">${escapeHtml(document.reference)}</span><span>Versión ${escapeHtml(document.version)}</span></div></td>
        <td class="nowrap">${escapeHtml(formatDate(document.date))}</td>
        <td>${documentActions(document, true)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  /* Convierte una etiqueta de estado del historial en una insignia; usa gris si no coincide. */
  function statusBadgeFromLabel(label) {
    const match = Object.values(EQUIPMENT_STATUS).find((item) => normalize(item.label) === normalize(label));
    return match ? statusBadge(match.key) : `<span class="badge badge-gray">${escapeHtml(label || '—')}</span>`;
  }

  /* Genera una entrada de la línea de tiempo con icono, evento, cambio de estado, fecha y
     responsable.
     */
  function historyEntryHtml(entry, filterable = false) {
    const meta = historyIcon(entry.type);
    const toneClass = meta.tone === 'blue' ? '' : meta.tone;
    const searchable = normalize([entry.order, entry.activity, entry.observations, entry.executedBy, entry.previousStatus, entry.newStatus].filter(Boolean).join(' '));
    return `<article class="history-entry" ${filterable ? `data-history-row data-search="${escapeAttr(searchable)}" data-type="${escapeAttr(entry.type)}"` : ''}>
      <span class="history-dot ${toneClass}">${icon(meta.icon)}</span>
      <div class="history-body">
        <strong>${escapeHtml(entry.activity)}</strong>
        <p>${escapeHtml(entry.order)} · ${escapeHtml(entry.observations || 'Sin observaciones registradas.')}</p>
        <div class="history-state-change">${statusBadgeFromLabel(entry.previousStatus)}${icon('arrow-right')}${statusBadgeFromLabel(entry.newStatus)}</div>
        <div class="history-date">${escapeHtml(formatDateTime(entry.date))} · ${escapeHtml(entry.executedBy)}</div>
      </div>
    </article>`;
  }

  /* Renderiza el expediente del equipo y la pestaña solicitada: resumen, diagnóstico, historial o
     documentos.
     */
  function renderExpediente(equipmentId, tab) {
    const equipment = getEquipment(equipmentId);
    const client = equipmentClient(equipment);
    const actions = actionsForEquipment(equipment);
    const tabs = [
      { key: 'resumen', label: 'Resumen' },
      { key: 'diagnostico', label: 'Diagnóstico' },
      { key: 'historial', label: 'Historial' },
      { key: 'documentos', label: 'Documentos' }
    ];
    let primaryAction = '';
    if (actions.canContinue) {
      primaryAction = `<a class="btn btn-primary" href="#/diagnosticos/${actions.draft.id}">${icon('edit')}Continuar diagnóstico</a>`;
    } else if (equipment.status === 'assigned' && actions.canStart) {
      primaryAction = `<button class="btn btn-primary" type="button" data-action="start-diagnostic" data-id="${escapeAttr(equipment.id)}">${icon('play')}Iniciar diagnóstico</button>`;
    } else if (equipment.status === 'repair') {
      primaryAction = `<a class="btn btn-primary" href="#/reparacion/${equipment.id}">${icon('settings')}Iniciar reparación</a>`;
    } else if (actions.finalized) {
      primaryAction = `<a class="btn btn-primary" href="#/diagnosticos/${actions.finalized.id}">${icon('eye')}Ver diagnóstico finalizado</a>`;
    }

    let tabContent = '';
    if (tab === 'resumen') {
      tabContent = `<div class="stack gap-20">
        <div class="record-grid">
          <article class="card info-card">
            <div class="info-card-head"><span class="icon-wrap">${icon('cpu')}</span><h2>Equipo</h2></div>
            <dl class="info-list">
              <div class="info-row"><dt>Fabricante</dt><dd>${escapeHtml(equipment.manufacturer)}</dd></div>
              <div class="info-row"><dt>Modelo</dt><dd>${escapeHtml(equipment.model)}</dd></div>
              <div class="info-row"><dt>Serie</dt><dd class="mono">${escapeHtml(equipment.serial)}</dd></div>
              <div class="info-row"><dt>Orden</dt><dd class="mono">${escapeHtml(equipment.order)}</dd></div>
              <div class="info-row"><dt>Prioridad</dt><dd>${priorityBadge(equipment.priority)}</dd></div>
            </dl>
          </article>
          <article class="card info-card">
            <div class="info-card-head"><span class="icon-wrap">${icon('building')}</span><h2>Cliente</h2></div>
            <dl class="info-list">
              <div class="info-row"><dt>Empresa</dt><dd>${escapeHtml(client?.company || '—')}</dd></div>
              <div class="info-row"><dt>Contacto</dt><dd>${escapeHtml(client?.contact || '—')}</dd></div>
              <div class="info-row"><dt>Teléfono</dt><dd>${escapeHtml(client?.phone || '—')}</dd></div>
              <div class="info-row"><dt>Correo</dt><dd>${escapeHtml(client?.email || '—')}</dd></div>
              <div class="info-row"><dt>Ubicación</dt><dd>${escapeHtml(client?.address || '—')}</dd></div>
            </dl>
          </article>
          <article class="card info-card">
            <div class="info-card-head"><span class="icon-wrap">${icon('calendar')}</span><h2>Recepción y asignación</h2></div>
            <dl class="info-list">
              <div class="info-row"><dt>Recepción</dt><dd>${escapeHtml(formatDateTime(equipment.receptionDate))}</dd></div>
              <div class="info-row"><dt>Recibió</dt><dd>${escapeHtml(equipment.receivedBy)}</dd></div>
              <div class="info-row"><dt>Vendedor</dt><dd>${escapeHtml(equipmentSeller(equipment))}</dd></div>
              <div class="info-row"><dt>Asignación</dt><dd>${escapeHtml(formatDateTime(equipment.assignmentDate))}</dd></div>
              <div class="info-row"><dt>Técnico</dt><dd>${escapeHtml(tech().name)}</dd></div>
              <div class="info-row"><dt>Estado</dt><dd>${statusBadge(equipment.status)}</dd></div>
            </dl>
          </article>
        </div>
        <div class="grid-2">
          <section class="card">
            <div class="card-head"><div><h2>Falla reportada</h2><p>Información capturada en la recepción</p></div></div>
            <div class="card-body stack gap-16">
              <p class="failure-text">${escapeHtml(equipment.reportedFailure)}</p>
              <div>
                <div class="field-label" style="margin-bottom:6px">Accesorios recibidos</div>
                <div class="chip-list">${equipment.accessories.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>
              </div>
              <div class="info-note">${escapeHtml(equipment.receptionNotes)}</div>
            </div>
          </section>
          <section class="card">
            <div class="card-head"><div><h2>Fotografías de recepción</h2><p>Imágenes ilustrativas de la demostración</p></div></div>
            <div class="card-body">
              <div class="photo-grid">
                ${equipment.photos.map((photo, index) => `<figure class="photo-card">
                  <button type="button" data-action="zoom-photo" data-id="${escapeAttr(equipment.id)}" data-index="${index}" aria-label="Ampliar fotografía ${index + 1} de ${escapeHtml(equipmentName(equipment))}">
                    <img src="${escapeAttr(photo)}" alt="Fotografía ${index + 1} de ${escapeAttr(equipmentName(equipment))}">
                  </button>
                  <figcaption>Vista ${index + 1} · ${escapeHtml(equipment.manufacturer)}</figcaption>
                </figure>`).join('')}
              </div>
              <div class="photo-note">Imágenes generadas internamente con fines de demostración.</div>
            </div>
          </section>
        </div>
      </div>`;
    } else if (tab === 'diagnostico') {
      const finished = diagnosticsForEquipment(equipment.id).filter((item) => item.status === 'finished');
      const draft = draftForEquipment(equipment.id);
      if (draft) {
        const progress = diagnosticProgress(draft);
        tabContent = `<div class="stack gap-16">
          <section class="card">
            <div class="card-head"><div><h2>Diagnóstico en borrador</h2><p>${escapeHtml(draft.id)} · actualizado ${escapeHtml(timeAgo(draft.updatedAt))}</p></div>${diagnosticBadge(draft.status)}</div>
            <div class="card-body stack gap-16">
              <div class="progress-card" style="padding:0;border:0">
                <div class="progress-top"><div><h2>Avance de captura</h2><p>${progress.completed} de ${progress.total} campos obligatorios completos</p></div><span class="progress-percent">${progress.percent}%</span></div>
                <div class="progress-track"><div class="progress-fill" style="width:${progress.percent}%"></div></div>
                <div class="progress-sections">${progress.sections.map((section) => `<span class="progress-chip ${section.complete ? 'complete' : ''}"><span class="dot-state">${icon('check')}</span>${escapeHtml(section.label)}</span>`).join('')}</div>
              </div>
              <div class="info-box">${icon('info')}<div>El equipo permanece <strong>En diagnóstico</strong> hasta que finalices el registro. Puedes guardar el borrador y continuar después.</div></div>
              <div class="btn-row"><a class="btn btn-primary" href="#/diagnosticos/${draft.id}">${icon('edit')}Continuar captura</a></div>
            </div>
          </section>
        </div>`;
      } else if (finished.length) {
        tabContent = `<div class="stack gap-16">
          <div class="success-box">${icon('shield')}<div><strong>Diagnóstico finalizado y protegido.</strong><br>Los registros finalizados son de solo lectura y conservan el historial de cambios.</div></div>
          <section class="card">
            <div class="card-head"><div><h2>Registros finalizados</h2><p>${finished.length} diagnóstico${finished.length === 1 ? '' : 's'} disponible${finished.length === 1 ? '' : 's'} para consulta</p></div></div>
            <div class="card-body"><div class="work-list">
              ${finished.map((diagnostic) => `<div class="work-item">
                <span class="work-icon">${icon('clipboard')}</span>
                <div class="work-main"><strong>${escapeHtml(diagnostic.id)} · ${escapeHtml(diagnostic.order)}</strong><span>Finalizado ${escapeHtml(formatDateTime(diagnostic.finalizedAt))} · Técnico ${escapeHtml(tech().name)}</span></div>
                ${diagnosticBadge(diagnostic.status)}
                <div class="work-side"><a class="btn btn-sm btn-primary" href="#/diagnosticos/${diagnostic.id}">${icon('eye')}Ver registro</a></div>
              </div>`).join('')}
            </div></div>
          </section>
        </div>`;
      } else {
        tabContent = `<div class="card">${emptyState({
          icon: 'clipboard',
          title: equipment.status === 'assigned' ? 'Diagnóstico pendiente de inicio' : 'Sin diagnóstico registrado',
          text: equipment.status === 'assigned'
            ? 'Inicia el diagnóstico para capturar la evaluación, retroalimentación, pinout, sincronía y conclusiones.'
            : equipment.status === 'repair'
              ? 'El equipo está autorizado y listo para reparación, pero no tiene un diagnóstico asociado en esta demostración.'
              : 'Este equipo no tiene un diagnóstico disponible en la demostración.',
          action: equipment.status === 'assigned' && actions.canStart
            ? `<button class="btn btn-primary" type="button" data-action="start-diagnostic" data-id="${escapeAttr(equipment.id)}">${icon('play')}Iniciar diagnóstico</button>`
            : ''
        })}</div>`;
      }
    } else if (tab === 'historial') {
      const entries = historyForEquipment(equipment.id);
      tabContent = entries.length
        ? `<div class="history-timeline">${entries.map((entry) => historyEntryHtml(entry)).join('')}</div>`
        : `<div class="card">${emptyState({ icon: 'history', title: 'Sin historial', text: 'Todavía no hay eventos registrados para este equipo.' })}</div>`;
    } else {
      const documents = documentsForEquipment(equipment.id);
      tabContent = documents.length
        ? documentTable(documents)
        : `<div class="card">${emptyState({ icon: 'file-text', title: 'Sin documentos', text: 'No hay documentos asociados a este equipo en la demostración.' })}</div>`;
    }

    return `<div class="view">
      <div class="record-head">
        <div class="page-head-copy">
          <a class="back-link" href="#/equipos">${icon('arrow-left')}Equipos</a>
          <span class="kicker">Expediente digital</span>
          <div class="record-title">
            <h1>${escapeHtml(equipment.order)}</h1>
            <p class="lead">${escapeHtml(equipmentName(equipment))} · ${escapeHtml(client?.company || 'Cliente')}</p>
            <div class="record-meta">${statusBadge(equipment.status)}${priorityBadge(equipment.priority)}<span class="chip mono">${escapeHtml(equipment.serial)}</span></div>
          </div>
        </div>
        <div class="record-quick-actions">${primaryAction}<a class="btn btn-secondary" href="#/documentos">${icon('file-text')}Documentos</a></div>
      </div>

      <section class="card table-card">
        <div class="tabs-card">
          <nav class="tabs" role="tablist" aria-label="Secciones del expediente">
            ${tabs.map((item) => `<a class="tab-btn" role="tab" aria-selected="${tab === item.key}" href="#/expediente/${equipment.id}/${item.key}">${escapeHtml(item.label)}${item.key === 'diagnostico' ? ` <span class="badge badge-gray">${diagnosticsForEquipment(equipment.id).length}</span>` : ''}${item.key === 'documentos' ? ` <span class="badge badge-gray">${documentsForEquipment(equipment.id).length}</span>` : ''}</a>`).join('')}
          </nav>
        </div>
        <div class="card-body tab-panel tab-panel-card">${tabContent}</div>
      </section>
    </div>`;
  }

  /* ------------------------------------------------------------
     14. Listado de diagnósticos
     Resumen de borradores y finalizados, equipos pendientes de iniciar, tabla filtrable y accesos para reanudar o consultar cada registro.
     ------------------------------------------------------------ */
  /* Construye el texto normalizado usado para buscar diagnósticos en la tabla. */
  function diagnosticSearchText(diagnostic) {
    const equipment = getEquipment(diagnostic.equipmentId);
    return normalize([
      diagnostic.id, diagnostic.order, equipmentName(equipment),
      equipmentClient(equipment)?.company, diagnostic.status, diagnostic.conclusion?.rootCause
    ].filter(Boolean).join(' '));
  }

  /* Genera una fila de diagnóstico con avance, estado, fecha y acciones. */
  function diagnosticTableRow(diagnostic) {
    const equipment = getEquipment(diagnostic.equipmentId);
    const client = equipment ? equipmentClient(equipment) : null;
    const progress = diagnosticProgress(diagnostic);
    return `<tr data-diagnostic-row data-search="${escapeAttr(diagnosticSearchText(diagnostic))}" data-status="${escapeAttr(diagnostic.status)}">
      <td><div class="cell-main"><strong>${escapeHtml(diagnostic.order)}</strong><span class="mono">${escapeHtml(diagnostic.id)}</span></div></td>
      <td><div class="cell-main"><strong>${escapeHtml(equipmentName(equipment))}</strong><span>${escapeHtml(client?.company || '—')}</span></div></td>
      <td>${diagnosticBadge(diagnostic.status)}</td>
      <td><div class="cell-main"><strong>${progress.percent}%</strong><span>${progress.completed} de ${progress.total} campos</span></div></td>
      <td><div class="cell-main"><strong>${escapeHtml(formatDate(diagnostic.updatedAt))}</strong><span>${diagnostic.status === 'finished' ? 'Finalizado' : 'Actualizado'} ${escapeHtml(timeAgo(diagnostic.finalizedAt || diagnostic.updatedAt))}</span></div></td>
      <td><div class="cell-actions">
        <a class="btn btn-sm ${diagnostic.status === 'draft' ? 'btn-primary' : 'btn-secondary'}" href="#/diagnosticos/${diagnostic.id}">${icon(diagnostic.status === 'draft' ? 'edit' : 'eye')}${diagnostic.status === 'draft' ? 'Reanudar' : 'Ver registro'}</a>
        <a class="btn btn-sm btn-ghost" href="#/expediente/${diagnostic.equipmentId}/diagnostico">${icon('file-text')}Expediente</a>
      </div></td>
    </tr>`;
  }

  /* Renderiza la vista de diagnósticos con resumen, equipos pendientes y tabla filtrable. */
  function renderDiagnosticos() {
    const diagnostics = state.diagnostics.filter((diagnostic) => isOwnDiagnostic(diagnostic));
    const drafts = diagnostics.filter((diagnostic) => diagnostic.status === 'draft');
    const finished = diagnostics.filter((diagnostic) => diagnostic.status === 'finished');
    const pending = ownEquipment().filter((equipment) => equipment.status === 'assigned' && !draftForEquipment(equipment.id));
    const finishedEquipment = ownEquipment().filter((equipment) => equipment.status === 'finished');

    return `<div class="view">
      ${pageHeader({
        kicker: 'Registro técnico',
        title: 'Diagnósticos',
        lead: 'Inicia, continúa y consulta los diagnósticos de tus equipos. Al finalizar, el registro se bloquea y el equipo pasa a Diagnosticado.',
        actions: pending.length ? `<button class="btn btn-primary" type="button" data-action="new-diagnostic">${icon('plus')}Nuevo diagnóstico</button>` : ''
      })}
      <div class="diag-summary-grid">
        <div class="diag-summary"><span>Equipos asignados</span><strong>${ownEquipment().length}</strong></div>
        <div class="diag-summary"><span>Borradores activos</span><strong>${drafts.length}</strong></div>
        <div class="diag-summary"><span>Diagnósticos finalizados</span><strong>${finished.length}</strong></div>
        <div class="diag-summary"><span>Equipos finalizados</span><strong>${finishedEquipment.length}</strong></div>
      </div>

      <section class="card">
        <div class="card-head"><div><h2>Equipos pendientes de diagnóstico</h2><p>Equipos en estado Asignado sin un borrador iniciado</p></div><span class="badge badge-blue">${pending.length}</span></div>
        <div class="card-body">
          ${pending.length
            ? `<div class="work-list">${pending.map((equipment) => `<article class="work-item"><span class="work-icon">${icon('cpu')}</span><div class="work-main"><strong>${escapeHtml(equipment.order)} · ${escapeHtml(equipmentName(equipment))}</strong><span>${escapeHtml(equipmentClient(equipment)?.company || 'Cliente')} · recibido ${escapeHtml(formatDate(equipment.receptionDate))}</span></div>${statusBadge(equipment.status)}<div class="work-side"><button class="btn btn-sm btn-primary" type="button" data-action="start-diagnostic" data-id="${escapeAttr(equipment.id)}">${icon('play')}Iniciar diagnóstico</button><a class="btn btn-sm btn-ghost" href="#/expediente/${equipment.id}">${icon('file-text')}Expediente</a></div></article>`).join('')}</div>`
            : `<div class="success-box">${icon('check-circle')}<div>No hay equipos pendientes de iniciar diagnóstico. ${drafts.length ? 'Tienes borradores activos listos para continuar.' : ''}</div></div>`}
        </div>
      </section>

      <section class="card table-card">
        <div class="card-head"><div><h2>Registros de diagnóstico</h2><p>Borradores y registros finalizados de tus equipos</p></div></div>
        <div class="table-toolbar">
          <div class="search-field" data-search-field>
            ${icon('search')}
            <label class="sr-only" for="diag-search">Buscar diagnósticos</label>
            <input id="diag-search" type="search" placeholder="Buscar por orden, equipo o diagnóstico..." autocomplete="off">
            <button class="search-clear" type="button" data-action="clear-diag-search" aria-label="Limpiar búsqueda">${icon('x')}</button>
          </div>
          <div class="select-field">
            <label for="diag-status-filter">Estado</label>
            <select id="diag-status-filter"><option value="all">Todos</option><option value="draft">Borrador</option><option value="finished">Finalizado</option></select>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <caption class="sr-only">Diagnósticos del técnico</caption>
            <thead><tr><th scope="col">Orden / Registro</th><th scope="col">Equipo / Cliente</th><th scope="col">Estado</th><th scope="col">Avance</th><th scope="col">Actualización</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody id="diag-table-body">${sortByDateDesc(diagnostics, 'createdAt').map(diagnosticTableRow).join('')}</tbody>
          </table>
        </div>
        <div class="table-foot"><span class="table-count" id="diag-table-count">Mostrando ${diagnostics.length} de ${diagnostics.length} registros</span><span>Los registros finalizados son de solo lectura</span></div>
      </section>
      <div class="info-box">${icon('info')}<div>Los estados de diagnóstico son <strong>Borrador</strong> y <strong>Finalizado</strong>. Al finalizar, el registro se bloquea y queda de solo lectura.</div></div>
    </div>`;
  }

  /* Filtra la tabla de diagnósticos por texto y estado. */
  function filterDiagnosticsTable() {
    const tbody = document.getElementById('diag-table-body');
    if (!tbody) return;
    const query = normalize(document.getElementById('diag-search')?.value || '');
    const status = document.getElementById('diag-status-filter')?.value || 'all';
    const searchField = document.querySelector('[data-search-field]');
    if (searchField) searchField.classList.toggle('has-value', Boolean(query));
    const diagnostics = state.diagnostics.filter((diagnostic) => isOwnDiagnostic(diagnostic));
    const rows = diagnostics.filter((diagnostic) => {
      const matchesQuery = !query || diagnosticSearchText(diagnostic).includes(query);
      const matchesStatus = status === 'all' || diagnostic.status === status;
      return matchesQuery && matchesStatus;
    });
    tbody.innerHTML = rows.length
      ? sortByDateDesc(rows, 'createdAt').map(diagnosticTableRow).join('')
      : `<tr><td colspan="6"><div class="table-empty">${icon('search')}<p>No hay diagnósticos que coincidan con el filtro.</p></div></td></tr>`;
    const count = document.getElementById('diag-table-count');
    if (count) count.textContent = `Mostrando ${rows.length} de ${diagnostics.length} registros`;
  }

  /* ------------------------------------------------------------
     15. Diagnóstico: progreso, formulario y tabla de sincronía
     Constantes de opciones, validadores ligeros, cálculo de avance por secciones, constructores de campos y tabla editable de sincronía según el número de polos.
     ------------------------------------------------------------ */
  /* Opciones cerradas de los campos select del diagnóstico (se reutilizan al validar). */
  const VISUAL_CONDITION_OPTIONS = [
    { value: 'Sin daños visibles', label: 'Sin daños visibles' },
    { value: 'Daños menores', label: 'Daños menores' },
    { value: 'Daños mayores', label: 'Daños mayores' }
  ];
  const SAFETY_OPTIONS = [
    { value: 'Verificado', label: 'Verificado' },
    { value: 'Con observaciones', label: 'Con observaciones' }
  ];
  const SYNC_STORED_OPTIONS = [
    { value: 'yes', label: 'Sí' },
    { value: 'no', label: 'No' }
  ];
  const FINAL_RESULT_OPTIONS = [
    { value: 'Equipo operable', label: 'Equipo operable' },
    { value: 'Requiere intervención', label: 'Requiere intervención' },
    { value: 'No reparable', label: 'No reparable' }
  ];

  /* Validadores ligeros compartidos por el progreso y la validación final. */
  const parseDecimal = (value) => {
    const normalized = String(value ?? '').trim().replace(',', '.');
    if (!normalized) return NaN;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : NaN;
  };
  const hasText = (value) => String(value ?? '').trim().length > 0;
  const validPoles = (value) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= CONFIG.maxPoles;
  };
  const validSyncStored = (value) => value === 'yes' || value === 'no';

  /* Comprueba que todas las celdas visibles de la tabla de sincronía tienen un valor positivo. */
  function syncVisibleComplete(diagnostic) {
    if (!validPoles(diagnostic.poles)) return false;
    const poles = Number(diagnostic.poles);
    return SYNC_ROWS.every((row) => {
      const values = Array.isArray(diagnostic.syncValues?.[row]) ? diagnostic.syncValues[row] : [];
      for (let index = 0; index < poles; index += 1) {
        if (!(parseDecimal(values[index]) > 0)) return false;
      }
      return true;
    });
  }

  /* Calcula el avance del diagnóstico sobre los 19 campos obligatorios agrupados en las secciones
     A, B, C y D.
     */
  function diagnosticProgress(diagnostic) {
    const assessment = diagnostic.assessment || {};
    const encoder = diagnostic.encoder || {};
    const pinout = diagnostic.pinout || {};
    const conclusion = diagnostic.conclusion || {};
    const sectionData = [
      {
        key: 'A', label: 'A · Evaluación', total: 3, completed: [
          hasText(assessment.visualCondition), hasText(assessment.safetyCheck), hasText(assessment.initialObservations)
        ].filter(Boolean).length
      },
      {
        key: 'B', label: 'B · Retroalimentación', total: 4, completed: [
          hasText(encoder.type), parseDecimal(encoder.impedanceSine) > 0,
          parseDecimal(encoder.impedanceCosine) > 0, parseDecimal(encoder.impedanceReference) > 0
        ].filter(Boolean).length
      },
      {
        key: 'C', label: 'C · Pinout y sincronía', total: 8, completed: [
          hasText(pinout.image), hasText(pinout.manufacturer), hasText(pinout.manual),
          hasText(pinout.page), hasText(pinout.connectorRef), validPoles(diagnostic.poles),
          validSyncStored(diagnostic.syncStored), syncVisibleComplete(diagnostic)
        ].filter(Boolean).length
      },
      {
        key: 'D', label: 'D · Conclusiones', total: 4, completed: [
          hasText(conclusion.rootCause), hasText(conclusion.actionsPerformed),
          hasText(conclusion.finalResult), hasText(conclusion.notes)
        ].filter(Boolean).length
      }
    ];
    const total = sectionData.reduce((sum, section) => sum + section.total, 0);
    const completed = sectionData.reduce((sum, section) => sum + section.completed, 0);
    return {
      total,
      completed,
      percent: Math.round((completed / total) * 100),
      sections: sectionData.map((section) => ({ ...section, complete: section.completed === section.total }))
    };
  }

  /* Indica si la tabla de sincronía contiene algún valor capturado. */
  function hasAnySyncData(diagnostic) {
    return SYNC_ROWS.some((row) => {
      const values = Array.isArray(diagnostic.syncValues?.[row]) ? diagnostic.syncValues[row] : [];
      return values.some((value) => hasText(value));
    });
  }

  /* Ajusta los arrays de sincronía al número de polos sin borrar los valores que quedan fuera de
     la vista.
     */
  function ensureSyncArrays(diagnostic, poles) {
    if (!diagnostic.syncValues) diagnostic.syncValues = emptySyncValues();
    SYNC_ROWS.forEach((row) => {
      if (!Array.isArray(diagnostic.syncValues[row])) diagnostic.syncValues[row] = [];
      while (diagnostic.syncValues[row].length < poles) diagnostic.syncValues[row].push('');
    });
  }

  /* Genera los chips de avance por sección; cada chip salta a su bloque. */
  function progressChipsHtml(progress) {
    return progress.sections.map((section) => `<button type="button" class="progress-chip ${section.complete ? 'complete' : ''} ${section.key === activeDiagTab ? 'is-active' : ''}" data-action="diag-tab" data-tab="${section.key}" aria-controls="seccion-${section.key.toLowerCase()}" ${section.key === activeDiagTab ? 'aria-current="step"' : ''} aria-label="Ir al bloque ${escapeAttr(section.label)}"><span class="dot-state">${icon('check')}</span>${escapeHtml(section.label)}</button>`).join('');
  }

  /* Devuelve la marca de sección completa o pendiente. */
  function sectionStateMarkup(progress, key) {
    const section = progress.sections.find((item) => item.key === key);
    return section?.complete
      ? `<span class="section-state complete" data-section-state="${key}">${icon('check-circle')}Completa</span>`
      : `<span class="section-state" data-section-state="${key}">${icon('clock')}Pendiente</span>`;
  }

  /* Genera la barra de pestañas de los bloques A-D del formulario editable. */
  function diagTabsHtml(progress) {
    return `<div class="diag-tabs" role="tablist" aria-label="Bloques del diagnóstico">${DIAG_BLOCKS.map((block) => {
      const section = progress.sections.find((item) => item.key === block.key);
      const selected = block.key === activeDiagTab;
      const complete = Boolean(section?.complete);
      return `<button class="diag-tab ${complete ? 'complete' : ''}" id="diag-tab-${block.key.toLowerCase()}" type="button" role="tab" aria-selected="${selected}" aria-controls="seccion-${block.key.toLowerCase()}" tabindex="${selected ? '0' : '-1'}" data-action="diag-tab" data-tab="${block.key}">
        <span class="diag-tab-index">${block.key}</span>
        <span class="diag-tab-copy"><strong>${escapeHtml(block.title)}</strong><small data-tab-meta="${block.key}">${section ? `${section.completed} de ${section.total}` : ''}</small></span>
        <span class="diag-tab-state" data-tab-state="${block.key}">${complete ? icon('check') : ''}</span>
      </button>`;
    }).join('')}</div>`;
  }

  /* Genera los controles para avanzar o retroceder entre bloques. */
  function diagBlockNavHtml() {
    const index = Math.max(0, DIAG_BLOCKS.findIndex((block) => block.key === activeDiagTab));
    const block = DIAG_BLOCKS[index];
    return `<button class="btn btn-secondary btn-sm" type="button" data-action="diag-block-prev" ${index === 0 ? 'disabled' : ''}>${icon('arrow-left')}Anterior</button>
      <span class="diag-block-position">Bloque <strong>${block.key}</strong> de ${DIAG_BLOCKS.length}<span>${escapeHtml(block.title)}</span></span>
      <button class="btn btn-secondary btn-sm" type="button" data-action="diag-block-next" ${index === DIAG_BLOCKS.length - 1 ? 'disabled' : ''}>Siguiente${icon('arrow-right')}</button>`;
  }

  /* Actualiza el texto y los botones de la navegación entre bloques. */
  function updateDiagBlockNav() {
    const nav = document.getElementById('diag-block-nav');
    if (nav) nav.innerHTML = diagBlockNavHtml();
  }

  /* Activa un bloque, muestra su panel y sincroniza pestañas, chips y navegación. */
  function activateDiagnosticTab(key, options = {}) {
    const block = DIAG_BLOCKS.find((item) => item.key === key);
    if (!block) return;
    activeDiagTab = block.key;
    const form = document.getElementById('diagnostic-form');
    if (!form) return;
    $$('.diag-tab', form).forEach((tab) => {
      const selected = tab.dataset.tab === block.key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    $$('[data-diag-panel]', form).forEach((panel) => {
      panel.hidden = panel.dataset.diagPanel !== block.key;
    });
    $$('.progress-chip').forEach((chip) => {
      const active = chip.dataset.tab === block.key;
      chip.classList.toggle('is-active', active);
      if (active) chip.setAttribute('aria-current', 'step');
      else chip.removeAttribute('aria-current');
    });
    updateDiagBlockNav();
    if (options.scroll) {
      form.querySelector('.diag-tabs')?.scrollIntoView({ behavior: state.preferences.reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
    const activeTab = form.querySelector(`.diag-tab[data-tab="${block.key}"]`);
    activeTab?.scrollIntoView({ behavior: state.preferences.reducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
    if (options.focusTab) {
      activeTab?.focus({ preventScroll: true });
    }
  }

  /* Avanza o retrocede un bloque desde la navegación inferior. */
  function moveDiagnosticTab(delta) {
    const index = DIAG_BLOCKS.findIndex((item) => item.key === activeDiagTab);
    const next = DIAG_BLOCKS[index + delta];
    if (next) activateDiagnosticTab(next.key, { focusTab: true, scroll: true });
  }

  /* Asocia la ruta de un error de validación con su bloque A-D. */
  function diagnosticSectionForPath(path) {
    if (path.startsWith('encoder.')) return 'B';
    if (path === 'poles' || path === 'syncStored' || path === 'sync' || path.startsWith('pinout.')) return 'C';
    if (path.startsWith('conclusion.')) return 'D';
    return 'A';
  }

  /* Generadores de ids estables para relacionar controles, ayudas y mensajes de error. */
  const diagControlId = (path) => `field-${path.replace(/[^a-z0-9]+/gi, '-')}`;
  const diagErrorId = (path) => `error-${path.replace(/[^a-z0-9]+/gi, '-')}`;

  /* Envuelve un control con etiqueta obligatoria, ayuda y párrafo de error asociado por id. */
  function fieldShell(path, label, control, options = {}) {
    const { help = '', span2 = false } = options;
    return `<div class="field ${span2 ? 'span-2' : ''}">
      <label for="${diagControlId(path)}">${escapeHtml(label)} <span class="req" aria-hidden="true">*</span></label>
      ${control}
      ${help ? `<span class="field-help">${help}</span>` : ''}
      <p class="field-error" id="${diagErrorId(path)}" data-error-for="${escapeAttr(path)}"></p>
    </div>`;
  }

  /* Genera un campo de texto del formulario de diagnóstico con valor y metadatos. */
  function diagTextField(diagnostic, path, label, options = {}) {
    const { placeholder = '', help = '', span2 = false, numeric = false, suffix = '', maxlength = '' } = options;
    const value = escapeAttr(getByPath(diagnostic, path) ?? '');
    const input = `<input id="${diagControlId(path)}" name="${escapeAttr(path)}" type="text" ${numeric ? 'inputmode="decimal" autocomplete="off"' : 'autocomplete="off"'} ${maxlength ? `maxlength="${maxlength}"` : ''} value="${value}" placeholder="${escapeAttr(placeholder)}" data-field="${escapeAttr(path)}" aria-describedby="${diagErrorId(path)}" required>`;
    const control = suffix ? `<div class="input-suffix">${input}<span>${escapeHtml(suffix)}</span></div>` : input;
    return fieldShell(path, label, control, { help, span2 });
  }

  /* Genera un área de texto del formulario de diagnóstico. */
  function diagTextareaField(diagnostic, path, label, options = {}) {
    const { placeholder = '', help = '', span2 = false, rows = 4 } = options;
    const value = escapeHtml(getByPath(diagnostic, path) ?? '');
    const control = `<textarea id="${diagControlId(path)}" name="${escapeAttr(path)}" rows="${rows}" placeholder="${escapeAttr(placeholder)}" data-field="${escapeAttr(path)}" aria-describedby="${diagErrorId(path)}" required>${value}</textarea>`;
    return fieldShell(path, label, control, { help, span2 });
  }

  /* Construye las opciones de un select y marca la seleccionada. */
  function optionsMarkup(options, selectedValue, placeholder = 'Selecciona una opción') {
    const normalizedSelected = String(selectedValue ?? '');
    return `<option value="">${escapeHtml(placeholder)}</option>${options.map((option) => {
      const value = typeof option === 'string' ? option : option.value;
      const label = typeof option === 'string' ? option : option.label;
      return `<option value="${escapeAttr(value)}" ${normalizedSelected === String(value) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('')}`;
  }

  /* Genera un campo select del formulario de diagnóstico. */
  function diagSelectField(diagnostic, path, label, options, settings = {}) {
    const { placeholder = 'Selecciona una opción', help = '', span2 = false } = settings;
    const control = `<select id="${diagControlId(path)}" name="${escapeAttr(path)}" data-field="${escapeAttr(path)}" aria-describedby="${diagErrorId(path)}" required>${optionsMarkup(options, getByPath(diagnostic, path), placeholder)}</select>`;
    return fieldShell(path, label, control, { help, span2 });
  }

  /* Devuelve la vista previa del pinout cargado o la zona de carga con opción de usar el ejemplo. */
  function pinoutPreviewHtml(diagnostic) {
    const pinout = diagnostic.pinout || {};
    if (pinout.image) {
      return `<div class="pinout-preview">
        <div class="pinout-preview-img"><img src="${escapeAttr(pinout.image)}" alt="Imagen del pinout cargada para el diagnóstico"></div>
        <div class="pinout-preview-meta">
          <span class="file-name">${icon('image')}<span>${escapeHtml(pinout.fileName || 'pinout')}</span></span>
          <span class="spacer"></span>
          <button class="btn btn-sm btn-secondary" type="button" data-action="zoom-pinout" data-id="${escapeAttr(diagnostic.id)}">${icon('zoom-in')}Ampliar</button>
          <label class="btn btn-sm btn-secondary" for="pinout-file">${icon('upload')}Cambiar</label>
          <button class="btn btn-sm btn-ghost" type="button" data-action="remove-pinout">${icon('trash')}Quitar</button>
        </div>
      </div>`;
    }
    return `<label class="upload-zone" for="pinout-file">
      ${icon('upload')}
      <strong>Subir imagen del pinout</strong>
      <span>JPG, PNG o WebP · máximo 5 MB · se comprime para guardarse en el navegador</span>
    </label>
    <div class="btn-row" style="margin-top:8px">
      <button class="btn btn-sm btn-ghost" type="button" data-action="demo-pinout">${icon('image')}Usar pinout de ejemplo (demo)</button>
    </div>`;
  }

  /* Genera la tabla editable de sincronía con una columna por polo o un aviso si faltan polos. */
  function syncTableHtml(diagnostic) {
    if (!validPoles(diagnostic.poles)) {
      return `<div class="sync-empty">${icon('sliders')} Define el número de polos y pulsa <strong>Aplicar polos</strong> para generar la tabla de sincronía.</div>`;
    }
    const poles = Number(diagnostic.poles);
    return `<div class="sync-table-wrap"><table class="sync-table">
      <caption class="sr-only">Tabla de sincronía de seis filas y ${poles} polos</caption>
      <thead><tr><th class="sticky-col" scope="col">Conexión</th>${Array.from({ length: poles }, (_, index) => `<th scope="col">Polo ${index + 1}</th>`).join('')}</tr></thead>
      <tbody>${SYNC_ROWS.map((row) => `<tr>
        <th class="sticky-col" scope="row">${escapeHtml(row)}</th>
        ${Array.from({ length: poles }, (_, index) => {
          const values = Array.isArray(diagnostic.syncValues?.[row]) ? diagnostic.syncValues[row] : [];
          return `<td><input class="sync-input" type="text" inputmode="decimal" value="${escapeAttr(values[index] ?? '')}" data-sync="${escapeAttr(row)}" data-col="${index}" aria-label="Sincronía ${escapeAttr(row)}, polo ${index + 1}" required></td>`;
        }).join('')}
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="table-scroll-hint">Desliza horizontalmente si hay muchos polos.</div>`;
  }

  /* Renderiza el formulario completo del borrador: progreso, secciones A-D, pinout, sincronía y
     barra de acciones.
     */
  function renderDiagnosticForm(diagnostic) {
    const equipment = getEquipment(diagnostic.equipmentId);
    const client = equipmentClient(equipment);
    const progress = diagnosticProgress(diagnostic);
    return `<div class="view">
      <div class="record-head">
        <div class="page-head-copy">
          <a class="back-link" href="#/diagnosticos">${icon('arrow-left')}Diagnósticos</a>
          <span class="kicker">Captura técnica</span>
          <div class="record-title">
            <h1>Diagnóstico ${escapeHtml(diagnostic.order)}</h1>
            <p class="lead">${escapeHtml(equipmentName(equipment))} · ${escapeHtml(client?.company || 'Cliente')}</p>
            <div class="record-meta">${diagnosticBadge(diagnostic.status)}${statusBadge(equipment.status)}<span class="chip mono">${escapeHtml(diagnostic.id)}</span><span class="chip">${icon('clock')}Actualizado ${escapeHtml(timeAgo(diagnostic.updatedAt))}</span></div>
          </div>
        </div>
        <div class="record-quick-actions"><a class="btn btn-secondary" href="#/expediente/${equipment.id}/diagnostico">${icon('file-text')}Ver expediente</a></div>
      </div>

      <div class="card progress-card">
        <div class="progress-top">
          <div><h2>Avance del diagnóstico</h2><p id="diag-progress-copy">${progress.completed} de ${progress.total} campos obligatorios completos</p></div>
          <span class="progress-percent" id="diag-progress-percent">${progress.percent}%</span>
        </div>
        <div class="progress-track"><div class="progress-fill" id="diag-progress-fill" style="width:${progress.percent}%"></div></div>
        <div class="progress-sections" id="diag-progress-chips">${progressChipsHtml(progress)}</div>
      </div>

      <div id="diag-errors" aria-live="polite"></div>
      <div class="info-box">${icon('info')}<div><strong>Todos los campos de los bloques A-D son obligatorios.</strong> Cambia de bloque sin perder lo capturado; el borrador se guarda automáticamente en este navegador. Los datos son ficticios.</div></div>

      <form id="diagnostic-form" novalidate>
        <div class="stack gap-20">
          ${diagTabsHtml(progress)}
          <section class="card diag-section diag-panel" id="seccion-a" role="tabpanel" aria-labelledby="diag-tab-a" data-diag-panel="A" tabindex="0" ${activeDiagTab === 'A' ? '' : 'hidden'}>
            <div class="diag-section-head">
              <span class="section-index">A</span>
              <div><h2 id="seccion-a-title">Evaluación inicial</h2><p>Condición del equipo y verificación de seguridad antes de la captura.</p></div>
              ${sectionStateMarkup(progress, 'A')}
            </div>
            <div class="diag-section-body">
              <div class="form-grid">
                ${diagSelectField(diagnostic, 'assessment.visualCondition', 'Condición visual', VISUAL_CONDITION_OPTIONS, { help: 'Registra el estado exterior observado durante la recepción técnica.' })}
                ${diagSelectField(diagnostic, 'assessment.safetyCheck', 'Verificación de seguridad', SAFETY_OPTIONS, { help: 'Confirma que se revisaron las condiciones de seguridad para trabajar.' })}
                ${diagTextareaField(diagnostic, 'assessment.initialObservations', 'Observaciones iniciales', { placeholder: 'Describe el estado encontrado, accesorios y cualquier hallazgo inicial...', span2: true, rows: 3 })}
              </div>
            </div>
          </section>

          <section class="card diag-section diag-panel" id="seccion-b" role="tabpanel" aria-labelledby="diag-tab-b" data-diag-panel="B" tabindex="0" ${activeDiagTab === 'B' ? '' : 'hidden'}>
            <div class="diag-section-head">
              <span class="section-index">B</span>
              <div><h2 id="seccion-b-title">Retroalimentación</h2><p>Tipo de encoder e impedancias de las señales medidas.</p></div>
              ${sectionStateMarkup(progress, 'B')}
            </div>
            <div class="diag-section-body">
              <div class="form-grid">
                ${diagSelectField(diagnostic, 'encoder.type', 'Tipo de encoder', ENCODER_TYPES, { help: 'El pinout y la verificación deben corresponder al tipo seleccionado.', span2: true })}
                ${diagTextField(diagnostic, 'encoder.impedanceSine', 'Impedancia seno', { numeric: true, suffix: 'Ω', placeholder: 'Ej. 118.5', help: 'Valor positivo. Puedes usar punto o coma decimal.' })}
                ${diagTextField(diagnostic, 'encoder.impedanceCosine', 'Impedancia coseno', { numeric: true, suffix: 'Ω', placeholder: 'Ej. 117.9' })}
                ${diagTextField(diagnostic, 'encoder.impedanceReference', 'Impedancia referencia', { numeric: true, suffix: 'Ω', placeholder: 'Ej. 59.8' })}
                <div class="field"><span class="field-label">Nota técnica</span><div class="info-note">Las impedancias se registran como referencia de demostración. No sustituyen una medición real.</div></div>
              </div>
            </div>
          </section>

          <section class="card diag-section diag-panel" id="seccion-c" role="tabpanel" aria-labelledby="diag-tab-c" data-diag-panel="C" tabindex="0" ${activeDiagTab === 'C' ? '' : 'hidden'}>
            <div class="diag-section-head">
              <span class="section-index">C</span>
              <div><h2 id="seccion-c-title">Pinout y sincronía</h2><p>Referencia del conector, número de polos y valores por par de fases.</p></div>
              ${sectionStateMarkup(progress, 'C')}
            </div>
            <div class="diag-section-body">
              <div class="form-grid">
                <div class="field span-2">
                  <span class="field-label">Imagen del pinout <span class="req" aria-hidden="true">*</span></span>
                  <div id="pinout-preview">${pinoutPreviewHtml(diagnostic)}</div>
                  <input class="hidden" id="pinout-file" type="file" accept="image/jpeg,image/png,image/webp">
                  <span class="field-help">Sube una imagen JPG, PNG o WebP de máximo 5 MB. También puedes usar el pinout de ejemplo.</span>
                  <p class="field-error" id="${diagErrorId('pinout.image')}" data-error-for="pinout.image"></p>
                </div>
                ${diagTextField(diagnostic, 'pinout.manufacturer', 'Fabricante del pinout', { placeholder: 'Ej. Siemens' })}
                ${diagTextField(diagnostic, 'pinout.manual', 'Manual de referencia', { placeholder: 'Ej. Manual de instalación 1FK7' })}
                ${diagTextField(diagnostic, 'pinout.page', 'Página del manual', { placeholder: 'Ej. 47' })}
                ${diagTextField(diagnostic, 'pinout.connectorRef', 'Referencia del conector', { placeholder: 'Ej. J4 / CON-A' })}
                <div class="field">
                  <label for="${diagControlId('poles')}">Número de polos <span class="req" aria-hidden="true">*</span></label>
                  <div class="row" style="flex-wrap:nowrap">
                    <input id="${diagControlId('poles')}" name="poles" type="number" min="1" max="${CONFIG.maxPoles}" step="1" value="${escapeAttr(diagnostic.poles ?? '')}" data-field="poles" aria-describedby="${diagErrorId('poles')}" required>
                    <button class="btn btn-secondary" type="button" data-action="apply-poles">Aplicar polos</button>
                  </div>
                  <span class="field-help">Entero positivo entre 1 y ${CONFIG.maxPoles}. Al cambiar los polos con datos capturados se pedirá confirmación.</span>
                  <p class="field-error" id="${diagErrorId('poles')}" data-error-for="poles"></p>
                </div>
                ${diagSelectField(diagnostic, 'syncStored', '¿Sincronía almacenada en el drive?', SYNC_STORED_OPTIONS, { help: 'Indica si los valores de sincronía quedaron almacenados en el drive.' })}
              </div>

              <div class="sync-meta">
                <strong>Tabla de sincronía</strong>
                <span>Filas fijas U-V, U-W, V-W, V-U, W-V y W-U · columnas según el número de polos</span>
              </div>
              <div id="sync-table-container">${syncTableHtml(diagnostic)}</div>
              <p class="field-error" id="${diagErrorId('sync')}" data-error-for="sync"></p>
              <div class="sync-note">${icon('info')}<span>Los valores de columnas ocultas al reducir polos se conservan internamente y se restauran si vuelves a aumentar el número de polos.</span></div>
            </div>
          </section>

          <section class="card diag-section diag-panel" id="seccion-d" role="tabpanel" aria-labelledby="diag-tab-d" data-diag-panel="D" tabindex="0" ${activeDiagTab === 'D' ? '' : 'hidden'}>
            <div class="diag-section-head">
              <span class="section-index">D</span>
              <div><h2 id="seccion-d-title">Conclusiones</h2><p>Cierre técnico del diagnóstico y recomendación.</p></div>
              ${sectionStateMarkup(progress, 'D')}
            </div>
            <div class="diag-section-body">
              <div class="form-grid">
                ${diagTextareaField(diagnostic, 'conclusion.rootCause', 'Causa raíz identificada', { placeholder: 'Describe la causa técnica del hallazgo...', span2: true, rows: 3 })}
                ${diagTextareaField(diagnostic, 'conclusion.actionsPerformed', 'Acciones realizadas', { placeholder: 'Describe las mediciones y verificaciones realizadas...', span2: true, rows: 3 })}
                ${diagSelectField(diagnostic, 'conclusion.finalResult', 'Resultado del diagnóstico', FINAL_RESULT_OPTIONS, { help: 'Este resultado quedará protegido en el registro finalizado.' })}
                ${diagTextareaField(diagnostic, 'conclusion.notes', 'Notas y recomendaciones', { placeholder: 'Recomendaciones para el equipo o para el siguiente paso...', rows: 4 })}
              </div>
            </div>
          </section>

          <div class="diag-block-nav" id="diag-block-nav">${diagBlockNavHtml()}</div>

          <div class="diag-actionbar">
            <span class="autosave-state" id="autosave-state" data-state="saved"><span class="status-dot"></span><span data-autosave-label>Guardado ${escapeHtml(timeAgo(diagnostic.updatedAt))}</span></span>
            <div class="btn-row">
              <button class="btn btn-ghost" type="button" data-action="diag-preview">${icon('eye')}Vista previa</button>
              <button class="btn btn-secondary" type="button" data-action="diag-save">${icon('save')}Guardar borrador</button>
              <button class="btn btn-primary" type="button" data-action="diag-finalize">${icon('check-circle')}Finalizar diagnóstico</button>
            </div>
          </div>
        </div>
      </form>
    </div>`;
  }

  /* ------------------------------------------------------------
     16. Validación, autoguardado y finalización
     Valida todos los campos obligatorios, marca errores accesibles, guarda con debounce, gestiona pinout y polos, y bloquea el registro al finalizar.
     ------------------------------------------------------------ */
  /* Valida todos los campos obligatorios y devuelve una lista de errores con ruta, etiqueta,
     mensaje y celdas inválidas.
     */
  function validateDiagnostic(diagnostic) {
    const errors = [];
    const seen = new Set();
    const push = (path, label, message, cells = null) => {
      if (seen.has(path)) return;
      seen.add(path);
      errors.push({ path, label, message, cells });
    };
    const assessment = diagnostic.assessment || {};
    const encoder = diagnostic.encoder || {};
    const pinout = diagnostic.pinout || {};
    const conclusion = diagnostic.conclusion || {};

    if (!VISUAL_CONDITION_OPTIONS.some((option) => option.value === assessment.visualCondition)) {
      push('assessment.visualCondition', 'Condición visual', 'Selecciona una condición visual válida.');
    }
    if (!SAFETY_OPTIONS.some((option) => option.value === assessment.safetyCheck)) {
      push('assessment.safetyCheck', 'Verificación de seguridad', 'Selecciona el resultado de la verificación de seguridad.');
    }
    if (!hasText(assessment.initialObservations)) {
      push('assessment.initialObservations', 'Observaciones iniciales', 'Captura las observaciones iniciales.');
    }
    if (!ENCODER_TYPES.some((option) => option.value === encoder.type)) {
      push('encoder.type', 'Tipo de encoder', 'Selecciona el tipo de encoder.');
    }
    const impedanceFields = [
      ['encoder.impedanceSine', 'Impedancia seno'],
      ['encoder.impedanceCosine', 'Impedancia coseno'],
      ['encoder.impedanceReference', 'Impedancia referencia']
    ];
    impedanceFields.forEach(([path, label]) => {
      if (!(parseDecimal(getByPath(diagnostic, path)) > 0)) {
        push(path, label, 'Captura un valor numérico mayor que cero. Puedes usar punto o coma decimal.');
      }
    });
    if (!hasText(pinout.image)) {
      push('pinout.image', 'Imagen del pinout', 'Carga una imagen de pinout o usa el pinout de ejemplo.');
    }
    ['manufacturer', 'manual', 'page', 'connectorRef'].forEach((key) => {
      if (!hasText(pinout[key])) {
        const labels = {
          manufacturer: 'Fabricante del pinout',
          manual: 'Manual de referencia',
          page: 'Página del manual',
          connectorRef: 'Referencia del conector'
        };
        push(`pinout.${key}`, labels[key], 'Este campo es obligatorio.');
      }
    });
    const polesInput = document.getElementById(diagControlId('poles'));
    if (polesInput) {
      if (!validPoles(polesInput.value)) {
        push('poles', 'Número de polos', `Captura un entero positivo entre 1 y ${CONFIG.maxPoles} y aplica el cambio.`);
      } else if (Number(polesInput.value) !== Number(diagnostic.poles)) {
        push('poles', 'Número de polos', 'Pulsa “Aplicar polos” para confirmar el cambio antes de finalizar.');
      }
    } else if (!validPoles(diagnostic.poles)) {
      push('poles', 'Número de polos', `Captura un entero positivo entre 1 y ${CONFIG.maxPoles} y aplica el cambio.`);
    }
    if (!validSyncStored(diagnostic.syncStored)) {
      push('syncStored', 'Sincronía almacenada', 'Indica si la sincronía quedó almacenada en el drive.');
    }
    if (validPoles(diagnostic.poles)) {
      const invalidCells = [];
      const poles = Number(diagnostic.poles);
      SYNC_ROWS.forEach((row) => {
        const values = Array.isArray(diagnostic.syncValues?.[row]) ? diagnostic.syncValues[row] : [];
        for (let index = 0; index < poles; index += 1) {
          if (!(parseDecimal(values[index]) > 0)) invalidCells.push({ row, col: index });
        }
      });
      if (invalidCells.length) {
        push('sync', 'Tabla de sincronía', `Completa con valores positivos las ${invalidCells.length} celdas pendientes de la tabla de sincronía.`, invalidCells);
      }
    }
    if (!hasText(conclusion.rootCause)) {
      push('conclusion.rootCause', 'Causa raíz identificada', 'Captura la causa raíz identificada.');
    }
    if (!hasText(conclusion.actionsPerformed)) {
      push('conclusion.actionsPerformed', 'Acciones realizadas', 'Captura las acciones realizadas.');
    }
    if (!FINAL_RESULT_OPTIONS.some((option) => option.value === conclusion.finalResult)) {
      push('conclusion.finalResult', 'Resultado del diagnóstico', 'Selecciona el resultado del diagnóstico.');
    }
    if (!hasText(conclusion.notes)) {
      push('conclusion.notes', 'Notas y recomendaciones', 'Captura las notas o recomendaciones.');
    }
    return errors;
  }

  /* Pinta los errores en los controles y en el resumen, marca aria-invalid y enfoca el primer
     campo inválido.
     */
  function markDiagnosticErrors(errors) {
    const form = document.getElementById('diagnostic-form');
    const summary = document.getElementById('diag-errors');
    if (!form) return;
    $$('.field-error', form).forEach((element) => { element.textContent = ''; });
    $$('.is-invalid', form).forEach((element) => {
      element.classList.remove('is-invalid');
      element.removeAttribute('aria-invalid');
    });

    errors.forEach((error) => {
      const control = form.querySelector(`[data-field="${error.path}"]`);
      if (control) {
        control.classList.add('is-invalid');
        control.setAttribute('aria-invalid', 'true');
      }
      const message = form.querySelector(`[data-error-for="${error.path}"]`);
      if (message) message.textContent = error.message;
      if (Array.isArray(error.cells)) {
        error.cells.forEach((cell) => {
          const input = form.querySelector(`[data-sync="${cell.row}"][data-col="${cell.col}"]`);
          if (input) {
            input.classList.add('is-invalid');
            input.setAttribute('aria-invalid', 'true');
          }
        });
      }
    });

    if (summary) {
      summary.innerHTML = errors.length
        ? `<div class="error-summary" role="alert">
            <h2>Revisa la captura del diagnóstico</h2>
            <p style="margin-bottom:7px">Faltan ${errors.length} campo${errors.length === 1 ? '' : 's'} obligatorio${errors.length === 1 ? '' : 's'} o hay valores inválidos.</p>
            <ul>${errors.map((error) => `<li><strong>${escapeHtml(error.label)}:</strong> ${escapeHtml(error.message)}</li>`).join('')}</ul>
          </div>`
        : '';
    }
    if (errors.length) {
      activateDiagnosticTab(diagnosticSectionForPath(errors[0].path));
      const firstInvalid = form.querySelector('.is-invalid');
      setTimeout(() => {
        firstInvalid?.focus();
        firstInvalid?.scrollIntoView({ behavior: state.preferences.reducedMotion ? 'auto' : 'smooth', block: 'center' });
      }, 40);
    }
  }

  /* Devuelve el diagnóstico actualmente abierto si sigue en estado borrador. */
  function currentDraft() {
    return activeDraftId ? getDiagnostic(activeDraftId) : null;
  }

  /* Actualiza el indicador visual de autoguardado (guardado, pendiente, guardando o error). */
  function setAutosaveState(stateKey, label) {
    const element = document.getElementById('autosave-state');
    if (element) {
      element.dataset.state = stateKey;
      const labelElement = element.querySelector('[data-autosave-label]');
      if (labelElement) labelElement.textContent = label;
    }
  }

  /* Recalcula y actualiza en vivo la barra, el porcentaje y los chips de avance. */
  function updateDiagnosticProgressUI() {
    const diagnostic = currentDraft();
    if (!diagnostic) return;
    const progress = diagnosticProgress(diagnostic);
    const percent = document.getElementById('diag-progress-percent');
    const fill = document.getElementById('diag-progress-fill');
    const copy = document.getElementById('diag-progress-copy');
    const chips = document.getElementById('diag-progress-chips');
    if (percent) percent.textContent = `${progress.percent}%`;
    if (fill) fill.style.width = `${progress.percent}%`;
    if (copy) copy.textContent = `${progress.completed} de ${progress.total} campos obligatorios completos`;
    if (chips) chips.innerHTML = progressChipsHtml(progress);
    progress.sections.forEach((section) => {
      $$(`[data-section-state="${section.key}"]`).forEach((element) => {
        element.className = `section-state ${section.complete ? 'complete' : ''}`;
        element.innerHTML = section.complete ? `${icon('check-circle')}Completa` : `${icon('clock')}Pendiente`;
      });
      const tab = document.querySelector(`.diag-tab[data-tab="${section.key}"]`);
      if (!tab) return;
      tab.classList.toggle('complete', section.complete);
      const meta = tab.querySelector('[data-tab-meta]');
      if (meta) meta.textContent = `${section.completed} de ${section.total}`;
      const tabState = tab.querySelector('[data-tab-state]');
      if (tabState) tabState.innerHTML = section.complete ? icon('check') : '';
    });
  }

  /* Limpia el mensaje y el estado de error de un campo concreto. */
  function clearDiagnosticFieldError(path) {
    const form = document.getElementById('diagnostic-form');
    if (!form) return;
    const message = form.querySelector(`[data-error-for="${path}"]`);
    if (message) message.textContent = '';
    const control = form.querySelector(`[data-field="${path}"]`);
    if (control) {
      control.classList.remove('is-invalid');
      control.removeAttribute('aria-invalid');
    }
    const summary = document.getElementById('diag-errors');
    if (summary) summary.innerHTML = '';
  }

  /* Limpia el estado de error de una celda de sincronía y del resumen. */
  function clearSyncCellError(input) {
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
    const message = document.querySelector('[data-error-for="sync"]');
    if (message) message.textContent = '';
    const summary = document.getElementById('diag-errors');
    if (summary) summary.innerHTML = '';
  }

  /* Programa un autoguardado con debounce de 750 ms y muestra el estado pendiente. */
  function scheduleDiagnosticAutosave() {
    if (!currentDraft()) return;
    setAutosaveState('pending', 'Cambios sin guardar');
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      saveDiagnosticDraft(true);
    }, CONFIG.autosaveMs);
  }

  /* Persiste el borrador actual y muestra feedback visual o un toast, según el modo silencioso. */
  function saveDiagnosticDraft(silent = false) {
    const diagnostic = currentDraft();
    if (!diagnostic) return false;
    setAutosaveState('saving', 'Guardando…');
    diagnostic.updatedAt = nowIso();
    const saved = persist();
    if (saved) {
      setAutosaveState('saved', `Guardado a las ${formatTime(diagnostic.updatedAt)}`);
      if (!silent) toast('Borrador guardado', 'El diagnóstico se guardó en este navegador.', 'success');
    } else {
      setAutosaveState('error', 'No se pudo guardar');
      if (!silent) toast('No se pudo guardar', 'Revisa el aviso de almacenamiento del navegador.', 'error');
    }
    return saved;
  }

  /* Vuelve a pintar la vista previa del pinout dentro del formulario. */
  function updatePinoutPreview() {
    const diagnostic = currentDraft();
    const container = document.getElementById('pinout-preview');
    if (diagnostic && container) container.innerHTML = pinoutPreviewHtml(diagnostic);
  }

  /* Comprime la imagen de pinout, la guarda en el borrador, actualiza el progreso y programa el
     autoguardado.
     */
  async function handlePinoutFile(file) {
    if (!file) return;
    const diagnostic = currentDraft();
    if (!diagnostic) return;
    const preview = document.getElementById('pinout-preview');
    if (preview) preview.innerHTML = `<div class="sync-empty"><span class="spinner"></span> Procesando imagen…</div>`;
    try {
      const processed = await compressImage(file);
      diagnostic.pinout.image = processed.dataUrl;
      diagnostic.pinout.fileName = processed.fileName;
      updatePinoutPreview();
      clearDiagnosticFieldError('pinout.image');
      updateDiagnosticProgressUI();
      scheduleDiagnosticAutosave();
      toast('Pinout cargado', 'La imagen se agregó al borrador del diagnóstico.', 'success');
    } catch (error) {
      updatePinoutPreview();
      const message = document.querySelector('[data-error-for="pinout.image"]');
      if (message) message.textContent = error.message;
      toast('No se pudo cargar la imagen', error.message, 'error');
    } finally {
      const input = document.getElementById('pinout-file');
      if (input) input.value = '';
    }
  }

  /* Quita la imagen de pinout del borrador y actualiza la interfaz. */
  function removePinout() {
    const diagnostic = currentDraft();
    if (!diagnostic) return;
    diagnostic.pinout.image = '';
    diagnostic.pinout.fileName = '';
    updatePinoutPreview();
    clearDiagnosticFieldError('pinout.image');
    updateDiagnosticProgressUI();
    scheduleDiagnosticAutosave();
    toast('Pinout quitado', 'Puedes subir otra imagen o usar el pinout de ejemplo.', 'info');
  }

  /* Carga el pinout SVG de ejemplo en el borrador actual. */
  function useDemoPinout() {
    const diagnostic = currentDraft();
    if (!diagnostic) return;
    diagnostic.pinout.image = pinoutDemoImage();
    diagnostic.pinout.fileName = 'pinout-demo.svg';
    updatePinoutPreview();
    clearDiagnosticFieldError('pinout.image');
    updateDiagnosticProgressUI();
    scheduleDiagnosticAutosave();
    toast('Pinout de ejemplo cargado', 'Completa los metadatos del pinout para el registro.', 'success');
  }

  /* Valida el número de polos, pide confirmación si ya hay datos y reconstruye la tabla
     conservando los valores ocultos.
     */
  function applyPolesChange() {
    const diagnostic = currentDraft();
    const input = document.getElementById(diagControlId('poles'));
    if (!diagnostic || !input) return;
    const nextPoles = Number(input.value);
    if (!Number.isInteger(nextPoles) || nextPoles < 1 || nextPoles > CONFIG.maxPoles) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      const error = document.querySelector('[data-error-for="poles"]');
      if (error) error.textContent = `Captura un entero positivo entre 1 y ${CONFIG.maxPoles}.`;
      toast('Número de polos inválido', `Debe ser un entero positivo entre 1 y ${CONFIG.maxPoles}.`, 'warning');
      input.focus();
      return;
    }
    if (Number(diagnostic.poles) === nextPoles) {
      clearDiagnosticFieldError('poles');
      return;
    }
    const commit = () => {
      diagnostic.poles = nextPoles;
      ensureSyncArrays(diagnostic, nextPoles);
      const container = document.getElementById('sync-table-container');
      if (container) container.innerHTML = syncTableHtml(diagnostic);
      clearDiagnosticFieldError('poles');
      updateDiagnosticProgressUI();
      scheduleDiagnosticAutosave();
      toast('Tabla de sincronía actualizada', `Se muestran ${nextPoles} polos. Los valores ocultos se conservan.`, 'success');
    };
    if (hasAnySyncData(diagnostic)) {
      openModal({
        title: 'Cambiar número de polos',
        subtitle: 'Tabla de sincronía',
        content: `<div class="confirm-copy">
          <p>La tabla tiene datos capturados. Vas a cambiar de <strong>${escapeHtml(diagnostic.poles ?? '—')}</strong> a <strong>${nextPoles}</strong> polos.</p>
          <ul>
            <li>Las columnas que queden fuera de la vista se ocultan, pero <strong>sus valores se conservan</strong> internamente.</li>
            <li>Si vuelves a aumentar los polos, los valores ocultos se recuperan.</li>
            <li>Los valores de los nuevos polos, si los hay, se solicitan como campos obligatorios.</li>
          </ul>
        </div>`,
        actions: [
          { label: 'Cancelar', variant: 'btn-secondary' },
          { label: 'Aplicar cambio', variant: 'btn-primary', icon: 'check', onClick: commit }
        ],
        onClose: () => {
          const updated = currentDraft();
          if (input && updated) input.value = updated.poles ?? '';
        },
        initialFocus: '[data-modal-action="1"]'
      });
    } else {
      commit();
    }
  }

  /* Sincroniza los cambios de campos y celdas con el borrador, limpia errores y programa el
     autoguardado.
     */
  function handleDiagnosticFormEvent(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const diagnostic = currentDraft();
    if (!diagnostic) return;

    const syncInput = target.closest('[data-sync]');
    if (syncInput) {
      const row = syncInput.dataset.sync;
      const column = Number(syncInput.dataset.col);
      if (!diagnostic.syncValues[row]) diagnostic.syncValues[row] = [];
      diagnostic.syncValues[row][column] = syncInput.value;
      clearSyncCellError(syncInput);
      updateDiagnosticProgressUI();
      scheduleDiagnosticAutosave();
      return;
    }

    const control = target.closest('[data-field]');
    if (!control) return;
    const path = control.dataset.field;
    if (path === 'poles') {
      clearDiagnosticFieldError('poles');
      return;
    }
    setByPath(diagnostic, path, control.value);
    clearDiagnosticFieldError(path);
    updateDiagnosticProgressUI();
    scheduleDiagnosticAutosave();
  }

  /* Conecta los eventos input, change, submit y carga de archivo del formulario de diagnóstico. */
  function bindDiagnosticForm() {
    const form = document.getElementById('diagnostic-form');
    if (!form) return;
    form.addEventListener('input', handleDiagnosticFormEvent);
    form.addEventListener('change', handleDiagnosticFormEvent);
    form.addEventListener('keydown', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const tab = target.closest('.diag-tab');
      if (!tab) return;
      const index = DIAG_BLOCKS.findIndex((block) => block.key === tab.dataset.tab);
      if (index < 0) return;
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % DIAG_BLOCKS.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + DIAG_BLOCKS.length) % DIAG_BLOCKS.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = DIAG_BLOCKS.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      activateDiagnosticTab(DIAG_BLOCKS[nextIndex].key, { focusTab: true });
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      saveDiagnosticDraft(false);
    });
    const fileInput = document.getElementById('pinout-file');
    fileInput?.addEventListener('change', (event) => {
      const [file] = Array.from(event.target.files || []);
      handlePinoutFile(file);
    });
    setAutosaveState('saved', 'Guardado automático');
  }

  /* Valida el diagnóstico y, si no hay errores, abre el modal de confirmación de finalización. */
  function tryFinalizeDiagnostic() {
    const diagnostic = currentDraft();
    if (!diagnostic) return;
    const errors = validateDiagnostic(diagnostic);
    markDiagnosticErrors(errors);
    if (errors.length) {
      toast('Faltan campos obligatorios', `Revisa ${errors.length} campo${errors.length === 1 ? '' : 's'} antes de finalizar.`, 'warning');
      return;
    }
    const equipment = getEquipment(diagnostic.equipmentId);
    openModal({
      title: 'Finalizar diagnóstico',
      subtitle: 'Esta acción bloquea el registro',
      content: `<div class="confirm-copy">
        <p>El diagnóstico <strong>${escapeHtml(diagnostic.id)}</strong> de la orden <strong>${escapeHtml(diagnostic.order)}</strong> quedará finalizado y <strong>de solo lectura</strong>.</p>
        <ul>
          <li>El equipo pasará de <strong>En diagnóstico</strong> a <strong>Diagnosticado</strong>.</li>
          <li>Se agregará un evento al historial con fecha y técnico.</li>
          <li>No podrás editar el registro después de finalizarlo en este prototipo.</li>
        </ul>
      </div>`,
      actions: [
        { label: 'Revisar de nuevo', variant: 'btn-secondary' },
        { label: 'Finalizar diagnóstico', variant: 'btn-primary', icon: 'check-circle', onClick: finalizeDiagnostic }
      ],
      initialFocus: '[data-modal-action="1"]'
    });
  }

  /* Bloquea el diagnóstico, cambia el equipo a Diagnosticado, registra el evento y revierte si
     falla el guardado.
     */
  function finalizeDiagnostic() {
    const diagnostic = currentDraft();
    if (!diagnostic) return false;
    const equipment = getEquipment(diagnostic.equipmentId);
    if (!equipment) {
      toast('No se pudo finalizar', 'El equipo asociado no está disponible.', 'error');
      return false;
    }
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
    const snapshot = JSON.stringify(state);
    const previousStatusLabel = statusMeta(equipment.status).label;
    const finalizedAt = nowIso();
    diagnostic.status = 'finished';
    diagnostic.finalizedAt = finalizedAt;
    diagnostic.updatedAt = finalizedAt;
    equipment.status = 'diagnosed';
    state.history.push({
      id: nextSequentialId('HIS', state.history),
      equipmentId: equipment.id,
      order: equipment.order,
      type: 'diagnosis_finished',
      activity: 'Diagnóstico finalizado',
      executedBy: state.tech.name,
      registeredBy: state.tech.name,
      date: finalizedAt,
      previousStatus: previousStatusLabel,
      newStatus: 'Diagnosticado',
      observations: `Diagnóstico ${diagnostic.id} finalizado desde la interfaz del técnico. El equipo cambió a Diagnosticado.`
    });
    if (!persist()) {
      state = JSON.parse(snapshot);
      setAutosaveState('error', 'No se pudo guardar');
      toast('Finalización bloqueada', 'No fue posible guardar el registro finalizado. El borrador se mantiene editable.', 'error');
      return false;
    }
    renderNotifications();
    toast('Diagnóstico finalizado', 'El equipo pasó a Diagnosticado. El registro ahora es de solo lectura.', 'success');
    navigateTo(`#/diagnosticos/${diagnostic.id}`);
    return true;
  }

  /* Abre la vista previa de solo lectura del borrador actual en un modal. */
  function previewCurrentDiagnostic() {
    const diagnostic = currentDraft();
    if (!diagnostic) return;
    const equipment = getEquipment(diagnostic.equipmentId);
    openModal({
      title: 'Vista previa del diagnóstico',
      subtitle: `${diagnostic.order} · ${equipmentName(equipment)}`,
      size: 'modal-xl',
      content: `<div class="stack gap-16">
        <div class="warn-box">${icon('eye')}<div>Esta es una vista previa del borrador. Los campos pendientes se muestran como <strong>Pendiente</strong> y todavía no forman parte de un registro finalizado.</div></div>
        ${renderReadonlySections(diagnostic, { interactive: false, preview: true })}
      </div>`,
      actions: [
        { label: 'Cerrar', variant: 'btn-secondary' },
        { label: 'Finalizar diagnóstico', variant: 'btn-primary', icon: 'check-circle', onClick: () => {
          setTimeout(tryFinalizeDiagnostic, 80);
          return true;
        } }
      ]
    });
  }

  /* ------------------------------------------------------------
     17. Vista de solo lectura del diagnóstico
     Reconstruye un diagnóstico finalizado sin controles editables, incluyendo la tabla de sincronía y los valores conservados fuera de la vista.
     ------------------------------------------------------------ */
  /* Genera un par etiqueta/valor para las vistas de solo lectura. */
  function readonlyItem(label, value, wide = false) {
    return `<div class="readonly-item" ${wide ? 'style="grid-column:1/-1"' : ''}><span>${escapeHtml(label)}</span><p class="readonly-value">${htmlValue(value)}</p></div>`;
  }

  /* Reconstruye la tabla de sincronía finalizada y, si existen, muestra los valores conservados en
     columnas ocultas.
     */
  function readonlySyncTableHtml(diagnostic) {
    if (!validPoles(diagnostic.poles)) {
      return `<div class="doc-preview-empty">No hay número de polos registrado para reconstruir la tabla.</div>`;
    }
    const poles = Number(diagnostic.poles);
    const visibleTable = `<div class="sync-table-wrap"><table class="sync-table readonly-table">
      <caption class="sr-only">Tabla de sincronía registrada</caption>
      <thead><tr><th class="sticky-col" scope="col">Conexión</th>${Array.from({ length: poles }, (_, index) => `<th scope="col">Polo ${index + 1}</th>`).join('')}</tr></thead>
      <tbody>${SYNC_ROWS.map((row) => `<tr>
        <th class="sticky-col" scope="row">${escapeHtml(row)}</th>
        ${Array.from({ length: poles }, (_, index) => {
          const value = Array.isArray(diagnostic.syncValues?.[row]) ? diagnostic.syncValues[row][index] : '';
          return `<td>${parseDecimal(value) > 0 ? escapeHtml(String(value)) : '<span class="missing">—</span>'}</td>`;
        }).join('')}
      </tr>`).join('')}</tbody>
    </table></div>`;

    const hiddenColumns = [];
    for (let column = poles; column < CONFIG.maxPoles; column += 1) {
      const hasValue = SYNC_ROWS.some((row) => hasText(diagnostic.syncValues?.[row]?.[column]));
      if (hasValue) hiddenColumns.push(column);
    }
    const hiddenTable = hiddenColumns.length ? `<details class="sync-hidden-values">
      <summary>Valores conservados fuera de la tabla visible (${hiddenColumns.length} columna${hiddenColumns.length === 1 ? '' : 's'})</summary>
      <div class="sync-table-wrap" style="margin-top:8px"><table class="sync-table readonly-table">
        <thead><tr><th class="sticky-col" scope="col">Conexión</th>${hiddenColumns.map((column) => `<th scope="col">Polo ${column + 1} · oculto</th>`).join('')}</tr></thead>
        <tbody>${SYNC_ROWS.map((row) => `<tr><th class="sticky-col" scope="row">${escapeHtml(row)}</th>${hiddenColumns.map((column) => `<td>${hasText(diagnostic.syncValues?.[row]?.[column]) ? escapeHtml(String(diagnostic.syncValues[row][column])) : '<span class="missing">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <div class="sync-note" style="margin-top:8px">${icon('info')}<span>Estos valores se conservan internamente aunque no formen parte de la tabla visible del número de polos actual.</span></div>
    </details>` : '';

    return `${visibleTable}${hiddenTable}`;
  }

  /* Renderiza las secciones A-D en modo lectura o vista previa, sin controles editables. */
  function renderReadonlySections(diagnostic, options = {}) {
    const { interactive = true, preview = false } = options;
    const pinout = diagnostic.pinout || {};
    const stateMarkup = preview
      ? `<span class="section-state complete">${icon('eye')}Vista previa</span>`
      : `<span class="section-state complete">${icon('lock')}Finalizada</span>`;
    const pinoutImage = pinout.image
      ? `<div class="pinout-preview">
          <div class="pinout-preview-img"><img src="${escapeAttr(pinout.image)}" alt="Pinout del diagnóstico ${escapeAttr(diagnostic.id)}"></div>
          <div class="pinout-preview-meta"><span class="file-name">${icon('image')}<span>${escapeHtml(pinout.fileName || 'pinout')}</span></span>${interactive ? `<span class="spacer"></span><button class="btn btn-sm btn-secondary" type="button" data-action="zoom-pinout" data-id="${escapeAttr(diagnostic.id)}">${icon('zoom-in')}Ampliar</button>` : ''}</div>
        </div>`
      : `<div class="doc-preview-empty">Sin imagen de pinout registrada.</div>`;

    return `<div class="stack gap-20">
      <section class="card diag-section readonly-section">
        <div class="diag-section-head"><span class="section-index">A</span><div><h2>Evaluación inicial</h2><p>Condición del equipo y seguridad</p></div>${stateMarkup}</div>
        <div class="diag-section-body"><div class="readonly-grid">
          ${readonlyItem('Condición visual', diagnostic.assessment?.visualCondition)}
          ${readonlyItem('Verificación de seguridad', diagnostic.assessment?.safetyCheck)}
          ${readonlyItem('Observaciones iniciales', diagnostic.assessment?.initialObservations, true)}
        </div></div>
      </section>
      <section class="card diag-section readonly-section">
        <div class="diag-section-head"><span class="section-index">B</span><div><h2>Retroalimentación</h2><p>Tipo de encoder e impedancias</p></div>${stateMarkup}</div>
        <div class="diag-section-body"><div class="readonly-grid">
          ${readonlyItem('Tipo de encoder', encoderLabel(diagnostic.encoder?.type))}
          ${readonlyItem('Impedancia seno', diagnostic.encoder?.impedanceSine ? `${diagnostic.encoder.impedanceSine} Ω` : '')}
          ${readonlyItem('Impedancia coseno', diagnostic.encoder?.impedanceCosine ? `${diagnostic.encoder.impedanceCosine} Ω` : '')}
          ${readonlyItem('Impedancia referencia', diagnostic.encoder?.impedanceReference ? `${diagnostic.encoder.impedanceReference} Ω` : '')}
        </div></div>
      </section>
      <section class="card diag-section readonly-section">
        <div class="diag-section-head"><span class="section-index">C</span><div><h2>Pinout y sincronía</h2><p>Referencia del conector y valores por par de fases</p></div>${stateMarkup}</div>
        <div class="diag-section-body">
          ${pinoutImage}
          <div class="readonly-grid">
            ${readonlyItem('Fabricante del pinout', pinout.manufacturer)}
            ${readonlyItem('Manual de referencia', pinout.manual)}
            ${readonlyItem('Página del manual', pinout.page)}
            ${readonlyItem('Referencia del conector', pinout.connectorRef)}
            ${readonlyItem('Número de polos', diagnostic.poles)}
            ${readonlyItem('Sincronía almacenada', validSyncStored(diagnostic.syncStored) ? (diagnostic.syncStored === 'yes' ? 'Sí' : 'No') : '')}
          </div>
          <div>
            <div class="sync-meta"><strong>Tabla de sincronía</strong><span>Filas fijas · columnas visibles según los polos registrados</span></div>
            ${readonlySyncTableHtml(diagnostic)}
          </div>
        </div>
      </section>
      <section class="card diag-section readonly-section">
        <div class="diag-section-head"><span class="section-index">D</span><div><h2>Conclusiones</h2><p>Cierre técnico del diagnóstico</p></div>${stateMarkup}</div>
        <div class="diag-section-body"><div class="readonly-grid">
          ${readonlyItem('Causa raíz identificada', diagnostic.conclusion?.rootCause, true)}
          ${readonlyItem('Acciones realizadas', diagnostic.conclusion?.actionsPerformed, true)}
          ${readonlyItem('Resultado del diagnóstico', diagnostic.conclusion?.finalResult)}
          ${readonlyItem('Notas y recomendaciones', diagnostic.conclusion?.notes, true)}
        </div></div>
      </section>
    </div>`;
  }

  /* Renderiza la vista protegida de un diagnóstico finalizado con su resumen y secciones de solo
     lectura.
     */
  function renderFinishedDiagnostic(diagnostic) {
    const equipment = getEquipment(diagnostic.equipmentId);
    const client = equipmentClient(equipment);
    const progress = diagnosticProgress(diagnostic);
    return `<div class="view">
      <div class="record-head">
        <div class="page-head-copy">
          <a class="back-link" href="#/diagnosticos">${icon('arrow-left')}Diagnósticos</a>
          <span class="kicker">Registro técnico finalizado</span>
          <div class="record-title">
            <h1>Diagnóstico ${escapeHtml(diagnostic.order)}</h1>
            <p class="lead">${escapeHtml(equipmentName(equipment))} · ${escapeHtml(client?.company || 'Cliente')}</p>
            <div class="record-meta">${diagnosticBadge(diagnostic.status)}<span class="readonly-pill">${icon('lock')}Solo lectura</span>${statusBadge(equipment.status)}<span class="chip mono">${escapeHtml(diagnostic.id)}</span></div>
          </div>
        </div>
        <div class="record-quick-actions">
          <a class="btn btn-secondary" href="#/expediente/${equipment.id}/diagnostico">${icon('file-text')}Expediente</a>
          <a class="btn btn-ghost" href="#/diagnosticos">${icon('clipboard')}Todos los diagnósticos</a>
        </div>
      </div>

      <div class="success-box">${icon('shield')}<div><strong>Diagnóstico finalizado el ${escapeHtml(formatDateTime(diagnostic.finalizedAt))}.</strong><br>Este registro está protegido y solo puede consultarse. No se puede editar ni volver a finalizar.</div></div>

      <div class="diag-summary-grid">
        <div class="diag-summary"><span>Resultado</span><strong>${htmlValue(diagnostic.conclusion?.finalResult)}</strong></div>
        <div class="diag-summary"><span>Polos registrados</span><strong>${escapeHtml(diagnostic.poles ?? '—')}</strong></div>
        <div class="diag-summary"><span>Sincronía almacenada</span><strong>${diagnostic.syncStored === 'yes' ? 'Sí' : diagnostic.syncStored === 'no' ? 'No' : '—'}</strong></div>
        <div class="diag-summary"><span>Avance del registro</span><strong>${progress.percent}%</strong></div>
      </div>

      ${renderReadonlySections(diagnostic, { interactive: true })}

      <div class="info-box">${icon('info')}<div>Registro finalizado por <strong>${escapeHtml(state.tech.name)}</strong> el ${escapeHtml(formatDateTime(diagnostic.finalizedAt))}. El historial del equipo conserva los eventos asociados.</div></div>
    </div>`;
  }

  /* Renderiza la vista de reparación con el diagnóstico de referencia bloqueado. Reutiliza las
     secciones de solo lectura para que el técnico no pueda modificar el registro.
     */
  function renderReparacion(equipmentId) {
    const equipment = getEquipment(equipmentId);
    if (!equipment) return renderNotFound('Reparación no encontrada');
    const client = equipmentClient(equipment);
    const diagnostic = latestFinalizedDiagnostic(equipment.id);
    if (!diagnostic) {
      return `<div class="view">
        ${pageHeader({
          back: { href: '#/equipos', label: 'Equipos' },
          kicker: 'Reparación',
          title: `Reparación · ${equipment.order}`,
          lead: 'Consulta el diagnóstico de referencia antes de intervenir el equipo.',
          actions: `<a class="btn btn-secondary" href="#/expediente/${equipment.id}">${icon('file-text')}Expediente</a>`
        })}
        <div class="card">${emptyState({
          icon: 'clipboard',
          title: 'Sin diagnóstico de referencia',
          text: 'Este equipo no tiene un diagnóstico finalizado que sirva como guía para la reparación.',
          action: '<a class="btn btn-primary" href="#/equipos">Volver a equipos</a>'
        })}</div>
      </div>`;
    }

    const progress = diagnosticProgress(diagnostic);
    return `<div class="view">
      <div class="record-head">
        <div class="page-head-copy">
          <a class="back-link" href="#/equipos">${icon('arrow-left')}Equipos</a>
          <span class="kicker">Reparación · Diagnóstico de referencia</span>
          <div class="record-title">
            <h1>Reparación ${escapeHtml(equipment.order)}</h1>
            <p class="lead">${escapeHtml(equipmentName(equipment))} · ${escapeHtml(client?.company || 'Cliente')}</p>
            <div class="record-meta">${statusBadge(equipment.status)}<span class="readonly-pill">${icon('lock')}Diagnóstico bloqueado</span><span class="chip mono">${escapeHtml(diagnostic.id)}</span></div>
          </div>
        </div>
        <div class="record-quick-actions">
          <a class="btn btn-secondary" href="#/expediente/${equipment.id}">${icon('file-text')}Expediente</a>
          <a class="btn btn-ghost" href="#/equipos">${icon('cpu')}Volver a equipos</a>
        </div>
      </div>

      <div class="success-box">${icon('lock')}<div><strong>Diagnóstico ficticio de solo lectura.</strong><br>Este registro guía la reparación y no puede editarse. El técnico solo puede consultar los valores capturados.</div></div>

      <div class="diag-summary-grid">
        <div class="diag-summary"><span>Resultado</span><strong>${htmlValue(diagnostic.conclusion?.finalResult)}</strong></div>
        <div class="diag-summary"><span>Polos registrados</span><strong>${escapeHtml(diagnostic.poles ?? '—')}</strong></div>
        <div class="diag-summary"><span>Sincronía almacenada</span><strong>${diagnostic.syncStored === 'yes' ? 'Sí' : diagnostic.syncStored === 'no' ? 'No' : '—'}</strong></div>
        <div class="diag-summary"><span>Avance del registro</span><strong>${progress.percent}%</strong></div>
      </div>

      ${renderReadonlySections(diagnostic, { interactive: true })}

      <div class="info-box">${icon('info')}<div>El equipo permanece en <strong>Por reparar</strong>. Esta demostración no incluye el registro de cierre de la reparación.</div></div>
    </div>`;
  }

  /* Decide si mostrar el formulario editable o la vista de solo lectura según el estado del
     diagnóstico.
     */
  function renderDiagnosticoDetail(diagnosticId) {
    const diagnostic = getDiagnostic(diagnosticId);
    if (!diagnostic) return renderNotFound('Diagnóstico no encontrado');
    if (diagnostic.status === 'draft') return renderDiagnosticForm(diagnostic);
    return renderFinishedDiagnostic(diagnostic);
  }

  /* ------------------------------------------------------------
     18. Historial
     Timeline de eventos de los equipos del técnico con búsqueda y filtro por tipo de evento.
     ------------------------------------------------------------ */
  /* Tipos de evento disponibles en el filtro del historial. */
  const HISTORY_TYPES = [
    { value: 'assignment', label: 'Equipo asignado' },
    { value: 'diagnosis_started', label: 'Diagnóstico iniciado' },
    { value: 'diagnosis_finished', label: 'Diagnóstico finalizado' },
    { value: 'equipment_finished', label: 'Equipo finalizado' }
  ];

  /* Devuelve todo el historial de los equipos del técnico ordenado por fecha. */
  function ownHistoryEntries() {
    const ownIds = new Set(ownEquipment().map((equipment) => equipment.id));
    return sortByDateDesc(state.history.filter((entry) => ownIds.has(entry.equipmentId)), 'date');
  }

  /* Renderiza la vista de historial con buscador, filtro por tipo y timeline. */
  function renderHistorial() {
    const entries = ownHistoryEntries();
    return `<div class="view">
      ${pageHeader({
        kicker: 'Trazabilidad',
        title: 'Historial',
        lead: 'Eventos registrados para los equipos asignados. Cada cambio de estado conserva fecha, responsable y observaciones.',
        actions: `<a class="btn btn-secondary" href="#/equipos">${icon('cpu')}Equipos</a>`
      })}
      <section class="card">
        <div class="table-toolbar">
          <div class="search-field" data-search-field>
            ${icon('search')}
            <label class="sr-only" for="history-search">Buscar en el historial</label>
            <input id="history-search" type="search" placeholder="Buscar por orden, evento o responsable..." autocomplete="off">
            <button class="search-clear" type="button" data-action="clear-history-search" aria-label="Limpiar búsqueda">${icon('x')}</button>
          </div>
          <div class="select-field">
            <label for="history-type-filter">Tipo de evento</label>
            <select id="history-type-filter">
              <option value="all">Todos</option>
              ${HISTORY_TYPES.map((type) => `<option value="${type.value}">${escapeHtml(type.label)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="card-body">
          ${entries.length ? `<div class="history-timeline" id="history-timeline">${entries.map((entry) => historyEntryHtml(entry, true)).join('')}</div>` : ''}
          <div id="history-empty" ${entries.length ? 'hidden' : ''}>${emptyState({ icon: 'history', title: 'Sin historial', text: 'No hay eventos registrados para tus equipos todavía.' })}</div>
        </div>
        <div class="table-foot"><span class="table-count" id="history-count">Mostrando ${entries.length} de ${entries.length} eventos</span><span>Historial de solo consulta</span></div>
      </section>
      <div class="info-box">${icon('info')}<div>El historial se deriva de los eventos de la demostración y es de solo consulta. Su contenido no se puede modificar.</div></div>
    </div>`;
  }

  /* Filtra las entradas del historial por texto y tipo de evento. */
  function filterHistoryTimeline() {
    const timeline = document.getElementById('history-timeline');
    const empty = document.getElementById('history-empty');
    if (!timeline) return;
    const query = normalize(document.getElementById('history-search')?.value || '');
    const type = document.getElementById('history-type-filter')?.value || 'all';
    const rows = $$('[data-history-row]', timeline);
    let visible = 0;
    rows.forEach((row) => {
      const matchesQuery = !query || row.dataset.search.includes(query);
      const matchesType = type === 'all' || row.dataset.type === type;
      const show = matchesQuery && matchesType;
      row.hidden = !show;
      if (show) visible += 1;
    });
    if (empty) empty.hidden = visible !== 0;
    const count = document.getElementById('history-count');
    if (count) count.textContent = `Mostrando ${visible} de ${rows.length} eventos`;
    const searchField = document.querySelector('[data-search-field]');
    if (searchField) searchField.classList.toggle('has-value', Boolean(query));
  }

  /* ------------------------------------------------------------
     19. Documentos: tabla, vista previa y descarga con Blob
     Listado filtrable de documentos ficticios; la vista previa y la descarga se generan en el navegador a partir del texto guardado, sin servidor.
     ------------------------------------------------------------ */
  /* Construye el texto normalizado para buscar documentos. */
  function documentSearchText(document) {
    const equipment = getEquipment(document.equipmentId);
    return normalize([
      document.name, document.type, document.reference, document.order,
      document.version, equipment?.manufacturer, equipment?.model
    ].filter(Boolean).join(' '));
  }

  /* Genera una fila de la tabla de documentos. */
  function documentTableRow(document) {
    const equipment = getEquipment(document.equipmentId);
    return `<tr data-document-row data-search="${escapeAttr(documentSearchText(document))}" data-type="${escapeAttr(document.type)}">
      <td><div class="cell-main"><strong>${escapeHtml(document.name)}</strong><span>${escapeHtml(document.file?.name || 'Sin archivo de demostración')}</span></div></td>
      <td>${documentTypeBadge(document)}</td>
      <td><div class="cell-main"><strong>${escapeHtml(document.order)}</strong><span>${escapeHtml(equipmentName(equipment))}</span></div></td>
      <td class="nowrap">${escapeHtml(formatDate(document.date))}</td>
      <td><span class="chip mono">v${escapeHtml(document.version)}</span></td>
      <td>${documentActions(document, true)}</td>
    </tr>`;
  }

  /* Renderiza la vista de documentos con buscador, filtro por tipo y tabla. */
  function renderDocumentos() {
    const documents = sortByDateDesc(state.documents.filter((document) => {
      const equipment = getEquipment(document.equipmentId);
      return equipment && equipment.technicianId === state.tech.id;
    }), 'date');
    const types = Array.from(new Set(documents.map((document) => document.type))).sort();
    return `<div class="view">
      ${pageHeader({
        kicker: 'Archivo técnico',
        title: 'Documentos',
        lead: 'Metadatos de demostración con vista previa y descarga de archivos de texto generados en el navegador mediante Blob.',
        actions: `<a class="btn btn-secondary" href="#/equipos">${icon('cpu')}Equipos</a>`
      })}
      <section class="card table-card">
        <div class="table-toolbar">
          <div class="search-field" data-search-field>
            ${icon('search')}
            <label class="sr-only" for="doc-search">Buscar documentos</label>
            <input id="doc-search" type="search" placeholder="Buscar documento, referencia u orden..." autocomplete="off">
            <button class="search-clear" type="button" data-action="clear-doc-search" aria-label="Limpiar búsqueda">${icon('x')}</button>
          </div>
          <div class="select-field">
            <label for="doc-type-filter">Tipo</label>
            <select id="doc-type-filter"><option value="all">Todos</option>${types.map((type) => `<option value="${escapeAttr(type)}">${escapeHtml(type)}</option>`).join('')}</select>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <caption class="sr-only">Documentos de los equipos asignados</caption>
            <thead><tr><th scope="col">Documento</th><th scope="col">Tipo</th><th scope="col">Equipo / Orden</th><th scope="col">Fecha</th><th scope="col">Versión</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody id="doc-table-body">${documents.map(documentTableRow).join('')}</tbody>
          </table>
        </div>
        <div class="table-foot"><span class="table-count" id="doc-table-count">Mostrando ${documents.length} de ${documents.length} documentos</span><span>Archivos ficticios de demostración</span></div>
      </section>
      <div class="info-box">${icon('info')}<div>Los archivos no existen en un servidor: la vista previa y la descarga se generan localmente desde el texto de demostración usando <span class="mono">Blob</span>.</div></div>
    </div>`;
  }

  /* Filtra la tabla de documentos por texto y tipo. */
  function filterDocumentsTable() {
    const tbody = document.getElementById('doc-table-body');
    if (!tbody) return;
    const query = normalize(document.getElementById('doc-search')?.value || '');
    const type = document.getElementById('doc-type-filter')?.value || 'all';
    const documents = state.documents.filter((document) => {
      const equipment = getEquipment(document.equipmentId);
      return equipment && equipment.technicianId === state.tech.id;
    });
    const rows = documents.filter((document) => {
      const matchesQuery = !query || documentSearchText(document).includes(query);
      const matchesType = type === 'all' || document.type === type;
      return matchesQuery && matchesType;
    });
    tbody.innerHTML = rows.length
      ? sortByDateDesc(rows, 'date').map(documentTableRow).join('')
      : `<tr><td colspan="6"><div class="table-empty">${icon('search')}<p>No hay documentos que coincidan con el filtro.</p></div></td></tr>`;
    const count = document.getElementById('doc-table-count');
    if (count) count.textContent = `Mostrando ${rows.length} de ${documents.length} documentos`;
    const searchField = document.querySelector('[data-search-field]');
    if (searchField) searchField.classList.toggle('has-value', Boolean(query));
  }

  /* Genera un Blob local y lo lee como texto para la vista previa de documentos. */
  const blobToText = (content, mime = 'text/plain;charset=utf-8') => new Promise((resolve, reject) => {
    const blob = new Blob([String(content ?? '')], { type: mime });
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No fue posible generar la vista previa del archivo.'));
    reader.readAsText(blob);
  });

  /* Recupera un documento y verifica que pertenece a un equipo del técnico antes de permitir verlo
     o descargarlo.
     */
  function getOwnDocument(documentId) {
    const document = getDocument(documentId);
    if (!document) {
      toast('Documento no disponible', 'No se encontró el documento solicitado.', 'error');
      return null;
    }
    const equipment = getEquipment(document.equipmentId);
    if (!equipment || equipment.technicianId !== state.tech.id) {
      toast('Acceso no disponible', 'El documento no pertenece a los equipos asignados.', 'error');
      return null;
    }
    return document;
  }

  /* Genera y descarga el archivo de texto del documento mediante Blob. */
  function downloadDocument(documentId, notify = true) {
    const document = getOwnDocument(documentId);
    if (!document) return false;
    if (!document.file) {
      toast('Sin archivo', 'Este documento no tiene un archivo de demostración asociado.', 'warning');
      return false;
    }
    try {
      downloadTextFile(document.file.name, document.file.content, document.file.mime || 'text/plain;charset=utf-8');
      if (notify) toast('Descarga generada', `${document.file.name} se generó en el navegador.`, 'success');
      return true;
    } catch (error) {
      console.error(error);
      toast('No se pudo descargar', 'El navegador no permitió generar el archivo.', 'error');
      return false;
    }
  }

  /* Lee el contenido ficticio del documento y lo muestra en un modal con opción de descarga. */
  async function previewDocument(documentId) {
    const document = getOwnDocument(documentId);
    if (!document) return;
    if (!document.file) {
      toast('Sin archivo', 'Este documento no tiene contenido de demostración.', 'warning');
      return;
    }
    const equipment = getEquipment(document.equipmentId);
    let content = '';
    try {
      content = await blobToText(document.file.content, document.file.mime);
    } catch (error) {
      toast('No se pudo abrir', error.message, 'error');
      return;
    }
    openModal({
      title: document.name,
      subtitle: `${document.type} · ${document.order}`,
      size: 'modal-lg',
      content: `<div class="doc-preview">
        <div class="doc-preview-meta">
          <div class="readonly-item"><span>Equipo</span><strong>${escapeHtml(equipmentName(equipment))}</strong></div>
          <div class="readonly-item"><span>Referencia</span><strong class="mono">${escapeHtml(document.reference)}</strong></div>
          <div class="readonly-item"><span>Versión</span><strong>${escapeHtml(document.version)}</strong></div>
          <div class="readonly-item"><span>Fecha</span><strong>${escapeHtml(formatDate(document.date))}</strong></div>
        </div>
        <div class="info-box">${icon('file-text')}<div>Archivo de texto ficticio generado con <span class="mono">Blob</span> y leído localmente. No proviene de un servidor ni de un documento real.</div></div>
        <div class="doc-preview-file">${escapeHtml(content)}</div>
      </div>`,
      actions: [
        { label: 'Cerrar', variant: 'btn-secondary' },
        { label: 'Descargar archivo', variant: 'btn-primary', icon: 'download', onClick: () => { downloadDocument(document.id); } }
      ],
      initialFocus: '[data-modal-action="1"]'
    });
  }

  /* ------------------------------------------------------------
     20. Configuración del técnico
     Perfil, avatar y preferencias de visualización; valida el nombre, aplica los cambios a toda la interfaz y revierte si localStorage falla.
     ------------------------------------------------------------ */
  /* Renderiza el perfil del técnico, el avatar y las preferencias de visualización. */
  function renderConfiguracion() {
    const person = state.tech;
    const preferences = state.preferences;
    return `<div class="view">
      ${pageHeader({
        kicker: 'Perfil del técnico',
        title: 'Configuración',
        lead: 'Ajusta tu nombre, avatar y preferencias de visualización. Los cambios se guardan en el almacenamiento local de este navegador.'
      })}
      <form id="settings-form" class="settings-grid" novalidate>
        <div class="stack gap-20">
          <section class="card">
            <div class="card-head"><div><h2>Perfil</h2><p>Información visible en la interfaz del técnico</p></div><span class="badge badge-blue">${escapeHtml(person.id)}</span></div>
            <div class="card-body">
              <div class="profile-head">
                <div class="profile-avatar-wrap"><div id="settings-avatar">${avatarHtml(person, 'avatar-xl')}</div><span class="avatar-edit-badge">${icon('edit')}</span></div>
                <div class="profile-head-copy">
                  <strong>${escapeHtml(person.name)}</strong>
                  <span>${escapeHtml(person.role)} · Cuenta de demostración</span>
                  <div class="avatar-actions">
                    <label class="btn btn-sm btn-secondary" for="avatar-file">${icon('upload')}Cambiar avatar</label>
                    <button class="btn btn-sm btn-ghost" type="button" data-action="avatar-remove" ${person.avatar ? '' : 'disabled'}>${icon('trash')}Quitar avatar</button>
                    <input class="hidden" id="avatar-file" type="file" accept="image/jpeg,image/png,image/webp">
                  </div>
                  <span class="field-help">JPG, PNG o WebP · máximo 5 MB · se recorta a 256 px para el almacenamiento local.</span>
                </div>
              </div>
              <div class="form-grid">
                <div class="field">
                  <label for="profile-name">Nombre completo <span class="req" aria-hidden="true">*</span></label>
                  <input id="profile-name" name="profile-name" type="text" value="${escapeAttr(person.name)}" maxlength="80" autocomplete="name" aria-describedby="profile-name-error" required>
                  <p class="field-error" id="profile-name-error"></p>
                </div>
                <div class="field">
                  <label for="profile-email">Correo electrónico</label>
                  <input id="profile-email" type="email" value="${escapeAttr(person.email)}" readonly>
                  <span class="field-help">Dato ficticio de demostración. No se envía información.</span>
                </div>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-head"><div><h2>Preferencias de visualización</h2><p>Los ajustes se aplican a toda la interfaz</p></div></div>
            <div class="card-body">
              <div class="pref-list">
                <div class="pref-row">
                  <div class="pref-copy"><strong>Densidad</strong><span>Ajusta el espaciado de tablas, tarjetas y formularios.</span></div>
                  <div class="segmented" role="group" aria-label="Densidad de la interfaz">
                    <label><input type="radio" name="density" value="comfortable" ${preferences.density !== 'compact' ? 'checked' : ''}><span>Cómoda</span></label>
                    <label><input type="radio" name="density" value="compact" ${preferences.density === 'compact' ? 'checked' : ''}><span>Compacta</span></label>
                  </div>
                </div>
                <div class="pref-row">
                  <div class="pref-copy"><strong>Tamaño de texto</strong><span>Modifica el tamaño base de la interfaz.</span></div>
                  <div class="segmented" role="group" aria-label="Tamaño del texto">
                    <label><input type="radio" name="textsize" value="normal" ${preferences.textSize !== 'large' ? 'checked' : ''}><span>Normal</span></label>
                    <label><input type="radio" name="textsize" value="large" ${preferences.textSize === 'large' ? 'checked' : ''}><span>Grande</span></label>
                  </div>
                </div>
                <div class="pref-row">
                  <div class="pref-copy"><strong>Notificaciones</strong><span>Muestra avisos derivados de borradores y equipos asignados.</span></div>
                  <label class="switch"><span class="sr-only">Activar notificaciones</span><input id="pref-notifications" type="checkbox" ${preferences.notifications ? 'checked' : ''}><span class="switch-track" aria-hidden="true"></span></label>
                </div>
                <div class="pref-row">
                  <div class="pref-copy"><strong>Movimiento reducido</strong><span>Reduce animaciones y transiciones de la demostración.</span></div>
                  <label class="switch"><span class="sr-only">Activar movimiento reducido</span><input id="pref-motion" type="checkbox" ${preferences.reducedMotion ? 'checked' : ''}><span class="switch-track" aria-hidden="true"></span></label>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="stack gap-20">
          <section class="card">
            <div class="card-head"><div><h2>Resumen del perfil</h2><p>Datos de la sesión de demostración</p></div></div>
            <div class="card-body stack gap-16">
              <dl class="info-list">
                <div class="info-row"><dt>Nombre</dt><dd>${escapeHtml(person.name)}</dd></div>
                <div class="info-row"><dt>ID técnico</dt><dd class="mono">${escapeHtml(person.id)}</dd></div>
                <div class="info-row"><dt>Rol</dt><dd>${escapeHtml(person.role)}</dd></div>
                <div class="info-row"><dt>Equipos</dt><dd>${ownEquipment().length} asignados</dd></div>
                <div class="info-row"><dt>Almacenamiento</dt><dd>Local del navegador</dd></div>
              </dl>
              <div class="profile-card-note">${icon('shield')}<span>Este prototipo no tiene autenticación ni backend. El cierre de sesión es solo informativo.</span></div>
            </div>
          </section>

          <section class="card">
            <div class="card-head"><div><h2>Guardar cambios</h2><p>Se aplicarán en toda la interfaz</p></div></div>
            <div class="card-body stack gap-12">
              <button class="btn btn-primary btn-block" type="submit">${icon('save')}Guardar preferencias</button>
              <p class="setting-save-note">El nombre, avatar y preferencias se guardan con <span class="mono">localStorage</span>. Si el navegador bloquea el almacenamiento, la aplicación lo indicará y los cambios podrían permanecer solo en esta pestaña.</p>
            </div>
          </section>
        </div>
      </form>
    </div>`;
  }

  /* Actualiza únicamente el avatar mostrado en la vista de configuración. */
  function updateSettingsAvatar() {
    const wrapper = document.getElementById('settings-avatar');
    if (wrapper) wrapper.innerHTML = avatarHtml(state.tech, 'avatar-xl');
  }

  /* Muestra u oculta el error del nombre y ajusta aria-invalid. */
  function showSettingsNameError(message) {
    const input = document.getElementById('profile-name');
    const error = document.getElementById('profile-name-error');
    if (input) {
      input.classList.toggle('is-invalid', Boolean(message));
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      if (message) input.focus();
    }
    if (error) error.textContent = message || '';
  }

  /* Valida y aplica nombre, avatar y preferencias; si el guardado falla, restaura el estado
     anterior.
     */
  function saveSettingsForm(event) {
    event.preventDefault();
    const form = document.getElementById('settings-form');
    if (!form) return;
    const nameInput = document.getElementById('profile-name');
    const name = String(nameInput?.value || '').trim();
    if (!name) {
      showSettingsNameError('El nombre completo es obligatorio.');
      toast('Revisa el perfil', 'El nombre completo es obligatorio.', 'warning');
      return;
    }
    if (name.length > 80) {
      showSettingsNameError('El nombre no puede superar los 80 caracteres.');
      return;
    }
    showSettingsNameError('');
    const snapshot = JSON.stringify(state);
    const density = form.querySelector('input[name="density"]:checked')?.value === 'compact' ? 'compact' : 'comfortable';
    const textSize = form.querySelector('input[name="textsize"]:checked')?.value === 'large' ? 'large' : 'normal';
    state.tech.name = name;
    state.preferences.density = density;
    state.preferences.textSize = textSize;
    state.preferences.notifications = Boolean(document.getElementById('pref-notifications')?.checked);
    state.preferences.reducedMotion = Boolean(document.getElementById('pref-motion')?.checked);

    applyPreferences();
    renderUserChrome();
    if (!persist()) {
      state = JSON.parse(snapshot);
      applyPreferences();
      renderUserChrome();
      if (refs.app) refs.app.innerHTML = renderConfiguracion();
      toast('No se pudieron guardar las preferencias', 'Revisa el aviso de almacenamiento del navegador.', 'error');
      return;
    }
    if (refs.app) refs.app.innerHTML = renderConfiguracion();
    renderNotifications();
    toast('Preferencias guardadas', 'Los cambios se aplicaron a la interfaz.', 'success');
  }

  /* Comprime la imagen de avatar, la guarda y actualiza la interfaz, revirtiendo si falla
     localStorage.
     */
  async function handleAvatarFile(file) {
    if (!file) return;
    const previousAvatar = state.tech.avatar;
    try {
      const processed = await compressImage(file, CONFIG.avatarMaxDimension);
      state.tech.avatar = processed.dataUrl;
      if (!persist()) {
        state.tech.avatar = previousAvatar;
        updateSettingsAvatar();
        renderUserChrome();
        toast('No se pudo guardar el avatar', 'Revisa el aviso de almacenamiento del navegador.', 'error');
        return;
      }
      updateSettingsAvatar();
      renderUserChrome();
      const removeButton = document.querySelector('[data-action="avatar-remove"]');
      if (removeButton) removeButton.disabled = false;
      toast('Avatar actualizado', 'La nueva imagen se guardó en este navegador.', 'success');
    } catch (error) {
      toast('No se pudo cargar el avatar', error.message, 'error');
    } finally {
      const input = document.getElementById('avatar-file');
      if (input) input.value = '';
    }
  }

  /* Elimina el avatar del técnico y guarda el cambio con rollback ante error. */
  function removeAvatar() {
    if (!state.tech.avatar) return;
    const previous = state.tech.avatar;
    state.tech.avatar = null;
    if (!persist()) {
      state.tech.avatar = previous;
      toast('No se pudo quitar el avatar', 'Revisa el aviso de almacenamiento del navegador.', 'error');
      return;
    }
    updateSettingsAvatar();
    renderUserChrome();
    const removeButton = document.querySelector('[data-action="avatar-remove"]');
    if (removeButton) removeButton.disabled = true;
    toast('Avatar eliminado', 'Se usarán las iniciales del técnico.', 'info');
  }

  /* ------------------------------------------------------------
     21. Manejadores globales de la aplicación
     Delegación de eventos sobre #app para acciones data-action, búsquedas en vivo, filtros, cambio de avatar y envío del formulario de configuración.
     ------------------------------------------------------------ */
  /* Abre un selector de equipo pendiente o inicia directamente el diagnóstico si solo hay uno. */
  function openNewDiagnostic() {
    const pending = ownEquipment().filter((equipment) => equipment.status === 'assigned' && !draftForEquipment(equipment.id));
    if (!pending.length) {
      toast('Sin equipos pendientes', 'No hay equipos en estado Asignado listos para iniciar un diagnóstico.', 'info');
      return;
    }
    if (pending.length === 1) {
      startDiagnostic(pending[0].id);
      return;
    }
    openModal({
      title: 'Nuevo diagnóstico',
      subtitle: 'Selecciona el equipo a diagnosticar',
      content: `<div class="work-list">${pending.map((equipment) => `<div class="work-item">
        <span class="work-icon">${icon('cpu')}</span>
        <div class="work-main"><strong>${escapeHtml(equipment.order)} · ${escapeHtml(equipmentName(equipment))}</strong><span>${escapeHtml(equipmentClient(equipment)?.company || 'Cliente')}</span></div>
        <div class="work-side"><button class="btn btn-sm btn-primary" type="button" data-pick-equipment="${escapeAttr(equipment.id)}">${icon('play')}Seleccionar</button></div>
      </div>`).join('')}</div>`,
      actions: [{ label: 'Cancelar', variant: 'btn-secondary' }],
      initialFocus: '[data-pick-equipment]'
    });
    setTimeout(() => {
      $$('[data-pick-equipment]', refs.modalRoot).forEach((button) => {
        button.addEventListener('click', () => {
          const equipmentId = button.dataset.pickEquipment;
          closeModal(true);
          setTimeout(() => startDiagnostic(equipmentId), 60);
        });
      });
    }, 30);
  }

  /* Delegación de clics de #app: traduce cada data-action a la función correspondiente
     (diagnósticos, pinout, documentos, avatares y limpieza de búsquedas).
     */
  function handleAppClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'start-diagnostic') {
      event.preventDefault();
      startDiagnostic(button.dataset.id);
    } else if (action === 'new-diagnostic') {
      event.preventDefault();
      openNewDiagnostic();
    } else if (action === 'zoom-photo') {
      event.preventDefault();
      const equipment = getEquipment(button.dataset.id);
      const index = Number(button.dataset.index || 0);
      const photo = equipment?.photos?.[index];
      if (photo) openImageModal(photo, `Fotografía de ${equipmentName(equipment)}`, `Vista ${index + 1} · equipo ${equipment.order}`);
    } else if (action === 'zoom-pinout') {
      event.preventDefault();
      const diagnostic = getDiagnostic(button.dataset.id);
      if (diagnostic?.pinout?.image) {
        const equipment = getEquipment(diagnostic.equipmentId);
        openImageModal(diagnostic.pinout.image, 'Pinout del diagnóstico', `${diagnostic.order} · ${equipmentName(equipment)}`);
      }
    } else if (action === 'remove-pinout') {
      event.preventDefault();
      removePinout();
    } else if (action === 'demo-pinout') {
      event.preventDefault();
      useDemoPinout();
    } else if (action === 'apply-poles') {
      event.preventDefault();
      applyPolesChange();
    } else if (action === 'diag-tab') {
      event.preventDefault();
      activateDiagnosticTab(button.dataset.tab);
    } else if (action === 'diag-block-prev' || action === 'diag-block-next') {
      event.preventDefault();
      moveDiagnosticTab(action === 'diag-block-next' ? 1 : -1);
    } else if (action === 'diag-preview') {
      event.preventDefault();
      previewCurrentDiagnostic();
    } else if (action === 'diag-save') {
      event.preventDefault();
      saveDiagnosticDraft(false);
    } else if (action === 'diag-finalize') {
      event.preventDefault();
      tryFinalizeDiagnostic();
    } else if (action === 'preview-doc') {
      event.preventDefault();
      previewDocument(button.dataset.id);
    } else if (action === 'download-doc') {
      event.preventDefault();
      downloadDocument(button.dataset.id);
    } else if (action === 'avatar-remove') {
      event.preventDefault();
      removeAvatar();
    } else if (action === 'clear-equipment-search') {
      event.preventDefault();
      const input = document.getElementById('equipment-search');
      if (input) { input.value = ''; input.focus(); }
      filterEquipmentTable();
    } else if (action === 'clear-diag-search') {
      event.preventDefault();
      const input = document.getElementById('diag-search');
      if (input) { input.value = ''; input.focus(); }
      filterDiagnosticsTable();
    } else if (action === 'clear-history-search') {
      event.preventDefault();
      const input = document.getElementById('history-search');
      if (input) { input.value = ''; input.focus(); }
      filterHistoryTimeline();
    } else if (action === 'clear-doc-search') {
      event.preventDefault();
      const input = document.getElementById('doc-search');
      if (input) { input.value = ''; input.focus(); }
      filterDocumentsTable();
    }
  }

  /* Atiende la escritura en los buscadores de cada tabla y limpia el error de nombre en
     configuración.
     */
  function handleAppInput(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.id === 'equipment-search') filterEquipmentTable();
    else if (target.id === 'diag-search') filterDiagnosticsTable();
    else if (target.id === 'history-search') filterHistoryTimeline();
    else if (target.id === 'doc-search') filterDocumentsTable();
    else if (target.id === 'profile-name') showSettingsNameError('');
  }

  /* Atiende cambios de filtros y la selección del archivo de avatar. */
  function handleAppChange(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.id === 'equipment-status-filter') filterEquipmentTable();
    else if (target.id === 'diag-status-filter') filterDiagnosticsTable();
    else if (target.id === 'history-type-filter') filterHistoryTimeline();
    else if (target.id === 'doc-type-filter') filterDocumentsTable();
    else if (target.id === 'avatar-file') {
      const [file] = Array.from(target.files || []);
      handleAvatarFile(file);
    }
  }

  /* Intercepta el envío del formulario de configuración. */
  function handleAppSubmit(event) {
    if (event.target.id === 'settings-form') saveSettingsForm(event);
  }

  /* ------------------------------------------------------------
     22. Eventos del shell, buscador y arranque
     Conecta sidebar, popovers, atajo /, teclado, hashchange, resize y beforeunload; init() carga el estado, aplica preferencias, monta la ruta y muestra avisos de arranque.
     ------------------------------------------------------------ */
  /* Indica si el foco está en un campo editable para no interceptar el atajo de teclado /. */
  function isTypingTarget(target) {
    if (!(target instanceof Element)) return false;
    return target.matches('input, textarea, select, [contenteditable="true"]') || Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  /* Conecta los eventos del armazón: sidebar, popovers, buscador global, teclado, clic exterior,
     hashchange, resize y beforeunload.
     */
  function bindShellEvents() {
    refs.sidebarToggle?.addEventListener('click', toggleSidebar);
    refs.sidebarClose?.addEventListener('click', closeSidebar);
    refs.sidebarOverlay?.addEventListener('click', closeSidebar);
    refs.logoutBtn?.addEventListener('click', openLogoutModal);
    refs.notifBtn?.addEventListener('click', toggleNotifications);
    refs.userMenuBtn?.addEventListener('click', toggleUserMenu);

    refs.userDropdown?.addEventListener('click', (event) => {
      const logout = event.target.closest('[data-user-logout]');
      if (logout) {
        event.preventDefault();
        openLogoutModal();
      }
    });

    refs.globalSearchInput?.addEventListener('input', (event) => {
      renderGlobalSearch(event.target.value);
    });
    refs.globalSearchInput?.addEventListener('focus', () => {
      if (refs.globalSearchInput.value.trim()) renderGlobalSearch(refs.globalSearchInput.value);
    });
    refs.globalSearchInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeSearch();
        refs.globalSearchInput.blur();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'Enter') return;
      const firstResult = $('.search-item', refs.globalResults);
      if (!firstResult || refs.globalResults.hidden) return;
      event.preventDefault();
      if (event.key === 'Enter') firstResult.click();
      else firstResult.focus();
    });

    refs.globalResults?.addEventListener('click', (event) => {
      const item = event.target.closest('.search-item');
      if (item) activateSearchItem(item);
    });
    refs.globalResults?.addEventListener('keydown', (event) => {
      const items = $$('.search-item', refs.globalResults).filter((item) => !item.hidden);
      const currentIndex = items.indexOf(document.activeElement);
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
        refs.globalSearchInput?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        items[(currentIndex + 1 + items.length) % items.length]?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (!refs.globalSearch?.contains(event.target)) closeSearch();
      if (!refs.notifPanel?.contains(event.target) && !refs.notifBtn?.contains(event.target)) closeNotifications();
      if (!refs.userDropdown?.contains(event.target) && !refs.userMenuBtn?.contains(event.target)) closeUserMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAllPopovers();
        return;
      }
      if (event.key === '/' && !isTypingTarget(event.target) && !ui.modalOpen) {
        event.preventDefault();
        refs.globalSearchInput?.focus();
        refs.globalSearchInput?.select();
      }
    });

    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('beforeunload', flushPendingAutosave);
    window.addEventListener('resize', () => {
      if (!isMobileMenu() && document.body.classList.contains('sidebar-open')) {
        document.body.classList.remove('sidebar-open');
        if (refs.sidebarOverlay) refs.sidebarOverlay.hidden = true;
      }
    });
  }

  /* Conecta la delegación de eventos sobre el contenedor principal de vistas. */
  function bindAppEvents() {
    if (!refs.app) return;
    refs.app.addEventListener('click', handleAppClick);
    refs.app.addEventListener('input', handleAppInput);
    refs.app.addEventListener('change', handleAppChange);
    refs.app.addEventListener('submit', handleAppSubmit);
  }

  /* Punto de arranque: carga el estado, aplica preferencias, enlaza eventos, normaliza la ruta,
     renderiza y muestra avisos de almacenamiento.
     */
  function init() {
    state = loadState();
    document.body.classList.toggle('sidebar-collapsed', Boolean(state.ui.sidebarCollapsed));
    if (refs.sidebarToggle) {
      refs.sidebarToggle.setAttribute('aria-expanded', String(!state.ui.sidebarCollapsed));
      refs.sidebarToggle.setAttribute('aria-label', state.ui.sidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral');
    }
    renderUserChrome();
    applyPreferences();
    bindShellEvents();
    bindAppEvents();

    if (!storageReady) {
      showStorageBanner('El navegador no permite usar almacenamiento local. Los cambios permanecerán solo en esta pestaña y se perderán al recargar.');
    }
    if (!location.hash || location.hash === '#') {
      try { history.replaceState(null, '', '#/inicio'); } catch (error) { console.warn(error); }
    }
    handleRoute();
    bootNotices.forEach((notice, index) => {
      setTimeout(() => toast(notice.title, notice.message, notice.type || 'warning', 6500), 300 + index * 250);
    });
    bootNotices = [];
    if (!storageReady) {
      setTimeout(() => toast('Modo de memoria activo', 'Los cambios no se conservarán al recargar esta pestaña.', 'warning', 6500), 700);
    }
  }

  /* Arranque seguro: espera a DOMContentLoaded si el documento aún se está cargando; si no, inicia
     de inmediato.
     */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();





