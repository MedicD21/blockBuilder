"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const BUILDER_SECTIONS = [
  {
    id: "blocks",
    title: "Blocks",
    items: [
      {
        id: "woodenwall",
        name: "Wooden Wall",
        color: "#8B5E3C",
        hex: 0x8b5e3c,
        shape: "cube",
      },
      {
        id: "stonebrickwall",
        name: "Stone brick wall",
        color: "#888899",
        hex: 0x888899,
        shape: "cube",
      },
      {
        id: "brickwall",
        name: "Brick wall",
        color: "#B24B3A",
        hex: 0xb24b3a,
        shape: "cube",
      },
      {
        id: "plasterwall",
        name: "Plaster wall",
        color: "#D5C2A4",
        hex: 0xd5c2a4,
        shape: "cube",
      },
    ],
  },
  {
    id: "doors",
    title: "Doors",
    items: [
      {
        id: "singledoor",
        name: "Single door (1x2)",
        color: "#228B22",
        hex: 0x228b22,
        shape: "cube",
        footprint: { width: 1, height: 2 },
      },
      {
        id: "doubledoor",
        name: "Double door (2x2)",
        color: "#C0C0C0",
        hex: 0xc0c0c0,
        shape: "cube",
        footprint: { width: 2, height: 2 },
      },
      {
        id: "largedoor",
        name: "Large door (2x3)",
        color: "#111111",
        hex: 0x111111,
        shape: "cube",
        footprint: { width: 2, height: 3 },
      },
    ],
  },
  {
    id: "windows",
    title: "Windows",
    items: [
      {
        id: "glasswindow",
        name: "Glass window",
        color: "#9ECFFF",
        hex: 0x9ecfff,
        shape: "cube",
      },
      {
        id: "windowpane",
        name: "Window pane",
        color: "#B5E1FF",
        hex: 0xb5e1ff,
        shape: "cube",
      },
      {
        id: "hatchwindow",
        name: "Hatch window",
        color: "#8DA4BF",
        hex: 0x8da4bf,
        shape: "cube",
      },
      {
        id: "sashwindow",
        name: "Sash window",
        color: "#D9E8F8",
        hex: 0xd9e8f8,
        shape: "cube",
      },
    ],
  },
  {
    id: "roof",
    title: "Roof",
    items: [
      {
        id: "pitchedbrickroof",
        name: "Pitched brick roof",
        color: "#F2A067",
        hex: 0xf2a067,
        shape: "roof",
      },
      {
        id: "slopedtiledroof",
        name: "Sloped tiled roof",
        color: "#D98B45",
        hex: 0xd98b45,
        shape: "roof",
      },
      {
        id: "slopedstoneroof",
        name: "Sloped stone roof",
        color: "#8A8A97",
        hex: 0x8a8a97,
        shape: "roof",
      },
      {
        id: "slopedtentroof",
        name: "Sloped tent roof",
        color: "#C3A86A",
        hex: 0xc3a86a,
        shape: "roof",
      },
    ],
  },
];

const BUILDER_ITEMS = BUILDER_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    ...item,
    sectionId: section.id,
    sectionTitle: section.title,
  })),
);

const BUILDER_ITEM_MAP = new Map(BUILDER_ITEMS.map((item) => [item.id, item]));

const GRID = 30;
const LAYERS = 18;
const CELL = 1;
const CLEAR_EVENT = "block-builder-clear";
const ROOF_ROTATIONS = [0, 90, 180, 270];
const ITEM_NAME_STORAGE_KEY = "block-builder-item-name-map-v1";
const DEFAULT_ITEM_NAME_MAP = Object.fromEntries(
  BUILDER_ITEMS.map((item) => [item.id, item.name]),
);

function buildEmptyGrid() {
  return Array.from({ length: LAYERS }, () =>
    Array.from({ length: GRID }, () => Array(GRID).fill(null)),
  );
}

function createZeroCounts() {
  return BUILDER_ITEMS.reduce((acc, item) => {
    acc[item.id] = 0;
    return acc;
  }, {});
}

export default function BlockBuilder() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const hoverGroupRef = useRef(null);
  const hoverMaterialRef = useRef(null);
  const hoverPreviewSignatureRef = useRef("");
  const refreshHoverPreviewRef = useRef(() => {});
  const updateGhostRef = useRef(() => {});
  const hasLoadedItemNamesRef = useRef(false);

  const selectedBlockRef = useRef(BUILDER_ITEMS[0]);
  const eraseModeRef = useRef(false);
  const currentLayerRef = useRef(1);
  const roofRotationRef = useRef(0);

  const [selectedBlockId, setSelectedBlockId] = useState(BUILDER_ITEMS[0].id);
  const [eraseMode, setEraseMode] = useState(false);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [roofRotation, setRoofRotation] = useState(0);
  const [counts, setCounts] = useState(createZeroCounts);
  const [itemNameMap, setItemNameMap] = useState(DEFAULT_ITEM_NAME_MAP);

  useEffect(() => {
    const block = BUILDER_ITEM_MAP.get(selectedBlockId);
    if (!block) return;

    selectedBlockRef.current = block;
    refreshHoverPreviewRef.current();
  }, [selectedBlockId]);

  useEffect(() => {
    roofRotationRef.current = roofRotation;
    if (selectedBlockRef.current.shape !== "roof") return;
    refreshHoverPreviewRef.current();
  }, [roofRotation]);

  useEffect(() => {
    eraseModeRef.current = eraseMode;
    refreshHoverPreviewRef.current();
  }, [eraseMode]);

  useEffect(() => {
    currentLayerRef.current = currentLayer;
    updateGhostRef.current();
  }, [currentLayer]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem(ITEM_NAME_STORAGE_KEY);
      if (!saved) {
        hasLoadedItemNamesRef.current = true;
        return;
      }

      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object") {
        hasLoadedItemNamesRef.current = true;
        return;
      }

      const mergedMap = { ...DEFAULT_ITEM_NAME_MAP };
      BUILDER_ITEMS.forEach((item) => {
        const savedName = parsed[item.id];
        if (typeof savedName !== "string") return;

        const normalized = savedName.trim();
        if (normalized.length > 0) {
          mergedMap[item.id] = normalized;
        }
      });
      setItemNameMap(mergedMap);
    } catch (error) {
      console.error("Failed to load saved item names", error);
    } finally {
      hasLoadedItemNamesRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasLoadedItemNamesRef.current) return;

    window.localStorage.setItem(
      ITEM_NAME_STORAGE_KEY,
      JSON.stringify(itemNameMap),
    );
  }, [itemNameMap]);

  const getItemDisplayName = (item) => {
    const savedName = itemNameMap[item.id];
    if (typeof savedName !== "string") return item.name;

    const normalized = savedName.trim();
    return normalized.length > 0 ? normalized : item.name;
  };

  const updateItemName = (itemId, nextName) => {
    setItemNameMap((prev) => ({ ...prev, [itemId]: nextName }));
  };

  const resetBlankItemName = (item) => {
    setItemNameMap((prev) => {
      const current = prev[item.id];
      if (typeof current !== "string") return prev;
      if (current.trim().length > 0) return prev;
      if (current === item.name) return prev;

      return { ...prev, [item.id]: item.name };
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const placed = buildEmptyGrid();
    const meshMap = {};
    const placementMap = {};
    let placementCounter = 0;

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

    const roofProfile = new THREE.Shape();
    roofProfile.moveTo(-CELL * 0.47, -CELL * 0.47);
    roofProfile.lineTo(-CELL * 0.47, CELL * 0.47);
    roofProfile.lineTo(CELL * 0.47, -CELL * 0.47);
    roofProfile.lineTo(-CELL * 0.47, -CELL * 0.47);

    const geometryCache = {
      cube: new THREE.BoxGeometry(CELL * 0.94, CELL * 0.94, CELL * 0.94),
      roof: new THREE.ExtrudeGeometry(roofProfile, {
        depth: CELL * 0.94,
        steps: 1,
        bevelEnabled: false,
        curveSegments: 1,
      }),
    };
    geometryCache.roof.center();

    const edgesCache = Object.entries(geometryCache).reduce(
      (acc, [shape, geometry]) => {
        acc[shape] = new THREE.EdgesGeometry(geometry);
        return acc;
      },
      {},
    );

    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
    });

    const matCache = {};
    BUILDER_ITEMS.forEach((item) => {
      matCache[item.id] = new THREE.MeshLambertMaterial({ color: item.hex });
    });

    const toCellKey = (layer, row, col) => `${layer}-${row}-${col}`;

    const getItemFootprint = (item) => {
      const rawWidth = item.footprint?.width ?? 1;
      const rawHeight = item.footprint?.height ?? 1;

      return {
        width: Math.max(1, Math.floor(rawWidth)),
        height: Math.max(1, Math.floor(rawHeight)),
      };
    };

    const getPlacementCells = (item, row, col, layer) => {
      if (layer < 1 || layer > LAYERS) return null;
      if (row < 0 || row >= GRID || col < 0 || col >= GRID) return null;

      const { width, height } = getItemFootprint(item);
      const cells = [];

      for (let layerOffset = 0; layerOffset < height; layerOffset += 1) {
        const nextLayer = layer + layerOffset;
        if (nextLayer < 1 || nextLayer > LAYERS) return null;

        for (let colOffset = 0; colOffset < width; colOffset += 1) {
          const nextCol = col + colOffset;
          if (nextCol < 0 || nextCol >= GRID) return null;
          cells.push({ row, col: nextCol, layer: nextLayer });
        }
      }

      return cells;
    };

    const canPlaceCells = (cells) => {
      if (!cells || cells.length === 0) return false;
      return cells.every(
        ({ row, col, layer }) => !placed[layer - 1][row][col],
      );
    };

    const hoverMaterial = new THREE.MeshLambertMaterial({
      color: selectedBlockRef.current.hex,
      transparent: true,
      opacity: 0.35,
    });
    const hoverGroup = new THREE.Group();
    hoverGroup.visible = false;
    scene.add(hoverGroup);
    hoverGroupRef.current = hoverGroup;
    hoverMaterialRef.current = hoverMaterial;

    const refreshHoverPreview = () => {
      const selected = selectedBlockRef.current;
      if (!selected) return;

      const shape = selected.shape || "cube";
      const { width, height } = getItemFootprint(selected);
      const previewSignature = `${shape}:${width}x${height}`;

      if (hoverPreviewSignatureRef.current !== previewSignature) {
        while (hoverGroup.children.length > 0) {
          hoverGroup.remove(hoverGroup.children[0]);
        }

        const geometry = geometryCache[shape] || geometryCache.cube;
        for (let layerOffset = 0; layerOffset < height; layerOffset += 1) {
          for (let colOffset = 0; colOffset < width; colOffset += 1) {
            const previewMesh = new THREE.Mesh(geometry, hoverMaterial);
            previewMesh.position.set(colOffset, layerOffset * CELL, 0);
            hoverGroup.add(previewMesh);
          }
        }

        hoverPreviewSignatureRef.current = previewSignature;
      }

      const rotationY =
        shape === "roof"
          ? THREE.MathUtils.degToRad(roofRotationRef.current)
          : 0;
      hoverGroup.children.forEach((previewMesh) => {
        previewMesh.rotation.y = rotationY;
      });

      hoverMaterial.color.set(eraseModeRef.current ? 0xff4444 : selected.hex);
      hoverMaterial.opacity = eraseModeRef.current ? 0.5 : 0.35;
    };

    refreshHoverPreviewRef.current = refreshHoverPreview;
    refreshHoverPreview();

    const updateCounts = () => {
      const nextCounts = createZeroCounts();
      for (let l = 0; l < LAYERS; l += 1) {
        for (let r = 0; r < GRID; r += 1) {
          for (let c = 0; c < GRID; c += 1) {
            const cell = placed[l][r][c];
            if (!cell || !cell.isAnchor || !cell.itemId) continue;
            nextCounts[cell.itemId] += 1;
          }
        }
      }
      setCounts(nextCounts);
    };

    const clearPlacementById = (placementId) => {
      const placement = placementMap[placementId];
      if (!placement) return;

      placement.cells.forEach(({ row, col, layer }) => {
        placed[layer - 1][row][col] = null;
        const key = toCellKey(layer, row, col);
        const mesh = meshMap[key];
        if (mesh) {
          scene.remove(mesh);
          delete meshMap[key];
        }
      });

      delete placementMap[placementId];
    };

    const placeBlock = (row, col, layer) => {
      const selected = selectedBlockRef.current;
      const cells = getPlacementCells(selected, row, col, layer);
      if (!canPlaceCells(cells)) return;

      placementCounter += 1;
      const placementId = `placement-${placementCounter}`;
      placementMap[placementId] = {
        id: placementId,
        itemId: selected.id,
        cells,
      };

      const shape = selected.shape || "cube";
      const geometry = geometryCache[shape] || geometryCache.cube;
      const edges = edgesCache[shape] || edgesCache.cube;
      const rotationY =
        shape === "roof"
          ? THREE.MathUtils.degToRad(roofRotationRef.current)
          : 0;

      cells.forEach((cell, index) => {
        placed[cell.layer - 1][cell.row][cell.col] = {
          itemId: selected.id,
          placementId,
          isAnchor: index === 0,
        };

        const mesh = new THREE.Mesh(geometry, matCache[selected.id]);
        mesh.position.set(
          cell.col,
          (cell.layer - 1) * CELL + CELL * 0.5,
          cell.row,
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.rotation.y = rotationY;
        mesh.userData = {
          row: cell.row,
          col: cell.col,
          layer: cell.layer,
          itemId: selected.id,
          shape,
          placementId,
          isAnchor: index === 0,
        };
        mesh.add(new THREE.LineSegments(edges, edgeMat));

        scene.add(mesh);
        meshMap[toCellKey(cell.layer, cell.row, cell.col)] = mesh;
      });

      updateCounts();
    };

    const removeBlock = (mesh) => {
      const { placementId, row, col, layer } = mesh.userData;
      if (placementId) {
        clearPlacementById(placementId);
      } else {
        placed[layer - 1][row][col] = null;
        scene.remove(mesh);
        delete meshMap[toCellKey(layer, row, col)];
      }

      updateCounts();
    };

    const clearAllBlocks = () => {
      Object.values(meshMap).forEach((mesh) => {
        scene.remove(mesh);
      });
      Object.keys(meshMap).forEach((key) => {
        delete meshMap[key];
      });
      Object.keys(placementMap).forEach((key) => {
        delete placementMap[key];
      });
      placementCounter = 0;

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

      const info = getGridCell(event);
      if (info && info.type === "place") {
        const selected = selectedBlockRef.current;
        const cells = getPlacementCells(selected, info.row, info.col, info.layer);
        if (!canPlaceCells(cells)) {
          hoverGroup.visible = false;
          return;
        }

        hoverGroup.visible = true;
        hoverGroup.position.set(
          info.col,
          (info.layer - 1) * CELL + CELL * 0.5,
          info.row,
        );
      } else {
        hoverGroup.visible = false;
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

      hoverGroupRef.current = null;
      hoverMaterialRef.current = null;
      hoverPreviewSignatureRef.current = "";
      refreshHoverPreviewRef.current = () => {};
      updateGhostRef.current = () => {};

      Object.values(geometryCache).forEach((geometry) => geometry.dispose());
      Object.values(edgesCache).forEach((geometry) => geometry.dispose());
      edgeMat.dispose();
      baseMesh.geometry.dispose();
      baseMesh.material.dispose();
      ghostPlane.geometry.dispose();
      ghostPlane.material.dispose();
      hoverMaterial.dispose();
      Object.values(matCache).forEach((material) => material.dispose());

      renderer.dispose();
    };
  }, []);

  const total = useMemo(
    () => Object.values(counts).reduce((sum, count) => sum + count, 0),
    [counts],
  );
  const selectedBuilderItem =
    BUILDER_ITEM_MAP.get(selectedBlockId) ?? BUILDER_ITEMS[0];
  const isRoofSelected = selectedBuilderItem.shape === "roof";

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

        <aside className='flex w-full flex-shrink-0 flex-col border-t-2 border-[#3a3a5c] bg-[rgba(10,10,20,.97)] lg:w-[260px] lg:border-l-2 lg:border-t-0 xl:w-[280px]'>
          <div className='max-h-[30dvh] overflow-y-auto border-b border-[#3a3a5c] px-2 pb-1 pt-2 sm:max-h-[35dvh] lg:max-h-none'>
            {BUILDER_SECTIONS.map((section) => (
              <div
                className='mb-2 border-b border-[#2a2a4c] pb-2 last:mb-0 last:border-b-0'
                key={section.id}
              >
                <h2 className='mb-2 text-[10px] uppercase tracking-[0.2em] text-[#666]'>
                  {section.title}
                </h2>
                <div className='grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1'>
                  {section.items.map((item) => {
                    const active = !eraseMode && selectedBlockId === item.id;

                    return (
                      <button
                        key={item.id}
                        className={`flex w-full items-center gap-2 rounded border px-2 py-1 text-left text-[11px] tracking-[0.04em] transition-all lg:text-[11px] ${
                          active
                            ? "border-[#a0c4ff] bg-[rgba(160,196,255,.15)] text-white"
                            : "border-transparent bg-white/5 text-[#ccc] hover:border-[#555] hover:bg-white/10"
                        }`}
                        onClick={() => {
                          setSelectedBlockId(item.id);
                          setEraseMode(false);
                        }}
                        type='button'
                      >
                        <span
                          className='h-[14px] w-[14px] flex-shrink-0 rounded-[2px] border border-white/15'
                          style={
                            item.shape === "roof"
                              ? {
                                  background: item.color,
                                  clipPath:
                                    "polygon(50% 0%, 100% 100%, 0% 100%)",
                                }
                              : { background: item.color }
                          }
                        />
                        <span className='min-w-0 truncate'>
                          {getItemDisplayName(item)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
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

          {isRoofSelected ? (
            <div className='border-b border-[#3a3a5c] px-2 py-2'>
              <h2 className='mb-1 text-[10px] uppercase tracking-[0.2em] text-[#666]'>
                Roof Rotation
              </h2>
              <div className='flex items-center gap-2'>
                <button
                  className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[11px] tracking-[0.08em] text-[#a0c4ff] transition hover:bg-white/10'
                  onClick={() => {
                    setRoofRotation((prev) => {
                      const index = ROOF_ROTATIONS.indexOf(prev);
                      const nextIndex =
                        index === -1 ? 0 : (index + 1) % ROOF_ROTATIONS.length;
                      return ROOF_ROTATIONS[nextIndex];
                    });
                  }}
                  type='button'
                >
                  ROTATE
                </button>
                <span className='text-[12px] tracking-[0.08em] text-[#9ba9cb]'>
                  {roofRotation}°
                </span>
              </div>
            </div>
          ) : null}

          <div className='border-b border-[#3a3a5c] px-2 py-2'>
            <div className='flex items-center justify-between text-[11px] tracking-[0.1em] text-[#888]'>
              TOTAL PLACED
              <span className='text-[15px] font-bold text-white'>{total}</span>
            </div>
          </div>

          <div className='max-h-[26dvh] overflow-y-auto px-2 pb-1 pt-2 sm:max-h-[30dvh] lg:flex-1 lg:max-h-none'>
            <h2 className='mb-2 text-[10px] uppercase tracking-[0.2em] text-[#666]'>
              Item Count
            </h2>

            {BUILDER_SECTIONS.map((section) => {
              const usedItems = section.items.filter((item) => counts[item.id] > 0);
              if (usedItems.length === 0) return null;

              return (
                <div className='mb-2' key={`counts-${section.id}`}>
                  <p className='mb-1 text-[10px] uppercase tracking-[0.12em] text-[#7f8bb0]'>
                    {section.title}
                  </p>
                  {usedItems.map((item) => (
                    <div
                      className='mb-1 flex items-center gap-[7px] text-[12px] text-[#bbb] lg:text-[11px]'
                      key={item.id}
                    >
                      <span
                        className='h-[10px] w-[10px] flex-shrink-0 rounded-[2px] border border-white/15'
                        style={
                          item.shape === "roof"
                            ? {
                                background: item.color,
                                clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
                              }
                            : { background: item.color }
                        }
                      />
                      <input
                        className='min-w-0 flex-1 rounded border border-[#2f3555] bg-white/5 px-2 py-1 text-[11px] tracking-[0.04em] text-[#e6ebff] outline-none transition focus:border-[#a0c4ff] focus:bg-white/10'
                        onBlur={() => resetBlankItemName(item)}
                        onChange={(event) =>
                          updateItemName(item.id, event.target.value)
                        }
                        placeholder={item.name}
                        type='text'
                        value={itemNameMap[item.id] ?? item.name}
                      />
                      <span className='w-7 text-right text-[13px] font-bold text-[#a0c4ff] lg:text-[12px]'>
                        {counts[item.id]}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}

            {total === 0 ? (
              <p className='text-[11px] text-[#666]'>No items placed yet.</p>
            ) : null}

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
