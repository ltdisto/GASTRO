/* =========================================================
   AR.JS — MindAR + Three.js scene (ES Module)
   Load model terkompresi (KTX2 texture + Meshopt geometry)
   & audio per marker
   ========================================================= */

import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const MODEL_BASE_PATH = "../3d/";
const AUDIO_BASE_PATH = "../audio/";
const MIND_FILE_PATH = "targets.mind";
const TOTAL_TARGETS = 38;

const modelCache = {};
const anchorGroups = {};
let currentAudio = null;
let currentAudioIndex = null;
let isAudioPlaying = false;
let gltfLoader = null;

/* ---------------- Progress tracking (persist saat refresh via localStorage) ---------------- */
const submissionId = localStorage.getItem('gastro_submission_id') || null;
const progressKey = submissionId ? `gastro_ar_progress_${submissionId}` : 'gastro_ar_progress_guest';

function loadProgress() {
  try {
    const raw = localStorage.getItem(progressKey);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}
function saveProgress(set) {
  localStorage.setItem(progressKey, JSON.stringify([...set]));
}
const discoveredTargets = loadProgress();

function updateProgressBadge() {
  document.getElementById('arProgressBadge').textContent = `${discoveredTargets.size} / ${TOTAL_TARGETS}`;
  updateSubmitButton();
  markCheckpointUnsaved(); // ada progress baru = checkpoint sebelumnya jadi "usang"
}
function markDiscovered(targetIndex) {
  if (!discoveredTargets.has(targetIndex)) {
    discoveredTargets.add(targetIndex);
    saveProgress(discoveredTargets);
    updateProgressBadge();
  }
}

/* ---------------- Sync ke Google Sheet (dipakai bareng: ikon checkpoint & tombol Simpan Progress) ---------------- */
const GOOGLE_SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz9Gw89cWOq7ZDy0Lf4i8ZhLFP0Q8QRCLsiluLndgG4X7oqMjrQ-rADCIm2-r9qiTr8pA/exec"; // lihat panduan setup Apps Script
const submittedKey = submissionId ? `gastro_submitted_${submissionId}` : 'gastro_submitted_guest';

function getUserDataSnapshot() {
  try {
    return JSON.parse(localStorage.getItem('gastro_user_data') || '{}');
  } catch (e) {
    return {};
  }
}

function buildProgressPayload() {
  const userData = getUserDataSnapshot();
  const isComplete = discoveredTargets.size >= TOTAL_TARGETS;
  return {
    submissionId: submissionId || '-',
    nama: userData.nama || '-',
    gender: userData.gender || '-',
    usia: userData.usia || '-',
    daerah: userData.daerah || '-',
    kabupaten: userData.kabupaten || '-',
    waktu: new Date().toISOString(),
    jumlahTerscan: discoveredTargets.size,
    status: isComplete ? 'Selesai' : 'Sedang Berjalan',
  };
}

/* syncProgress: mengirim (upsert) baris progress ke Google Sheet.
   Dipakai baik oleh ikon checkpoint (kapan saja) maupun tombol
   Simpan Progress besar (hanya aktif di 38/38). */
async function syncProgress() {
  const res = await fetch(GOOGLE_SHEET_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // hindari CORS preflight, tetap bisa baca respons
    body: JSON.stringify(buildProgressPayload()),
  });
  const json = await res.json();
  if (json.status !== 'success') throw new Error('Response tidak sukses');
}

/* ---------------- Ikon Checkpoint (topbar, bisa kapan saja) ---------------- */
let hasUnsavedProgress = true;

function markCheckpointUnsaved() {
  hasUnsavedProgress = true;
  const btn = document.getElementById('arCheckpointBtn');
  btn.classList.remove('saved');
}

document.getElementById('arCheckpointBtn').addEventListener('click', async () => {
  const btn = document.getElementById('arCheckpointBtn');
  if (btn.classList.contains('syncing')) return;

  btn.classList.add('syncing');
  try {
    await syncProgress();
    hasUnsavedProgress = false;
    btn.classList.remove('syncing');
    btn.classList.add('saved');
  } catch (err) {
    console.error('Gagal checkpoint progress:', err);
    btn.classList.remove('syncing');
    // beri tanda gagal singkat (tetap merah sebentar lalu normal) tanpa mengganggu UX
    btn.style.background = 'rgba(193,68,14,0.85)';
    setTimeout(() => { btn.style.background = ''; }, 1200);
  }
});

/* ---------------- Tombol Simpan Progress (bawah, hanya aktif di 38/38) ---------------- */
function updateSubmitButton() {
  const btn = document.getElementById('arSubmitBtn');
  const btnText = document.getElementById('arSubmitBtnText');
  const alreadySubmitted = localStorage.getItem(submittedKey) === '1';

  if (alreadySubmitted) {
    btn.disabled = true;
    btn.classList.add('submitted');
    btnText.textContent = 'Progress Tersimpan ✓';
    return;
  }

  const isComplete = discoveredTargets.size >= TOTAL_TARGETS;
  btn.disabled = !isComplete;
  btnText.textContent = isComplete
    ? 'Simpan Progress'
    : `Simpan Progress (${discoveredTargets.size}/${TOTAL_TARGETS})`;
}

async function submitProgress() {
  const btn = document.getElementById('arSubmitBtn');
  const btnText = document.getElementById('arSubmitBtnText');
  if (btn.disabled) return;

  btn.disabled = true;
  btnText.textContent = 'Mengirim...';

  try {
    await syncProgress();

    localStorage.setItem(submittedKey, '1');
    btn.classList.add('submitted');
    btnText.textContent = 'Progress Tersimpan ✓';

    // tombol final berhasil = checkpoint ikon juga otomatis ikut jadi "tersimpan"
    hasUnsavedProgress = false;
    document.getElementById('arCheckpointBtn').classList.add('saved');
  } catch (err) {
    console.error('Gagal mengirim progress:', err);
    btn.disabled = false;
    btnText.textContent = 'Gagal, coba lagi';
    setTimeout(updateSubmitButton, 2000);
  }
}

document.getElementById('arSubmitBtn').addEventListener('click', submitProgress);

/* ---------------- UI Helpers ---------------- */
function setLoadingProgress(percent, text) {
  document.getElementById('arLoadingBarFill').style.width = percent + '%';
  if (text) document.getElementById('arLoadingText').textContent = text;
}
function hideLoadingOverlay() {
  document.getElementById('arLoading').classList.add('hide');
}
function showModelSpinner(show) {
  document.getElementById('arModelSpinner').classList.toggle('show', show);
}
function showHint(show) {
  document.getElementById('arHint').style.display = show ? 'flex' : 'none';
}
function showInfoCard(data) {
  document.getElementById('arInfoProvinsi').textContent = data.provinsi;
  document.getElementById('arInfoTitle').textContent = data.makanan;
  document.getElementById('arInfoCard').classList.add('show');
  document.getElementById('arSubmitBtn').style.display = 'none';
}
function hideInfoCard() {
  document.getElementById('arInfoCard').classList.remove('show');
  document.getElementById('arSubmitBtn').style.display = 'flex';
}
function setAudioIcon(playing) {
  const icon = document.getElementById('arAudioIcon');
  icon.innerHTML = playing
    ? '<rect x="6" y="5" width="4" height="14"></rect><rect x="14" y="5" width="4" height="14"></rect>'
    : '<path d="M8 5v14l11-7z"></path>';
}
function showErrorOverlay(message) {
  if (message) document.getElementById('arErrorText').textContent = message;
  document.getElementById('arErrorOverlay').classList.add('show');
  hideLoadingOverlay();
}

/* ---------------- Audio control ---------------- */
function playAudioFor(targetIndex) {
  const ref = AR_DATA[targetIndex];
  if (!ref) return;

  if (currentAudioIndex !== targetIndex) {
    if (currentAudio) currentAudio.pause();
    currentAudio = new Audio(AUDIO_BASE_PATH + ref.audio);
    currentAudioIndex = targetIndex;
  }
  currentAudio.play().catch(() => {});
  isAudioPlaying = true;
  setAudioIcon(true);
}
function pauseAudio() {
  if (currentAudio) currentAudio.pause();
  isAudioPlaying = false;
  setAudioIcon(false);
}
function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  isAudioPlaying = false;
  currentAudioIndex = null;
  setAudioIcon(false);
}

document.getElementById('arAudioBtn').addEventListener('click', () => {
  if (currentAudioIndex === null) return;
  isAudioPlaying ? pauseAudio() : playAudioFor(currentAudioIndex);
});

/* ---------------- Model loading (lazy + cached) ---------------- */
function initLoaders(renderer) {
  const ktx2Loader = new KTX2Loader()
    .setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/')
    .detectSupport(renderer);

  gltfLoader = new GLTFLoader();
  gltfLoader.setKTX2Loader(ktx2Loader);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
}

function loadModelForTarget(targetIndex, onReady) {
  if (modelCache[targetIndex]) {
    onReady(modelCache[targetIndex].clone());
    return;
  }

  const ref = AR_DATA[targetIndex];
  if (!ref) return;

  const adjust = getAdjustFor(ref.no);
  showModelSpinner(true);

  gltfLoader.load(
    MODEL_BASE_PATH + ref.glb,
    (gltf) => {
      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;

      const BASE_TARGET_SIZE = 1.6; // ukuran dasar (relatif terhadap lebar marker)
      const scale = (BASE_TARGET_SIZE * adjust.scaleMultiplier) / maxDim;
      model.scale.setScalar(scale);

      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center.multiplyScalar(scale));

      // Koreksi orientasi per-model (lihat AR_ADJUST di ar-data.js kalau masih terbalik/miring)
      model.rotation.x = THREE.MathUtils.degToRad(adjust.rotX);
      model.rotation.y = THREE.MathUtils.degToRad(adjust.rotY);
      model.rotation.z = THREE.MathUtils.degToRad(adjust.rotZ);

      modelCache[targetIndex] = model;
      showModelSpinner(false);
      onReady(model.clone());
    },
    undefined,
    (error) => {
      console.error('Gagal memuat model:', ref.glb, error);
      showModelSpinner(false);
    }
  );
}

/* ---------------- MindAR Setup ---------------- */
async function startAR() {
  try {
    const mindarThree = new MindARThree({
      container: document.querySelector("#ar-container"),
      imageTargetSrc: MIND_FILE_PATH,
      maxTrack: 1,
      uiScanning: "no",
      uiLoading: "no",
    });

    const { renderer, scene, camera } = mindarThree;
    initLoaders(renderer);

    let activeGroup = null;
    let userSpinY = 0;

    AR_DATA.forEach((ref, index) => {
      const anchor = mindarThree.addAnchor(index);
      const group = new THREE.Group();
      anchor.group.add(group);
      anchorGroups[index] = { anchor, group };

      anchor.onTargetFound = () => {
        showHint(false);
        const data = getArDataByIndex(index);
        showInfoCard(data);
        markDiscovered(index);

        userSpinY = 0;
        group.rotation.y = 0;
        activeGroup = group;

        const rotateHint = document.getElementById('arRotateHint');
        rotateHint.classList.add('show');
        setTimeout(() => rotateHint.classList.remove('show'), 2800);

        loadModelForTarget(index, (modelInstance) => {
          group.clear();
          group.add(modelInstance);
        });

        playAudioFor(index);
      };

      anchor.onTargetLost = () => {
        hideInfoCard();
        stopAudio();
        showHint(true);
        if (activeGroup === group) activeGroup = null;
      };
    });

    /* ---- Putar model dengan geser jari (kiri-kanan, sumbu Y saja) ---- */
    let isDragging = false;
    let lastPointerX = 0;
    const canvasEl = renderer.domElement;

    canvasEl.addEventListener('pointerdown', (e) => {
      if (!activeGroup) return;
      isDragging = true;
      lastPointerX = e.clientX;
    });
    window.addEventListener('pointermove', (e) => {
      if (!isDragging || !activeGroup) return;
      const deltaX = e.clientX - lastPointerX;
      lastPointerX = e.clientX;
      userSpinY += deltaX * 0.012;
      activeGroup.rotation.y = userSpinY;
    });
    window.addEventListener('pointerup', () => { isDragging = false; });
    window.addEventListener('pointercancel', () => { isDragging = false; });

    const hemiLight = new THREE.HemisphereLight(0xfff4e0, 0x3a2415, 1.1);
    scene.add(hemiLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(0.5, 1, 0.3);
    scene.add(dirLight);

    setLoadingProgress(65, 'Menyiapkan pelacakan 38 marker...');
    setLoadingProgress(80, 'Mengaktifkan kamera, mohon izinkan aksesnya...');
    await mindarThree.start();
    setLoadingProgress(100, 'Siap! Arahkan kamera ke marker.');

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

    setTimeout(hideLoadingOverlay, 350);

  } catch (err) {
    console.error('AR init error:', err);
    showErrorOverlay(
      err && err.name === 'NotAllowedError'
        ? 'Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser lalu muat ulang halaman.'
        : 'Terjadi kendala saat memuat fitur AR. Pastikan koneksi internet stabil lalu coba lagi.'
    );
  }
}

/* ---------------- Init ---------------- */
updateProgressBadge();
// Kalau sebelumnya sudah pernah submit final, ikon checkpoint langsung tampil "tersimpan"
if (localStorage.getItem(submittedKey) === '1') {
  hasUnsavedProgress = false;
  document.getElementById('arCheckpointBtn').classList.add('saved');
}
setLoadingProgress(15, 'Memuat pustaka Three.js & MindAR...');
window.addEventListener('load', () => {
  setLoadingProgress(35, 'Menyiapkan mesin AR & decoder model 3D...');
  startAR();
});
