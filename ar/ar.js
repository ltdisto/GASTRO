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

/* ---------------- Progress tracking (persist saat refresh via sessionStorage) ---------------- */
const submissionId = sessionStorage.getItem('gastro_submission_id') || null;
const progressKey = submissionId ? `gastro_ar_progress_${submissionId}` : 'gastro_ar_progress_guest';

function loadProgress() {
  try {
    const raw = sessionStorage.getItem(progressKey);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}
function saveProgress(set) {
  sessionStorage.setItem(progressKey, JSON.stringify([...set]));
}
const discoveredTargets = loadProgress();

function updateProgressBadge() {
  document.getElementById('arProgressBadge').textContent = `${discoveredTargets.size} / ${TOTAL_TARGETS}`;
  updateSubmitButton();
}
function markDiscovered(targetIndex) {
  if (!discoveredTargets.has(targetIndex)) {
    discoveredTargets.add(targetIndex);
    saveProgress(discoveredTargets);
    updateProgressBadge();
  }
}

/* ---------------- Submit ke Google Sheet ---------------- */
const GOOGLE_SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz9Gw89cWOq7ZDy0Lf4i8ZhLFP0Q8QRCLsiluLndgG4X7oqMjrQ-rADCIm2-r9qiTr8pA/exec"; // lihat panduan setup Apps Script
const submittedKey = submissionId ? `gastro_submitted_${submissionId}` : 'gastro_submitted_guest';

function updateSubmitButton() {
  const btn = document.getElementById('arSubmitBtn');
  const btnText = document.getElementById('arSubmitBtnText');
  const alreadySubmitted = sessionStorage.getItem(submittedKey) === '1';

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

  let userData = {};
  try {
    userData = JSON.parse(sessionStorage.getItem('gastro_user_data') || '{}');
  } catch (e) {}

  btn.disabled = true;
  btnText.textContent = 'Mengirim...';

  const payload = {
    submissionId: submissionId || '-',
    nama: userData.nama || '-',
    prodi: userData.prodi || '-',
    instansi: userData.instansi || '-',
    waktu: new Date().toISOString(),
    jumlahTerscan: discoveredTargets.size,
  };

  try {
    await fetch(GOOGLE_SHEET_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors', // Apps Script Web App tidak mendukung CORS response, kirim saja tanpa baca balasan
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });

    sessionStorage.setItem(submittedKey, '1');
    btn.classList.add('submitted');
    btnText.textContent = 'Progress Tersimpan ✓';
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

  showModelSpinner(true);

  gltfLoader.load(
    MODEL_BASE_PATH + ref.glb,
    (gltf) => {
      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 0.55 / maxDim;
      model.scale.setScalar(scale);

      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center.multiplyScalar(scale));
      model.rotation.x = Math.PI / 2.4;

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
      };
    });

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
setLoadingProgress(15, 'Memuat pustaka Three.js & MindAR...');
window.addEventListener('load', () => {
  setLoadingProgress(35, 'Menyiapkan mesin AR & decoder model 3D...');
  startAR();
});
