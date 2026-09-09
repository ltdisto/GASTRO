/* =========================================================
   ADMIN.JS — Panel Admin: Editor Materi, Leaderboard, Database
   ========================================================= */

// PENTING: samakan URL ini dengan APPS_SCRIPT_URL di app.js & GOOGLE_SHEET_WEBAPP_URL di ar.js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz9Gw89cWOq7ZDy0Lf4i8ZhLFP0Q8QRCLsiluLndgG4X7oqMjrQ-rADCIm2-r9qiTr8pA/exec";
// PENTING: ganti dengan URL Google Sheet Anda (untuk tombol "Buka Google Sheet")
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1mgUvpFZpsIwP6vHYrKLkdDuDhNLO9GucYiDwwJbAPfo/edit?gid=0#gid=0";

/* ---------------- Auth guard ---------------- */
(function checkAdminAuth() {
  const isAdmin = sessionStorage.getItem('gastro_is_admin') === '1';
  if (!isAdmin) {
    window.location.href = '../index.html';
  }
})();

function adminLogout() {
  sessionStorage.removeItem('gastro_user_data');
  sessionStorage.removeItem('gastro_submission_id');
  sessionStorage.removeItem('gastro_is_admin');
  sessionStorage.removeItem('gastro_nav_state');
  window.location.href = '../index.html';
}

/* ---------------- Tab switching ---------------- */
document.querySelectorAll('.admin-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');

    if (btn.dataset.tab === 'leaderboard' && !leaderboardLoaded) {
      loadLeaderboard();
    }
  });
});

/* ---------------- EDITOR MATERI ---------------- */
let overridesCache = {}; // { foodKey: { deskripsi, gambarUrl, posisiGambar } }
let currentEditingKey = null;

function foodKeyOf(islandId, provIndex) {
  return `${islandId}_${provIndex}`;
}

function renderFoodList() {
  const listEl = document.getElementById('editorFoodList');
  listEl.innerHTML = '';

  FOOD_DATA.forEach(island => {
    const group = document.createElement('div');
    group.className = 'editor-island-group';

    const label = document.createElement('p');
    label.className = 'editor-island-label';
    label.textContent = island.islandName;
    group.appendChild(label);

    island.provinces.forEach((item, index) => {
      const key = foodKeyOf(island.islandId, index);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'editor-food-item';
      btn.dataset.key = key;
      btn.innerHTML = `<span>${item.makanan}</span>${overridesCache[key] ? '<span class="edited-badge">Diedit</span>' : ''}`;
      btn.onclick = () => selectFoodForEdit(island.islandId, index, item);
      group.appendChild(btn);
    });

    listEl.appendChild(group);
  });
}

function selectFoodForEdit(islandId, provIndex, item) {
  currentEditingKey = foodKeyOf(islandId, provIndex);

  document.querySelectorAll('.editor-food-item').forEach(el => {
    el.classList.toggle('active', el.dataset.key === currentEditingKey);
  });

  const override = overridesCache[currentEditingKey];

  document.getElementById('editorFormTitle').textContent = `${item.makanan} — ${item.provinsi}`;
  document.getElementById('editorFormSub').textContent = 'Edit deskripsi & gambar makanan ini.';
  document.getElementById('editorFormFields').style.display = 'block';
  document.getElementById('editorDeskripsi').value = override ? override.deskripsi : item.deskripsi;
  document.getElementById('editorGambarUrl').value = override ? (override.gambarUrl || '') : '';
  document.querySelector(`input[name="posisiGambar"][value="${override ? (override.posisiGambar || 'atas') : 'atas'}"]`).checked = true;
  document.getElementById('editorStatus').textContent = '';
  document.getElementById('editorStatus').className = 'editor-status';
}

document.getElementById('editorSaveBtn').addEventListener('click', async () => {
  if (!currentEditingKey) return;

  const btn = document.getElementById('editorSaveBtn');
  const statusEl = document.getElementById('editorStatus');
  const deskripsi = document.getElementById('editorDeskripsi').value.trim();
  const gambarUrl = document.getElementById('editorGambarUrl').value.trim();
  const posisiGambar = document.querySelector('input[name="posisiGambar"]:checked').value;

  if (!deskripsi) {
    statusEl.textContent = 'Deskripsi tidak boleh kosong.';
    statusEl.className = 'editor-status error';
    return;
  }

  if (APPS_SCRIPT_URL.startsWith('GANTI_')) {
    statusEl.textContent = 'APPS_SCRIPT_URL belum dikonfigurasi di admin.js.';
    statusEl.className = 'editor-status error';
    return;
  }

  btn.disabled = true;
  statusEl.textContent = 'Menyimpan...';
  statusEl.className = 'editor-status';

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // hindari CORS preflight
      body: JSON.stringify({
        action: 'save_materi',
        foodKey: currentEditingKey,
        deskripsi,
        gambarUrl,
        posisiGambar,
      }),
    });
    const json = await res.json();

    if (json.status === 'success') {
      overridesCache[currentEditingKey] = { deskripsi, gambarUrl, posisiGambar };
      statusEl.textContent = '✓ Perubahan tersimpan & langsung tampil ke semua pengunjung.';
      statusEl.className = 'editor-status success';
      renderFoodList();
      // re-highlight item yang sedang diedit setelah list di-render ulang
      const el = document.querySelector(`.editor-food-item[data-key="${currentEditingKey}"]`);
      if (el) el.classList.add('active');
    } else {
      throw new Error('Response tidak sukses');
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Gagal menyimpan. Cek koneksi & konfigurasi APPS_SCRIPT_URL.';
    statusEl.className = 'editor-status error';
  } finally {
    btn.disabled = false;
  }
});

async function loadOverrides() {
  if (APPS_SCRIPT_URL.startsWith('GANTI_')) {
    renderFoodList();
    return;
  }
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=get_materi`);
    const json = await res.json();
    (json.data || []).forEach(row => {
      overridesCache[row.foodKey] = {
        deskripsi: row.deskripsi,
        gambarUrl: row.gambarUrl,
        posisiGambar: row.posisiGambar || 'atas',
      };
    });
  } catch (err) {
    console.warn('Gagal memuat data editor sebelumnya:', err);
  }
  renderFoodList();
}

/* ---------------- LEADERBOARD ---------------- */
let leaderboardData = [];
let leaderboardLoaded = false;

function populateLeaderboardFilters() {
  const select = document.getElementById('lbFilterProvinsi');
  FOOD_DATA.forEach(island => {
    island.provinces.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.provinsi;
      opt.textContent = item.provinsi;
      select.appendChild(opt);
    });
  });
}

async function loadLeaderboard() {
  const tbody = document.getElementById('lbTableBody');
  const emptyNote = document.getElementById('lbEmptyNote');

  if (APPS_SCRIPT_URL.startsWith('GANTI_')) {
    emptyNote.textContent = 'APPS_SCRIPT_URL belum dikonfigurasi di admin.js.';
    emptyNote.style.display = 'block';
    return;
  }

  tbody.innerHTML = '';
  emptyNote.style.display = 'none';

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=get_submissions`);
    const json = await res.json();
    leaderboardData = json.data || [];
    leaderboardLoaded = true;
    renderLeaderboard();
  } catch (err) {
    console.error(err);
    emptyNote.textContent = 'Gagal memuat data. Cek koneksi & konfigurasi APPS_SCRIPT_URL.';
    emptyNote.style.display = 'block';
  }
}

function renderLeaderboard() {
  const tbody = document.getElementById('lbTableBody');
  const emptyNote = document.getElementById('lbEmptyNote');
  const filterProvinsi = document.getElementById('lbFilterProvinsi').value;
  const filterGender = document.getElementById('lbFilterGender').value;

  let filtered = leaderboardData.filter(row => {
    if (filterProvinsi && row.daerah !== filterProvinsi) return false;
    if (filterGender && row.gender !== filterGender) return false;
    return true;
  });

  filtered.sort((a, b) => (Number(b.jumlahTerscan) || 0) - (Number(a.jumlahTerscan) || 0));

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    emptyNote.textContent = 'Tidak ada data yang cocok dengan filter.';
    emptyNote.style.display = 'block';
    return;
  }
  emptyNote.style.display = 'none';

  filtered.forEach((row, i) => {
    const tr = document.createElement('tr');
    const waktuFmt = row.waktu ? new Date(row.waktu).toLocaleString('id-ID') : '-';
    tr.innerHTML = `
      <td class="lb-rank">${i + 1}</td>
      <td>${row.nama || '-'}</td>
      <td>${row.gender || '-'}</td>
      <td>${row.usia || '-'}</td>
      <td>${row.daerah || '-'}</td>
      <td>${row.kabupaten || '-'}</td>
      <td>${row.jumlahTerscan || 0}/38</td>
      <td>${waktuFmt}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('lbFilterProvinsi').addEventListener('change', renderLeaderboard);
document.getElementById('lbFilterGender').addEventListener('change', renderLeaderboard);
document.getElementById('lbRefreshBtn').addEventListener('click', loadLeaderboard);

/* ---------------- DATABASE ---------------- */
document.getElementById('dbSheetLink').href = SPREADSHEET_URL;

/* ---------------- Init ---------------- */
populateLeaderboardFilters();
loadOverrides();
