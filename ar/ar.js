/* =========================================================
   AR.JS — MindAR + Three.js scene, load model terkompresi
   (KTX2 texture + Meshopt geometry) & audio per marker
   ========================================================= */

const MODEL_BASE_PATH = "../3d/";   // sesuaikan jika struktur folder deploy berbeda
const AUDIO_BASE_PATH = "../audio/";
const MIND_FILE_PATH = "targets.mind";

const modelCache = {};      // cache THREE.Group hasil load, per targetIndex
const anchorGroups = {};    // group aktif per targetIndex
let currentAudio = null;
let currentAudioIndex = null;
let isAudioPlaying = false;

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
let gltfLoader = null;

function initLoaders(renderer) {
  const ktx2Loader = new THREE.KTX2Loader()
    .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/')
    .detectSupport(renderer);

  gltfLoader = new THREE.GLTFLoader();
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

      // Normalisasi ukuran & posisi model supaya konsisten di atas marker
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 0.55 / maxDim; // target lebar ~0.55 unit marker
      model.scale.setScalar(scale);

      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center.multiplyScalar(scale));
      model.rotation.x = Math.PI / 2.4; // sedikit dimiringkan agar terlihat natural "berdiri" dari marker datar

      modelCache[targetIndex] = model;
      showModelSpinner(false);
      onReady(model.clone());
    },
    (progressEvent) => {
      // progress loading tiap model (opsional, silent agar tidak mengganggu UX cepat)
    },
    (error) => {
      console.error('Gagal memuat model:', ref.glb, error);
      showModelSpinner(false);
    }
  );
}

/* ---------------- MindAR Setup ---------------- */
async function startAR() {
  try {
    const mindarThree = new window.MINDAR.IMAGE.MindARThree({
      container: document.querySelector("#ar-container"),
      imageTargetSrc: MIND_FILE_PATH,
      maxTrack: 1,
      uiScanning: "no",
      uiLoading: "no",
    });

    const { renderer, scene, camera } = mindarThree;
    initLoaders(renderer);

    // Buat anchor untuk setiap target (0..37)
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

    // Lighting sederhana agar model terlihat baik (PBR material dari glTF butuh cahaya)
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
    document.getElementById('arErrorOverlay').classList.add('show');
    hideLoadingOverlay();
  }
}

/* ---------------- Init ---------------- */
setLoadingProgress(20, 'Memuat pustaka AR...');
window.addEventListener('load', () => {
  setLoadingProgress(45, 'Menyiapkan marker...');
  startAR();
});
