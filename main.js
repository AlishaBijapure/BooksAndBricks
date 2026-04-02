import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ===== Scene Setup =====
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); // aspect updated below
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

const container = document.getElementById('canvas-wrapper');
container.appendChild(renderer.domElement);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Responsive Camera
const updateCameraAndRenderer = () => {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  // Update aspect ratio
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);

  // Responsive camera Z distance and Target Pan Offset
  const screenWidth = window.innerWidth;
  if (screenWidth < 480) {
    camera.position.set(10, 0, 45); // mobile
    controls.target.set(0, -1.0, 0); // pan camera down to explicitly push cup up
  } else if (screenWidth < 768) {
    camera.position.set(10, 0, 35); // tablet
    controls.target.set(0, -0.5, 0);
  } else {
    camera.position.set(10, 0, 30); // desktop
    controls.target.set(0, 1, 0);
  }
  controls.update();
};

updateCameraAndRenderer();
window.addEventListener('resize', updateCameraAndRenderer);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(-2, 0, 2);
dirLight.castShadow = true;
scene.add(dirLight);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x333333 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Animation Variables
let fluidFrames = [];
let currentFrame = 0;
let frameDelay = 1;
let frameCount = 0;
let cupGroup = null;
let coffeeStarted = false;
let scrollTriggered = false;

const toRadians = deg => THREE.MathUtils.degToRad(deg);

const initialRotation = { x: toRadians(5), y: toRadians(-70), z: toRadians(-7) };
const finalRotation = { x: toRadians(45), y: toRadians(-70), z: toRadians(17) };
const initialPosition = { x: 0, y: 0, z: 0 };
const finalPosition = { x: 1, y: 0.76, z: 1.9 };

const fluidPosition = { x: 1, y: -11.5, z: 4 };
const fluidInitialRotation = { x: 0, y: toRadians(-90), z: 0 };

// Load Model
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('libs/draco/');
loader.setDRACOLoader(dracoLoader);

loader.load(
  'node-draco.glb',
  (gltf) => {
    const allChildren = gltf.scene.children;

    // Fluid frames
    fluidFrames = allChildren.filter(child => /^Fluid_Frame_(\d+)$/.test(child.name));
    fluidFrames.sort((a, b) => {
      const aNum = parseInt(a.name.split('_').pop());
      const bNum = parseInt(b.name.split('_').pop());
      return aNum - bNum;
    });

    fluidFrames.forEach(mesh => {
      mesh.visible = false;
      mesh.position.set(fluidPosition.x, fluidPosition.y, fluidPosition.z);
      mesh.rotation.set(fluidInitialRotation.x, fluidInitialRotation.y, fluidInitialRotation.z);
      scene.add(mesh);
    });

    // Cup
    cupGroup = allChildren.find(child => child.name === 'samplecup');
    if (cupGroup) {
      cupGroup.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
      cupGroup.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
      scene.add(cupGroup);
    } else {
      console.warn('⚠️ Cup group not found.');
    }

    // Make materials double-sided and receive light
    gltf.scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.material.side = THREE.DoubleSide;
      }
    });

    const el = document.getElementById('progress-container');
    if (el) el.style.display = 'none';

    animate();
  },
  (xhr) => {
    const progress = (xhr.loaded / xhr.total * 100).toFixed(1);
    const el = document.getElementById('progress-container');
    if (el) el.textContent = `Loading model: ${progress}%`;
  },
  (error) => {
    console.error('❌ Error loading model:', error);
    const el = document.getElementById('progress-container');
    if (el) el.textContent = 'Error loading model.';
  }
);

// Scroll Trigger
window.addEventListener('scroll', () => {
  if (!scrollTriggered && window.scrollY > 50) {
    scrollTriggered = true;
    const scrollText = document.getElementById('scroll-instruction');
    if (scrollText) scrollText.style.display = 'none';
  }
});

// Animate
function animate() {
  requestAnimationFrame(animate);

  if (cupGroup && scrollTriggered && !coffeeStarted) {
    cupGroup.rotation.x += (finalRotation.x - cupGroup.rotation.x) * 0.02;
    cupGroup.rotation.y += (finalRotation.y - cupGroup.rotation.y) * 0.02;
    cupGroup.rotation.z += (finalRotation.z - cupGroup.rotation.z) * 0.02;
    cupGroup.position.x += (finalPosition.x - cupGroup.position.x) * 0.02;
    cupGroup.position.y += (finalPosition.y - cupGroup.position.y) * 0.02;
    cupGroup.position.z += (finalPosition.z - cupGroup.position.z) * 0.02;

    const rot = cupGroup.rotation, pos = cupGroup.position;
    if (
      Math.abs(rot.x - finalRotation.x) < 0.3 &&
      Math.abs(rot.y - finalRotation.y) < 0.3 &&
      Math.abs(rot.z - finalRotation.z) < 0.3 &&
      Math.abs(pos.x - finalPosition.x) < 0.3 &&
      Math.abs(pos.y - finalPosition.y) < 0.3 &&
      Math.abs(pos.z - finalPosition.z) < 0.3
    ) {
      coffeeStarted = true;
      if (fluidFrames[0]) fluidFrames[0].visible = true;
    }
  }

  if (coffeeStarted && fluidFrames.length > 0) {
    frameCount++;
    if (frameCount % frameDelay === 0) {
      fluidFrames[currentFrame].visible = false;
      currentFrame = (currentFrame + 1) % fluidFrames.length;
      fluidFrames[currentFrame].visible = true;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
