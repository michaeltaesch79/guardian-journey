import * as THREE from 'three';

/* ====================================================================
   Player — Capsule mesh, WASD tank controls, Space breathing mechanic
==================================================================== */

const SPEEDS = { GREEN: 5.0, YELLOW: 4.0, RED: 2.5 };
const TURN_SPEED = 1.9; // radians / second
const BREATH_CYCLE_SEC = 8;    // 4s inhale + 4s exhale
const BREATH_CYCLES_NEEDED = 2;

export class Player {
  constructor(scene) {
    this.isBreathing  = false;
    this.breathTimer  = 0;
    this.breathCycles = 0;
    this.breathRing   = null;
    this.onCalmReached = null; // set by caller

    this.mesh = this._buildMesh(scene);
    scene.add(this.mesh);

    this._breathHint = document.getElementById('breathing-hint');
  }

  // ------------------------------------------------------------------
  _buildMesh(scene) {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.48, 1.1, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x4ADE80, roughness: 0.5, metalness: 0.1 })
    );
    body.position.y = 0.95;
    body.castShadow = true;
    group.add(body);

    // Eyes (direction indicator)
    const eyeMat  = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const eyeGeo  = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeL    = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR    = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.2, 1.65, 0.4);
    eyeR.position.set( 0.2, 1.65, 0.4);
    group.add(eyeL, eyeR);

    // Shield emblem on chest
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.6, roughness: 0.3 })
    );
    shield.position.set(0, 1.2, 0.42);
    group.add(shield);

    group.position.set(0, 0, 0);
    return group;
  }

  // ------------------------------------------------------------------
  startBreathing(scene) {
    if (this.isBreathing) return;
    this.isBreathing  = true;
    this.breathTimer  = 0;
    this.breathCycles = 0;

    const torusGeo = new THREE.TorusGeometry(2, 0.14, 16, 64);
    const torusMat = new THREE.MeshStandardMaterial({
      color:           0x2DD4BF,
      emissive:        new THREE.Color(0x2DD4BF),
      emissiveIntensity: 0.9,
      transparent:     true,
      opacity:         0.75,
    });
    this.breathRing = new THREE.Mesh(torusGeo, torusMat);
    this.breathRing.rotation.x = Math.PI / 2; // lie flat
    this.breathRing.position.copy(this.mesh.position);
    this.breathRing.position.y = 0.15;
    scene.add(this.breathRing);

    this._breathHint.style.display = 'block';
    this._breathHint.textContent   = '🌬️ Breathe IN… (1/2) — Hold SPACE';
    showToast('✨ Hold SPACE to calm your breathing…');
  }

  // ------------------------------------------------------------------
  cancelBreathing() {
    if (!this.isBreathing) return;
    this.isBreathing = false;
    this._removeRing();
    this._breathHint.style.display = 'none';
    showToast('🌬️ Keep going! Hold SPACE for 2 full breaths.');
  }

  // ------------------------------------------------------------------
  _removeRing() {
    if (this.breathRing) {
      this.breathRing.parent && this.breathRing.parent.remove(this.breathRing);
      this.breathRing.geometry.dispose();
      this.breathRing.material.dispose();
      this.breathRing = null;
    }
  }

  // ------------------------------------------------------------------
  _finishBreathing(gameManager) {
    this.isBreathing = false;
    this._removeRing();
    this._breathHint.style.display = 'none';
    gameManager.setState('GREEN');
    showToast('💚 Amazing! You breathed through it. You are calm and ready!');
  }

  // ------------------------------------------------------------------
  update(delta, keys, gameManager, scene) {
    if (this.isBreathing) {
      this._updateBreathing(delta, gameManager, scene);
      return; // no movement while breathing
    }

    const spd = SPEEDS[gameManager.state] ?? SPEEDS.GREEN;

    // Turn with A/D
    if (keys['KeyA'] || keys['ArrowLeft'])
      this.mesh.rotation.y += TURN_SPEED * delta;
    if (keys['KeyD'] || keys['ArrowRight'])
      this.mesh.rotation.y -= TURN_SPEED * delta;

    // Forward vector (pointing into screen by default)
    const fwd = new THREE.Vector3(
      -Math.sin(this.mesh.rotation.y),
      0,
      -Math.cos(this.mesh.rotation.y)
    );

    if (keys['KeyW'] || keys['ArrowUp'])
      this.mesh.position.addScaledVector(fwd, spd * delta);
    if (keys['KeyS'] || keys['ArrowDown'])
      this.mesh.position.addScaledVector(fwd, -spd * 0.55 * delta);

    // RED-state control drift
    if (gameManager.state === 'RED') {
      this.mesh.position.x += (Math.random() - 0.5) * 0.06;
      this.mesh.position.z += (Math.random() - 0.5) * 0.06;
    }

    // Keep on ground; clamp world bounds
    this.mesh.position.y = 0;
    this.mesh.position.x = Math.max(-72, Math.min(72, this.mesh.position.x));
    this.mesh.position.z = Math.max(-72, Math.min(30, this.mesh.position.z));
  }

  // ------------------------------------------------------------------
  _updateBreathing(delta, gameManager, scene) {
    this.breathTimer += delta;

    const cycle   = this.breathTimer / BREATH_CYCLE_SEC;
    const intCycles = Math.floor(cycle);

    // New cycle just finished?
    if (intCycles > this.breathCycles) {
      this.breathCycles = intCycles;
      if (this.breathCycles >= BREATH_CYCLES_NEEDED) {
        this._finishBreathing(gameManager);
        return;
      }
      // Partial improvement: RED → YELLOW after cycle 1
      if (gameManager.state === 'RED') gameManager.setState('YELLOW');
      showToast('💛 Good breath! One more cycle for full calm…');
    }

    // Cycle progress 0→1
    const t = (this.breathTimer % BREATH_CYCLE_SEC) / BREATH_CYCLE_SEC;
    const phase = t < 0.5 ? t * 2 : (1 - t) * 2; // 0→1→0 (inhale / exhale)
    const scale = 0.4 + phase * 2.0; // 0.4 ↔ 2.4

    if (this.breathRing) {
      this.breathRing.scale.set(scale, scale, 1);
      this.breathRing.position.copy(this.mesh.position);
      this.breathRing.position.y = 0.15;
      this.breathRing.rotation.z += delta * 0.35;
      this.breathRing.material.opacity = 0.4 + phase * 0.45;
    }

    // Update UI hint
    const phaseLabel = t < 0.5 ? 'Breathe IN…' : 'Breathe OUT…';
    this._breathHint.textContent =
      '🌬️ ' + phaseLabel + ' (' + (this.breathCycles + 1) + '/' + BREATH_CYCLES_NEEDED + ') — Hold SPACE';
  }
}

// Global toast helper (shared utility)
export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3000);
}
