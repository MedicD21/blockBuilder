"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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

const GRID = 30;
const LAYERS = 18;
const CELL = 1;
const CLEAR_EVENT = "block-builder-clear";

function buildEmptyGrid() {
  return Array.from({ length: LAYERS }, () =>
    Array.from({ length: GRID }, () => Array(GRID).fill(null)),
  );
}

function createZeroCounts() {
  return BLOCKS.reduce((acc, block) => {
    acc[block.id] = 0;
    return acc;
  }, {});
}

export default function BlockBuilder() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const hoverMeshRef = useRef(null);
  const updateGhostRef = useRef(() => {});

  const selectedBlockRef = useRef(BLOCKS[0]);
  const eraseModeRef = useRef(false);
  const currentLayerRef = useRef(1);

  const [selectedBlockId, setSelectedBlockId] = useState(BLOCKS[0].id);
  const [eraseMode, setEraseMode] = useState(false);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [counts, setCounts] = useState(createZeroCounts);

  useEffect(() => {
    const block = BLOCKS.find((entry) => entry.id === selectedBlockId);
    if (!block) return;

    selectedBlockRef.current = block;
    if (!eraseModeRef.current && hoverMeshRef.current) {
      hoverMeshRef.current.material.color.set(block.hex);
      hoverMeshRef.current.material.opacity = 0.35;
    }
  }, [selectedBlockId]);

  useEffect(() => {
    eraseModeRef.current = eraseMode;
    if (!hoverMeshRef.current) return;

    hoverMeshRef.current.material.color.set(
      eraseMode ? 0xff4444 : selectedBlockRef.current.hex,
    );
    hoverMeshRef.current.material.opacity = eraseMode ? 0.5 : 0.35;
  }, [eraseMode]);

  useEffect(() => {
    currentLayerRef.current = currentLayer;
    updateGhostRef.current();
  }, [currentLayer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const placed = buildEmptyGrid();
    const meshMap = {};

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
    sun.shadow.camera.updateProjectionMatrix();
    scene.add(sun);

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

    const ghostPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID, GRID),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    ghostPlane.rotation.x = -Math.PI / 2;
    scene.add(ghostPlane);

    const hoverMesh = new THREE.Mesh(
      new THREE.BoxGeometry(CELL * 0.96, CELL * 0.96, CELL * 0.96),
      new THREE.MeshLambertMaterial({
        color: selectedBlockRef.current.hex,
        transparent: true,
        opacity: 0.35,
      }),
    );
    hoverMesh.visible = false;
    scene.add(hoverMesh);
    hoverMeshRef.current = hoverMesh;

    const blockGeo = new THREE.BoxGeometry(
      CELL * 0.94,
      CELL * 0.94,
      CELL * 0.94,
    );
    const edgesSource = new THREE.BoxGeometry(
      CELL * 0.94,
      CELL * 0.94,
      CELL * 0.94,
    );
    const edgesGeo = new THREE.EdgesGeometry(edgesSource);
    edgesSource.dispose();

    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
    });

    const matCache = {};
    BLOCKS.forEach((block) => {
      matCache[block.id] = new THREE.MeshLambertMaterial({ color: block.hex });
    });

    const updateCounts = () => {
      const nextCounts = createZeroCounts();
      for (let l = 0; l < LAYERS; l += 1) {
        for (let r = 0; r < GRID; r += 1) {
          for (let c = 0; c < GRID; c += 1) {
            const blockId = placed[l][r][c];
            if (blockId) nextCounts[blockId] += 1;
          }
        }
      }
      setCounts(nextCounts);
    };

    const placeBlock = (row, col, layer) => {
      if (layer < 1 || layer > LAYERS) return;
      if (row < 0 || row >= GRID || col < 0 || col >= GRID) return;
      if (placed[layer - 1][row][col]) return;

      const selected = selectedBlockRef.current;
      placed[layer - 1][row][col] = selected.id;

      const mesh = new THREE.Mesh(blockGeo, matCache[selected.id]);
      mesh.position.set(col, (layer - 1) * CELL + CELL * 0.5, row);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { row, col, layer };
      mesh.add(new THREE.LineSegments(edgesGeo, edgeMat));

      scene.add(mesh);
      meshMap[`${layer}-${row}-${col}`] = mesh;
      updateCounts();
    };

    const removeBlock = (mesh) => {
      const { row, col, layer } = mesh.userData;
      placed[layer - 1][row][col] = null;
      scene.remove(mesh);
      delete meshMap[`${layer}-${row}-${col}`];
      updateCounts();
    };

    const clearAllBlocks = () => {
      Object.values(meshMap).forEach((mesh) => {
        scene.remove(mesh);
      });
      Object.keys(meshMap).forEach((key) => {
        delete meshMap[key];
      });

      for (let l = 0; l < LAYERS; l += 1) {
        for (let r = 0; r < GRID; r += 1) {
          for (let c = 0; c < GRID; c += 1) {
            placed[l][r][c] = null;
          }
        }
      }

      updateCounts();
    };

    const resize = () => {
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrap);
    resize();

    const updateGhostPlane = () => {
      const y = (currentLayerRef.current - 1) * CELL;
      ghostPlane.position.set(GRID / 2 - 0.5, y, GRID / 2 - 0.5);
      gridHelper.position.y = y;
    };
    updateGhostRef.current = updateGhostPlane;
    updateGhostPlane();

    const raycaster = new THREE.Raycaster();
    const mouse2 = new THREE.Vector2();

    const getXY = (event) => {
      if (event.changedTouches?.length > 0) {
        return {
          x: event.changedTouches[0].clientX,
          y: event.changedTouches[0].clientY,
        };
      }

      if (event.touches?.length > 0) {
        return {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }

      return { x: event.clientX, y: event.clientY };
    };

    const getGridCell = (event) => {
      const rect = canvas.getBoundingClientRect();
      const { x: cx, y: cy } = getXY(event);
      mouse2.x = ((cx - rect.left) / rect.width) * 2 - 1;
      mouse2.y = -((cy - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse2, camera);

      const blockMeshes = Object.values(meshMap);
      if (blockMeshes.length > 0) {
        const hits = raycaster.intersectObjects(blockMeshes, false);
        if (hits.length > 0) {
          const hit = hits[0];
          const mesh = hit.object;

          if (mesh.userData?.layer === undefined) {
            return null;
          }

          if (eraseModeRef.current) {
            return { type: "block", mesh };
          }

          const normal = hit.face
            ? hit.face.normal.clone()
            : new THREE.Vector3(0, 1, 0);
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(
            mesh.matrixWorld,
          );
          normal.applyMatrix3(normalMatrix).normalize();

          const { row, col, layer } = mesh.userData;
          const absX = Math.abs(normal.x);
          const absY = Math.abs(normal.y);
          const absZ = Math.abs(normal.z);

          let nextRow = row;
          let nextCol = col;
          let nextLayer = layer;

          if (absY >= absX && absY >= absZ) {
            nextLayer = normal.y > 0 ? layer + 1 : layer - 1;
          } else if (absX >= absZ) {
            nextCol = normal.x > 0 ? col + 1 : col - 1;
          } else {
            nextRow = normal.z > 0 ? row + 1 : row - 1;
          }

          if (nextLayer < 1 || nextLayer > LAYERS) return null;
          if (nextCol < 0 || nextCol >= GRID || nextRow < 0 || nextRow >= GRID)
            return null;

          return {
            type: "place",
            row: nextRow,
            col: nextCol,
            layer: nextLayer,
          };
        }
      }

      const planeHits = raycaster.intersectObject(ghostPlane);
      if (planeHits.length > 0) {
        const point = planeHits[0].point;
        const col = Math.floor(point.x + 0.5);
        const row = Math.floor(point.z + 0.5);

        if (col < 0 || col >= GRID || row < 0 || row >= GRID) return null;
        if (eraseModeRef.current) return null;

        return {
          type: "place",
          row,
          col,
          layer: currentLayerRef.current,
        };
      }

      return null;
    };

    let pointerMoved = false;
    let pointerDownPos = { x: 0, y: 0 };
    let lastTouchEnd = 0;

    const onPointerDown = (event) => {
      const { x, y } = getXY(event);
      pointerDownPos = { x, y };
      pointerMoved = false;
    };

    const onPointerMove = (event) => {
      const { x, y } = getXY(event);
      if (Math.hypot(x - pointerDownPos.x, y - pointerDownPos.y) > 6) {
        pointerMoved = true;
      }

      if (event.type === "mousemove") {
        const info = getGridCell(event);
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
        } else {
          hoverMesh.visible = false;
        }
      }
    };

    const onPointerUp = (event) => {
      try {
        if (event.type === "mouseup" && Date.now() - lastTouchEnd < 500) return;
        if (event.type === "touchend") lastTouchEnd = Date.now();
        if (pointerMoved) return;

        const info = getGridCell(event);
        if (!info) return;

        if (info.type === "block") {
          removeBlock(info.mesh);
        } else if (info.type === "place") {
          placeBlock(info.row, info.col, info.layer);
        }
      } catch (error) {
        console.error("tap error:", error);
      }
    };

    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("touchstart", onPointerDown, { passive: true });
    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("touchmove", onPointerMove, { passive: true });
    canvas.addEventListener("mouseup", onPointerUp);
    canvas.addEventListener("touchend", onPointerUp);
    window.addEventListener(CLEAR_EVENT, clearAllBlocks);

    let animationFrameId;
    const animate = () => {
      animationFrameId = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    updateCounts();

    return () => {
      canvas.removeEventListener("mousedown", onPointerDown);
      canvas.removeEventListener("touchstart", onPointerDown);
      canvas.removeEventListener("mousemove", onPointerMove);
      canvas.removeEventListener("touchmove", onPointerMove);
      canvas.removeEventListener("mouseup", onPointerUp);
      canvas.removeEventListener("touchend", onPointerUp);
      window.removeEventListener(CLEAR_EVENT, clearAllBlocks);

      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();

      Object.values(meshMap).forEach((mesh) => {
        scene.remove(mesh);
      });

      hoverMeshRef.current = null;
      updateGhostRef.current = () => {};

      blockGeo.dispose();
      edgesGeo.dispose();
      edgeMat.dispose();
      baseMesh.geometry.dispose();
      baseMesh.material.dispose();
      ghostPlane.geometry.dispose();
      ghostPlane.material.dispose();
      hoverMesh.geometry.dispose();
      hoverMesh.material.dispose();
      Object.values(matCache).forEach((material) => material.dispose());

      renderer.dispose();
    };
  }, []);

  const total = useMemo(
    () => Object.values(counts).reduce((sum, count) => sum + count, 0),
    [counts],
  );

  return (
    <main className='flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#1a1a2e] text-[#e0e0e0]'>
      <header className='z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-[#3a3a5c] bg-[rgba(10,10,20,.95)] px-4 py-4 sm:px-6 sm:py-5'>
        <div className='flex items-center gap-2'>
          <Image
            alt='Pokopia logo'
            className='h-14 w-14 rounded-md border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-0.5 sm:h-16 sm:w-16'
            height={64}
            priority
            src='/images/logo/pokopiaplannerdb.png'
            width={64}
          />
          <h1 className='whitespace-nowrap text-[18px] font-bold uppercase tracking-[0.21em] text-[#a0c4ff] sm:text-[22px] lg:text-[24px]'>
            Block Builder
          </h1>
        </div>
        <p className='hidden whitespace-nowrap text-[10px] tracking-[0.1em] text-[#666] lg:block'>
          TAP = PLACE | DRAG = ROTATE | PINCH = ZOOM
        </p>
        <div className='flex-1' />
        <nav className='flex w-full justify-end gap-3 border-t border-[#3a3a5c] pt-2 sm:w-auto sm:border-t-0 sm:pt-0'>
          <Link
            className='whitespace-nowrap text-[12px] tracking-[0.1em] text-[#f2a067] transition-colors hover:text-[#a0c4ff] sm:text-[13px] lg:text-[16px]'
            href='/pokemon-explorer'
          >
            POKEMON ↗
          </Link>
          <Link
            className='whitespace-nowrap text-[12px] tracking-[0.1em] text-[#f2a067] transition-colors hover:text-[#a0c4ff] sm:text-[13px] lg:text-[16px]'
            href='/items'
          >
            ITEMS ↗
          </Link>
        </nav>
      </header>

      <div className='flex flex-1 flex-col lg:min-h-0 lg:flex-row'>
        <div
          className='relative min-h-[38dvh] flex-1 sm:min-h-[44dvh] lg:min-h-0'
          ref={wrapRef}
        >
          <canvas className='block h-full w-full' ref={canvasRef} />
          <div className='pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#3a3a5c] bg-black/60 px-3 py-1 text-[9px] tracking-[0.1em] text-[#666] sm:text-[10px]'>
            Tap grid to place blocks
          </div>
        </div>

        <aside className='flex w-full flex-shrink-0 flex-col border-t-2 border-[#3a3a5c] bg-[rgba(10,10,20,.97)] lg:w-[220px] lg:border-l-2 lg:border-t-0 xl:w-[240px]'>
          <div className='border-b border-[#3a3a5c] px-2 pb-1 pt-2'>
            <h2 className='mb-2 text-[10px] uppercase tracking-[0.2em] text-[#666]'>
              Blocks
            </h2>
            <div className='grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1'>
              {BLOCKS.map((block) => {
                const active = !eraseMode && selectedBlockId === block.id;
                return (
                  <button
                    key={block.id}
                    className={`flex w-full items-center gap-2 rounded border px-2 py-1 text-left text-[12px] tracking-[0.08em] transition-all lg:text-[11px] ${
                      active
                        ? "border-[#a0c4ff] bg-[rgba(160,196,255,.15)] text-white"
                        : "border-transparent bg-white/5 text-[#ccc] hover:border-[#555] hover:bg-white/10"
                    }`}
                    onClick={() => {
                      setSelectedBlockId(block.id);
                      setEraseMode(false);
                    }}
                    type='button'
                  >
                    <span
                      className='h-[14px] w-[14px] flex-shrink-0 rounded-[2px] border border-white/15'
                      style={{ background: block.color }}
                    />
                    {block.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className={`mx-2 mb-2 mt-0 rounded border px-2 py-1 text-[11px] tracking-[0.1em] transition-all lg:text-[10px] ${
              eraseMode
                ? "border-[#ff5050] bg-[rgba(255,80,80,.2)] text-white"
                : "border-[#5a2a2a] bg-[rgba(255,80,80,.08)] text-[#ff9090] hover:border-[#ff5050] hover:bg-[rgba(255,80,80,.2)] hover:text-white"
            }`}
            onClick={() => setEraseMode((prev) => !prev)}
            type='button'
          >
            ✕ ERASE
          </button>

          <div className='border-y border-[#3a3a5c] px-2 py-2'>
            <h2 className='mb-1 text-[10px] uppercase tracking-[0.2em] text-[#666]'>
              Layer
            </h2>
            <div className='flex items-center gap-2'>
              <button
                className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[15px] text-[#aaa] transition-colors hover:bg-white/15 lg:h-6 lg:w-6 lg:text-[14px]'
                onClick={() => setCurrentLayer((prev) => Math.max(1, prev - 1))}
                type='button'
              >
                −
              </button>
              <div className='min-w-5 text-center text-[14px] font-bold tracking-[0.08em] text-[#a0c4ff] lg:text-[13px]'>
                {currentLayer}
              </div>
              <button
                className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[15px] text-[#aaa] transition-colors hover:bg-white/15 lg:h-6 lg:w-6 lg:text-[14px]'
                onClick={() =>
                  setCurrentLayer((prev) => Math.min(LAYERS, prev + 1))
                }
                type='button'
              >
                +
              </button>
              <div className='ml-0.5 text-[11px] text-[#555] lg:text-[10px]'>
                / {LAYERS}
              </div>
            </div>
          </div>

          <div className='border-b border-[#3a3a5c] px-2 py-2'>
            <div className='flex items-center justify-between text-[11px] tracking-[0.1em] text-[#888]'>
              TOTAL BLOCKS
              <span className='text-[15px] font-bold text-white'>{total}</span>
            </div>
          </div>

          <div className='max-h-[26dvh] overflow-y-auto px-2 pb-1 pt-2 sm:max-h-[30dvh] lg:flex-1 lg:max-h-none'>
            <h2 className='mb-2 text-[10px] uppercase tracking-[0.2em] text-[#666]'>
              Block Count
            </h2>
            {BLOCKS.filter((block) => counts[block.id] > 0).map((block) => (
              <div
                className='mb-1 flex items-center gap-[7px] text-[12px] text-[#bbb] lg:text-[11px]'
                key={block.id}
              >
                <span
                  className='h-[10px] w-[10px] flex-shrink-0 rounded-[2px] border border-white/15'
                  style={{ background: block.color }}
                />
                <span className='flex-1 text-[11px] tracking-[0.04em] lg:text-[10px]'>
                  {block.name}
                </span>
                <span className='text-[13px] font-bold text-[#a0c4ff] lg:text-[12px]'>
                  {counts[block.id]}
                </span>
              </div>
            ))}

            <div className='mt-2 flex items-center justify-between border-t border-[#3a3a5c] pt-2 text-[11px] tracking-[0.1em] text-[#888] lg:text-[10px]'>
              TOTAL
              <span className='text-[14px] font-bold text-white lg:text-[13px]'>
                {total}
              </span>
            </div>
          </div>

          <button
            className='m-2 rounded border border-[#3a3a5c] bg-transparent px-2 py-1 text-[11px] tracking-[0.1em] text-[#666] transition-all hover:border-[#ff5050] hover:text-[#ff9090] lg:text-[10px]'
            onClick={() => {
              const event = new CustomEvent(CLEAR_EVENT);
              window.dispatchEvent(event);
            }}
            type='button'
          >
            CLEAR ALL
          </button>
        </aside>
      </div>
    </main>
  );
}
