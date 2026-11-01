import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const root = document.getElementById('canvasRoot');
const loading = document.getElementById('loading');
const errorPanel = document.getElementById('errorPanel');
const opacityRange = document.getElementById('opacityRange');
const opacityValue = document.getElementById('opacityValue');
const infoTitle = document.getElementById('infoTitle');
const infoDot = document.getElementById('infoDot');
const infoDescription = document.getElementById('infoDescription');
const infoPills = document.getElementById('infoPills');
const count = document.getElementById('planeCount');

const INFO = {
  median: {
    name: 'Mediánní rovina', color: '#ef8fba',
    description: 'Prochází podélně středem těla a rozděluje koně na dvě přibližně souměrné poloviny — pravou a levou. Označuje se také jako střední nebo midsagitální rovina.',
    pills: ['Pravá polovina', 'Levá polovina'],
    visible: true,
    geometry: [3.65, 2.66],
    rotation: [0, 0, 0], position: [-0.22, 1.31, 0],
    label: [-0.95, 2.70, 0.03], short: 'MEDIÁNNÍ'
  },
  sagittal: {
    name: 'Sagitální rovina', color: '#f0b967',
    description: 'Každá rovina rovnoběžná s mediánní rovinou. Neprochází-li přesně středem těla, dělí jej na nestejně velkou pravou a levou část. Zde je posunutá směrem k boku koně.',
    pills: ['Pravá část', 'Levá část'],
    visible: false,
    geometry: [3.55, 2.48],
    rotation: [0, 0, 0], position: [-0.22, 1.31, 0.36],
    label: [-0.45, 2.58, 0.36], short: 'SAGITÁLNÍ'
  },
  dorsal: {
    name: 'Dorzální rovina', color: '#55d4cb',
    description: 'Je podélná a přibližně rovnoběžná s hřbetem stojícího koně. Rozděluje tělo na dorzální (hřbetní) a ventrální (břišní) část. Nazývá se také frontální.',
    pills: ['Dorzálně — hřbet', 'Ventrálně — břicho'],
    visible: false,
    geometry: [3.6, 1.65],
    rotation: [-Math.PI / 2, 0, 0], position: [-0.22, 1.36, 0],
    label: [-1.64, 1.40, 0.81], short: 'DORZÁLNÍ'
  },
  transverse: {
    name: 'Transverzální rovina', color: '#ac99f2',
    description: 'Je kolmá na podélnou osu trupu koně. Rozděluje tělo na kraniální (směrem k hlavě) a kaudální (směrem k ocasu) část. Může procházet různými místy trupu.',
    pills: ['Kraniálně — k hlavě', 'Kaudálně — k ocasu'],
    visible: true,
    geometry: [1.70, 2.64],
    rotation: [0, Math.PI / 2, 0], position: [-0.10, 1.32, 0],
    label: [-0.10, 2.70, 0.67], short: 'PŘÍČNÁ'
  }
};

let renderer, scene, camera, controls;
let labelsVisible = true;
let cameraTween = null;
const viewTarget = new THREE.Vector3(-0.20, 1.22, 0);
const defaultCamera = new THREE.Vector3(-4.35, 2.92, 5.5);
const groups = new Map();
const views = {
  iso: defaultCamera,
  side: new THREE.Vector3(0, 1.67, 7.05),
  front: new THREE.Vector3(-7.1, 1.80, 0.01),
  top: new THREE.Vector3(-0.17, 8.25, 0.015)
};

function createLabel(label, hex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.roundRect(12, 14, 488, 95, 17);
  ctx.fillStyle = 'rgba(10,26,37,0.91)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = hex; ctx.stroke();
  ctx.fillStyle = hex;
  ctx.beginPath(); ctx.arc(45, 61, 9, 0, Math.PI * 2); ctx.fill();
  ctx.font = '700 40px Arial, sans-serif';
  ctx.textBaseline = 'middle'; ctx.fillStyle = '#f4f8fa';
  ctx.fillText(label, 71, 65);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite: false }));
  sprite.scale.set(1.0, .25, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function createPlanes() {
  Object.entries(INFO).forEach(([key, data]) => {
    const group = new THREE.Group();
    const color = new THREE.Color(data.color);
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(...data.geometry), new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: .3, side: THREE.DoubleSide,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1
    }));
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(surface.geometry), new THREE.LineBasicMaterial({
      color, transparent: true, opacity: .88, depthWrite: false
    }));
    surface.add(frame);
    group.add(surface);
    group.position.set(...data.position);
    group.rotation.set(...data.rotation);
    const label = createLabel(data.short, data.color);
    if (label) {
      // Label positions are world coordinates, so they are separate from the plane geometry's rotation.
      const container = new THREE.Group();
      label.position.set(...data.label);
      container.add(label);
      scene.add(container);
      group.userData.label = container;
    }
    group.userData.surface = surface;
    group.visible = data.visible;
    scene.add(group);
    groups.set(key, group);
    if (group.userData.label) group.userData.label.visible = data.visible && labelsVisible;
  });
}

function updatePlane(key, isVisible) {
  INFO[key].visible = isVisible;
  const group = groups.get(key);
  if (group) {
    group.visible = isVisible;
    if (group.userData.label) group.userData.label.visible = isVisible && labelsVisible;
  }
  const button = document.querySelector(`.plane-toggle[data-plane="${key}"]`);
  if (button) {
    button.classList.toggle('active', isVisible);
    button.setAttribute('aria-pressed', String(isVisible));
  }
  count.textContent = `${Object.values(INFO).filter(p => p.visible).length} / 4`;
  showInfo(key);
}

function showInfo(key) {
  const data = INFO[key];
  infoTitle.textContent = data.name;
  infoDot.style.backgroundColor = data.color;
  infoDescription.textContent = data.description;
  infoPills.replaceChildren();
  data.pills.forEach(item => {
    const span = document.createElement('span');
    span.textContent = item;
    infoPills.appendChild(span);
  });
}

function updateOpacity() {
  const transparency = Number(opacityRange.value);
  opacityValue.value = `${transparency} %`;
  groups.forEach(group => {
    group.userData.surface.material.opacity = (100 - transparency) / 100;
  });
}

function setAllPlanes(visible) {
  Object.keys(INFO).forEach(k => updatePlane(k, visible));
  showInfo(visible ? 'median' : 'transverse');
}

function selectView(name) {
  const destination = views[name];
  if (!destination || !camera) return;
  document.querySelectorAll('.view-btn').forEach(btn => {
    const selected = btn.dataset.view === name;
    btn.classList.toggle('selected', selected);
    btn.setAttribute('aria-pressed', String(selected));
  });
  controls.autoRotate = false;
  document.getElementById('autoRotate').checked = false;
  cameraTween = { from: camera.position.clone(), to: destination.clone(), started: performance.now(), duration: 650 };
}

function handleResize() {
  if (!renderer || !camera) return;
  const width = Math.max(1, root.clientWidth), height = Math.max(1, root.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function showError(e) {
  console.error('3D viewer:', e);
  loading.hidden = true;
  errorPanel.hidden = false;
}

function setupUI() {
  document.querySelectorAll('.plane-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.dataset.plane;
      updatePlane(key, !INFO[key].visible);
    });
  });
  document.getElementById('showAll').addEventListener('click', () => setAllPlanes(true));
  document.getElementById('hideAll').addEventListener('click', () => setAllPlanes(false));
  opacityRange.addEventListener('input', updateOpacity);
  document.getElementById('showLabels').addEventListener('change', e => {
    labelsVisible = e.target.checked;
    groups.forEach((group, key) => {
      if (group.userData.label) group.userData.label.visible = INFO[key].visible && labelsVisible;
    });
  });
  document.getElementById('autoRotate').addEventListener('change', e => {
    controls.autoRotate = e.target.checked;
    cameraTween = null;
  });
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => selectView(btn.dataset.view));
  });
  document.getElementById('resetCamera').addEventListener('click', () => selectView('iso'));
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
    const keys = ['median', 'sagittal', 'dorsal', 'transverse'];
    const i = Number(event.key) - 1;
    if (i >= 0 && i < 4) updatePlane(keys[i], !INFO[keys[i]].visible);
    else if (event.key.toLowerCase() === 'r') selectView('iso');
  });
  showInfo('median');
  updateOpacity();
}

function init() {
  if (!root) return;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, .05, 120);
  camera.position.copy(defaultCamera);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.72;
  root.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(viewTarget);
  controls.enableDamping = true;
  controls.dampingFactor = .055;
  controls.minDistance = 2.9;
  controls.maxDistance = 14;
  controls.minPolarAngle = .035;
  controls.maxPolarAngle = Math.PI - .035;
  controls.autoRotateSpeed = 1.0;
  controls.enablePan = true;
  controls.update();
  controls.addEventListener('start', () => {
    cameraTween = null;
    document.querySelectorAll('.view-btn').forEach(btn => {btn.classList.remove('selected');btn.setAttribute('aria-pressed','false');});
  });

  scene.add(new THREE.HemisphereLight(0xc6e8f9, 0x694f3c, 3));
  const light = new THREE.DirectionalLight(0xffead0, 3.6);
  light.position.set(-3.5, 7.0, 4.0);
  scene.add(light);
  const fill = new THREE.DirectionalLight(0x9ad2f0, 2.7);
  fill.position.set(2.0, 4.0, -5.0);
  scene.add(fill);

  // CAD floor aids 3D orientation but does not represent an anatomical plane.
  const grid = new THREE.GridHelper(8, 20, 0x456373, 0x294756);
  grid.position.y = -.015;
  grid.material.transparent = true;
  grid.material.opacity = .33;
  scene.add(grid);

  createPlanes();
  setupUI();
  handleResize();
  new ResizeObserver(handleResize).observe(root);
  window.addEventListener('resize', handleResize);

  new GLTFLoader().load('./models/kun.glb', gltf => {
    const horse = gltf.scene;
    horse.traverse(node => {
      if (node.isMesh) {
        node.castShadow = false;
        if (node.material) node.material.side = THREE.DoubleSide;
      }
    });
    scene.add(horse);
    loading.hidden = true;
  }, undefined, showError);

  function animate(time) {
    requestAnimationFrame(animate);
    if (cameraTween) {
      const t = Math.min((time - cameraTween.started) / cameraTween.duration, 1);
      const eased = 1 - Math.pow(1-t,3);
      camera.position.lerpVectors(cameraTween.from, cameraTween.to, eased);
      if (t >= 1) cameraTween = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

try { init(); } catch (error) { showError(error); }
