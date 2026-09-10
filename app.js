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

/* ---------------- Konten Editor Admin (Google Sheets sebagai CMS) ---------------- */
// PENTING: isi dengan URL Web App Apps Script yang sama seperti di ar.js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz9Gw89cWOq7ZDy0Lf4i8ZhLFP0Q8QRCLsiluLndgG4X7oqMjrQ-rADCIm2-r9qiTr8pA/exec";

let MATERI_OVERRIDES = {}; // { "islandId_provIndex": { deskripsi, gambarUrl, posisiGambar } }

function foodKeyOf(islandId, provIndex) {
  return `${islandId}_${provIndex}`;
}

async function loadMateriOverrides() {
  if (APPS_SCRIPT_URL.startsWith('GANTI_')) return; // belum dikonfigurasi, lewati diam-diam
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=get_materi`);
    const json = await res.json();
    (json.data || []).forEach(row => {
      MATERI_OVERRIDES[row.foodKey] = {
        deskripsi: row.deskripsi,
        gambarUrl: row.gambarUrl,
        posisiGambar: row.posisiGambar || 'atas',
      };
    });
    // Jika user sedang membuka halaman detail saat data override tiba, render ulang
    const nav = getNavState();
    if (nav && nav.screen === 'materi-detail-screen' && document.getElementById('materi-detail-screen').classList.contains('active')) {
      openFoodDetail(nav.islandId, nav.provIndex);
    }
  } catch (err) {
    console.warn('Gagal memuat konten editor admin (memakai teks default):', err);
  }
}
loadMateriOverrides();

/* Konversi berbagai format link Google Drive jadi link gambar langsung yang bisa ditampilkan */
function toDirectImageUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  const driveMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && trimmed.includes('drive.google.com')) {
    // Format "uc?export=view" sering diblokir Google untuk hotlink <img>.
    // Format thumbnail jauh lebih stabil untuk ditampilkan langsung di website.
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1000`;
  }
  return trimmed; // asumsikan sudah berupa link gambar langsung (jpg/png/webp, dsb)
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

  // Jika sesi admin aktif dan kembali membuka index.html, langsung arahkan ke panel Admin
  if (APP_STATE.isAdmin) {
    window.location.href = 'admin/admin.html';
    return true;
  }

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
  const skipBtn = document.getElementById('btnSkipSplash');

  let finished = false;
  let timeoutId = null;

  function goToLogin() {
    if (finished) return;
    finished = true;
    clearTimeout(timeoutId);
    switchScreen('login-screen');
  }

  timeoutId = setTimeout(goToLogin, DURATION_MS);
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

/* ---------------- Isi dropdown Asal Daerah dari FOOD_DATA ---------------- */
(function populateDaerahDropdown() {
  const select = document.getElementById('userDaerah');
  if (!select || typeof FOOD_DATA === 'undefined') return;

  FOOD_DATA.forEach(island => {
    island.provinces.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.provinsi;
      opt.textContent = item.provinsi;
      select.appendChild(opt);
    });
  });
})();

/* ---------------- LOGIN USER ---------------- */
document.getElementById('formUser').addEventListener('submit', function (e) {
  e.preventDefault();

  const nama = document.getElementById('userNama').value.trim();
  const gender = document.getElementById('userGender').value;
  const usia = document.getElementById('userUsia').value;
  const daerah = document.getElementById('userDaerah').value;
  const kabupaten = document.getElementById('userKabupaten').value.trim();

  if (!nama || !gender || !usia || !daerah || !kabupaten) return;

  APP_STATE.userData = { nama, gender, usia, daerah, kabupaten };
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

  if (password !== 'BRIGHT') {
    const passInput = document.getElementById('adminPassword');
    passInput.style.boxShadow = '0 0 0 3px rgba(193,68,14,0.5)';
    setTimeout(() => { passInput.style.boxShadow = ''; }, 900);
    return;
  }

  APP_STATE.isAdmin = true;
  APP_STATE.userData = { nama: username };

  const submissionId = generateSubmissionId();
  sessionStorage.setItem('gastro_submission_id', submissionId);
  sessionStorage.setItem('gastro_user_data', JSON.stringify(APP_STATE.userData));
  sessionStorage.setItem('gastro_is_admin', '1');

  window.location.href = 'admin/admin.html';
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

  const override = MATERI_OVERRIDES[foodKeyOf(islandId, provIndex)];
  const deskripsi = (override && override.deskripsi) ? override.deskripsi : item.deskripsi;
  const gambarUrl = override && override.gambarUrl ? toDirectImageUrl(override.gambarUrl) : '';
  const posisiGambar = (override && override.posisiGambar) || 'atas';

  document.getElementById('detailProvinsi').textContent = item.provinsi;
  document.getElementById('detailMakanan').textContent = item.makanan;

  const paragraphsHtml = deskripsi
    .split('\n\n')
    .map(paragraf => `<p>${paragraf.trim()}</p>`)
    .join('');

  const imageHtml = gambarUrl
    ? `<img src="${gambarUrl}" alt="${item.makanan}" class="detail-image" onerror="this.style.display='none'">`
    : '';

  const bodyEl = document.getElementById('detailBody');
  bodyEl.innerHTML = posisiGambar === 'bawah'
    ? paragraphsHtml + imageHtml
    : imageHtml + paragraphsHtml;

  const backBtn = document.getElementById('detailBackBtn');
  backBtn.onclick = () => openProvinsiList(islandId);

  switchScreen('materi-detail-screen');
  saveNavState({ screen: 'materi-detail-screen', islandId: islandId, provIndex: provIndex });
}
