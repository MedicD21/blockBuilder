import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const BLOCKS = [
  { id: "wood", name: "WOOD", color: "#8B5E3C", hex: 0x8b5e3c },
  { id: "stone", name: "STONE", color: "#888899", hex: 0x888899 },
  { id: "dirt", name: "DIRT", color: "#7B5230", hex: 0x7b5230 },
  { id: "grass", name: "GRASS", color: "#4CAF50", hex: 0x4caf50 },
  { id: "planks", name: "PLANKS", color: "#C8A86B", hex: 0xc8a86b },
  { id: "brick", name: "BRICK", color: "#B24B3A", hex: 0xb24b3a },
  { id: "glass", name: "GLASS", color: "#9ECFFF", hex: 0x9ecfff },
  { id: "iron", name: "IRON", color: "#C0C0C0", hex: 0xc0c0c0 },
  { id: "sand", name: "SAND", color: "#E8D8A0", hex: 0xe8d8a0 },
  { id: "dark", name: "DARK STN", color: "#444466", hex: 0x444466 },
];

const GRID = 16,
  LAYERS = 8,
  CELL = 1.0;
let selectedBlock = BLOCKS[0];
let eraseMode = false;
let currentLayer = 1;

const placed = Array.from({ length: LAYERS }, () =>
  Array.from({ length: GRID }, () => Array(GRID).fill(null)),
);
const meshMap = {}; // key: "layer-row-col" => Mesh

// Scene
const canvas = document.getElementById("c");
const wrap = document.getElementById("canvas-wrap");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x1a1a2e);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1a1a2e, 30, 60);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
camera.position.set(GRID * 0.8, GRID * 0.9, GRID * 0.8);
camera.lookAt(GRID / 2, 0, GRID / 2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(GRID / 2, 0, GRID / 2);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 4;
controls.maxDistance = 40;
controls.update();

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sun = new THREE.DirectionalLight(0xffeedd, 1.4);
sun.position.set(20, 30, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  near: 1,
  far: 100,
  left: -25,
  right: 25,
  top: 25,
  bottom: -25,
});
sun.shadow.camera.updateProjectionMatrix(); // required after changing frustum bounds
scene.add(sun);

// Ground
const baseMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(GRID, GRID),
  new THREE.MeshLambertMaterial({ color: 0x12122a }),
);
baseMesh.rotation.x = -Math.PI / 2;
baseMesh.position.set(GRID / 2 - 0.5, -0.01, GRID / 2 - 0.5);
baseMesh.receiveShadow = true;
scene.add(baseMesh);

const gridHelper = new THREE.GridHelper(GRID, GRID, 0x3a3a5c, 0x2a2a4c);
gridHelper.position.set(GRID / 2 - 0.5, 0, GRID / 2 - 0.5);
scene.add(gridHelper);

// Ghost plane for raycasting empty grid
const ghostPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(GRID, GRID),
  new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
);
ghostPlane.rotation.x = -Math.PI / 2;
ghostPlane.name = "ghost";
scene.add(ghostPlane);

// Hover preview
const hoverMesh = new THREE.Mesh(
  new THREE.BoxGeometry(CELL * 0.96, CELL * 0.96, CELL * 0.96),
  new THREE.MeshLambertMaterial({
    color: 0xa0c4ff,
    transparent: true,
    opacity: 0.35,
  }),
);
hoverMesh.visible = false;
scene.add(hoverMesh);

// Shared geometries — never dispose these
const blockGeo = new THREE.BoxGeometry(CELL * 0.94, CELL * 0.94, CELL * 0.94);
const _edgesSrc = new THREE.BoxGeometry(CELL * 0.94, CELL * 0.94, CELL * 0.94);
const edgesGeo = new THREE.EdgesGeometry(_edgesSrc);
_edgesSrc.dispose(); // source geometry is no longer needed after EdgesGeometry is built
const edgeMat = new THREE.LineBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.25,
});

// Per-block material cache
const matCache = {};
BLOCKS.forEach((b) => {
  matCache[b.id] = new THREE.MeshLambertMaterial({ color: b.hex });
});

// Resize
function resize() {
  const w = wrap.clientWidth,
    h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(wrap);
resize();

// Ghost plane Y tracks current layer
function updateGhostPlane() {
  const y = (currentLayer - 1) * CELL;
  ghostPlane.position.set(GRID / 2 - 0.5, y, GRID / 2 - 0.5);
  gridHelper.position.y = y;
}
updateGhostPlane();

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse2 = new THREE.Vector2();

function getXY(e) {
  if (e.changedTouches && e.changedTouches.length > 0)
    return {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };
  if (e.touches && e.touches.length > 0)
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function getGridCell(e) {
  const rect = canvas.getBoundingClientRect();
  const { x: cx, y: cy } = getXY(e);
  mouse2.x = ((cx - rect.left) / rect.width) * 2 - 1;
  mouse2.y = -((cy - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse2, camera);

  // Test only parent block meshes (recursive=false avoids hitting LineSegments children)
  const blockMeshes = Object.values(meshMap);
  if (blockMeshes.length > 0) {
    const hits = raycaster.intersectObjects(blockMeshes, false);
    if (hits.length > 0) {
      const hit = hits[0];
      const mesh = hit.object;
      // Safety: skip if userData missing (shouldn't happen but guards the crash)
      if (!mesh.userData || mesh.userData.layer === undefined) {
        // fall through to ghost plane
      } else {
        if (eraseMode) return { type: "block", mesh };

        // Use hit face normal to determine which adjacent cell to place in
        const normal = hit.face
          ? hit.face.normal.clone()
          : new THREE.Vector3(0, 1, 0);
        const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
        normal.applyMatrix3(nm).normalize();

        const { row, col, layer } = mesh.userData;
        const ax = Math.abs(normal.x),
          ay = Math.abs(normal.y),
          az = Math.abs(normal.z);
        let nr = row,
          nc = col,
          nl = layer;

        if (ay >= ax && ay >= az) {
          nl = normal.y > 0 ? layer + 1 : layer - 1;
        } else if (ax >= az) {
          nc = normal.x > 0 ? col + 1 : col - 1;
        } else {
          nr = normal.z > 0 ? row + 1 : row - 1;
        }

        if (nl < 1 || nl > LAYERS) return null;
        if (nc < 0 || nc >= GRID || nr < 0 || nr >= GRID) return null;
        return { type: "place", row: nr, col: nc, layer: nl };
      }
    }
  }

  // Ghost plane fallback
  const hits2 = raycaster.intersectObject(ghostPlane);
  if (hits2.length > 0) {
    const pt = hits2[0].point;
    const col = Math.floor(pt.x + 0.5);
    const row = Math.floor(pt.z + 0.5);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return null;
    if (eraseMode) return null;
    return { type: "place", row, col, layer: currentLayer };
  }
  return null;
}

function placeBlock(row, col, layer) {
  if (layer < 1 || layer > LAYERS) return;
  if (row < 0 || row >= GRID || col < 0 || col >= GRID) return;
  if (placed[layer - 1][row][col]) return;
  placed[layer - 1][row][col] = selectedBlock.id;

  // Use shared materials directly — no clone needed since blocks of the same type
  // are visually identical. This avoids creating up to 2 × 2048 throwaway GPU objects.
  const mesh = new THREE.Mesh(blockGeo, matCache[selectedBlock.id]);
  mesh.position.set(col, (layer - 1) * CELL + CELL * 0.5, row);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { row, col, layer };
  mesh.add(new THREE.LineSegments(edgesGeo, edgeMat));
  scene.add(mesh);
  meshMap[`${layer}-${row}-${col}`] = mesh;
  updateCounts();
}

function removeBlock(mesh) {
  const { row, col, layer } = mesh.userData;
  placed[layer - 1][row][col] = null;
  scene.remove(mesh);
  // Do NOT dispose materials here — they are shared across all blocks of the same type.
  // matCache entries and edgeMat live for the full page lifetime and are intentionally
  // kept alive so other meshes can continue using them.
  delete meshMap[`${layer}-${row}-${col}`];
  updateCounts();
}

function updateCounts() {
  const counts = {};
  BLOCKS.forEach((b) => (counts[b.id] = 0));
  for (let l = 0; l < LAYERS; l++)
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (placed[l][r][c]) counts[placed[l][r][c]]++;
  const list = document.getElementById("count-list");
  list.innerHTML = "";
  let total = 0;
  BLOCKS.forEach((b) => {
    if (!counts[b.id]) return;
    total += counts[b.id];
    const row = document.createElement("div");
    row.className = "count-row";
    row.innerHTML = `<div class="swatch" style="background:${b.color}"></div><div class="label">${b.name}</div><div class="num">${counts[b.id]}</div>`;
    list.appendChild(row);
  });
  document.getElementById("total-num").textContent = total;
}

// UI: Palette
const paletteEl = document.getElementById("palette");
BLOCKS.forEach((b) => {
  const btn = document.createElement("button");
  btn.className = "block-btn" + (b.id === selectedBlock.id ? " active" : "");
  btn.dataset.id = b.id;
  btn.innerHTML = `<div class="swatch" style="background:${b.color}"></div>${b.name}`;
  btn.addEventListener("click", () => {
    selectedBlock = b;
    eraseMode = false;
    document.getElementById("erase-btn").classList.remove("active");
    document
      .querySelectorAll(".block-btn")
      .forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");
    hoverMesh.material.color.set(b.hex);
    hoverMesh.material.opacity = 0.35;
  });
  paletteEl.appendChild(btn);
});

// UI: Erase
document.getElementById("erase-btn").addEventListener("click", () => {
  eraseMode = !eraseMode;
  document.getElementById("erase-btn").classList.toggle("active", eraseMode);
  document
    .querySelectorAll(".block-btn")
    .forEach((el) => el.classList.remove("active"));
  hoverMesh.material.color.set(eraseMode ? 0xff4444 : selectedBlock.hex);
  hoverMesh.material.opacity = eraseMode ? 0.5 : 0.35;
});

// UI: Layer
function updateLayerUI() {
  document.getElementById("layer-val").textContent = currentLayer;
  updateGhostPlane();
}
document.getElementById("layer-up").addEventListener("click", () => {
  if (currentLayer < LAYERS) {
    currentLayer++;
    updateLayerUI();
  }
});
document.getElementById("layer-down").addEventListener("click", () => {
  if (currentLayer > 1) {
    currentLayer--;
    updateLayerUI();
  }
});

// UI: Clear
document.getElementById("clear-btn").addEventListener("click", () => {
  Object.values(meshMap).forEach((m) => {
    scene.remove(m);
    // Materials are shared — do not dispose them here.
  });
  for (const k in meshMap) delete meshMap[k];
  for (let l = 0; l < LAYERS; l++)
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++) placed[l][r][c] = null;
  updateCounts();
});

// Pointer handling
let pointerMoved = false;
let pointerDownPos = { x: 0, y: 0 };

canvas.addEventListener("mousedown", (e) => {
  const { x, y } = getXY(e);
  pointerDownPos = { x, y };
  pointerMoved = false;
});
canvas.addEventListener(
  "touchstart",
  (e) => {
    const { x, y } = getXY(e);
    pointerDownPos = { x, y };
    pointerMoved = false;
  },
  { passive: true },
);

canvas.addEventListener("mousemove", (e) => {
  const { x, y } = getXY(e);
  if (Math.hypot(x - pointerDownPos.x, y - pointerDownPos.y) > 6)
    pointerMoved = true;
  // Desktop hover preview — only show when the target cell is actually free
  const info = getGridCell(e);
  if (
    info &&
    info.type === "place" &&
    !placed[info.layer - 1][info.row][info.col]
  ) {
    hoverMesh.visible = true;
    hoverMesh.position.set(
      info.col,
      (info.layer - 1) * CELL + CELL * 0.5,
      info.row,
    );
  } else hoverMesh.visible = false;
});
canvas.addEventListener(
  "touchmove",
  (e) => {
    const { x, y } = getXY(e);
    if (Math.hypot(x - pointerDownPos.x, y - pointerDownPos.y) > 6)
      pointerMoved = true;
  },
  { passive: true },
);

let lastTouchEnd = 0;

function onUp(e) {
  try {
    // Safari fires both touchend AND mouseup — ignore the mouseup that follows a touch
    if (e.type === "mouseup" && Date.now() - lastTouchEnd < 500) return;
    if (e.type === "touchend") lastTouchEnd = Date.now();
    if (pointerMoved) return;
    const info = getGridCell(e);
    if (!info) return;
    if (info.type === "block") removeBlock(info.mesh);
    else if (info.type === "place") placeBlock(info.row, info.col, info.layer);
  } catch (err) {
    console.error("tap error:", err);
  }
}
canvas.addEventListener("mouseup", onUp);
canvas.addEventListener("touchend", onUp);

// Render loop
(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
})();

updateCounts();
updateLayerUI();
