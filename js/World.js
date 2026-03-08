import * as THREE from 'three';
import { showToast } from './Player.js';

/* ====================================================================
   World — biomes, NPCs, crystals, hazard zones, and per-frame updates
==================================================================== */

// --------------- Biome colour palette ---------------
const C = {
  base:       0x3A5C2A,  // grass start zone
  volcano:    0x4A1A0A,  // dark red-brown volcanic ground
  lavaPit:    0xFF4400,  // bright orange lava
  marsh:      0x2A4040,  // grey-blue marsh
  valley:     0x1A2350,  // blue-purple valley
  rock:       0x8B7355,
  crystalOn:  0x67E8F9,
  crystalOff: 0x334455,
};

// ---- NPC definitons: world position + which dialogue + biome type -----
const NPC_DATA = [
  { id: 'anger-1',   pos: [-30, 0,  8], color: 0xEF4444, label: '😠', crystalIdx: 0 },
  { id: 'anger-2',   pos: [-46, 0, -5], color: 0xFF6B35, label: '🔥', crystalIdx: 1 },
  { id: 'anxiety-1', pos: [ 26, 0,  6], color: 0x8B5CF6, label: '👻', crystalIdx: 2 },
  { id: 'anxiety-2', pos: [ 44, 0, -7], color: 0x6366F1, label: '🌫️', crystalIdx: 3 },
  { id: 'sadness-1', pos: [  6, 0,-30], color: 0x3B82F6, label: '😢', crystalIdx: 4 },
  { id: 'sadness-2', pos: [ -8, 0,-46], color: 0x60A5FA, label: '🌧️', crystalIdx: 5 },
];

// ---- Crystal positions (placed near/past their linked NPC) -----
const CRYSTAL_POSITIONS = [
  [-26,  1,  14],   // volcano 1
  [-44,  1,   2],   // volcano 2
  [ 30,  1,  12],   // marsh 1
  [ 46,  1,  -2],   // marsh 2
  [  2,  1, -26],   // valley 1
  [-12,  1, -44],   // valley 2
];

// ---- Lava hazard rectangles [minX, maxX, minZ, maxZ] -----
const LAVA_ZONES = [
  [-22, -14,  -6,  4],
  [-38, -28,  -4,  8],
  [-54, -44,   4, 14],
];

export class World {
  constructor(scene, gameManager, dialogueSystem, onQuestComplete) {
    this.scene          = scene;
    this.gm             = gameManager;
    this.dlg            = dialogueSystem;
    this.onQuestComplete = onQuestComplete;
    this.crystalCount   = 0;
    this.crystalTotal   = CRYSTAL_POSITIONS.length;

    this.npcs     = [];
    this.crystals = [];
    this._nearNPC = null;

    this._biomeLabelEl  = document.getElementById('biome-label');
    this._crystalCountEl = document.getElementById('crystal-count');
    this._updateCrystalUI();

    this._build();
  }

  // ==================================================================
  _build() {
    const s = this.scene;

    // ---- Ground planes ----
    this._addGround(s,   0, 0,    130, 130, C.base,    0.01); // base
    this._addGround(s, -32, 0,     60, 50,  C.volcano, 0.02); // volcano
    this._addGround(s,  35, 0,     56, 50,  C.marsh,   0.02); // marsh
    this._addGround(s,   0, -35,   50, 56,  C.valley,  0.02); // valley

    // ---- Lava pools ----
    LAVA_ZONES.forEach(([x1, x2, z1, z2]) => {
      const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
      const w  = x2 - x1, d = z2 - z1;
      this._addGround(s, cx, cz, w, d, C.lavaPit, 0.05, true);
    });

    // ---- Mountains around the perimeter ----
    this._addMountains(s);

    // ---- Rock obstacles ----
    this._addRocks(s);

    // ---- Path markers (lighter ground strips) ----
    this._addGround(s, -16, 0,  12,  6, 0x6B4D2A, 0.03); // path west
    this._addGround(s,  18, 0,  12,  6, 0x5A6040, 0.03); // path east
    this._addGround(s,   0,-16,  6, 12, 0x2A3A60, 0.03); // path north

    // ---- Starting stone ----
    const stoneGeo = new THREE.CylinderGeometry(3, 3.5, 0.4, 16);
    const stoneMesh = new THREE.Mesh(
      stoneGeo,
      new THREE.MeshStandardMaterial({ color: 0x9A8A7A, roughness: 0.9 })
    );
    stoneMesh.position.set(0, 0.2, 0);
    stoneMesh.receiveShadow = true;
    s.add(stoneMesh);

    // ---- NPCs ----
    NPC_DATA.forEach((nd, i) => this._createNPC(nd, i));

    // ---- Crystals ----
    CRYSTAL_POSITIONS.forEach((pos, i) => this._createCrystal(pos, i));

    // ---- Ambient point lights ----
    const lavaLight = new THREE.PointLight(0xFF5500, 2.5, 40);
    lavaLight.position.set(-30, 3, 0);
    s.add(lavaLight);

    const marshLight = new THREE.PointLight(0x4488AA, 1.8, 50);
    marshLight.position.set(35, 4, 0);
    s.add(marshLight);

    const valleyLight = new THREE.PointLight(0x4466CC, 2.0, 50);
    valleyLight.position.set(0, 4, -35);
    s.add(valleyLight);
  }

  // ------------------------------------------------------------------
  _addGround(scene, cx, cz, w, d, color, y = 0, glow = false) {
    const geo  = new THREE.PlaneGeometry(w, d);
    const mat  = new THREE.MeshStandardMaterial({
      color,
      roughness:  glow ? 0.3 : 0.85,
      metalness:  0,
      emissive:   glow ? new THREE.Color(color) : new THREE.Color(0),
      emissiveIntensity: glow ? 0.4 : 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, y, cz);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  // ------------------------------------------------------------------
  _addMountains(scene) {
    // [x, z, scale, baseColor]  — placed around the map perimeter (±55–70 units)
    const MOUNTAIN_DEFS = [
      // ---- North edge ----
      [-45, -48, 2.2, 0x6A6A70], [-32, -50, 1.7, 0x6A6A70], [-18, -47, 2.6, 0x6A6A70],
      [ -4, -50, 1.8, 0x6A6A70], [ 10, -48, 2.1, 0x6A6A70], [ 24, -50, 1.6, 0x6A6A70],
      [ 38, -47, 2.4, 0x6A6A70], [ 50, -50, 2.0, 0x6A6A70],

      // ---- South edge ----
      [-45,  48, 2.0, 0x6A6A70], [-32,  50, 1.8, 0x6A6A70], [-18,  47, 2.5, 0x6A6A70],
      [ -4,  50, 1.7, 0x6A6A70], [ 10,  48, 2.2, 0x6A6A70], [ 24,  50, 1.9, 0x6A6A70],
      [ 38,  47, 2.0, 0x6A6A70], [ 50,  50, 2.3, 0x6A6A70],

      // ---- West edge (volcano-tinted warm brown) ----
      [-48, -36, 2.1, 0x6A5040], [-50, -20, 1.8, 0x6A5040], [-47,  -4, 2.4, 0x6A5040],
      [-50,  12, 2.0, 0x6A5040], [-48,  28, 1.7, 0x6A5040], [-50,  42, 2.3, 0x6A5040],

      // ---- East edge (marsh-tinted blue-grey) ----
      [ 48, -36, 2.0, 0x4A5A55], [ 50, -20, 1.9, 0x4A5A55], [ 47,  -4, 2.3, 0x4A5A55],
      [ 50,  12, 2.0, 0x4A5A55], [ 48,  28, 1.6, 0x4A5A55], [ 50,  42, 2.2, 0x4A5A55],

      // ---- Corners (taller anchors) ----
      [-50, -50, 3.0, 0x6A6A70], [ 50, -50, 2.8, 0x6A6A70],
      [-50,  50, 2.8, 0x6A6A70], [ 50,  50, 3.0, 0x6A6A70],
    ];

    const snowMat = new THREE.MeshStandardMaterial({ color: 0xDDDDEE, roughness: 0.65 });

    MOUNTAIN_DEFS.forEach(([x, z, sc, baseColor]) => {
      const group = new THREE.Group();

      // --- Base cone ---
      const h1 = 14 * sc, r1 = 8 * sc;
      const base = new THREE.Mesh(
        new THREE.ConeGeometry(r1, h1, 7),
        new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.92 })
      );
      base.position.y = h1 / 2;
      base.castShadow = true;
      group.add(base);

      // --- Middle layer ---
      const h2 = 7 * sc, r2 = 3.2 * sc;
      const mid = new THREE.Mesh(
        new THREE.ConeGeometry(r2, h2, 6),
        new THREE.MeshStandardMaterial({ color: 0x7A7A80, roughness: 0.88 })
      );
      mid.position.y = h1 * 0.78 + h2 / 2;
      mid.castShadow = true;
      group.add(mid);

      // --- Snow peak ---
      const h3 = 3.5 * sc, r3 = 1.4 * sc;
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(r3, h3, 5),
        snowMat
      );
      peak.position.y = h1 * 0.78 + h2 * 0.72 + h3 / 2;
      peak.castShadow = true;
      group.add(peak);

      group.position.set(x, 0, z);
      // Deterministic pseudo-rotation based on position for visual variety
      group.rotation.y = ((x * 7 + z * 3) % 628) / 100;
      scene.add(group);
    });
  }

  // ------------------------------------------------------------------
  _addRocks(scene) {
    const positions = [
      [-18, 2, 5], [-20, 1.5, -6], [-40, 2.5, 12], [-50, 2, -10],
      [14, 2, -3], [20, 1.5, 8], [42, 2, 10], [50, 1.8, -12],
      [3, 1.8, -18], [-6, 2, -22], [8, 2, -48], [-14, 1.5, -50],
    ];
    const mat = new THREE.MeshStandardMaterial({ color: C.rock, roughness: 0.9 });
    positions.forEach(([x, y, z]) => {
      const r   = 0.7 + Math.random() * 1.0;
      const geo = new THREE.DodecahedronGeometry(r, 0);
      const m   = new THREE.Mesh(geo, mat);
      m.position.set(x, r * 0.6, z);
      m.rotation.set(Math.random(), Math.random(), Math.random());
      m.castShadow = true;
      scene.add(m);
    });
  }

  // ------------------------------------------------------------------
  _createNPC(nd, index) {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 0.9, 8, 12),
      new THREE.MeshStandardMaterial({ color: nd.color, roughness: 0.6 })
    );
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);

    // Horns / orbs to make each type distinctive
    const orbGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const orbMat = new THREE.MeshStandardMaterial({
      color: nd.color, emissive: new THREE.Color(nd.color), emissiveIntensity: 0.6
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 1.85;
    group.add(orb);

    // Floating emoji label via a small plane (visual cue)
    group.position.set(...nd.pos);
    this.scene.add(group);

    const npc = { id: nd.id, mesh: group, solved: false, inRange: false, crystalIdx: nd.crystalIdx };
    this.npcs.push(npc);
    return npc;
  }

  // ------------------------------------------------------------------
  _createCrystal([x, y, z], index) {
    const geo  = new THREE.IcosahedronGeometry(0.55, 1);
    const mat  = new THREE.MeshStandardMaterial({
      color:             C.crystalOff,
      emissive:          new THREE.Color(C.crystalOff),
      emissiveIntensity: 0.2,
      transparent:       true,
      opacity:           0.5,
      metalness:         0.4,
      roughness:         0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    // Dim point light (activated on unlock)
    const light = new THREE.PointLight(C.crystalOff, 0, 8);
    light.position.set(x, y + 1, z);
    this.scene.add(light);

    const crystal = { mesh, light, unlocked: false, collected: false, npcIndex: index };
    this.crystals.push(crystal);
    return crystal;
  }

  // ------------------------------------------------------------------
  unlockCrystal(idx) {
    const cr = this.crystals[idx];
    if (!cr || cr.unlocked) return;
    cr.unlocked = true;

    cr.mesh.material.color.set(C.crystalOn);
    cr.mesh.material.emissive.set(C.crystalOn);
    cr.mesh.material.emissiveIntensity = 1.2;
    cr.mesh.material.opacity  = 0.9;
    cr.light.color.set(C.crystalOn);
    cr.light.intensity = 2.2;
  }

  // ------------------------------------------------------------------
  tryInteract(player) {
    const npc = this.npcs.find(n => n.inRange && !n.solved);
    if (!npc || this.dlg.active) return;

    document.getElementById('interact-prompt').style.display = 'none';

    this.dlg.open(npc.id, (success) => {
      if (!success) return;
      npc.solved = true;

      // Float NPC away
      const floatUp = setInterval(() => {
        npc.mesh.position.y += 0.15;
        npc.mesh.scale.multiplyScalar(0.96);
        if (npc.mesh.scale.x < 0.05) {
          clearInterval(floatUp);
          npc.mesh.visible = false;
        }
      }, 30);

      this.unlockCrystal(npc.crystalIdx);
      showToast('💎 Calm Crystal unlocked! Go collect it!');

      // Calm state after a correct dialogue
      if (this.gm.state !== 'GREEN') {
        setTimeout(() => this.gm.setState('GREEN'), 800);
      }
    });
  }

  // ------------------------------------------------------------------
  _checkCrystals(player) {
    this.crystals.forEach(cr => {
      if (cr.collected || !cr.unlocked) return;
      if (player.mesh.position.distanceTo(cr.mesh.position) < 2.2) {
        cr.collected = true;
        cr.mesh.visible = false;
        cr.light.intensity = 0;
        this.crystalCount++;
        this._updateCrystalUI();
        showToast('✨ Calm Crystal collected! (' + this.crystalCount + '/' + this.crystalTotal + ')');

        if (this.crystalCount >= this.crystalTotal) {
          setTimeout(() => this.onQuestComplete(this.crystalCount), 600);
        }
      }
    });
  }

  // ------------------------------------------------------------------
  _checkLava(player) {
    const px = player.mesh.position.x;
    const pz = player.mesh.position.z;
    const inLava = LAVA_ZONES.some(
      ([x1, x2, z1, z2]) => px >= x1 && px <= x2 && pz >= z1 && pz <= z2
    );
    if (inLava && this.gm.state === 'GREEN') {
      this.gm.setState('YELLOW');
      showToast('🌋 Hot lava! You feel overwhelmed. Hold SPACE to breathe!');
    }
  }

  // ------------------------------------------------------------------
  _checkNPCProximity(player) {
    let anyNear = false;
    this.npcs.forEach(npc => {
      if (npc.solved) { npc.inRange = false; return; }
      const dist = player.mesh.position.distanceTo(npc.mesh.position);
      npc.inRange = dist < 4.5;
      if (npc.inRange) anyNear = true;
    });
    document.getElementById('interact-prompt').style.display = anyNear ? 'block' : 'none';
  }

  // ------------------------------------------------------------------
  _updateBiomeLabel(player) {
    const x = player.mesh.position.x;
    const z = player.mesh.position.z;
    let label = '⬆️ Explore the three islands!';
    if (x < -10) label = '🌋 Volcanic Valley — Anger Island';
    else if (x > 10) label = '🌫️ Misty Marsh — Worry Island';
    else if (z < -10) label = '💙 Blue Valley — Sadness Island';
    this._biomeLabelEl.textContent = label;
  }

  // ------------------------------------------------------------------
  _updateCrystalUI() {
    const el = document.getElementById('crystal-count');
    if (el) el.textContent = this.crystalCount + ' / ' + this.crystalTotal;
  }

  // ------------------------------------------------------------------
  spinCrystals(delta) {
    this.crystals.forEach((cr, i) => {
      if (!cr.collected) {
        cr.mesh.rotation.y += delta * (cr.unlocked ? 1.8 : 0.5);
        cr.mesh.position.y = CRYSTAL_POSITIONS[i][1] +
          Math.sin(Date.now() * 0.001 + i * 1.1) * 0.18;
      }
    });
  }

  // ------------------------------------------------------------------
  update(delta, player) {
    this.spinCrystals(delta);
    this._checkNPCProximity(player);
    this._checkLava(player);
    this._checkCrystals(player);
    this._updateBiomeLabel(player);
  }
}
