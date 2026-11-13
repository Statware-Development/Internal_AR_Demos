import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MindARThree } from 'mindar-image-three';
import { CONFIG } from './config.js';
import { createPlaceholder } from './placeholders.js';

const $ = (id) => document.getElementById(id);
const ui = {
  loading: $('loading'), loadingText: $('loading-text'),
  hint: $('hint'), hintText: $('hint-text'),
  card: $('card'), cardTitle: $('card-title'), cardText: $('card-text'),
  progress: $('progress'),
  error: $('error'), errorText: $('error-text'), retry: $('retry'),
};

const seen = new Set();          // índices de páginas ya escaneadas
const visibleNow = new Set();    // índices actualmente visibles
const entries = [];              // un registro por target (modelo, mixer, estado)
const clock = new THREE.Clock();
const gltfLoader = new GLTFLoader();
let currentMindar = null;

const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function getCameraTrack() {
  const video = $('ar-container').querySelector('video');
  return video?.srcObject?.getVideoTracks?.()[0] ?? null;
}

function stopStream(stream) {
  stream.getTracks().forEach((track) => track.stop());
}

function focusError(name, message) {
  const error = new Error(message);
  error.name = name;
  return error;
}

async function findContinuousFocusCamera() {
  if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
    throw focusError('CameraSelectionError', CONFIG.texts.cameraSelectionUnavailable);
  }

  const permissionStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' } },
  });
  stopStream(permissionStream);

  const cameras = (await navigator.mediaDevices.enumerateDevices())
    .filter((device) => device.kind === 'videoinput');
  let environmentCameraId = null;
  let otherCameraId = null;
  let checkedCameraCount = 0;

  for (const [index, device] of cameras.entries()) {
    const label = device.label || `Cámara ${index + 1}`;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { deviceId: { exact: device.deviceId } },
      });
      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities?.();
      const modes = capabilities?.focusMode ?? [];
      const settings = track?.getSettings?.();
      const facingMode = settings?.facingMode;
      checkedCameraCount += 1;
      console.info(`[Catálogo AR] Cámara "${label}": modos de enfoque`, modes, 'orientación', facingMode || 'desconocida');
      if (modes.includes('continuous') && facingMode !== 'user' && !/\b(front|user|frontal)\b/i.test(label)) {
        if (facingMode === 'environment' || /\b(back|rear|environment|world|trasera)\b/i.test(label)) {
          if (!environmentCameraId) environmentCameraId = device.deviceId;
        } else {
          if (!otherCameraId) otherCameraId = device.deviceId;
        }
      }
    } catch (err) {
      console.warn(`[Catálogo AR] No se pudo comprobar la cámara "${label}".`, err);
    } finally {
      if (stream) stopStream(stream);
    }
  }

  const selectedCameraId = environmentCameraId || otherCameraId;
  if (selectedCameraId) {
    console.info('[Catálogo AR] Se usará una cámara con enfoque continuo; se prioriza la orientada al entorno.');
    return selectedCameraId;
  }

  if (checkedCameraCount === 0) {
    throw focusError('CameraSelectionError', CONFIG.texts.cameraCheckFailed);
  }

  throw focusError('ContinuousFocusUnavailableError', CONFIG.texts.continuousFocusUnavailable);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// async function refocusCamera() {
//   const track = getCameraTrack();
//   if (!track?.getCapabilities || !track.applyConstraints) {
//     console.warn('[Catálogo AR] No hay track de cámara con controles de enfoque.');
//     return;
//   }

//   const caps = track.getCapabilities();
//   const modes = caps.focusMode ?? [];
//   console.log('[Catálogo AR] focusMode soportados:', modes, 'focusDistance:', caps.focusDistance);

//   try {
//     if (modes.includes('single-shot')) {
//       await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
//       return;
//     }

//     if (modes.includes('manual') && caps.focusDistance && modes.includes('continuous')) {
//       // Mueve el foco a otro punto y regresa a continuo para forzar un nuevo enfoque
//       const { min, max } = caps.focusDistance;
//       await track.applyConstraints({
//         advanced: [{ focusMode: 'manual', focusDistance: min + (max - min) * 0.3 }],
//       });
//       await wait(150);
//       await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
//       return;
//     }

//     if (modes.includes('continuous')) {
//       await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
//       return;
//     }

//     console.warn('[Catálogo AR] Este dispositivo no permite controlar el enfoque.');
//   } catch (err) {
//     console.warn('[Catálogo AR] No se pudo reenfocar la cámara.', err);
//   }
// }

// document.addEventListener('pointerdown', refocusCamera, { passive: true });

/* ---------- UI ---------- */

function buildProgress() {
  ui.progress.innerHTML = '';
  CONFIG.targets.forEach((t) => {
    const s = document.createElement('span');
    s.dataset.index = t.index;
    s.textContent = t.label;
    ui.progress.appendChild(s);
  });
}

function refreshUI() {
  ui.progress.querySelectorAll('span').forEach((s) => {
    const i = Number(s.dataset.index);
    s.classList.toggle('seen', seen.has(i));
    s.classList.toggle('active', visibleNow.has(i));
  });

  if (visibleNow.size > 0) {
    const i = [...visibleNow][0];
    const t = CONFIG.targets.find((x) => x.index === i);
    ui.cardTitle.textContent = t.title;
    ui.cardText.textContent = t.message;
    ui.card.classList.remove('hidden');
    ui.hint.classList.add('hidden');
    return;
  }

  ui.card.classList.add('hidden');
  const T = CONFIG.texts;
  const nextUnseen = CONFIG.targets.find((t) => !seen.has(t.index));
  if (seen.size === 0) ui.hintText.textContent = T.scanCover;
  else if (nextUnseen) ui.hintText.textContent = T.scanNext(nextUnseen.title);
  else ui.hintText.textContent = T.scanAgain;
  ui.hint.classList.remove('hidden');
}

function showError(err) {
  console.error(err);
  const denied = err && (err.name === 'NotAllowedError' || /permission|denied/i.test(String(err.message || err)));
  if (err?.name === 'ContinuousFocusUnavailableError' || err?.name === 'CameraSelectionError') {
    ui.errorText.textContent = err.message;
  } else {
    ui.errorText.textContent = denied ? CONFIG.texts.cameraDenied : CONFIG.texts.generic;
  }
  ui.loading.classList.add('hidden');
  ui.hint.classList.add('hidden');
  ui.error.classList.remove('hidden');
}

/* ---------- Modelos ---------- */

async function loadModel(def) {
  if (def.model) {
    try {
      const gltf = await gltfLoader.loadAsync(def.model);
      let mixer = null;
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
      }
      return { object: gltf.scene, mixer, isPlaceholder: false };
    } catch (e) {
      console.warn(`[Catálogo AR] No se pudo cargar "${def.model}". Se usa placeholder.`);
    }
  }
  return { object: createPlaceholder(def.placeholder), mixer: null, isPlaceholder: true };
}

/* ---------- Arranque ---------- */

async function start() {
  // Limpia un intento anterior (botón "Reintentar")
  if (currentMindar) {
    try { currentMindar.renderer.setAnimationLoop(null); await currentMindar.stop(); } catch (_) {}
    $('ar-container').innerHTML = '';
    currentMindar = null;
  }
  seen.clear(); visibleNow.clear();

  ui.error.classList.add('hidden');
  ui.loading.classList.remove('hidden');
  ui.loadingText.textContent = CONFIG.texts.loading;
  document.title = `Catálogo AR – ${CONFIG.company}`;
  $('loading-title').textContent = CONFIG.company;

  const environmentDeviceId = await findContinuousFocusCamera();
  const mindar = new MindARThree({
    container: $('ar-container'),
    imageTargetSrc: CONFIG.mindFile,
    maxTrack: CONFIG.maxTrack,
    environmentDeviceId,
    ...CONFIG.tracking,
    uiLoading: 'no', uiScanning: 'no', uiError: 'no',
  });
  currentMindar = mindar;
  const { renderer, scene, camera } = mindar;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Luces (suficientes para modelos PBR sin mapa de entorno)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(0.5, 1, 1.2);
  scene.add(sun);

  entries.length = 0;
  for (const def of CONFIG.targets) {
    const anchor = mindar.addAnchor(def.index);
    const { object, mixer, isPlaceholder } = await loadModel(def);

    const group = new THREE.Group();
    group.position.set(...def.position);
    group.rotation.set(...def.rotation);
    group.add(object);
    anchor.group.add(group);

    const entry = { def, anchor, group, object, mixer, isPlaceholder, appear: 0, baseScale: def.scale };
    group.scale.setScalar(0.0001);
    entries.push(entry);

    anchor.onTargetFound = () => {
      entry.appear = 0;
      seen.add(def.index);
      visibleNow.add(def.index);
      refreshUI();
    };
    anchor.onTargetLost = () => {
      visibleNow.delete(def.index);
      refreshUI();
    };
  }

  await mindar.start();   // pide permiso de cámara y carga el .mind
  const cameraTrack = getCameraTrack();
  try {
    if (!cameraTrack?.applyConstraints) throw new Error('El navegador no permite configurar el enfoque.');
    await cameraTrack.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
  } catch (err) {
    console.warn('[Catálogo AR] No se pudo activar el enfoque continuo.', err);
    throw focusError('ContinuousFocusUnavailableError', CONFIG.texts.continuousFocusActivationFailed);
  }

  buildProgress();
  ui.progress.classList.remove('hidden');
  ui.loading.classList.add('hidden');
  refreshUI();

  // Bucle de render: aquí se concentran las animaciones.
  clock.start();
  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.elapsedTime;

    for (const e of entries) {
      if (!e.anchor.group.visible) continue;

      // Entrada con rebote al detectar la página
      if (e.appear < 1) {
        e.appear = Math.min(1, e.appear + delta * 2.5);
        e.group.scale.setScalar(Math.max(0.0001, e.baseScale * easeOutBack(e.appear)));
      }

      e.mixer?.update(delta);                     // animaciones del .glb
      e.object.userData.update?.(delta, elapsed); // animación del placeholder
      e.def.onUpdate?.(e, delta, elapsed);        // hook personalizado desde config.js
    }

    renderer.render(scene, camera);
  });
}

ui.retry.addEventListener('click', () => start().catch(showError));
start().catch(showError);
