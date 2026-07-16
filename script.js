/* ════════════════════════════════════════════
   SUPABASE CLIENT & STATE
════════════════════════════════════════════ */
const SUPABASE_URL = 'https://xwwgedbdfahxrtphuzdd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d2dlZGJkZmFoeHJ0cGh1emRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDA4NDMsImV4cCI6MjA5OTYxNjg0M30.FGxL1yOwH2e9x6ad5FNB3-nEsxAq6qyqZsjM5_1ue3I';

let supabaseClient;
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error("Supabase SDK no se cargó correctamente. Revisa tu conexión a internet o la importación en index.html.");
}

const TAG_CLASS = {
  'Favorita': 'tag tag-fav', 'Popular': 'tag tag-pop', 'Temporada': 'tag tag-tmp',
  'Nuevo': 'tag tag-new', 'Especial': 'tag tag-esp', 'Personalizado': 'tag tag-per'
};

let state = {
  user: null,
  isAdmin: false,
  selectedProduct: null,
  qty: 1,
  editingItemId: null,
  menuItems: [],
  content: {
    brandName: 'Oleya by M.J.',
    heroTitle: 'Sabor con', heroAccent: 'Pasión',
    heroDesc: 'En Oleya elaboramos galletas de mantequilla decoradas y personalizadas, galletas new york y pays artesanales con ingredientes naturales seleccionados. Cada bocado es una bomba de sabor.',
    menuTitle: 'El Menú', menuSub: 'Elaborados diariamente con recetas propias y los mejores ingredientes.',
    histTitle: 'De una pequeña cocina a tu corazón',
    histP1: 'En diciembre de 2022, Maria Jose Novelo Triay comenzó con algunos utensilios de cocina y el horno de su mamá. Los primeros pedidos llegaron de familiares y amigos.',
    histP2: 'Con esfuerzo logró su Kitchen Aid, perfeccionó su receta y construyó una marca con identidad propia — Oleya by M.J.',
    histYears: '4',
    bannerTitle: 'Pedidos especiales y personalizados',
    bannerSub: 'Bodas, quinceañeros, cumpleaños. Creamos el pastel de tus sueños con los sabores que más amas.',
    waNumber: '529999584400',
    address: 'Calle 21, Esquina. Col. México',
    hours: 'Lunes a sábado de 9:00 a 18:00 hrs.',
  }
};

/* ════════════════════════════════════════════
   SUPABASE DATA LOADERS
════════════════════════════════════════════ */

/**
 * Carga productos desde la tabla `productos` + `etiquetas` de Supabase
 */
async function loadProductsFromDB() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('productos')
      .select('*, etiquetas(nombre)')
      .eq('activo', true)
      .order('fecha_creacion', { ascending: true });

    if (error) {
      console.error('Error cargando productos:', error);
      return;
    }

    if (data && data.length > 0) {
      state.menuItems = data.map(p => ({
        id: p.id_producto,
        emoji: p.emoji || '🍰',
        name: p.nombre,
        desc: p.descripcion || '',
        price: `$${Number(p.precio).toFixed(0)}`,
        priceNum: Number(p.precio),
        tag: p.etiquetas?.nombre || 'Nuevo',
        photo: p.foto_url || null,
        id_etiqueta: p.id_etiqueta
      }));
    }
  } catch (err) {
    console.error('Error general cargando productos:', err);
  }
}

/**
 * Carga contenido del sitio desde la tabla `contenido_sitio` de Supabase
 */
async function loadSiteContentFromDB() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('contenido_sitio')
      .select('clave, valor');

    if (error) {
      console.error('Error cargando contenido:', error);
      return;
    }

    if (data && data.length > 0) {
      data.forEach(row => {
        if (row.clave && row.valor !== null && row.valor !== undefined) {
          state.content[row.clave] = row.valor;
        }
      });
    }
  } catch (err) {
    console.error('Error general cargando contenido:', err);
  }
}

/* ════════════════════════════════════════════
   VIEW NAVIGATION
════════════════════════════════════════════ */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    window.scrollTo(0, 0);
  }
  if (id === 'view-site') {
    applySiteContent();
    renderMenuGrid();
    renderProductList();
    syncUserUI();
  }
  if (id === 'view-admin') {
    populateAdminForms();
    renderAdminMenuItems();
  }
}

/* ════════════════════════════════════════════
   SMOOTH SCROLL (within site view)
   Renamed from scrollTo → scrollToSection to avoid
   overriding the native window.scrollTo method
════════════════════════════════════════════ */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
  closeMobileMenu();
}

/* ════════════════════════════════════════════
   NAV
════════════════════════════════════════════ */
function toggleMobileMenu() {
  const btn = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  btn.classList.toggle('open');
  menu.classList.toggle('open');
}
function closeMobileMenu() {
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('mobile-menu').classList.remove('open');
}
async function handleAccountNav() {
  closeMobileMenu();
  if (state.user) {
    // logout
    await supabaseClient.auth.signOut();
    state.user = null;
    state.isAdmin = false;
    syncUserUI();
  } else {
    showView('view-user-login');
  }
}
function syncUserUI() {
  const lbl = document.getElementById('nav-account-label');
  const mbl = document.getElementById('mobile-account-label');
  const loggedAs = document.getElementById('form-logged-as');
  const loggedName = document.getElementById('form-logged-name');
  const regHint = document.getElementById('form-hint-register');
  const addrInfo = document.getElementById('user-address-info');

  if (state.user) {
    const first = state.user.name.split(' ')[0];
    if (lbl) lbl.textContent = first;
    if (mbl) mbl.textContent = `Hola, ${first}`;
    if (loggedAs) loggedAs.style.display = 'flex';
    if (loggedName) loggedName.textContent = state.user.name;
    if (regHint) regHint.style.display = 'none';
    // pre-fill form
    const nombre = document.getElementById('order-nombre');
    const tel = document.getElementById('order-tel');
    if (nombre && !nombre.value) nombre.value = state.user.name;
    if (tel && !tel.value) tel.value = state.user.phone;
    if (addrInfo) {
      addrInfo.style.display = 'flex';
      document.getElementById('user-addr-text').textContent = `${state.user.address}, ${state.user.colonia} · ${state.user.phone}`;
    }
  } else {
    if (lbl) lbl.textContent = 'Mi cuenta';
    if (mbl) mbl.textContent = 'Mi cuenta';
    if (loggedAs) loggedAs.style.display = 'none';
    if (regHint) regHint.style.display = 'block';
    if (addrInfo) addrInfo.style.display = 'none';
  }
}

/* ════════════════════════════════════════════
   MENU GRID RENDER
════════════════════════════════════════════ */
function renderMenuGrid() {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;

  if (state.menuItems.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:2rem">Cargando menú...</p>';
    return;
  }

  grid.innerHTML = state.menuItems.map(item => `
    <div class="menu-card">
      ${item.photo ? `<div class="menu-card-img"><img src="${item.photo}" alt="${item.name}" loading="lazy"></div>` : ''}
      <div class="menu-card-body">
        <div class="menu-card-top">
          ${!item.photo ? `<div class="menu-card-emoji">${item.emoji}</div>` : ''}
          <span class="${TAG_CLASS[item.tag] || 'tag tag-new'}">${item.tag}</span>
        </div>
        <div>
          <h3>${item.name}</h3>
          <p>${item.desc}</p>
        </div>
        <div class="menu-card-footer">
          <span class="menu-price">${item.price}</span>
          <button class="btn-pedir" onclick="scrollToSection('contacto');selectProduct('${item.id}')">Pedir ✨</button>
        </div>
      </div>
    </div>
  `).join('');
}

/* ════════════════════════════════════════════
   ORDER FORM
════════════════════════════════════════════ */
function renderProductList() {
  const list = document.getElementById('product-list');
  if (!list) return;
  const opts = [...state.menuItems.map(i => i.name), 'Solicitud especial'];
  list.innerHTML = opts.map(opt => {
    const item = state.menuItems.find(i => i.name === opt);
    const isActive = state.selectedProduct === opt;
    return `
      <button class="product-btn ${isActive ? 'active' : ''}" onclick="selectProduct(null,'${opt.replace(/'/g,"\\'")}')" type="button">
        <span class="pname">${opt === 'Solicitud especial' ? '📝 Solicitud especial' : opt}</span>
        ${item ? `<span class="pprice">${item.price}</span>` : ''}
      </button>
    `;
  }).join('');
}

function selectProduct(id, name) {
  if (id) {
    const item = state.menuItems.find(i => i.id === id);
    if (item) state.selectedProduct = item.name;
  } else {
    state.selectedProduct = name;
  }
  state.qty = 1;
  document.getElementById('qty-value').textContent = '1';

  const isEspecial = state.selectedProduct === 'Solicitud especial';
  const qtySection = document.getElementById('qty-section');
  const notesSection = document.getElementById('notes-section');
  const notesLabel = document.getElementById('notes-label');
  const notesArea = document.getElementById('order-notes');

  qtySection.style.display = (state.selectedProduct && !isEspecial) ? 'flex' : 'none';
  notesSection.style.display = state.selectedProduct ? 'flex' : 'none';

  if (isEspecial) {
    notesLabel.textContent = '✏️ Describe tu solicitud';
    notesArea.placeholder = 'Cuéntanos con detalle qué necesitas, diseño, fecha, etc.';
  } else {
    notesLabel.textContent = '📝 Notas adicionales (opcional)';
    notesArea.placeholder = 'Alergias, diseño especial, fecha de entrega...';
  }
  renderProductList();
}

function changeQty(delta) {
  state.qty = Math.max(1, state.qty + delta);
  document.getElementById('qty-value').textContent = state.qty;
}

function sendWhatsApp() {
  const nombre = document.getElementById('order-nombre').value.trim();
  const tel = document.getElementById('order-tel').value.trim();
  const notes = document.getElementById('order-notes').value.trim();
  const errEl = document.getElementById('order-error');

  if (!nombre) { showError(errEl, 'Por favor escribe tu nombre.'); return; }
  if (!state.selectedProduct) { showError(errEl, 'Selecciona un producto o solicitud.'); return; }
  const isEspecial = state.selectedProduct === 'Solicitud especial';
  if (isEspecial && !notes) { showError(errEl, 'Describe tu solicitud especial.'); return; }
  errEl.style.display = 'none';

  const item = state.menuItems.find(i => i.name === state.selectedProduct);
  const price = item ? ` (${item.price} c/u)` : '';

  let msg = `¡Hola Oleya by M.J.! 🌸\n\nMe llamo *${nombre}*`;
  if (tel) msg += ` y mi número es ${tel}`;
  msg += `.\n\nQuiero hacer un pedido:\n`;
  if (isEspecial) {
    msg += `📝 *Solicitud especial:*\n${notes}`;
  } else {
    msg += `🛍 *${state.selectedProduct}*${price}\n📦 Cantidad: ${state.qty}`;
    if (notes) msg += `\n📝 Notas: ${notes}`;
  }
  if (state.user?.address) msg += `\n\n📍 Entrega en: ${state.user.address}, ${state.user.colonia}`;
  msg += '\n\n¡Gracias! 💜';

  window.open(`https://wa.me/${state.content.waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
}

function showError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

/* ════════════════════════════════════════════
   AUTH
════════════════════════════════════════════ */
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.innerHTML = isText
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email').value.trim();
  const pw = document.getElementById('admin-pw').value;
  const errEl = document.getElementById('admin-error');
  errEl.style.display = 'none';

  if (!supabaseClient) {
    errEl.textContent = 'Supabase no está configurado correctamente.';
    errEl.style.display = 'block';
    return;
  }

  try {
    // 1. Autenticar con Supabase
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: pw,
    });

    if (error) {
      errEl.textContent = 'Credenciales incorrectas. Intenta de nuevo.';
      errEl.style.display = 'block';
      return;
    }

    // 2. Verificar si es administrador usando la función es_admin()
    const { data: isAdmin, error: rpcError } = await supabaseClient.rpc('es_admin');

    if (rpcError || !isAdmin) {
      await supabaseClient.auth.signOut();
      errEl.textContent = 'No tienes permisos de administrador.';
      errEl.style.display = 'block';
      return;
    }

    // 3. Cargar perfil y mostrar panel de admin
    state.isAdmin = true;
    await fetchUserProfile(data.user.id);
    
    // 4. Recargar productos y contenido con permisos de admin
    await loadProductsFromDB();
    await loadSiteContentFromDB();
    
    showView('view-admin');
  } catch (err) {
    console.error('Error en login de admin:', err);
    errEl.textContent = 'Ocurrió un error inesperado.';
    errEl.style.display = 'block';
  }
}

async function fetchUserProfile(userId) {
  try {
    if (!supabaseClient) {
      console.warn("supabaseClient no está inicializado en fetchUserProfile");
      return;
    }
    
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('id_usuario', userId)
      .single();
      
    if (data) {
      state.user = {
        id: data.id_usuario,
        name: data.nombre,
        email: data.email,
        phone: data.telefono,
        address: data.direccion,
        colonia: data.colonia
      };
    } else {
      // Fallback if not immediately found in public table (e.g. trigger delay or RLS issue)
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          state.user = {
            id: user.id,
            name: user.user_metadata?.nombre || 'Usuario',
            email: user.email,
            phone: user.user_metadata?.telefono || '',
            address: user.user_metadata?.direccion || '',
            colonia: user.user_metadata?.colonia || ''
          };
        }
      } catch (fallbackErr) {
        console.error("Error en fallback de perfil:", fallbackErr);
      }
    }
  } catch (err) {
    console.error("Error general en fetchUserProfile:", err);
  }
}

async function handleUserLogin(e) {
  e.preventDefault();
  const email = document.getElementById('user-email').value.trim();
  const pw = document.getElementById('user-pw').value;
  const errEl = document.getElementById('user-login-error');
  errEl.style.display = 'none';

  if (!supabaseClient) {
    showError(errEl, 'Supabase no está configurado o cargado correctamente.');
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: pw,
    });

    if (error) {
      console.error("Error de Supabase auth:", error);
      let msg = 'Correo o contraseña incorrectos.';
      if (error.message === 'Email not confirmed') {
        msg = 'Por favor, confirma tu correo electrónico. Revisa tu bandeja de entrada.';
      } else if (error.status === 400 || error.message.includes('Invalid login credentials')) {
        msg = 'Correo o contraseña incorrectos.';
      } else {
        msg = error.message || 'Error al iniciar sesión.';
      }
      showError(errEl, msg);
    } else {
      await fetchUserProfile(data.user.id);
      showView('view-site');
      syncUserUI();
    }
  } catch (err) {
    console.error("Error inesperado en handleUserLogin:", err);
    showError(errEl, 'Ocurrió un error inesperado al conectar con el servidor.');
  }
}

async function handleUserRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pw = document.getElementById('reg-pw').value;
  const phone = document.getElementById('reg-phone').value.trim();
  const address = document.getElementById('reg-address').value.trim();
  const colonia = document.getElementById('reg-colonia').value.trim();
  
  if (!supabaseClient) {
    alert("Supabase no está configurado o cargado correctamente.");
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: pw,
      options: {
        data: {
          nombre: name,
          telefono: phone,
          direccion: address,
          colonia: colonia
        }
      }
    });

    if (error) {
      alert('Error al registrar: ' + error.message);
      return;
    }
    
    if (data.user) {
      await fetchUserProfile(data.user.id);
    }
    
    showView('view-success');
    setTimeout(() => {
      showView('view-site');
      syncUserUI();
    }, 1800);
  } catch (err) {
    console.error("Error inesperado en handleUserRegister:", err);
    alert('Ocurrió un error inesperado al crear tu cuenta.');
  }
}

/* ════════════════════════════════════════════
   ADMIN PANEL
════════════════════════════════════════════ */
function setAdminTab(tab) {
  ['inicio','menu','historia','contacto'].forEach(t => {
    document.getElementById(`admin-tab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`tab-btn-${t}`).classList.toggle('active', t === tab);
  });
}

function toggleAdminSidebar() {
  document.getElementById('admin-sidebar').classList.toggle('open');
}

async function logoutAdmin() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  state.user = null;
  state.isAdmin = false;
  showView('view-site');
}

/**
 * Populate admin form fields from current state
 */
function populateAdminForms() {
  setVal('ad-brandName', state.content.brandName);
  setVal('ad-heroTitle', state.content.heroTitle);
  setVal('ad-heroAccent', state.content.heroAccent);
  setVal('ad-heroDesc', state.content.heroDesc);
  setVal('ad-menuTitle', state.content.menuTitle);
  setVal('ad-menuSub', state.content.menuSub);
  setVal('ad-histTitle', state.content.histTitle);
  setVal('ad-histP1', state.content.histP1);
  setVal('ad-histP2', state.content.histP2);
  setVal('ad-histYears', state.content.histYears);
  setVal('ad-bannerTitle', state.content.bannerTitle);
  setVal('ad-bannerSub', state.content.bannerSub);
  setVal('ad-waNumber', state.content.waNumber);
  setVal('ad-address', state.content.address);
  setVal('ad-hours', state.content.hours);
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

/**
 * Save admin changes — persists to Supabase contenido_sitio table
 */
async function saveAdmin() {
  // pull values from admin form
  state.content.brandName = v('ad-brandName');
  state.content.heroTitle  = v('ad-heroTitle');
  state.content.heroAccent = v('ad-heroAccent');
  state.content.heroDesc   = v('ad-heroDesc');
  state.content.menuTitle  = v('ad-menuTitle');
  state.content.menuSub    = v('ad-menuSub');
  state.content.histTitle  = v('ad-histTitle');
  state.content.histP1     = v('ad-histP1');
  state.content.histP2     = v('ad-histP2');
  state.content.histYears  = v('ad-histYears');
  state.content.bannerTitle = v('ad-bannerTitle');
  state.content.bannerSub  = v('ad-bannerSub');
  state.content.waNumber   = v('ad-waNumber');
  state.content.address    = v('ad-address');
  state.content.hours      = v('ad-hours');

  // apply to site immediately
  applySiteContent();

  // Persist to Supabase
  if (supabaseClient) {
    try {
      const entries = Object.entries(state.content);
      for (const [clave, valor] of entries) {
        const { error } = await supabaseClient
          .from('contenido_sitio')
          .upsert(
            { clave, valor, fecha_actualizacion: new Date().toISOString() },
            { onConflict: 'clave' }
          );
        if (error) {
          console.error(`Error guardando contenido '${clave}':`, error);
        }
      }
      console.log('✅ Contenido guardado en Supabase');
    } catch (err) {
      console.error('Error general al guardar contenido:', err);
      alert('Error al guardar los cambios en la base de datos. Verifica tus permisos.');
      return;
    }
  }

  const badge = document.getElementById('saved-badge');
  badge.classList.add('show');
  setTimeout(() => badge.classList.remove('show'), 2500);
}

function v(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function applySiteContent() {
  // historia
  const el = (id) => document.getElementById(id);
  if (el('historia-title-display'))  el('historia-title-display').textContent  = state.content.histTitle;
  if (el('historia-p1-display'))     el('historia-p1-display').textContent     = state.content.histP1;
  if (el('historia-p2-display'))     el('historia-p2-display').textContent     = state.content.histP2;
  if (el('historia-years-display'))  el('historia-years-display').textContent  = state.content.histYears;
  if (el('banner-title-display'))    el('banner-title-display').textContent    = state.content.bannerTitle;
  if (el('banner-sub-display'))      el('banner-sub-display').textContent      = state.content.bannerSub;
  if (el('contact-hours'))           el('contact-hours').textContent           = state.content.hours;
  if (el('contact-address'))         el('contact-address').textContent         = state.content.address;
  if (el('contact-wa')) {
    const num = state.content.waNumber;
    el('contact-wa').textContent = '+' + num.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
  }
  // Hero section
  const heroTitle = el('inicio')?.querySelector('.hero-title');
  if (heroTitle && state.content.heroTitle) {
    heroTitle.innerHTML = `${state.content.heroTitle} <span class="accent">${state.content.heroAccent || ''}</span>`;
  }
  const heroDesc = el('inicio')?.querySelector('.hero-desc');
  if (heroDesc && state.content.heroDesc) {
    heroDesc.textContent = state.content.heroDesc;
  }
  // Menu section headers
  const menuTitle = el('menu')?.querySelector('.section-title');
  if (menuTitle && state.content.menuTitle) {
    menuTitle.textContent = state.content.menuTitle;
  }
  const menuSub = el('menu')?.querySelector('.section-sub');
  if (menuSub && state.content.menuSub) {
    menuSub.textContent = state.content.menuSub;
  }
}

/* ─── Admin Menu Items ─── */
function renderAdminMenuItems() {
  const container = document.getElementById('admin-menu-items');
  if (!container) return;
  container.innerHTML = state.menuItems.map(item => {
    if (state.editingItemId === item.id) {
      return renderItemEditor(item);
    }
    return `
      <div class="menu-item-row" id="admin-row-${item.id}">
        ${item.photo
          ? `<img src="${item.photo}" alt="${item.name}" onerror="this.outerHTML='<div class=\\'item-emoji-box\\'>${item.emoji}</div>'">`
          : `<div class="item-emoji-box">${item.emoji}</div>`}
        <div class="item-info">
          <p class="item-name">${item.name}</p>
          <p class="item-desc">${item.desc}</p>
          <div class="item-meta">
            <span class="item-price">${item.price}</span>
            <span class="${TAG_CLASS[item.tag] || 'tag tag-new'}" style="font-size:.62rem">${item.tag}</span>
          </div>
        </div>
        <div class="menu-item-actions">
          <button class="btn-icon edit" onclick="editItem('${item.id}')" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon del" onclick="deleteItem('${item.id}')" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderItemEditor(item) {
  // Build tag options
  const tagOptions = ['Favorita', 'Popular', 'Temporada', 'Nuevo', 'Especial', 'Personalizado'];
  const tagSelect = tagOptions.map(t =>
    `<option value="${t}" ${item.tag === t ? 'selected' : ''}>${t}</option>`
  ).join('');

  return `
    <div class="item-editor">
      <div class="item-editor-header">
        <h4>Editando producto</h4>
        <button class="btn-close-editor" onclick="cancelEditItem()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="admin-grid-2">
        <div class="form-field">
          <label>Emoji</label>
          <input type="text" id="ed-emoji" value="${item.emoji}" placeholder="🌸">
        </div>
        <div class="form-field">
          <label>Etiqueta</label>
          <select id="ed-tag">${tagSelect}</select>
        </div>
      </div>
      <div class="form-field">
        <label>Nombre del producto</label>
        <input type="text" id="ed-name" value="${item.name.replace(/"/g,'&quot;')}">
      </div>
      <div class="form-field">
        <label>Descripción</label>
        <textarea id="ed-desc" rows="2">${item.desc}</textarea>
      </div>
      <div class="form-field">
        <label>Precio (número, sin $)</label>
        <input type="number" id="ed-price" value="${item.priceNum || item.price.replace('$','')}" placeholder="45" step="0.01" min="0">
      </div>
      <div class="form-field">
        <label>URL de la foto (opcional)</label>
        <input type="url" id="ed-photo" value="${item.photo || ''}" placeholder="https://images.unsplash.com/...">
      </div>
      <button class="btn-save-item" onclick="saveEditItem('${item.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Guardar producto
      </button>
    </div>
  `;
}

function editItem(id) {
  state.editingItemId = id;
  renderAdminMenuItems();
}
function cancelEditItem() {
  state.editingItemId = null;
  renderAdminMenuItems();
}

/**
 * Save edited item — persists to Supabase productos table
 */
async function saveEditItem(id) {
  const item = state.menuItems.find(i => i.id === id);
  if (!item) return;

  const newEmoji = document.getElementById('ed-emoji').value;
  const newTag   = document.getElementById('ed-tag').value;
  const newName  = document.getElementById('ed-name').value;
  const newDesc  = document.getElementById('ed-desc').value;
  const newPrice = parseFloat(document.getElementById('ed-price').value) || 0;
  const newPhoto = document.getElementById('ed-photo').value || null;

  // Find or create etiqueta
  let id_etiqueta = null;
  if (supabaseClient && newTag) {
    try {
      // Try to find existing tag
      const { data: existingTag } = await supabaseClient
        .from('etiquetas')
        .select('id_etiqueta')
        .eq('nombre', newTag)
        .single();

      if (existingTag) {
        id_etiqueta = existingTag.id_etiqueta;
      } else {
        // Create new tag
        const { data: newTagData } = await supabaseClient
          .from('etiquetas')
          .insert({ nombre: newTag })
          .select('id_etiqueta')
          .single();
        if (newTagData) id_etiqueta = newTagData.id_etiqueta;
      }
    } catch (err) {
      console.warn('Error buscando/creando etiqueta:', err);
    }
  }

  // Update in Supabase
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('productos')
        .update({
          nombre: newName,
          descripcion: newDesc,
          precio: newPrice,
          emoji: newEmoji,
          foto_url: newPhoto,
          id_etiqueta: id_etiqueta
        })
        .eq('id_producto', id);

      if (error) {
        console.error('Error actualizando producto:', error);
        alert('Error al guardar el producto: ' + error.message);
        return;
      }
      console.log('✅ Producto actualizado en Supabase');
    } catch (err) {
      console.error('Error general al actualizar producto:', err);
      alert('Error al guardar el producto.');
      return;
    }
  }

  // Update local state
  item.emoji = newEmoji;
  item.tag   = newTag;
  item.name  = newName;
  item.desc  = newDesc;
  item.price = `$${newPrice.toFixed(0)}`;
  item.priceNum = newPrice;
  item.photo = newPhoto;
  item.id_etiqueta = id_etiqueta;
  
  state.editingItemId = null;
  renderAdminMenuItems();
  renderMenuGrid();
  renderProductList();

  // Show saved badge
  const badge = document.getElementById('saved-badge');
  badge.classList.add('show');
  setTimeout(() => badge.classList.remove('show'), 2500);
}

/**
 * Delete item — persists to Supabase (sets activo=false)
 */
async function deleteItem(id) {
  if (!confirm('¿Eliminar este producto?')) return;

  // Soft delete in Supabase (set activo=false)
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('productos')
        .update({ activo: false })
        .eq('id_producto', id);

      if (error) {
        console.error('Error eliminando producto:', error);
        alert('Error al eliminar el producto: ' + error.message);
        return;
      }
      console.log('✅ Producto desactivado en Supabase');
    } catch (err) {
      console.error('Error general al eliminar producto:', err);
      alert('Error al eliminar el producto.');
      return;
    }
  }

  state.menuItems = state.menuItems.filter(i => i.id !== id);
  renderAdminMenuItems();
  renderMenuGrid();
  renderProductList();
}

/**
 * Add new menu item — persists to Supabase
 */
async function addMenuItem() {
  // Get the 'Nuevo' tag id
  let id_etiqueta = null;
  if (supabaseClient) {
    try {
      const { data: tags, error: tagError } = await supabaseClient
        .from('etiquetas')
        .select('id_etiqueta')
        .eq('nombre', 'Nuevo');
      
      if (tagError) {
        console.warn('Error buscando etiqueta Nuevo:', tagError);
      } else if (tags && tags.length > 0) {
        id_etiqueta = tags[0].id_etiqueta;
      }
    } catch (err) {
      console.warn('Error general buscando etiqueta Nuevo:', err);
    }
  }

  let newId = Date.now().toString();

  // Insert into Supabase
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('productos')
        .insert({
          nombre: 'Nuevo producto',
          descripcion: 'Descripción del producto.',
          precio: 0,
          emoji: '🍰',
          foto_url: null,
          id_etiqueta: id_etiqueta,
          activo: true
        })
        .select('id_producto');

      if (error) {
        console.error('Error creando producto:', error);
        alert('Error al crear el producto en Base de Datos: ' + (error.message || JSON.stringify(error)));
        return;
      }
      
      if (data && data.length > 0) {
        newId = data[0].id_producto;
        console.log('✅ Producto creado en Supabase:', newId);
      } else {
        console.warn('Supabase no retornó datos del producto creado (posible problema de RLS).');
      }
    } catch (err) {
      console.error('Error general al crear producto:', err);
      alert('Error al crear el producto: ' + err.message);
      return;
    }
  }

  const newItem = {
    id: newId, emoji: '🍰',
    name: 'Nuevo producto', desc: 'Descripción del producto.',
    price: '$0', priceNum: 0, tag: 'Nuevo', photo: null,
    id_etiqueta: id_etiqueta
  };
  state.menuItems.push(newItem);
  state.editingItemId = newItem.id;
  renderAdminMenuItems();
  renderMenuGrid();
  renderProductList();
}

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Load products and content from Supabase first
  await Promise.all([
    loadProductsFromDB(),
    loadSiteContentFromDB()
  ]);

  // 2. Apply loaded content to the site
  applySiteContent();
  renderMenuGrid();
  renderProductList();

  // 3. Check for existing session
  try {
    if (supabaseClient) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session && session.user) {
        await fetchUserProfile(session.user.id);
        
        // Check if the user is an admin
        try {
          const { data: isAdmin } = await supabaseClient.rpc('es_admin');
          state.isAdmin = !!isAdmin;
        } catch (e) {
          state.isAdmin = false;
        }
      }
    }
  } catch (err) {
    console.error("Error inicializando Supabase:", err);
  }
  
  syncUserUI();
  
  // 4. Listen for auth state changes
  try {
    if (supabaseClient) {
      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await fetchUserProfile(session.user.id);
          syncUserUI();
        } else if (event === 'SIGNED_OUT') {
          state.user = null;
          state.isAdmin = false;
          syncUserUI();
        }
      });
    }
  } catch (err) {
    console.error("Error al suscribirse a los cambios de Supabase:", err);
  }
});
