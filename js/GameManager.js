import * as THREE from 'three';

/* ====================================================================
   GameManager — Regulation State Machine + Environmental Effects
   States: GREEN (calm) | YELLOW (nervous) | RED (overwhelmed)
==================================================================== */
export class GameManager {
  constructor(scene) {
    this.scene      = scene;
    this.state      = 'GREEN';
    this.shakeAmt   = 0;

    // DOM refs
    this.vignetteEl = document.getElementById('vignette');
    this.heartEl    = document.getElementById('heart-icon');
    this.meterEl    = document.getElementById('meter-fill');
    this.labelEl    = document.getElementById('state-label');

    // Start green
    this._applyState();
    this.updateUI();
  }

  // ------------------------------------------------------------------
  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this._applyState();
    this.updateUI();
  }

  // ------------------------------------------------------------------
  _applyState() {
    const s = this.state;
    if (s === 'GREEN') {
      this.scene.fog      = new THREE.FogExp2(0x87CEEB, 0.007);
      this.scene.background.set(0x87CEEB);
      this.vignetteEl.style.opacity = '0';
      this.vignetteEl.style.background = 'transparent';
      this.shakeAmt = 0;

    } else if (s === 'YELLOW') {
      this.scene.fog      = new THREE.FogExp2(0xB0947A, 0.022);
      this.scene.background.set(0xC8956A);
      this.vignetteEl.style.opacity = '0.28';
      this.vignetteEl.style.background =
        'radial-gradient(ellipse at center, transparent 48%, rgba(180,90,0,0.65) 100%)';
      this.shakeAmt = 0.016;

    } else { // RED
      this.scene.fog      = new THREE.FogExp2(0x3A0A0A, 0.042);
      this.scene.background.set(0x5A0A0A);
      this.vignetteEl.style.opacity = '0.58';
      this.vignetteEl.style.background =
        'radial-gradient(ellipse at center, transparent 33%, rgba(160,0,0,0.85) 100%)';
      this.shakeAmt = 0.042;
    }
  }

  // ------------------------------------------------------------------
  updateUI() {
    const MAP = {
      GREEN:  { pct: 100, clr: '#22C55E', label: '🌿 Calm & Ready',     heart: '💚' },
      YELLOW: { pct:  52, clr: '#F59E0B', label: '😰 Feeling Nervous',   heart: '💛' },
      RED:    { pct:  18, clr: '#EF4444', label: '😤 Overwhelmed',        heart: '❤️' },
    };
    const d = MAP[this.state];
    this.meterEl.style.width      = d.pct + '%';
    this.meterEl.style.background = d.clr;
    this.labelEl.textContent      = d.label;
    this.heartEl.textContent      = d.heart;
  }

  // ------------------------------------------------------------------
  update(delta, camera) {
    if (this.shakeAmt <= 0) return;
    camera.position.x += (Math.random() - 0.5) * this.shakeAmt;
    camera.position.y += (Math.random() - 0.5) * this.shakeAmt * 0.4;
  }
}
