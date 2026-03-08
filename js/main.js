import * as THREE from 'three';
import { GameManager }    from './GameManager.js';
import { Player, showToast } from './Player.js';
import { World }          from './World.js';
import { DialogueSystem } from './DialogueSystem.js';
import { SocialStory, showReflection } from './SocialStory.js';

// ====================================================================
// Scene / Renderer
// ====================================================================
const canvas   = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog        = new THREE.FogExp2(0x87CEEB, 0.004);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 8, 14);

const clock = new THREE.Clock();

// ====================================================================
// Lighting
// ====================================================================
scene.add(new THREE.AmbientLight(0xFFEEDD, 0.65));

const sun = new THREE.DirectionalLight(0xFFF4D6, 1.3);
sun.position.set(40, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left   = -100;
sun.shadow.camera.right  =  100;
sun.shadow.camera.top    =  100;
sun.shadow.camera.bottom = -100;
sun.shadow.camera.far    =  200;
scene.add(sun);

// ====================================================================
// Systems
// ====================================================================
const gameManager    = new GameManager(scene);
const dialogueSystem = new DialogueSystem();
let player, world;
let gameActive = false;

function initGame() {
  player = new Player(scene);
  world  = new World(scene, gameManager, dialogueSystem, onQuestComplete);
}

function onQuestComplete(crystalCount) {
  gameActive = false;
  setTimeout(() => showReflection(crystalCount), 500);
}

// ====================================================================
// Input
// ====================================================================
const keys = {};

document.addEventListener('keydown', e => {
  if (e.code === 'Space') e.preventDefault();
  keys[e.code] = true;

  if (e.code === 'KeyE' && gameActive && !dialogueSystem.active) {
    world.tryInteract(player);
  }
});

document.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Space' && player && player.isBreathing) {
    player.cancelBreathing();
  }
});

// ====================================================================
// Resize
// ====================================================================
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ====================================================================
// Camera follow
// ====================================================================
const _camOffset = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookAt    = new THREE.Vector3();

function updateCamera(delta) {
  _camOffset.set(0, 5.5, 9);
  _camOffset.applyEuler(new THREE.Euler(0, player.mesh.rotation.y, 0));
  _camTarget.copy(player.mesh.position).add(_camOffset);
  camera.position.lerp(_camTarget, Math.min(1.0, 10 * delta));
  _lookAt.copy(player.mesh.position).add(new THREE.Vector3(0, 1.5, 0));
  camera.lookAt(_lookAt);
}

// ====================================================================
// Game loop
// ====================================================================
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.04);

  if (gameActive) {
    if (keys['Space'] && !dialogueSystem.active) {
      player.startBreathing(scene);
    }

    if (!dialogueSystem.active) {
      player.update(delta, keys, gameManager, scene);
      world.update(delta, player);
    } else {
      // Keep crystals spinning even during dialogue
      world.spinCrystals(delta);
    }

    updateCamera(delta);
    gameManager.update(delta, camera);
  }

  renderer.render(scene, camera);
}

// ====================================================================
// Boot
// ====================================================================
initGame();
animate();

const story = new SocialStory(() => {
  gameActive = true;
  gameManager.updateUI();
  showToast('🗺️ Use WASD to explore. Press E near creatures to talk!');
});
story.start();
