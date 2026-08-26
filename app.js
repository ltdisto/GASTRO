/* =========================================================
   JELAJAH RASA NUSANTARA — app.js
   Bagian ini fokus: OPENING + LOGIN
   ========================================================= */

const APP_STATE = {
  userData: null,
  isAdmin: false,
};

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

/* ---------------- OPENING / SPLASH ---------------- */
(function initSplash() {
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

  // TODO: arahkan ke halaman Menu Utama sesungguhnya (dikerjakan di tahap berikutnya)
  switchScreen('main-menu-screen');
});

/* ---------------- LOGIN ADMIN ---------------- */
document.getElementById('formAdmin').addEventListener('submit', function (e) {
  e.preventDefault();

  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (!username || !password) return;

  // TODO: ganti dengan validasi kredensial admin sesungguhnya
  APP_STATE.isAdmin = true;

  switchScreen('main-menu-screen');
});
