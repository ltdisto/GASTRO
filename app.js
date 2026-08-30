/* =========================================================
   JELAJAH RASA NUSANTARA — app.js
   Bagian ini fokus: OPENING + LOGIN
   ========================================================= */

const APP_STATE = {
  userData: null,
  isAdmin: false,
};

function generateSubmissionId() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

/* ---------------- Persistensi sesi (agar refresh tidak logout) ---------------- */
function saveNavState(state) {
  sessionStorage.setItem('gastro_nav_state', JSON.stringify(state));
}
function getNavState() {
  try {
    return JSON.parse(sessionStorage.getItem('gastro_nav_state') || 'null');
  } catch (e) {
    return null;
  }
}

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');

  // Simpan posisi halaman terakhir, kecuali splash/login (tidak relevan untuk direstore)
  if (screenId !== 'splash-screen' && screenId !== 'login-screen') {
    saveNavState({ screen: screenId });
  }
}

function restoreUserUI() {
  const avatarEl = document.getElementById('menuAvatar');
  const greetingEl = document.getElementById('menuGreeting');
  const nama = (APP_STATE.userData && APP_STATE.userData.nama) || 'Tamu';

  avatarEl.textContent = nama.trim().charAt(0).toUpperCase() || 'G';
  greetingEl.textContent = APP_STATE.isAdmin ? `Halo, Admin ${nama}!` : `Halo, ${nama}!`;
}

function restoreSession() {
  const rawUser = sessionStorage.getItem('gastro_user_data');
  if (!rawUser) return false;

  try {
    APP_STATE.userData = JSON.parse(rawUser);
  } catch (e) {
    return false;
  }
  APP_STATE.isAdmin = sessionStorage.getItem('gastro_is_admin') === '1';
  restoreUserUI();

  const nav = getNavState();
  if (!nav || !nav.screen) {
    switchScreen('main-menu-screen');
    return true;
  }

  switch (nav.screen) {
    case 'materi-provinsi-screen':
      if (nav.islandId) openProvinsiList(nav.islandId);
      else switchScreen('main-menu-screen');
      break;
    case 'materi-detail-screen':
      if (nav.islandId != null && nav.provIndex != null) openFoodDetail(nav.islandId, nav.provIndex);
      else switchScreen('main-menu-screen');
      break;
    case 'materi-pulau-screen':
      openMateri();
      break;
    case 'petunjuk-screen':
    case 'profil-screen':
    case 'main-menu-screen':
    case 'ar-screen':
      switchScreen(nav.screen);
      break;
    default:
      switchScreen('main-menu-screen');
  }
  return true;
}

/* ---------------- OPENING / SPLASH ---------------- */
(function initSplash() {
  // Jika sesi login masih ada (refresh halaman), lewati splash & login sepenuhnya
  if (restoreSession()) return;

  const DURATION_MS = 4200; // total durasi opening otomatis
  const fill = document.getElementById('splashLoaderFill');
  const label = document.getElementById('splashLoaderLabel');
  const skipBtn = document.getElementById('btnSkipSplash');

  const messages = [
    'Menyiapkan pengalaman...',
    'Menata rempah nusantara...',
    'Hampir siap...'
  ];

  let start = null;
  let rafId = null;
  let finished = false;

  function goToLogin() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(rafId);
    switchScreen('login-screen');
  }

  function tick(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    const progress = Math.min(elapsed / DURATION_MS, 1);

    fill.style.width = (progress * 100).toFixed(1) + '%';

    const msgIndex = Math.min(
      messages.length - 1,
      Math.floor(progress * messages.length)
    );
    label.textContent = messages[msgIndex];

    if (progress < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      setTimeout(goToLogin, 250);
    }
  }

  rafId = requestAnimationFrame(tick);
  skipBtn.addEventListener('click', goToLogin);
})();

/* ---------------- LOGIN TABS (User / Admin) ---------------- */
function switchLoginTab(which) {
  const tabUser = document.getElementById('tabUser');
  const tabAdmin = document.getElementById('tabAdmin');
  const indicator = document.getElementById('loginTabIndicator');
  const cardUser = document.getElementById('cardUser');
  const cardAdmin = document.getElementById('cardAdmin');

  if (which === 'user') {
    tabUser.classList.add('active');
    tabAdmin.classList.remove('active');
    indicator.classList.remove('to-admin');
    cardUser.style.display = '';
    cardAdmin.style.display = 'none';
  } else {
    tabAdmin.classList.add('active');
    tabUser.classList.remove('active');
    indicator.classList.add('to-admin');
    cardAdmin.style.display = '';
    cardUser.style.display = 'none';
  }
}

/* ---------------- LOGIN USER ---------------- */
document.getElementById('formUser').addEventListener('submit', function (e) {
  e.preventDefault();

  const nama = document.getElementById('userNama').value.trim();
  const prodi = document.getElementById('userProdi').value.trim();
  const instansi = document.getElementById('userInstansi').value.trim();

  if (!nama || !prodi || !instansi) return;

  APP_STATE.userData = { nama, prodi, instansi };
  APP_STATE.isAdmin = false;

  const submissionId = generateSubmissionId();
  sessionStorage.setItem('gastro_submission_id', submissionId);
  sessionStorage.setItem('gastro_user_data', JSON.stringify(APP_STATE.userData));
  sessionStorage.setItem('gastro_is_admin', '0');

  goToMainMenu();
});

/* ---------------- LOGIN ADMIN ---------------- */
document.getElementById('formAdmin').addEventListener('submit', function (e) {
  e.preventDefault();

  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (!username || !password) return;

  // TODO: ganti dengan validasi kredensial admin sesungguhnya
  APP_STATE.isAdmin = true;
  APP_STATE.userData = { nama: username, prodi: '', instansi: '' };

  const submissionId = generateSubmissionId();
  sessionStorage.setItem('gastro_submission_id', submissionId);
  sessionStorage.setItem('gastro_user_data', JSON.stringify(APP_STATE.userData));
  sessionStorage.setItem('gastro_is_admin', '1');

  goToMainMenu();
});

/* ---------------- MENU UTAMA ---------------- */
function goToMainMenu() {
  restoreUserUI();
  switchScreen('main-menu-screen');
}

function logoutUser() {
  APP_STATE.userData = null;
  APP_STATE.isAdmin = false;
  sessionStorage.removeItem('gastro_user_data');
  sessionStorage.removeItem('gastro_submission_id');
  sessionStorage.removeItem('gastro_is_admin');
  sessionStorage.removeItem('gastro_nav_state');
  document.getElementById('formUser').reset();
  document.getElementById('formAdmin').reset();
  switchLoginTab('user');
  switchScreen('login-screen');
}

/* =========================================================
   MATERI — Pulau -> Provinsi & Makanan -> Detail
   ========================================================= */
let CURRENT_ISLAND = null;

function openMateri() {
  renderIslandGrid();
  switchScreen('materi-pulau-screen');
}

function renderIslandGrid() {
  const grid = document.getElementById('islandGrid');
  grid.innerHTML = '';

  FOOD_DATA.forEach(island => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'island-card';
    btn.style.setProperty('--island-color', island.color);
    btn.onclick = () => openProvinsiList(island.islandId);

    btn.innerHTML = `
      <span class="island-icon">${island.icon}</span>
      <span class="island-info">
        <span class="island-name">${island.islandName}</span>
        <span class="island-count">${island.provinces.length} provinsi</span>
      </span>
      <svg class="island-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    `;
    grid.appendChild(btn);
  });
}

function openProvinsiList(islandId) {
  const island = FOOD_DATA.find(i => i.islandId === islandId);
  if (!island) return;

  CURRENT_ISLAND = islandId;
  document.getElementById('provinsiIslandTitle').textContent = `Kuliner Pulau ${island.islandName}`;

  const list = document.getElementById('foodList');
  list.innerHTML = '';

  island.provinces.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'food-item';
    btn.onclick = () => openFoodDetail(islandId, index);

    btn.innerHTML = `
      <span class="food-item-emoji">🍽️</span>
      <span class="food-item-text">
        <span class="food-item-name">${item.makanan}</span>
        <span class="food-item-prov">${item.provinsi}</span>
      </span>
      <svg class="food-item-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    `;
    list.appendChild(btn);
  });

  switchScreen('materi-provinsi-screen');
  saveNavState({ screen: 'materi-provinsi-screen', islandId: islandId });
}

function openFoodDetail(islandId, provIndex) {
  const item = getFoodByRef(islandId, provIndex);
  if (!item) return;

  document.getElementById('detailProvinsi').textContent = item.provinsi;
  document.getElementById('detailMakanan').textContent = item.makanan;

  const bodyEl = document.getElementById('detailBody');
  bodyEl.innerHTML = item.deskripsi
    .split('\n\n')
    .map(paragraf => `<p>${paragraf.trim()}</p>`)
    .join('');

  const backBtn = document.getElementById('detailBackBtn');
  backBtn.onclick = () => openProvinsiList(islandId);

  switchScreen('materi-detail-screen');
  saveNavState({ screen: 'materi-detail-screen', islandId: islandId, provIndex: provIndex });
}
