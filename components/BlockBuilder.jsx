"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
        footprint: { width: 1, height: 2 },
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

const DEFAULT_GRID_SIZE = 20;
const MIN_GRID_SIZE = 8;
const MAX_GRID_SIZE = 60;
const DEFAULT_GRID_HEIGHT = 15;
const MIN_GRID_HEIGHT = 4;
const MAX_GRID_HEIGHT = 40;
const CELL = 1;
const CLEAR_EVENT = "block-builder-clear";
const ROOF_ROTATIONS = [0, 90, 180, 270];
const ITEM_NAME_STORAGE_KEY = "block-builder-item-name-map-v1";
const DEFAULT_ITEM_NAME_MAP = Object.fromEntries(
  BUILDER_ITEMS.map((item) => [item.id, item.name]),
);
const SECTION_ID_BY_SHORTCUT_KEY = {
  q: "blocks",
  w: "doors",
  e: "windows",
  r: "roof",
};
const SECTION_SHORTCUT_LABEL_BY_SECTION_ID = Object.fromEntries(
  Object.entries(SECTION_ID_BY_SHORTCUT_KEY).map(([shortcutKey, sectionId]) => [
    sectionId,
    shortcutKey.toUpperCase(),
  ]),
);
const SECTION_DEFAULT_ITEM_BY_ID = BUILDER_SECTIONS.reduce((acc, section) => {
  acc[section.id] = section.items[0]?.id ?? null;
  return acc;
}, {});

function buildEmptyGrid(gridSize, gridHeight) {
  return Array.from({ length: gridHeight }, () =>
    Array.from({ length: gridSize }, () => Array(gridSize).fill(null)),
  );
}

function createZeroCounts() {
  return BUILDER_ITEMS.reduce((acc, item) => {
    acc[item.id] = 0;
    return acc;
  }, {});
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  const safeValue = Number.isNaN(parsed) ? fallback : parsed;
  return Math.max(min, Math.min(max, safeValue));
}

function normalizeBuilderSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;

  const groupedPlacements = Array.isArray(snapshot.groupedPlacements)
    ? snapshot.groupedPlacements
        .map((groupedPlacement) => {
          if (!groupedPlacement || typeof groupedPlacement !== "object") {
            return null;
          }

          const itemId = String(groupedPlacement.itemId || "");
          if (!BUILDER_ITEM_MAP.has(itemId)) return null;

          const cells = Array.isArray(groupedPlacement.cells)
            ? groupedPlacement.cells
                .map((cell) => {
                  if (!cell || typeof cell !== "object") return null;
                  const row = clampInteger(cell.row, 0, 200, 0);
                  const col = clampInteger(cell.col, 0, 200, 0);
                  const layer = clampInteger(cell.layer, 1, 200, 1);
                  return { row, col, layer };
                })
                .filter(Boolean)
            : [];

          if (cells.length === 0) return null;

          const rotationY = Number(groupedPlacement.rotationY);
          return {
            itemId,
            cells,
            rotationY: Number.isFinite(rotationY) ? rotationY : 0,
          };
        })
        .filter(Boolean)
    : [];

  const singleCells = Array.isArray(snapshot.singleCells)
    ? snapshot.singleCells
        .map((singleCell) => {
          if (!singleCell || typeof singleCell !== "object") return null;

          const itemId = String(singleCell.itemId || "");
          if (!BUILDER_ITEM_MAP.has(itemId)) return null;

          const row = clampInteger(singleCell.row, 0, 200, 0);
          const col = clampInteger(singleCell.col, 0, 200, 0);
          const layer = clampInteger(singleCell.layer, 1, 200, 1);
          const rotationY = Number(singleCell.rotationY);

          return {
            itemId,
            row,
            col,
            layer,
            rotationY: Number.isFinite(rotationY) ? rotationY : 0,
          };
        })
        .filter(Boolean)
    : [];

  return { groupedPlacements, singleCells };
}

function normalizeLoadedBuilderState(value) {
  if (!value || typeof value !== "object") return null;

  const gridSize = clampInteger(
    value.gridSize,
    MIN_GRID_SIZE,
    MAX_GRID_SIZE,
    DEFAULT_GRID_SIZE,
  );
  const gridHeight = clampInteger(
    value.gridHeight,
    MIN_GRID_HEIGHT,
    MAX_GRID_HEIGHT,
    DEFAULT_GRID_HEIGHT,
  );

  const currentLayer = clampInteger(value.currentLayer, 1, gridHeight, 1);
  const roofRotation = ROOF_ROTATIONS.includes(value.roofRotation)
    ? value.roofRotation
    : 0;
  const selectedBlockId = BUILDER_ITEM_MAP.has(value.selectedBlockId)
    ? value.selectedBlockId
    : BUILDER_ITEMS[0].id;

  const wallDimensions = {
    width: clampInteger(value.wallDimensions?.width, 1, gridSize, 1),
    height: clampInteger(value.wallDimensions?.height, 1, gridHeight, 1),
  };

  const itemNameMap = { ...DEFAULT_ITEM_NAME_MAP };
  if (value.itemNameMap && typeof value.itemNameMap === "object") {
    BUILDER_ITEMS.forEach((item) => {
      const rawName = value.itemNameMap[item.id];
      if (typeof rawName !== "string") return;

      const trimmed = rawName.trim();
      if (trimmed) {
        itemNameMap[item.id] = trimmed.slice(0, 80);
      }
    });
  }

  const snapshot = normalizeBuilderSnapshot(value.snapshot);
  if (!snapshot) return null;

  return {
    gridSize,
    gridHeight,
    currentLayer,
    roofRotation,
    selectedBlockId,
    wallDimensions,
    itemNameMap,
    snapshot,
  };
}

function normalizeSavedProjectMeta(record) {
  if (!record || typeof record !== "object") return null;
  const id = String(record.id || "").trim();
  const name = String(record.name || "").trim();
  if (!id || !name) return null;

  const totalBlocks = Number(record.totalBlocks);
  return {
    id,
    name: name.slice(0, 80),
    totalBlocks: Number.isFinite(totalBlocks) ? Math.max(0, totalBlocks) : 0,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}

function formatSavedDate(value) {
  if (!value) return "Unknown time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown time";
  return parsed.toLocaleString();
}

export default function BlockBuilder() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const hoverGroupRef = useRef(null);
  const hoverMaterialRef = useRef(null);
  const hoverPreviewSignatureRef = useRef("");
  const refreshHoverPreviewRef = useRef(() => {});
  const updateGhostRef = useRef(() => {});
  const getBuildExtentsRef = useRef(() => ({
    hasBlocks: false,
    requiredGridSize: MIN_GRID_SIZE,
    requiredGridHeight: MIN_GRID_HEIGHT,
  }));
  const getLiveBuildSnapshotRef = useRef(() => null);
  const buildSnapshotRef = useRef(null);
  const pendingSnapshotOverrideRef = useRef(null);
  const hasLoadedItemNamesRef = useRef(false);

  const selectedBlockRef = useRef(BUILDER_ITEMS[0]);
  const eraseModeRef = useRef(false);
  const currentLayerRef = useRef(1);
  const roofRotationRef = useRef(0);
  const wallDimensionsRef = useRef({ width: 1, height: 1 });

  const [selectedBlockId, setSelectedBlockId] = useState(BUILDER_ITEMS[0].id);
  const [eraseMode, setEraseMode] = useState(false);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [roofRotation, setRoofRotation] = useState(0);
  const [counts, setCounts] = useState(createZeroCounts);
  const [itemNameMap, setItemNameMap] = useState(DEFAULT_ITEM_NAME_MAP);
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [gridHeight, setGridHeight] = useState(DEFAULT_GRID_HEIGHT);
  const [wallDimensions, setWallDimensions] = useState({ width: 1, height: 1 });
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExportSummaryOpen, setIsExportSummaryOpen] = useState(false);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [savedProjects, setSavedProjects] = useState([]);
  const [savedProjectsBusy, setSavedProjectsBusy] = useState(false);
  const [savedProjectsMessage, setSavedProjectsMessage] = useState("");
  const [savedProjectLoadId, setSavedProjectLoadId] = useState("");
  const [savedProjectDeleteId, setSavedProjectDeleteId] = useState("");
  const [sceneVersion, setSceneVersion] = useState(0);

  const getMinimumGridSize = () => {
    const extents = getBuildExtentsRef.current();
    if (!extents?.hasBlocks) return MIN_GRID_SIZE;
    return Math.max(MIN_GRID_SIZE, extents.requiredGridSize);
  };

  const getMinimumGridHeight = () => {
    const extents = getBuildExtentsRef.current();
    if (!extents?.hasBlocks) return MIN_GRID_HEIGHT;
    return Math.max(MIN_GRID_HEIGHT, extents.requiredGridHeight);
  };

  const closeMobileMenuIfNeeded = () => {
    if (!isMobileViewport) return;
    setIsMobileMenuOpen(false);
  };

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
    wallDimensionsRef.current = wallDimensions;
    if (selectedBlockRef.current.sectionId !== "blocks") return;
    refreshHoverPreviewRef.current();
  }, [wallDimensions]);

  useEffect(() => {
    currentLayerRef.current = currentLayer;
    updateGhostRef.current();
  }, [currentLayer]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncMobileState = (matches) => {
      setIsMobileViewport(matches);
      if (!matches) {
        setIsMobileMenuOpen(false);
      }
    };

    syncMobileState(mediaQuery.matches);

    const handleChange = (event) => {
      syncMobileState(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

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

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok || !data?.user) {
          setAuthUser(null);
          return;
        }

        setAuthUser(data.user);
      } catch (error) {
        if (!cancelled) {
          setAuthUser(null);
        }
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchSavedProjects = useCallback(
    async ({ silent = false } = {}) => {
      if (!authUser) return;

      if (!silent) {
        setSavedProjectsBusy(true);
      }
      setSavedProjectsMessage("");

      try {
        const response = await fetch("/api/projects/list", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          setSavedProjectsMessage(
            data?.error || "Unable to load saved builds right now.",
          );
          return;
        }

        const projects = Array.isArray(data?.projects)
          ? data.projects.map(normalizeSavedProjectMeta).filter(Boolean)
          : [];
        setSavedProjects(projects);
      } catch (error) {
        setSavedProjectsMessage("Unable to load saved builds right now.");
      } finally {
        if (!silent) {
          setSavedProjectsBusy(false);
        }
      }
    },
    [authUser],
  );

  useEffect(() => {
    if (!authUser) {
      setSavedProjects([]);
      setSavedProjectsMessage("");
      setSavedProjectLoadId("");
      setSavedProjectDeleteId("");
      return;
    }

    fetchSavedProjects();
  }, [authUser, fetchSavedProjects]);

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

  const setWallDimension = (axis, nextValue) => {
    const maxValue = axis === "width" ? gridSize : gridHeight;
    const parsed = Number.parseInt(String(nextValue), 10);
    const safeValue = Number.isNaN(parsed) ? 1 : parsed;
    const clamped = Math.max(1, Math.min(maxValue, safeValue));

    setWallDimensions((prev) => {
      if (prev[axis] === clamped) return prev;
      return { ...prev, [axis]: clamped };
    });
  };

  const adjustWallDimension = (axis, delta) => {
    const maxValue = axis === "width" ? gridSize : gridHeight;
    setWallDimensions((prev) => {
      const nextValue = Math.max(1, Math.min(maxValue, prev[axis] + delta));
      if (prev[axis] === nextValue) return prev;
      return { ...prev, [axis]: nextValue };
    });
  };

  const setGridSizeValue = (nextValue) => {
    const parsed = Number.parseInt(String(nextValue), 10);
    const safeValue = Number.isNaN(parsed) ? DEFAULT_GRID_SIZE : parsed;
    const minimum = getMinimumGridSize();
    const clamped = Math.max(minimum, Math.min(MAX_GRID_SIZE, safeValue));
    setGridSize(clamped);
  };

  const adjustGridSize = (delta) => {
    const minimum = getMinimumGridSize();
    setGridSize((prev) =>
      Math.max(minimum, Math.min(MAX_GRID_SIZE, prev + delta)),
    );
  };

  const setGridHeightValue = (nextValue) => {
    const parsed = Number.parseInt(String(nextValue), 10);
    const safeValue = Number.isNaN(parsed) ? DEFAULT_GRID_HEIGHT : parsed;
    const minimum = getMinimumGridHeight();
    const clamped = Math.max(minimum, Math.min(MAX_GRID_HEIGHT, safeValue));
    setGridHeight(clamped);
  };

  const adjustGridHeight = (delta) => {
    const minimum = getMinimumGridHeight();
    setGridHeight((prev) =>
      Math.max(minimum, Math.min(MAX_GRID_HEIGHT, prev + delta)),
    );
  };

  const runAuthAction = async (mode) => {
    if (authBusy) return;

    const email = authEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setAuthMessage("Enter a valid email address.");
      return;
    }

    if (authPassword.length < 6) {
      setAuthMessage("Password must be at least 6 characters.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("");

    try {
      const endpoint = mode === "register" ? "register" : "login";
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: authPassword,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.user) {
        setAuthMessage(data?.error || "Unable to authenticate.");
        return;
      }

      setAuthUser(data.user);
      setAuthPassword("");
      setAuthMessage(
        mode === "register" ? "Account created." : "Logged in successfully.",
      );
    } catch (error) {
      setAuthMessage("Unable to authenticate right now.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    if (authBusy) return;

    setAuthBusy(true);
    setAuthMessage("");

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAuthUser(null);
      setAuthPassword("");
      setAuthMessage("Logged out.");
    } catch (error) {
      setAuthMessage("Unable to log out right now.");
    } finally {
      setAuthBusy(false);
    }
  };

  const loadSavedProject = async (projectId) => {
    if (!authUser) {
      setSaveMessage("Log in to load saved builds.");
      return;
    }

    if (!projectId || savedProjectLoadId || saveBusy) return;

    setSavedProjectLoadId(projectId);
    setSavedProjectsMessage("");
    setSaveMessage("");

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.project) {
        setSaveMessage(data?.error || "Unable to load this saved build.");
        return;
      }

      const normalized = normalizeLoadedBuilderState(data.project.builderState);
      if (!normalized) {
        setSaveMessage("Saved build data is invalid.");
        return;
      }

      buildSnapshotRef.current = normalized.snapshot;
      pendingSnapshotOverrideRef.current = normalized.snapshot;
      setGridSize(normalized.gridSize);
      setGridHeight(normalized.gridHeight);
      setCurrentLayer(normalized.currentLayer);
      setRoofRotation(normalized.roofRotation);
      setWallDimensions(normalized.wallDimensions);
      setSelectedBlockId(normalized.selectedBlockId);
      setEraseMode(false);
      setItemNameMap(normalized.itemNameMap);
      setSceneVersion((previous) => previous + 1);
      setSaveMessage(`Loaded "${data.project.name}".`);
      closeMobileMenuIfNeeded();
    } catch (error) {
      setSaveMessage("Unable to load this saved build right now.");
    } finally {
      setSavedProjectLoadId("");
    }
  };

  const deleteSavedProject = async (project) => {
    if (!authUser) {
      setSaveMessage("Log in to manage saved builds.");
      return;
    }

    if (!project?.id || savedProjectDeleteId || savedProjectLoadId) return;
    const confirmed = window.confirm(
      `Delete saved build "${project.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setSavedProjectDeleteId(project.id);
    setSavedProjectsMessage("");
    setSaveMessage("");

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(project.id)}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setSavedProjectsMessage(
          data?.error || "Unable to delete this saved build.",
        );
        return;
      }

      setSavedProjects((previous) =>
        previous.filter((savedProject) => savedProject.id !== project.id),
      );
      setSavedProjectsMessage(`Deleted "${project.name}".`);
    } catch (error) {
      setSavedProjectsMessage("Unable to delete this saved build right now.");
    } finally {
      setSavedProjectDeleteId("");
    }
  };

  const saveCurrentBuild = async () => {
    if (!authUser) {
      setSaveMessage("Log in to save your build.");
      return;
    }

    if (saveBusy) return;

    const liveSnapshot = getLiveBuildSnapshotRef.current?.();
    if (!liveSnapshot) {
      setSaveMessage("Builder is still initializing. Try again in a second.");
      return;
    }

    const defaultName = `Build ${new Date().toLocaleString()}`;
    const chosenName = window.prompt("Project name", defaultName);
    if (chosenName === null) return;

    const trimmedName = chosenName.trim();
    if (!trimmedName) {
      setSaveMessage("Project name is required.");
      return;
    }

    setSaveBusy(true);
    setSaveMessage("");

    try {
      const response = await fetch("/api/projects/save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          totalBlocks: total,
          builderState: {
            version: 1,
            gridSize,
            gridHeight,
            currentLayer,
            roofRotation,
            selectedBlockId,
            wallDimensions,
            counts,
            itemNameMap,
            snapshot: liveSnapshot,
          },
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setSaveMessage(data?.error || "Unable to save build.");
        return;
      }

      setSaveMessage(`Saved "${data.project?.name || trimmedName}".`);
      const normalizedProject = normalizeSavedProjectMeta(data.project);
      if (normalizedProject) {
        setSavedProjects((previous) => [
          normalizedProject,
          ...previous.filter((project) => project.id !== normalizedProject.id),
        ]);
      } else {
        fetchSavedProjects({ silent: true });
      }
      closeMobileMenuIfNeeded();
    } catch (error) {
      setSaveMessage("Unable to save build right now.");
    } finally {
      setSaveBusy(false);
    }
  };

  const rotateRoofSelection = useCallback(() => {
    setRoofRotation((prev) => {
      const index = ROOF_ROTATIONS.indexOf(prev);
      const nextIndex = index === -1 ? 0 : (index + 1) % ROOF_ROTATIONS.length;
      return ROOF_ROTATIONS[nextIndex];
    });
  }, []);

  useEffect(() => {
    setWallDimensions((prev) => {
      const clampedWidth = Math.min(prev.width, gridSize);
      const clampedHeight = Math.min(prev.height, gridHeight);
      if (clampedWidth === prev.width && clampedHeight === prev.height) {
        return prev;
      }
      return { ...prev, width: clampedWidth, height: clampedHeight };
    });
  }, [gridHeight, gridSize]);

  useEffect(() => {
    setCurrentLayer((prev) => Math.min(prev, gridHeight));
  }, [gridHeight]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (window.matchMedia("(pointer: coarse)").matches) return undefined;

    const handleKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName;
        if (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT" ||
          activeElement.isContentEditable
        ) {
          return;
        }
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === "a") {
        event.preventDefault();
        setEraseMode((prev) => !prev);
        return;
      }

      if (key === "s") {
        event.preventDefault();
        setCurrentLayer((prev) => Math.max(1, prev - 1));
        return;
      }

      if (key === "d") {
        event.preventDefault();
        setCurrentLayer((prev) => Math.min(gridHeight, prev + 1));
        return;
      }

      if (key === "f") {
        if (selectedBlockRef.current.shape !== "roof") return;
        event.preventDefault();
        rotateRoofSelection();
        return;
      }

      const sectionId = SECTION_ID_BY_SHORTCUT_KEY[key];
      if (!sectionId) return;

      const defaultItemId = SECTION_DEFAULT_ITEM_BY_ID[sectionId];
      if (!defaultItemId) return;

      event.preventDefault();
      setSelectedBlockId(defaultItemId);
      setEraseMode(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gridHeight, rotateRoofSelection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const placed = buildEmptyGrid(gridSize, gridHeight);
    const meshMap = {};
    const placementMap = {};
    let placementCounter = 0;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x1a1a2e);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(
      0x1a1a2e,
      Math.max(18, gridSize),
      Math.max(60, gridSize * 2.4),
    );

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.set(gridSize * 0.8, gridSize * 0.9, gridSize * 0.8);
    camera.lookAt(gridSize / 2, 0, gridSize / 2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(gridSize / 2, 0, gridSize / 2);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 4;
    controls.maxDistance = Math.max(40, gridSize * 2.2);
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
      new THREE.PlaneGeometry(gridSize, gridSize),
      new THREE.MeshLambertMaterial({ color: 0x12122a }),
    );
    baseMesh.rotation.x = -Math.PI / 2;
    baseMesh.position.set(gridSize / 2 - 0.5, -0.01, gridSize / 2 - 0.5);
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridSize,
      0x3a3a5c,
      0x2a2a4c,
    );
    gridHelper.position.set(gridSize / 2 - 0.5, 0, gridSize / 2 - 0.5);
    scene.add(gridHelper);

    const ghostPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(gridSize, gridSize),
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
      const isDynamicWallBlock = item.sectionId === "blocks";
      const rawWidth = isDynamicWallBlock
        ? wallDimensionsRef.current.width
        : (item.footprint?.width ?? 1);
      const rawHeight = isDynamicWallBlock
        ? wallDimensionsRef.current.height
        : (item.footprint?.height ?? 1);

      return {
        width: Math.max(1, Math.floor(rawWidth)),
        height: Math.max(1, Math.floor(rawHeight)),
      };
    };

    const getPlacementCells = (item, row, col, layer) => {
      if (layer < 1 || layer > gridHeight) return null;
      if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;

      const { width, height } = getItemFootprint(item);
      const cells = [];

      for (let layerOffset = 0; layerOffset < height; layerOffset += 1) {
        const nextLayer = layer + layerOffset;
        if (nextLayer < 1 || nextLayer > gridHeight) return null;

        for (let colOffset = 0; colOffset < width; colOffset += 1) {
          const nextCol = col + colOffset;
          if (nextCol < 0 || nextCol >= gridSize) return null;
          cells.push({ row, col: nextCol, layer: nextLayer });
        }
      }

      return cells;
    };

    const canPlaceCells = (cells) => {
      if (!cells || cells.length === 0) return false;
      return cells.every(({ row, col, layer }) => !placed[layer - 1][row][col]);
    };

    const getBuildExtents = () => {
      let maxRow = -1;
      let maxCol = -1;
      let maxLayer = -1;

      for (let l = 0; l < gridHeight; l += 1) {
        for (let r = 0; r < gridSize; r += 1) {
          for (let c = 0; c < gridSize; c += 1) {
            if (!placed[l][r][c]) continue;
            if (r > maxRow) maxRow = r;
            if (c > maxCol) maxCol = c;
            if (l > maxLayer) maxLayer = l;
          }
        }
      }

      const hasBlocks = maxLayer >= 0;
      return {
        hasBlocks,
        requiredGridSize: hasBlocks
          ? Math.max(maxRow, maxCol) + 1
          : MIN_GRID_SIZE,
        requiredGridHeight: hasBlocks ? maxLayer + 1 : MIN_GRID_HEIGHT,
      };
    };

    getBuildExtentsRef.current = getBuildExtents;

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
      for (let l = 0; l < gridHeight; l += 1) {
        for (let r = 0; r < gridSize; r += 1) {
          for (let c = 0; c < gridSize; c += 1) {
            const cell = placed[l][r][c];
            if (!cell || !cell.isAnchor || !cell.itemId) continue;
            nextCounts[cell.itemId] += 1;
          }
        }
      }
      setCounts(nextCounts);
    };

    const addPlacementMeshes = ({
      item,
      cells,
      placementId,
      rotationY,
      treatAsIndependentCells,
    }) => {
      const shape = item.shape || "cube";
      const geometry = geometryCache[shape] || geometryCache.cube;
      const edges = edgesCache[shape] || edgesCache.cube;

      cells.forEach((cell, index) => {
        const isAnchor = treatAsIndependentCells || index === 0;
        placed[cell.layer - 1][cell.row][cell.col] = {
          itemId: item.id,
          placementId,
          isAnchor,
        };

        const mesh = new THREE.Mesh(geometry, matCache[item.id]);
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
          itemId: item.id,
          shape,
          placementId,
          isAnchor,
        };
        mesh.add(new THREE.LineSegments(edges, edgeMat));

        scene.add(mesh);
        meshMap[toCellKey(cell.layer, cell.row, cell.col)] = mesh;
      });
    };

    const buildSnapshot = () => {
      const groupedPlacements = Object.values(placementMap).map((placement) => {
        const [anchorCell] = placement.cells;
        const anchorMesh = anchorCell
          ? meshMap[toCellKey(anchorCell.layer, anchorCell.row, anchorCell.col)]
          : null;
        const rotationY = anchorMesh?.rotation?.y ?? 0;

        return {
          itemId: placement.itemId,
          cells: placement.cells.map((cell) => ({ ...cell })),
          rotationY,
        };
      });

      const singleCells = [];
      for (let l = 0; l < gridHeight; l += 1) {
        for (let r = 0; r < gridSize; r += 1) {
          for (let c = 0; c < gridSize; c += 1) {
            const cell = placed[l][r][c];
            if (!cell || !cell.itemId || cell.placementId) continue;

            const mesh = meshMap[toCellKey(l + 1, r, c)];
            singleCells.push({
              itemId: cell.itemId,
              row: r,
              col: c,
              layer: l + 1,
              rotationY: mesh?.rotation?.y ?? 0,
            });
          }
        }
      }

      return { groupedPlacements, singleCells };
    };
    getLiveBuildSnapshotRef.current = buildSnapshot;

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

      const shouldPlaceAsIndividualCells = selected.sectionId === "blocks";
      let placementId = null;
      if (!shouldPlaceAsIndividualCells) {
        placementCounter += 1;
        placementId = `placement-${placementCounter}`;
        placementMap[placementId] = {
          id: placementId,
          itemId: selected.id,
          cells,
        };
      }

      const rotationY =
        selected.shape === "roof"
          ? THREE.MathUtils.degToRad(roofRotationRef.current)
          : 0;

      addPlacementMeshes({
        item: selected,
        cells,
        placementId,
        rotationY,
        treatAsIndependentCells: shouldPlaceAsIndividualCells,
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

      for (let l = 0; l < gridHeight; l += 1) {
        for (let r = 0; r < gridSize; r += 1) {
          for (let c = 0; c < gridSize; c += 1) {
            placed[l][r][c] = null;
          }
        }
      }

      updateCounts();
    };

    const snapshot = buildSnapshotRef.current;
    if (snapshot) {
      snapshot.groupedPlacements?.forEach((groupedPlacement) => {
        const item = BUILDER_ITEM_MAP.get(groupedPlacement.itemId);
        if (!item) return;

        const cells =
          groupedPlacement.cells?.map((cell) => ({ ...cell })) ?? [];
        if (!canPlaceCells(cells)) return;

        placementCounter += 1;
        const placementId = `placement-${placementCounter}`;
        placementMap[placementId] = {
          id: placementId,
          itemId: item.id,
          cells,
        };

        addPlacementMeshes({
          item,
          cells,
          placementId,
          rotationY: groupedPlacement.rotationY ?? 0,
          treatAsIndependentCells: false,
        });
      });

      snapshot.singleCells?.forEach((singleCell) => {
        const item = BUILDER_ITEM_MAP.get(singleCell.itemId);
        if (!item) return;

        const cells = [
          {
            row: singleCell.row,
            col: singleCell.col,
            layer: singleCell.layer,
          },
        ];
        if (!canPlaceCells(cells)) return;

        addPlacementMeshes({
          item,
          cells,
          placementId: null,
          rotationY: singleCell.rotationY ?? 0,
          treatAsIndependentCells: true,
        });
      });
    }
    buildSnapshotRef.current = null;

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
      ghostPlane.position.set(gridSize / 2 - 0.5, y, gridSize / 2 - 0.5);
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

          if (nextLayer < 1 || nextLayer > gridHeight) return null;
          if (
            nextCol < 0 ||
            nextCol >= gridSize ||
            nextRow < 0 ||
            nextRow >= gridSize
          )
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

        if (col < 0 || col >= gridSize || row < 0 || row >= gridSize)
          return null;
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
        const cells = getPlacementCells(
          selected,
          info.row,
          info.col,
          info.layer,
        );
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

      const fallbackSnapshot = buildSnapshot();
      if (pendingSnapshotOverrideRef.current) {
        buildSnapshotRef.current = pendingSnapshotOverrideRef.current;
        pendingSnapshotOverrideRef.current = null;
      } else {
        buildSnapshotRef.current = fallbackSnapshot;
      }
      getLiveBuildSnapshotRef.current = () => null;
      getBuildExtentsRef.current = () => ({
        hasBlocks: false,
        requiredGridSize: MIN_GRID_SIZE,
        requiredGridHeight: MIN_GRID_HEIGHT,
      });

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
  }, [gridHeight, gridSize, sceneVersion]);

  const total = useMemo(
    () => Object.values(counts).reduce((sum, count) => sum + count, 0),
    [counts],
  );
  const minimumGridSize = getMinimumGridSize();
  const minimumGridHeight = getMinimumGridHeight();
  const selectedBuilderItem =
    BUILDER_ITEM_MAP.get(selectedBlockId) ?? BUILDER_ITEMS[0];
  const isRoofSelected = selectedBuilderItem.shape === "roof";
  const showMobileOverlayMenu = isMobileViewport && isMobileMenuOpen;
  const exportSummarySections = BUILDER_SECTIONS.map((section) => ({
    ...section,
    usedItems: section.items
      .filter((item) => counts[item.id] > 0)
      .map((item) => ({
        ...item,
        count: counts[item.id],
        displayName: getItemDisplayName(item),
      })),
  })).filter((section) => section.usedItems.length > 0);

  return (
    <main className='flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#1a1a2e] text-[#e0e0e0]'>
      <header className='z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-[#3a3a5c] bg-[rgba(10,10,20,.95)] px-4 py-4 sm:px-6 sm:py-5'>
        <div className='flex items-center gap-2'>
          <Link aria-label='Go to home screen' href='/'>
            <Image
              alt='Pokopia logo'
              className='h-14 w-14 rounded-md border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-0.5 sm:h-16 sm:w-16'
              height={64}
              priority
              src='/images/logo/pokopiaplannerdb.png'
              width={64}
            />
          </Link>
          <h1 className='whitespace-nowrap text-[20px] font-bold uppercase tracking-[0.21em] text-[#a0c4ff] sm:text-[24px] lg:text-[26px]'>
            Block Builder
          </h1>
        </div>
        <p className='hidden whitespace-nowrap text-[12px] tracking-[0.1em] text-[#666] lg:block'>
          TAP = PLACE | DRAG = ROTATE | PINCH = ZOOM
        </p>
        <div className='flex-1' />
        <nav className='flex w-full justify-end gap-3 border-t border-[#3a3a5c] pt-2 sm:w-auto sm:border-t-0 sm:pt-0'>
          <Link
            className='whitespace-nowrap text-[14px] tracking-[0.1em] text-[#f2a067] transition-colors hover:text-[#a0c4ff] sm:text-[15px] lg:text-[18px]'
            href='/pokemon-explorer'
          >
            POKEMON ↗
          </Link>
          <Link
            className='whitespace-nowrap text-[14px] tracking-[0.1em] text-[#f2a067] transition-colors hover:text-[#a0c4ff] sm:text-[15px] lg:text-[18px]'
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
          {isRoofSelected && !showMobileOverlayMenu ? (
            <button
              className='absolute right-3 top-3 z-30 rounded-md border border-[#3a3a5c] bg-[rgba(10,10,20,.95)] px-3 py-2 text-[12px] font-semibold tracking-[0.1em] text-[#a0c4ff] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:bg-[rgba(30,30,50,.98)]'
              onClick={rotateRoofSelection}
              type='button'
            >
              Rotate Roof
            </button>
          ) : null}
          <div className='pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#3a3a5c] bg-black/60 px-3 py-1 text-[11px] tracking-[0.1em] text-[#666] sm:text-[12px]'>
            Tap grid to place blocks
          </div>
        </div>

        {isMobileViewport ? (
          <button
            className='fixed bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[#3a3a5c] bg-[rgba(10,10,20,.95)] px-4 py-2 text-[12px] font-semibold tracking-[0.1em] text-[#a0c4ff] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:bg-[rgba(30,30,50,.98)] lg:hidden'
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            type='button'
          >
            {showMobileOverlayMenu ? "Close Menu" : "Open Menu"}
          </button>
        ) : null}

        <aside
          className={`${
            showMobileOverlayMenu ? "fixed inset-0 z-50" : "hidden"
          } flex w-full flex-shrink-0 flex-col border-t-2 border-[#3a3a5c] bg-[rgba(10,10,20,.97)] lg:static lg:flex lg:w-[260px] lg:border-l-2 lg:border-t-0 lg:z-auto xl:w-[280px] ${
            showMobileOverlayMenu ? "overflow-y-auto" : ""
          }`}
        >
          {showMobileOverlayMenu ? (
            <div className='flex items-center justify-between border-b border-[#3a3a5c] px-3 py-2 lg:hidden'>
              <p className='text-[13px] font-semibold uppercase tracking-[0.12em] text-[#a0c4ff]'>
                Builder Menu
              </p>
              <button
                className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[12px] tracking-[0.08em] text-[#9ba9cb] transition hover:bg-white/10'
                onClick={() => setIsMobileMenuOpen(false)}
                type='button'
              >
                Close
              </button>
            </div>
          ) : null}

          <div className='border-b border-[#3a3a5c] px-2 py-2'>
            <button
              className='flex w-full items-center justify-between gap-2 rounded border border-[#3a3a5c] bg-white/5 px-2 py-2 text-left transition hover:bg-white/10'
              onClick={() => setIsAccountPanelOpen((prev) => !prev)}
              type='button'
            >
              <div className='min-w-0'>
                <h2 className='text-[12px] uppercase tracking-[0.2em] text-[#a0c4ff]'>
                  Account + Save
                </h2>
                <p className='truncate text-[11px] tracking-[0.08em] text-[#7f8bb0]'>
                  {authUser ? `Logged in: ${authUser.email}` : "Log in to save builds"}
                </p>
              </div>
              <span className='rounded border border-[#3a3a5c] px-1.5 py-0.5 text-[10px] tracking-[0.1em] text-[#9fb0d6]'>
                {isAccountPanelOpen ? "HIDE" : "OPEN"}
              </span>
            </button>

            {isAccountPanelOpen ? (
              <div className='mt-2 space-y-2'>
                {authUser ? (
                  <div className='space-y-2'>
                    <p className='text-[13px] tracking-[0.08em] text-[#9fb0d6]'>
                      Logged in as{" "}
                      <span className='font-semibold text-[#d9e4ff]'>
                        {authUser.email}
                      </span>
                    </p>
                    <button
                      className='w-full rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[12px] tracking-[0.1em] text-[#c5d4ff] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'
                      disabled={authBusy}
                      onClick={handleLogout}
                      type='button'
                    >
                      {authBusy ? "LOGGING OUT..." : "LOG OUT"}
                    </button>
                  </div>
                ) : (
                  <div className='space-y-2'>
                    <input
                      autoComplete='email'
                      className='w-full rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[13px] text-[#dce7ff] outline-none transition focus:border-[#a0c4ff] focus:bg-white/10'
                      onChange={(event) => setAuthEmail(event.target.value)}
                      placeholder='Email'
                      type='email'
                      value={authEmail}
                    />
                    <input
                      autoComplete='current-password'
                      className='w-full rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[13px] text-[#dce7ff] outline-none transition focus:border-[#a0c4ff] focus:bg-white/10'
                      onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder='Password'
                      type='password'
                      value={authPassword}
                    />
                    <div className='grid grid-cols-2 gap-1'>
                      <button
                        className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[12px] tracking-[0.1em] text-[#c5d4ff] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'
                        disabled={authBusy}
                        onClick={() => runAuthAction("login")}
                        type='button'
                      >
                        {authBusy ? "WAIT..." : "LOG IN"}
                      </button>
                      <button
                        className='rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] px-2 py-1 text-[12px] tracking-[0.1em] text-[#a0c4ff] transition hover:bg-[rgba(160,196,255,.16)] disabled:cursor-not-allowed disabled:opacity-60'
                        disabled={authBusy}
                        onClick={() => runAuthAction("register")}
                        type='button'
                      >
                        {authBusy ? "WAIT..." : "SIGN UP"}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  className='w-full rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] px-2 py-1 text-[13px] tracking-[0.1em] text-[#a0c4ff] transition-all hover:bg-[rgba(160,196,255,.16)] disabled:cursor-not-allowed disabled:opacity-60 lg:text-[12px]'
                  disabled={!authUser || saveBusy}
                  onClick={saveCurrentBuild}
                  type='button'
                >
                  {saveBusy
                    ? "SAVING..."
                    : authUser
                      ? "SAVE BUILD"
                      : "LOG IN TO SAVE"}
                </button>

                {authMessage ? (
                  <p className='text-[12px] tracking-[0.08em] text-[#8fb0d9]'>
                    {authMessage}
                  </p>
                ) : null}
                {saveMessage ? (
                  <p className='text-[12px] tracking-[0.08em] text-[#8fb0d9]'>
                    {saveMessage}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div
            className={`border-b border-[#3a3a5c] px-2 pb-1 pt-2 lg:max-h-none ${
              showMobileOverlayMenu
                ? "max-h-none overflow-visible"
                : "max-h-[34dvh] overflow-y-auto sm:max-h-[42dvh]"
            }`}
          >
            <div className='mb-2 border-b border-[#2a2a4c] pb-2'>
              <h2 className='mb-1 text-[12px] uppercase tracking-[0.2em] text-[#666]'>
                Grid Size
              </h2>
              <div className='flex items-center gap-1'>
                <button
                  className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[16px] text-[#aaa] transition-colors hover:bg-white/15'
                  onClick={() => adjustGridSize(-1)}
                  type='button'
                >
                  −
                </button>
                <input
                  className='w-full rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-center text-[14px] text-[#a0c4ff] outline-none focus:border-[#a0c4ff]'
                  inputMode='numeric'
                  max={MAX_GRID_SIZE}
                  min={minimumGridSize}
                  onChange={(event) => setGridSizeValue(event.target.value)}
                  type='number'
                  value={gridSize}
                />
                <button
                  className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[16px] text-[#aaa] transition-colors hover:bg-white/15'
                  onClick={() => adjustGridSize(1)}
                  type='button'
                >
                  +
                </button>
              </div>
              <p className='mt-1 text-[12px] tracking-[0.08em] text-[#7f8bb0]'>
                {gridSize} × {gridSize} × {gridHeight}
              </p>
              <div className='mt-2'>
                <p className='mb-1 text-[12px] tracking-[0.08em] text-[#7f8bb0]'>
                  Height (Layers)
                </p>
                <div className='flex items-center gap-1'>
                  <button
                    className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[16px] text-[#aaa] transition-colors hover:bg-white/15'
                    onClick={() => adjustGridHeight(-1)}
                    type='button'
                  >
                    −
                  </button>
                  <input
                    className='w-full rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-center text-[14px] text-[#a0c4ff] outline-none focus:border-[#a0c4ff]'
                    inputMode='numeric'
                    max={MAX_GRID_HEIGHT}
                    min={minimumGridHeight}
                    onChange={(event) => setGridHeightValue(event.target.value)}
                    type='number'
                    value={gridHeight}
                  />
                  <button
                    className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[16px] text-[#aaa] transition-colors hover:bg-white/15'
                    onClick={() => adjustGridHeight(1)}
                    type='button'
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {BUILDER_SECTIONS.map((section) => (
              <Fragment key={section.id}>
                <div className='mb-2 border-b border-[#2a2a4c] pb-2'>
                  <h2 className='mb-2 flex items-center gap-1.5 text-[12px] uppercase tracking-[0.2em] text-[#666]'>
                    <span>{section.title}</span>
                    {SECTION_SHORTCUT_LABEL_BY_SECTION_ID[section.id] ? (
                      <span className='rounded border border-[#3a3a5c] bg-white/5 px-1.5 py-0.5 text-[11px] tracking-[0.12em] text-[#8ca2d0]'>
                        {SECTION_SHORTCUT_LABEL_BY_SECTION_ID[section.id]}
                      </span>
                    ) : null}
                  </h2>
                  <div className='grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1'>
                    {section.items.map((item) => {
                      const active = !eraseMode && selectedBlockId === item.id;

                      return (
                        <button
                          key={item.id}
                          className={`flex w-full items-center gap-2 rounded border px-2 py-1 text-left text-[13px] tracking-[0.04em] transition-all lg:text-[13px] ${
                            active
                              ? "border-[#a0c4ff] bg-[rgba(160,196,255,.15)] text-white"
                              : "border-transparent bg-white/5 text-[#ccc] hover:border-[#555] hover:bg-white/10"
                          }`}
                          onClick={() => {
                            setSelectedBlockId(item.id);
                            setEraseMode(false);
                            closeMobileMenuIfNeeded();
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

                {section.id === "blocks" ? (
                  <div className='mb-2 border-b border-[#2a2a4c] pb-2'>
                    <h2 className='mb-1 text-[12px] uppercase tracking-[0.2em] text-[#666]'>
                      Wall Size
                    </h2>
                    <div className='grid grid-cols-2 gap-2'>
                      <div>
                        <p className='mb-1 text-[12px] tracking-[0.08em] text-[#7f8bb0]'>
                          Length
                        </p>
                        <div className='flex items-center gap-1'>
                          <button
                            className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[16px] text-[#aaa] transition-colors hover:bg-white/15'
                            onClick={() => adjustWallDimension("width", -1)}
                            type='button'
                          >
                            −
                          </button>
                          <input
                            className='w-full rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-center text-[14px] text-[#a0c4ff] outline-none focus:border-[#a0c4ff]'
                            inputMode='numeric'
                            max={gridSize}
                            min={1}
                            onChange={(event) =>
                              setWallDimension("width", event.target.value)
                            }
                            type='number'
                            value={wallDimensions.width}
                          />
                          <button
                            className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[16px] text-[#aaa] transition-colors hover:bg-white/15'
                            onClick={() => adjustWallDimension("width", 1)}
                            type='button'
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className='mb-1 text-[12px] tracking-[0.08em] text-[#7f8bb0]'>
                          Height
                        </p>
                        <div className='flex items-center gap-1'>
                          <button
                            className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[16px] text-[#aaa] transition-colors hover:bg-white/15'
                            onClick={() => adjustWallDimension("height", -1)}
                            type='button'
                          >
                            −
                          </button>
                          <input
                            className='w-full rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-center text-[14px] text-[#a0c4ff] outline-none focus:border-[#a0c4ff]'
                            inputMode='numeric'
                            max={gridHeight}
                            min={1}
                            onChange={(event) =>
                              setWallDimension("height", event.target.value)
                            }
                            type='number'
                            value={wallDimensions.height}
                          />
                          <button
                            className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[16px] text-[#aaa] transition-colors hover:bg-white/15'
                            onClick={() => adjustWallDimension("height", 1)}
                            type='button'
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </Fragment>
            ))}
          </div>

          <button
            className={`mx-2 mb-2 mt-0 rounded border px-2 py-1 text-[13px] tracking-[0.1em] transition-all lg:text-[12px] ${
              eraseMode
                ? "border-[#ff5050] bg-[rgba(255,80,80,.2)] text-white"
                : "border-[#5a2a2a] bg-[rgba(255,80,80,.08)] text-[#ff9090] hover:border-[#ff5050] hover:bg-[rgba(255,80,80,.2)] hover:text-white"
            }`}
            onClick={() => {
              setEraseMode((prev) => !prev);
              closeMobileMenuIfNeeded();
            }}
            type='button'
          >
            ✕ ERASE MODE
          </button>

          <div className='border-y border-[#3a3a5c] px-2 py-2'>
            <h2 className='mb-1 text-[12px] uppercase tracking-[0.2em] text-[#666]'>
              Layer
            </h2>
            <div className='flex items-center gap-2'>
              <button
                className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[17px] text-[#aaa] transition-colors hover:bg-white/15 lg:h-6 lg:w-6 lg:text-[16px]'
                onClick={() => {
                  setCurrentLayer((prev) => Math.max(1, prev - 1));
                  closeMobileMenuIfNeeded();
                }}
                type='button'
              >
                −
              </button>
              <div className='min-w-5 text-center text-[16px] font-bold tracking-[0.08em] text-[#a0c4ff] lg:text-[15px]'>
                {currentLayer}
              </div>
              <button
                className='flex h-7 w-7 items-center justify-center rounded border border-[#444] bg-white/5 text-[17px] text-[#aaa] transition-colors hover:bg-white/15 lg:h-6 lg:w-6 lg:text-[16px]'
                onClick={() => {
                  setCurrentLayer((prev) => Math.min(gridHeight, prev + 1));
                  closeMobileMenuIfNeeded();
                }}
                type='button'
              >
                +
              </button>
              <div className='ml-0.5 text-[13px] text-[#555] lg:text-[12px]'>
                / {gridHeight}
              </div>
            </div>
          </div>

          <div className='border-b border-[#3a3a5c] px-2 py-2'>
            <div className='flex items-center justify-between text-[13px] tracking-[0.1em] text-[#888]'>
              TOTAL PLACED
              <span className='text-[17px] font-bold text-white'>{total}</span>
            </div>
          </div>

          <div
            className={`px-2 pb-1 pt-2 lg:flex-1 lg:max-h-none ${
              showMobileOverlayMenu
                ? "max-h-none overflow-visible"
                : "max-h-[26dvh] overflow-y-auto sm:max-h-[30dvh]"
            }`}
          >
            <h2 className='mb-2 text-[12px] uppercase tracking-[0.2em] text-[#666]'>
              Item Count
            </h2>

            {BUILDER_SECTIONS.map((section) => {
              const usedItems = section.items.filter(
                (item) => counts[item.id] > 0,
              );
              if (usedItems.length === 0) return null;

              return (
                <div className='mb-2' key={`counts-${section.id}`}>
                  <p className='mb-1 text-[12px] uppercase tracking-[0.12em] text-[#7f8bb0]'>
                    {section.title}
                  </p>
                  {usedItems.map((item) => (
                    <div
                      className='mb-1 flex items-center gap-[7px] text-[14px] text-[#bbb] lg:text-[13px]'
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
                        className='min-w-0 flex-1 rounded border border-[#2f3555] bg-white/5 px-2 py-1 text-[13px] tracking-[0.04em] text-[#e6ebff] outline-none transition focus:border-[#a0c4ff] focus:bg-white/10'
                        onBlur={() => resetBlankItemName(item)}
                        onChange={(event) =>
                          updateItemName(item.id, event.target.value)
                        }
                        placeholder={item.name}
                        type='text'
                        value={itemNameMap[item.id] ?? item.name}
                      />
                      <span className='w-7 text-right text-[15px] font-bold text-[#a0c4ff] lg:text-[14px]'>
                        {counts[item.id]}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}

            {total === 0 ? (
              <p className='text-[13px] text-[#666]'>No items placed yet.</p>
            ) : null}

            <div className='mt-2 flex items-center justify-between border-t border-[#3a3a5c] pt-2 text-[13px] tracking-[0.1em] text-[#888] lg:text-[12px]'>
              TOTAL
              <span className='text-[16px] font-bold text-white lg:text-[15px]'>
                {total}
              </span>
            </div>
          </div>

          <div className='mx-2 mt-2 rounded border border-[#3a3a5c] bg-[rgba(255,255,255,0.02)] p-2'>
            <div className='mb-2 flex items-center justify-between gap-2'>
              <h2 className='text-[12px] uppercase tracking-[0.14em] text-[#7f8bb0]'>
                My Saved Builds
              </h2>
              <button
                className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[11px] tracking-[0.1em] text-[#9fb0d6] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'
                disabled={
                  !authUser ||
                  savedProjectsBusy ||
                  Boolean(savedProjectLoadId) ||
                  Boolean(savedProjectDeleteId)
                }
                onClick={() => fetchSavedProjects()}
                type='button'
              >
                {savedProjectsBusy ? "LOADING..." : "REFRESH"}
              </button>
            </div>

            {!authUser ? (
              <p className='text-[12px] tracking-[0.08em] text-[#6f7ca0]'>
                Log in to view your saved builds.
              </p>
            ) : savedProjects.length === 0 ? (
              <p className='text-[12px] tracking-[0.08em] text-[#6f7ca0]'>
                No saved builds yet.
              </p>
            ) : (
              <div className='max-h-[20dvh] space-y-2 overflow-y-auto pr-1'>
                {savedProjects.map((project) => (
                  <div
                    className='rounded border border-[#2f3555] bg-white/5 p-2'
                    key={project.id}
                  >
                    <p
                      className='truncate text-[13px] font-semibold tracking-[0.06em] text-[#d9e4ff]'
                      title={project.name}
                    >
                      {project.name}
                    </p>
                    <p className='mt-1 text-[11px] tracking-[0.08em] text-[#7f8bb0]'>
                      {project.totalBlocks} blocks •{" "}
                      {formatSavedDate(project.updatedAt)}
                    </p>
                    <div className='mt-2 grid grid-cols-2 gap-1'>
                      <button
                        className='rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] px-2 py-1 text-[11px] tracking-[0.1em] text-[#a0c4ff] transition hover:bg-[rgba(160,196,255,.16)] disabled:cursor-not-allowed disabled:opacity-60'
                        disabled={
                          saveBusy ||
                          Boolean(savedProjectDeleteId) ||
                          Boolean(savedProjectLoadId)
                        }
                        onClick={() => loadSavedProject(project.id)}
                        type='button'
                      >
                        {savedProjectLoadId === project.id
                          ? "LOADING..."
                          : "LOAD"}
                      </button>
                      <button
                        className='rounded border border-[#5a2a2a] bg-[rgba(255,80,80,.08)] px-2 py-1 text-[11px] tracking-[0.1em] text-[#ff9090] transition hover:border-[#ff5050] hover:bg-[rgba(255,80,80,.2)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60'
                        disabled={
                          saveBusy ||
                          Boolean(savedProjectLoadId) ||
                          Boolean(savedProjectDeleteId)
                        }
                        onClick={() => deleteSavedProject(project)}
                        type='button'
                      >
                        {savedProjectDeleteId === project.id
                          ? "DELETING..."
                          : "DELETE"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {savedProjectsMessage ? (
              <p className='mt-2 text-[12px] tracking-[0.08em] text-[#8fb0d9]'>
                {savedProjectsMessage}
              </p>
            ) : null}
          </div>

          <button
            className='mx-2 mt-2 rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] px-2 py-1 text-[13px] tracking-[0.1em] text-[#a0c4ff] transition-all hover:bg-[rgba(160,196,255,.16)] lg:text-[12px]'
            onClick={() => {
              setIsExportSummaryOpen(true);
              closeMobileMenuIfNeeded();
            }}
            type='button'
          >
            EXPORT SUMMARY
          </button>

          <button
            className='m-2 rounded border border-[#3a3a5c] bg-transparent px-2 py-1 text-[13px] tracking-[0.1em] text-[#666] transition-all hover:border-[#ff5050] hover:text-[#ff9090] lg:text-[12px]'
            onClick={() => {
              const event = new CustomEvent(CLEAR_EVENT);
              window.dispatchEvent(event);
              closeMobileMenuIfNeeded();
            }}
            type='button'
          >
            CLEAR ALL
          </button>
        </aside>
      </div>

      {isExportSummaryOpen ? (
        <div
          className='fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(4,6,12,.72)] px-3'
          onClick={() => setIsExportSummaryOpen(false)}
        >
          <div
            className='w-full max-w-[560px] overflow-hidden rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.98)] shadow-[0_20px_60px_rgba(0,0,0,0.45)]'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='border-b border-[#3a3a5c] px-4 py-3'>
              <h2 className='text-[16px] font-bold uppercase tracking-[0.14em] text-[#a0c4ff]'>
                Build Export Summary
              </h2>
              <p className='mt-1 text-[12px] tracking-[0.08em] text-[#7f8bb0]'>
                Grid: {gridSize} × {gridSize} × {gridHeight} | Total Placed:{" "}
                {total}
              </p>
            </div>

            <div className='max-h-[62dvh] overflow-y-auto px-4 py-3'>
              {exportSummarySections.length === 0 ? (
                <p className='text-[14px] text-[#9ba9cb]'>
                  No blocks placed yet.
                </p>
              ) : (
                exportSummarySections.map((section) => (
                  <div className='mb-3 last:mb-0' key={`export-${section.id}`}>
                    <p className='mb-1 text-[12px] uppercase tracking-[0.12em] text-[#7f8bb0]'>
                      {section.title}
                    </p>
                    <div className='space-y-1 rounded border border-[#2f3555] bg-white/5 p-2'>
                      {section.usedItems.map((item) => (
                        <div
                          className='flex items-center justify-between gap-2 text-[14px] text-[#d6deff]'
                          key={`export-${section.id}-${item.id}`}
                        >
                          <span className='min-w-0 truncate'>
                            {item.displayName}
                          </span>
                          <span className='font-semibold text-[#a0c4ff]'>
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className='border-t border-[#3a3a5c] px-4 py-3'>
              <button
                className='w-full rounded border border-[#3a3a5c] bg-white/5 px-3 py-2 text-[13px] tracking-[0.1em] text-[#a0c4ff] transition hover:bg-white/10'
                onClick={() => setIsExportSummaryOpen(false)}
                type='button'
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
