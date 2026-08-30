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

const modelCache = {};
const anchorGroups = {};
let currentAudio = null;
let currentAudioIndex = null;
let isAudioPlaying = false;
let gltfLoader = null;

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
}
function hideInfoCard() {
  document.getElementById('arInfoCard').classList.remove('show');
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

    setLoadingProgress(70, 'Mengaktifkan kamera...');
    await mindarThree.start();
    setLoadingProgress(100, 'Siap!');

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
setLoadingProgress(20, 'Memuat pustaka AR...');
window.addEventListener('load', () => {
  setLoadingProgress(45, 'Menyiapkan marker...');
  startAR();
});
