"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PREFAB_HOUSE_OPTIONS,
  buildPreconfiguredHousingPlans,
  calculateHousingComfort,
  createHousingLookups,
  getHouseCapacity,
  normalizeSavedHousingConfig,
} from "@/lib/housing";

const PANEL_CLASS =
  "rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] p-4 shadow-[0_8px_30px_rgba(0,0,0,.25)] md:p-5";
const INPUT_CLASS =
  "w-full rounded-md border border-[#3a3a5c] bg-[rgba(12,12,24,.95)] px-3 py-2 text-[16px] text-[#e0e0e0] outline-none transition placeholder:text-[#666] focus:border-[#a0c4ff] focus:ring-1 focus:ring-[#a0c4ff]/40";

function toPublicImageSrc(src) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return src;
  return `/${src}`;
}

function normalizeTextKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function sectionPreferenceScore(sectionTitle) {
  const label = String(sectionTitle || "").toLowerCase();
  if (label.includes("lost relics")) return 5;
  if (label.includes("other")) return 4;
  if (label.includes("misc")) return 3;
  return 1;
}

function formatSavedDate(value) {
  if (!value) return "Unknown time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown time";
  return parsed.toLocaleString();
}

function normalizeConfigSummary(record) {
  if (!record || typeof record !== "object") return null;
  const id = String(record.id || "").trim();
  const name = String(record.name || "").trim();
  if (!id || !name) return null;

  return {
    id,
    name: name.slice(0, 100),
    happinessScore: Number(record.happinessScore) || 0,
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  };
}

function normalizeBuilderProject(record) {
  if (!record || typeof record !== "object") return null;
  const id = String(record.id || "").trim();
  const name = String(record.name || "").trim();
  if (!id || !name) return null;

  return {
    id,
    name: name.slice(0, 80),
    totalBlocks: Number(record.totalBlocks) || 0,
    updatedAt: record.updatedAt || null,
  };
}

export function HousingPlanner({ pokemonDataset, habitatDataset, itemsDataset }) {
  const lookups = useMemo(
    () =>
      createHousingLookups({
        pokemonDataset,
        habitatDataset,
        itemsDataset,
      }),
    [habitatDataset, itemsDataset, pokemonDataset],
  );

  const pokemonOptions = useMemo(
    () =>
      [...(pokemonDataset?.pokemon || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [pokemonDataset?.pokemon],
  );

  const habitatOptions = useMemo(
    () => [...(habitatDataset?.habitats || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [habitatDataset?.habitats],
  );

  const preconfiguredPlans = useMemo(
    () => buildPreconfiguredHousingPlans(pokemonDataset),
    [pokemonDataset],
  );

  const itemOptions = useMemo(() => {
    const byNameKey = new Map();

    for (const section of itemsDataset?.sections || []) {
      for (const item of section.items || []) {
        const itemName = String(item.name || "").trim();
        if (!itemName) continue;
        const itemKey = normalizeTextKey(itemName);
        const imageSrc = toPublicImageSrc(item.imageSrc);
        const sectionTitle = String(section.title || item.sectionTitle || "").trim();
        const existing = byNameKey.get(itemKey);

        if (!existing) {
          byNameKey.set(itemKey, {
            ...item,
            imageSrc,
            sectionTitle,
            sectionTitles: new Set(sectionTitle ? [sectionTitle] : []),
            favoritesSet: new Set(item.favorites || []),
            qualityRank: sectionPreferenceScore(sectionTitle),
          });
          continue;
        }

        if (sectionTitle) {
          existing.sectionTitles.add(sectionTitle);
        }
        for (const favorite of item.favorites || []) {
          existing.favoritesSet.add(favorite);
        }

        const nextRank = sectionPreferenceScore(sectionTitle);
        const shouldReplacePrimary = nextRank < existing.qualityRank;
        if (shouldReplacePrimary) {
          existing.id = item.id;
          existing.sectionTitle = sectionTitle;
          existing.imageSrc = imageSrc || existing.imageSrc;
          existing.qualityRank = nextRank;
        }
      }
    }

    return Array.from(byNameKey.values())
      .map((entry) => ({
        ...entry,
        favorites: Array.from(entry.favoritesSet).sort((a, b) => a.localeCompare(b)),
        sectionTitle:
          entry.sectionTitle ||
          Array.from(entry.sectionTitles).sort((a, b) => a.localeCompare(b))[0] ||
          "Other",
        sectionLabels: Array.from(entry.sectionTitles).sort((a, b) =>
          a.localeCompare(b),
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsDataset?.sections]);

  const pokemonFavoriteFilterOptions = useMemo(
    () => [...(pokemonDataset?.facets?.favorites || [])].sort((a, b) => a.localeCompare(b)),
    [pokemonDataset?.facets?.favorites],
  );

  const pokemonLikeFilterOptions = useMemo(() => {
    const values = new Set();
    for (const pokemon of pokemonOptions) {
      for (const like of pokemon.habitatAttractions || []) {
        if (like) values.add(like);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [pokemonOptions]);

  const itemFavoriteFilterOptions = useMemo(() => {
    const values = new Set();
    for (const item of itemOptions) {
      for (const favorite of item.favorites || []) {
        if (favorite) values.add(favorite);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [itemOptions]);

  const [activeSubsection, setActiveSubsection] = useState("ideal");
  const [isPresetExamplesOpen, setIsPresetExamplesOpen] = useState(false);
  const [houseMode, setHouseMode] = useState("prefab");
  const [prefabType, setPrefabType] = useState(PREFAB_HOUSE_OPTIONS[1].id);
  const [preferredHabitat, setPreferredHabitat] = useState(
    pokemonDataset?.facets?.idealHabitats?.[0] || "",
  );
  const [selectedHabitatId, setSelectedHabitatId] = useState(
    habitatOptions[0]?.id || "",
  );
  const [selectedResidentNames, setSelectedResidentNames] = useState([]);
  const [linkedBuilderProjectId, setLinkedBuilderProjectId] = useState("");
  const [itemSelections, setItemSelections] = useState([]);
  const [pokemonSearch, setPokemonSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [pokemonFavoriteFilter, setPokemonFavoriteFilter] = useState("all");
  const [pokemonLikeFilter, setPokemonLikeFilter] = useState("all");
  const [itemFavoriteFilter, setItemFavoriteFilter] = useState("all");
  const [itemLikeFilter, setItemLikeFilter] = useState("all");
  const [selectedResidentFavoriteTag, setSelectedResidentFavoriteTag] = useState("");
  const [similarToFirstResidentOnly, setSimilarToFirstResidentOnly] = useState(false);
  const [plannerMessage, setPlannerMessage] = useState("");

  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [saveName, setSaveName] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [savedConfigs, setSavedConfigs] = useState([]);
  const [savedConfigsBusy, setSavedConfigsBusy] = useState(false);
  const [savedConfigsMessage, setSavedConfigsMessage] = useState("");
  const [savedConfigLoadId, setSavedConfigLoadId] = useState("");
  const [savedConfigDeleteId, setSavedConfigDeleteId] = useState("");

  const [savedBuilderProjects, setSavedBuilderProjects] = useState([]);
  const [savedBuilderProjectsBusy, setSavedBuilderProjectsBusy] = useState(false);
  const [savedBuilderProjectsMessage, setSavedBuilderProjectsMessage] = useState("");

  const houseCapacity = getHouseCapacity(houseMode, prefabType);

  useEffect(() => {
    setSelectedResidentNames((previous) => {
      if (previous.length <= houseCapacity) return previous;
      return previous.slice(0, houseCapacity);
    });
  }, [houseCapacity]);

  useEffect(() => {
    if (!selectedHabitatId && habitatOptions.length > 0) {
      setSelectedHabitatId(habitatOptions[0].id);
    }
  }, [habitatOptions, selectedHabitatId]);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.user) {
        setAuthUser(null);
        return;
      }

      setAuthUser({
        id: data.user.id,
        email: data.user.email,
      });
    } catch {
      setAuthUser(null);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const fetchSavedConfigs = useCallback(
    async ({ silent = false } = {}) => {
      if (!authUser) {
        setSavedConfigs([]);
        setSavedConfigsMessage("");
        return;
      }

      if (!silent) setSavedConfigsBusy(true);
      setSavedConfigsMessage("");

      try {
        const response = await fetch("/api/housing/list", {
          method: "GET",
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setSavedConfigsMessage(
            data?.error || "Unable to load saved housing configurations.",
          );
          return;
        }

        const list = Array.isArray(data?.configs)
          ? data.configs.map(normalizeConfigSummary).filter(Boolean)
          : [];
        setSavedConfigs(list);
      } catch {
        setSavedConfigsMessage("Unable to load saved housing configurations.");
      } finally {
        if (!silent) setSavedConfigsBusy(false);
      }
    },
    [authUser],
  );

  const fetchSavedBuilderProjects = useCallback(
    async ({ silent = false } = {}) => {
      if (!authUser) {
        setSavedBuilderProjects([]);
        setSavedBuilderProjectsMessage("");
        setLinkedBuilderProjectId("");
        return;
      }

      if (!silent) setSavedBuilderProjectsBusy(true);
      setSavedBuilderProjectsMessage("");

      try {
        const response = await fetch("/api/projects/list", {
          method: "GET",
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setSavedBuilderProjectsMessage(
            data?.error || "Unable to load saved builder projects.",
          );
          return;
        }

        const list = Array.isArray(data?.projects)
          ? data.projects.map(normalizeBuilderProject).filter(Boolean)
          : [];

        setSavedBuilderProjects(list);
        setLinkedBuilderProjectId((current) => {
          if (!current) return "";
          return list.some((project) => project.id === current) ? current : "";
        });
      } catch {
        setSavedBuilderProjectsMessage("Unable to load saved builder projects.");
      } finally {
        if (!silent) setSavedBuilderProjectsBusy(false);
      }
    },
    [authUser],
  );

  useEffect(() => {
    if (!authUser) {
      setSavedConfigs([]);
      setSavedConfigsMessage("");
      setSavedConfigLoadId("");
      setSavedConfigDeleteId("");
      setSavedBuilderProjects([]);
      setSavedBuilderProjectsMessage("");
      setLinkedBuilderProjectId("");
      return;
    }

    fetchSavedConfigs();
    fetchSavedBuilderProjects();
  }, [authUser, fetchSavedBuilderProjects, fetchSavedConfigs]);

  const runAuthAction = useCallback(async (mode) => {
    if (authBusy) return;

    const email = authEmail.trim();
    const password = authPassword;

    if (!email || !password) {
      setAuthMessage("Email and password are required.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("");

    try {
      const endpoint = mode === "register" ? "register" : "login";
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setAuthMessage(data?.error || "Unable to authenticate right now.");
        return;
      }

      setAuthUser(data.user || null);
      setAuthPassword("");
      setAuthMessage(mode === "register" ? "Account created." : "Logged in.");
    } catch {
      setAuthMessage("Unable to authenticate right now.");
    } finally {
      setAuthBusy(false);
    }
  }, [authBusy, authEmail, authPassword]);

  const handleLogout = useCallback(async () => {
    if (authBusy) return;

    setAuthBusy(true);
    setAuthMessage("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setAuthMessage(data?.error || "Unable to log out right now.");
        return;
      }

      setAuthUser(null);
      setAuthPassword("");
      setAuthMessage("Logged out.");
    } catch {
      setAuthMessage("Unable to log out right now.");
    } finally {
      setAuthBusy(false);
    }
  }, [authBusy]);

  const selectedResidents = useMemo(
    () =>
      selectedResidentNames
        .map((name) => lookups.pokemonByName.get(name))
        .filter(Boolean),
    [lookups.pokemonByName, selectedResidentNames],
  );

  const selectedItems = useMemo(
    () => {
      const grouped = new Map();

      itemSelections.forEach((entry) => {
        const item = lookups.itemsById.get(entry.itemId);
        const quantity = Number(entry.quantity) || 0;
        if (!item || quantity <= 0) return;

        const key = normalizeTextKey(item.name);
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, {
            item,
            quantity,
          });
          return;
        }

        existing.quantity += quantity;
      });

      return Array.from(grouped.values());
    },
    [itemSelections, lookups.itemsById],
  );

  const selectedHabitat = selectedHabitatId
    ? lookups.habitatsById.get(selectedHabitatId) || null
    : null;

  const linkedBuilderProject = linkedBuilderProjectId
    ? savedBuilderProjects.find((project) => project.id === linkedBuilderProjectId) ||
      null
    : null;

  const comfort = useMemo(
    () =>
      calculateHousingComfort({
        selectedResidents,
        selectedItems,
        preferredHabitat,
        selectedHabitat,
        houseCapacity,
        linkedBuilderProject,
      }),
    [
      houseCapacity,
      linkedBuilderProject,
      preferredHabitat,
      selectedHabitat,
      selectedItems,
      selectedResidents,
    ],
  );

  useEffect(() => {
    setItemSelections((previous) => {
      const grouped = new Map();
      let changed = false;

      previous.forEach((entry) => {
        const item = lookups.itemsById.get(entry.itemId);
        const quantity = Number(entry.quantity) || 0;
        if (!item || quantity <= 0) {
          changed = true;
          return;
        }

        const key = normalizeTextKey(item.name);
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, { itemId: item.id, quantity });
          return;
        }

        existing.quantity += quantity;
        changed = true;
      });

      if (!changed && grouped.size === previous.length) return previous;
      return Array.from(grouped.values());
    });
  }, [lookups.itemsById]);

  useEffect(() => {
    if (!selectedResidentFavoriteTag) return;
    const hasTag = selectedResidents.some((resident) =>
      (resident.favorites || []).includes(selectedResidentFavoriteTag),
    );
    if (!hasTag) {
      setSelectedResidentFavoriteTag("");
    }
  }, [selectedResidentFavoriteTag, selectedResidents]);

  const availablePokemonOptions = useMemo(() => {
    const selectedSet = new Set(selectedResidentNames);
    const query = pokemonSearch.trim().toLowerCase();
    const firstSelectedResident =
      selectedResidentNames.length > 0
        ? lookups.pokemonByName.get(selectedResidentNames[0]) || null
        : null;
    const firstFavoriteKeySet = new Set(
      (firstSelectedResident?.favorites || []).map((favorite) =>
        normalizeTextKey(favorite),
      ),
    );

    return pokemonOptions
      .filter((pokemon) => !selectedSet.has(pokemon.name))
      .filter((pokemon) => {
        const inFavoriteFilter =
          pokemonFavoriteFilter === "all" ||
          pokemon.favorites.includes(pokemonFavoriteFilter);
        const inLikeFilter =
          pokemonLikeFilter === "all" ||
          (pokemon.habitatAttractions || []).includes(pokemonLikeFilter);
        const inSimilarityFilter =
          !similarToFirstResidentOnly ||
          !firstSelectedResident ||
          normalizeTextKey(pokemon.idealHabitat) ===
            normalizeTextKey(firstSelectedResident.idealHabitat) ||
          pokemon.favorites.some((favorite) =>
            firstFavoriteKeySet.has(normalizeTextKey(favorite)),
          );

        if (!inFavoriteFilter || !inLikeFilter || !inSimilarityFilter) {
          return false;
        }

        if (!query) return true;
        return [
          pokemon.name,
          pokemon.number,
          pokemon.idealHabitat,
          pokemon.primaryLocation,
          ...(pokemon.favorites || []),
          ...(pokemon.habitatAttractions || []),
          ...(pokemon.specialties || []),
        ].some((value) => String(value || "").toLowerCase().includes(query));
      })
      .slice(0, 80);
  }, [
    lookups.pokemonByName,
    pokemonFavoriteFilter,
    pokemonLikeFilter,
    pokemonOptions,
    pokemonSearch,
    selectedResidentNames,
    similarToFirstResidentOnly,
  ]);

  const availableItemOptions = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();

    return itemOptions
      .filter((item) => {
        const inFavoriteFilter =
          itemFavoriteFilter === "all" || item.favorites.includes(itemFavoriteFilter);
        const inResidentFavoriteFilter =
          !selectedResidentFavoriteTag ||
          item.favorites.includes(selectedResidentFavoriteTag);
        const inLikeFilter =
          itemLikeFilter === "all" ||
          normalizeTextKey(item.name) === normalizeTextKey(itemLikeFilter);
        if (!inFavoriteFilter || !inResidentFavoriteFilter || !inLikeFilter) {
          return false;
        }

        if (!query) return true;
        return [
          item.name,
          item.sectionTitle,
          ...(item.sectionLabels || []),
          ...(item.favorites || []),
          item.tagText,
          item.description,
        ].some((value) => String(value || "").toLowerCase().includes(query));
      })
      .slice(0, 120);
  }, [
    itemFavoriteFilter,
    itemLikeFilter,
    itemOptions,
    itemSearch,
    selectedResidentFavoriteTag,
  ]);

  const addResident = useCallback(
    (pokemonName) => {
      if (!pokemonName) return;
      setPlannerMessage("");

      setSelectedResidentNames((previous) => {
        if (previous.includes(pokemonName)) return previous;
        if (previous.length >= houseCapacity) {
          setPlannerMessage(
            `This house can hold ${houseCapacity} resident${houseCapacity === 1 ? "" : "s"}.`,
          );
          return previous;
        }
        return [...previous, pokemonName];
      });
    },
    [houseCapacity],
  );

  const removeResident = useCallback((pokemonName) => {
    setSelectedResidentNames((previous) =>
      previous.filter((name) => name !== pokemonName),
    );
  }, []);

  const addItem = useCallback((itemId) => {
    if (!itemId) return;

    setItemSelections((previous) => {
      const matchIndex = previous.findIndex((entry) => entry.itemId === itemId);
      if (matchIndex === -1) {
        return [...previous, { itemId, quantity: 1 }];
      }

      const next = [...previous];
      const currentQuantity = Number(next[matchIndex].quantity) || 0;
      next[matchIndex] = {
        ...next[matchIndex],
        quantity: Math.min(999, currentQuantity + 1),
      };
      return next;
    });
  }, []);

  const setItemQuantity = useCallback((itemId, quantityValue) => {
    const quantity = Number.parseInt(String(quantityValue || "0"), 10);
    const normalized = Number.isFinite(quantity)
      ? Math.max(0, Math.min(999, quantity))
      : 0;

    setItemSelections((previous) => {
      if (normalized <= 0) {
        return previous.filter((entry) => entry.itemId !== itemId);
      }

      const matchIndex = previous.findIndex((entry) => entry.itemId === itemId);
      if (matchIndex === -1) {
        return [...previous, { itemId, quantity: normalized }];
      }

      const next = [...previous];
      next[matchIndex] = { ...next[matchIndex], quantity: normalized };
      return next;
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    const item = lookups.itemsById.get(itemId);
    if (!item) return;
    const removeKey = normalizeTextKey(item.name);

    setItemSelections((previous) =>
      previous.filter((entry) => {
        const candidate = lookups.itemsById.get(entry.itemId);
        if (!candidate) return false;
        return normalizeTextKey(candidate.name) !== removeKey;
      }),
    );
  }, [lookups.itemsById]);

  const applyPreconfiguredPlan = useCallback((plan) => {
    if (!plan) return;

    const targetPrefabType = PREFAB_HOUSE_OPTIONS.some(
      (entry) => entry.id === plan.suggestedPrefabType,
    )
      ? plan.suggestedPrefabType
      : PREFAB_HOUSE_OPTIONS[1].id;

    const targetCapacity = getHouseCapacity("prefab", targetPrefabType);

    setHouseMode("prefab");
    setPrefabType(targetPrefabType);
    setPreferredHabitat(plan.preferredHabitat || "");
    setSelectedResidentNames(plan.sampleResidents.slice(0, targetCapacity));
    setPlannerMessage(`Applied ${plan.title}. Continue customizing below.`);
    setActiveSubsection("custom");
  }, []);

  const saveHousingConfig = useCallback(async () => {
    if (!authUser) {
      setSaveMessage("Log in to save housing configurations.");
      return;
    }

    const trimmedName = saveName.trim() || `Housing ${new Date().toLocaleString()}`;
    const payload = {
      name: trimmedName,
      happinessScore: comfort.score,
      config: {
        houseMode,
        prefabType,
        preferredHabitat,
        selectedHabitatId,
        linkedBuilderProjectId,
        selectedResidentNames,
        itemSelections,
      },
    };

    setSaveBusy(true);
    setSaveMessage("");

    try {
      const response = await fetch("/api/housing/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setSaveMessage(data?.error || "Unable to save housing configuration.");
        return;
      }

      const savedSummary = normalizeConfigSummary(data?.config);
      if (savedSummary) {
        setSavedConfigs((previous) => [savedSummary, ...previous]);
      } else {
        fetchSavedConfigs({ silent: true });
      }

      setSaveName(trimmedName);
      setSaveMessage(`Saved \"${trimmedName}\".`);
    } catch {
      setSaveMessage("Unable to save housing configuration.");
    } finally {
      setSaveBusy(false);
    }
  }, [
    authUser,
    comfort.score,
    fetchSavedConfigs,
    houseMode,
    itemSelections,
    linkedBuilderProjectId,
    prefabType,
    preferredHabitat,
    saveName,
    selectedHabitatId,
    selectedResidentNames,
  ]);

  const loadSavedConfig = useCallback(
    async (configId) => {
      if (!authUser) {
        setSaveMessage("Log in to load housing configurations.");
        return;
      }

      if (!configId) return;

      setSavedConfigLoadId(configId);
      setSavedConfigsMessage("");
      setSaveMessage("");

      try {
        const response = await fetch(`/api/housing/${encodeURIComponent(configId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setSaveMessage(data?.error || "Unable to load saved housing configuration.");
          return;
        }

        const normalized = normalizeSavedHousingConfig({
          config: data?.config?.config,
          pokemonByName: lookups.pokemonByName,
          itemsById: lookups.itemsById,
          habitatsById: lookups.habitatsById,
        });

        if (!normalized) {
          setSaveMessage("Saved housing configuration is invalid.");
          return;
        }

        setHouseMode(normalized.houseMode);
        setPrefabType(normalized.prefabType);
        setPreferredHabitat(normalized.preferredHabitat);
        setSelectedHabitatId(normalized.selectedHabitatId);
        setLinkedBuilderProjectId(normalized.linkedBuilderProjectId);
        setSelectedResidentNames(normalized.selectedResidentNames);
        setItemSelections(normalized.itemSelections);
        setActiveSubsection("custom");
        setSaveName(data?.config?.name || "");
        setSaveMessage(`Loaded \"${data?.config?.name || "saved config"}\".`);
      } catch {
        setSaveMessage("Unable to load saved housing configuration.");
      } finally {
        setSavedConfigLoadId("");
      }
    },
    [
      authUser,
      lookups.habitatsById,
      lookups.itemsById,
      lookups.pokemonByName,
    ],
  );

  const deleteSavedConfig = useCallback(
    async (config) => {
      if (!authUser) {
        setSavedConfigsMessage("Log in to manage saved housing configurations.");
        return;
      }

      if (!config?.id) return;
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(`Delete \"${config.name}\"?`);
        if (!confirmed) return;
      }

      setSavedConfigDeleteId(config.id);
      setSavedConfigsMessage("");

      try {
        const response = await fetch(`/api/housing/${encodeURIComponent(config.id)}`, {
          method: "DELETE",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setSavedConfigsMessage(data?.error || "Unable to delete saved configuration.");
          return;
        }

        setSavedConfigs((previous) =>
          previous.filter((entry) => entry.id !== config.id),
        );
        setSavedConfigsMessage(`Deleted \"${config.name}\".`);
      } catch {
        setSavedConfigsMessage("Unable to delete saved configuration.");
      } finally {
        setSavedConfigDeleteId("");
      }
    },
    [authUser],
  );

  return (
    <section className='space-y-5'>
      <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] p-3 shadow-[0_8px_30px_rgba(0,0,0,.25)]'>
        <button
          className='flex w-full items-center justify-between gap-3 rounded-lg border border-[#3a3a5c] bg-white/5 px-3 py-2 text-left transition hover:bg-white/10'
          onClick={() => setIsAccountPanelOpen((previous) => !previous)}
          type='button'
        >
          <div>
            <h2 className='text-[13px] font-semibold uppercase tracking-[0.18em] text-[#a0c4ff]'>
              Account + Housing Saves
            </h2>
            <p className='text-[12px] tracking-[0.08em] text-[#7f8bb0]'>
              {authUser ? `Logged in: ${authUser.email}` : "Log in to save housing plans"}
            </p>
          </div>
          <span className='rounded border border-[#3a3a5c] px-2 py-1 text-[11px] tracking-[0.1em] text-[#9fb0d6]'>
            {isAccountPanelOpen ? "HIDE" : "OPEN"}
          </span>
        </button>

        {isAccountPanelOpen ? (
          <div className='mt-3 grid gap-3 lg:grid-cols-2'>
            <div className='space-y-2 rounded-lg border border-[#3a3a5c] bg-white/5 p-3'>
              {authUser ? (
                <>
                  <p className='text-[13px] tracking-[0.08em] text-[#9fb0d6]'>
                    Logged in as <span className='font-semibold text-[#d9e4ff]'>{authUser.email}</span>
                  </p>
                  <button
                    className='w-full rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[12px] tracking-[0.1em] text-[#c5d4ff] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'
                    disabled={authBusy}
                    onClick={handleLogout}
                    type='button'
                  >
                    {authBusy ? "LOGGING OUT..." : "LOG OUT"}
                  </button>
                </>
              ) : (
                <>
                  <input
                    autoComplete='email'
                    className={INPUT_CLASS}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder='Email'
                    type='email'
                    value={authEmail}
                  />
                  <input
                    autoComplete='current-password'
                    className={INPUT_CLASS}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder='Password'
                    type='password'
                    value={authPassword}
                  />
                  <div className='grid grid-cols-2 gap-2'>
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
                </>
              )}

              <label className='space-y-1'>
                <span className='text-[12px] uppercase tracking-[0.1em] text-[#9fb0d6]'>
                  Save Name
                </span>
                <input
                  className={INPUT_CLASS}
                  onChange={(event) => setSaveName(event.target.value)}
                  placeholder='Habitat plan name'
                  value={saveName}
                />
              </label>

              <button
                className='w-full rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] px-2 py-1 text-[13px] tracking-[0.1em] text-[#a0c4ff] transition hover:bg-[rgba(160,196,255,.16)] disabled:cursor-not-allowed disabled:opacity-60'
                disabled={!authUser || saveBusy}
                onClick={saveHousingConfig}
                type='button'
              >
                {saveBusy ? "SAVING..." : authUser ? "SAVE HOUSING CONFIG" : "LOG IN TO SAVE"}
              </button>

              {authMessage ? (
                <p className='text-[12px] tracking-[0.08em] text-[#8fb0d9]'>{authMessage}</p>
              ) : null}
              {saveMessage ? (
                <p className='text-[12px] tracking-[0.08em] text-[#8fb0d9]'>{saveMessage}</p>
              ) : null}
            </div>

            <div className='space-y-2 rounded-lg border border-[#3a3a5c] bg-white/5 p-3'>
              <div className='flex items-center justify-between gap-2'>
                <h3 className='text-[12px] uppercase tracking-[0.14em] text-[#7f8bb0]'>
                  My Saved Housing
                </h3>
                <button
                  className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[11px] tracking-[0.1em] text-[#9fb0d6] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'
                  disabled={!authUser || savedConfigsBusy || Boolean(savedConfigLoadId) || Boolean(savedConfigDeleteId)}
                  onClick={() => fetchSavedConfigs()}
                  type='button'
                >
                  {savedConfigsBusy ? "LOADING..." : "REFRESH"}
                </button>
              </div>

              {!authUser ? (
                <p className='text-[12px] tracking-[0.08em] text-[#6f7ca0]'>
                  Log in to view saved housing configurations.
                </p>
              ) : savedConfigs.length === 0 ? (
                <p className='text-[12px] tracking-[0.08em] text-[#6f7ca0]'>
                  No saved housing configurations yet.
                </p>
              ) : (
                <div className='max-h-[24dvh] space-y-2 overflow-y-auto pr-1'>
                  {savedConfigs.map((config) => (
                    <div className='rounded border border-[#2f3555] bg-white/5 p-2' key={config.id}>
                      <p className='truncate text-[13px] font-semibold tracking-[0.06em] text-[#d9e4ff]'>
                        {config.name}
                      </p>
                      <p className='mt-1 text-[11px] tracking-[0.08em] text-[#7f8bb0]'>
                        Comfort {config.happinessScore.toFixed(1)}% • {formatSavedDate(config.updatedAt)}
                      </p>
                      <div className='mt-2 grid grid-cols-2 gap-1'>
                        <button
                          className='rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] px-2 py-1 text-[11px] tracking-[0.1em] text-[#a0c4ff] transition hover:bg-[rgba(160,196,255,.16)] disabled:cursor-not-allowed disabled:opacity-60'
                          disabled={saveBusy || Boolean(savedConfigDeleteId) || Boolean(savedConfigLoadId)}
                          onClick={() => loadSavedConfig(config.id)}
                          type='button'
                        >
                          {savedConfigLoadId === config.id ? "LOADING..." : "LOAD"}
                        </button>
                        <button
                          className='rounded border border-[#5a2a2a] bg-[rgba(255,80,80,.08)] px-2 py-1 text-[11px] tracking-[0.1em] text-[#ff9090] transition hover:border-[#ff5050] hover:bg-[rgba(255,80,80,.2)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60'
                          disabled={saveBusy || Boolean(savedConfigLoadId) || Boolean(savedConfigDeleteId)}
                          onClick={() => deleteSavedConfig(config)}
                          type='button'
                        >
                          {savedConfigDeleteId === config.id ? "DELETING..." : "DELETE"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {savedConfigsMessage ? (
                <p className='text-[12px] tracking-[0.08em] text-[#8fb0d9]'>
                  {savedConfigsMessage}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className='flex flex-wrap gap-2'>
        <button
          className={`rounded-full border px-3 py-1 text-[13px] font-semibold tracking-[0.1em] transition ${
            activeSubsection === "ideal"
              ? "border-[#a0c4ff] bg-[rgba(160,196,255,.22)] text-[#d7e7ff]"
              : "border-[#49a281] bg-[rgba(73,162,129,.14)] text-[#f2a067] hover:border-[#8ad7b9] hover:bg-[rgba(73,162,129,.26)] hover:text-[#a0c4ff]"
          }`}
          onClick={() => setActiveSubsection("ideal")}
          type='button'
        >
          1. IDEAL HOUSING
        </button>
        <button
          className={`rounded-full border px-3 py-1 text-[13px] font-semibold tracking-[0.1em] transition ${
            activeSubsection === "custom"
              ? "border-[#a0c4ff] bg-[rgba(160,196,255,.22)] text-[#d7e7ff]"
              : "border-[#49a281] bg-[rgba(73,162,129,.14)] text-[#f2a067] hover:border-[#8ad7b9] hover:bg-[rgba(73,162,129,.26)] hover:text-[#a0c4ff]"
          }`}
          onClick={() => setActiveSubsection("custom")}
          type='button'
        >
          2. CUSTOM HOUSING
        </button>
      </div>

      {activeSubsection === "ideal" ? (
        <div className={PANEL_CLASS}>
          <button
            className='flex w-full items-center justify-between gap-3 rounded-lg border border-[#3a3a5c] bg-white/5 px-3 py-2 text-left transition hover:bg-white/10'
            onClick={() => setIsPresetExamplesOpen((previous) => !previous)}
            type='button'
          >
            <div>
              <h2 className='text-[16px] font-semibold uppercase tracking-[0.14em] text-[#a0c4ff]'>
                Ideal Housing Preset Examples
              </h2>
              <p className='text-[13px] tracking-[0.08em] text-[#8197c2]'>
                Built from Pokemon ideal habitat preferences.
              </p>
            </div>
            <span className='rounded border border-[#3a3a5c] px-2 py-1 text-[11px] tracking-[0.1em] text-[#9fb0d6]'>
              {isPresetExamplesOpen ? "HIDE" : "OPEN"}
            </span>
          </button>

          {isPresetExamplesOpen ? (
            <div className='mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
              {preconfiguredPlans.slice(0, 18).map((plan) => (
                <article
                  className='rounded-lg border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] p-3'
                  key={plan.id}
                >
                  <h3 className='text-[17px] font-bold text-[#e8efff]'>{plan.title}</h3>
                  <p className='mt-1 text-[13px] text-[#8fa3cc]'>{plan.description}</p>

                  <p className='mt-2 text-[12px] uppercase tracking-[0.12em] text-[#7fa4e4]'>
                    Suggested Residents
                  </p>
                  <div className='mt-1 grid gap-1'>
                    {(plan.sampleResidentProfiles || []).map((resident) => (
                      <div
                        className='flex items-center gap-2 rounded border border-[#3a3a5c] bg-[rgba(255,255,255,.06)] px-2 py-1'
                        key={`${plan.id}-${resident.name}`}
                      >
                        {resident.spriteUrl ? (
                          <Image
                            alt=''
                            aria-hidden='true'
                            className='h-7 w-7 object-contain'
                            height={28}
                            src={toPublicImageSrc(resident.spriteUrl)}
                            unoptimized
                            width={28}
                          />
                        ) : null}
                        <span className='truncate text-[12px] text-[#cbd7f3]'>
                          {resident.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className='mt-2 text-[12px] uppercase tracking-[0.12em] text-[#7fa4e4]'>
                    Recommended Favorites
                  </p>
                  <div className='mt-1 flex flex-wrap gap-1'>
                    {plan.recommendedFavorites.slice(0, 5).map((favorite) => (
                      <span
                        className='rounded-full border border-[#4f628d] bg-[rgba(79,98,141,.25)] px-2 py-0.5 text-[11px] text-[#d7e7ff]'
                        key={`${plan.id}-${favorite}`}
                      >
                        {favorite}
                      </span>
                    ))}
                  </div>

                  <button
                    className='mt-3 w-full rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] px-2 py-1 text-[12px] tracking-[0.1em] text-[#a0c4ff] transition hover:bg-[rgba(160,196,255,.16)]'
                    onClick={() => applyPreconfiguredPlan(plan)}
                    type='button'
                  >
                    USE PRESET
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={PANEL_CLASS}>
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]'>
          <div className='space-y-4'>
            <div className='rounded-lg border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] p-3'>
              <h2 className='text-[15px] font-semibold uppercase tracking-[0.14em] text-[#a0c4ff]'>
                House Setup
              </h2>

              <div className='mt-2 grid gap-3 lg:grid-cols-2'>
                <label className='space-y-1'>
                  <span className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                    Housing Type
                  </span>
                  <select
                    className={INPUT_CLASS}
                    onChange={(event) => setHouseMode(event.target.value === "custom" ? "custom" : "prefab")}
                    value={houseMode}
                  >
                    <option value='prefab'>Prefab Housing</option>
                    <option value='custom'>Custom Housing</option>
                  </select>
                </label>

                <label className='space-y-1'>
                  <span className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                    Prefab Model
                  </span>
                  <select
                    className={INPUT_CLASS}
                    disabled={houseMode !== "prefab"}
                    onChange={(event) => setPrefabType(event.target.value)}
                    value={prefabType}
                  >
                    {PREFAB_HOUSE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label} ({option.capacity})
                      </option>
                    ))}
                  </select>
                </label>

                <label className='space-y-1'>
                  <span className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                    Preferred Habitat Style
                  </span>
                  <select
                    className={INPUT_CLASS}
                    onChange={(event) => setPreferredHabitat(event.target.value)}
                    value={preferredHabitat}
                  >
                    {(pokemonDataset?.facets?.idealHabitats || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className='space-y-1'>
                  <span className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                    Habitat Dex Style
                  </span>
                  <select
                    className={INPUT_CLASS}
                    onChange={(event) => setSelectedHabitatId(event.target.value)}
                    value={selectedHabitatId}
                  >
                    {habitatOptions.map((habitat) => (
                      <option key={habitat.id} value={habitat.id}>
                        {habitat.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className='mt-3 rounded-md border border-[#3a3a5c] bg-[rgba(10,20,42,.45)] p-2'>
                <p className='text-[12px] tracking-[0.08em] text-[#9fb0d6]'>
                  Capacity: <span className='font-semibold text-[#d8e4ff]'>{houseCapacity}</span>{" "}
                  resident{houseCapacity === 1 ? "" : "s"} ({houseMode === "custom" ? "Custom house is fixed at 4" : "Prefab capacity rule"})
                </p>
              </div>

              <div className='mt-3 space-y-2'>
                <div className='flex items-center justify-between gap-2'>
                  <h3 className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                    Link Saved Builder House (Optional)
                  </h3>
                  <button
                    className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[10px] tracking-[0.1em] text-[#9fb0d6] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'
                    disabled={!authUser || savedBuilderProjectsBusy}
                    onClick={() => fetchSavedBuilderProjects()}
                    type='button'
                  >
                    {savedBuilderProjectsBusy ? "LOADING..." : "REFRESH"}
                  </button>
                </div>

                {!authUser ? (
                  <p className='text-[12px] tracking-[0.08em] text-[#6f7ca0]'>
                    Log in to pick from your saved Block Builder houses.
                  </p>
                ) : savedBuilderProjects.length === 0 ? (
                  <p className='text-[12px] tracking-[0.08em] text-[#6f7ca0]'>
                    No saved Block Builder houses found.
                  </p>
                ) : (
                  <select
                    className={INPUT_CLASS}
                    onChange={(event) => setLinkedBuilderProjectId(event.target.value)}
                    value={linkedBuilderProjectId}
                  >
                    <option value=''>None</option>
                    {savedBuilderProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.totalBlocks} blocks)
                      </option>
                    ))}
                  </select>
                )}

                {savedBuilderProjectsMessage ? (
                  <p className='text-[12px] tracking-[0.08em] text-[#8fb0d9]'>
                    {savedBuilderProjectsMessage}
                  </p>
                ) : null}
              </div>
            </div>

            <div className='rounded-lg border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] p-3'>
              <h2 className='text-[15px] font-semibold uppercase tracking-[0.14em] text-[#a0c4ff]'>
                Residents ({selectedResidents.length}/{houseCapacity})
              </h2>

              <label className='mt-2 block space-y-1'>
                <span className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                  Search Pokemon
                </span>
                <input
                  className={INPUT_CLASS}
                  onChange={(event) => setPokemonSearch(event.target.value)}
                  placeholder='Name, number, habitat, likes, specialty, location'
                  value={pokemonSearch}
                />
              </label>

              <div className='mt-2 grid gap-2 lg:grid-cols-3'>
                <label className='space-y-1'>
                  <span className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                    Favorite Filter
                  </span>
                  <select
                    className={INPUT_CLASS}
                    onChange={(event) => setPokemonFavoriteFilter(event.target.value)}
                    value={pokemonFavoriteFilter}
                  >
                    <option value='all'>All favorites</option>
                    {pokemonFavoriteFilterOptions.map((favoriteName) => (
                      <option key={`resident-favorite-${favoriteName}`} value={favoriteName}>
                        {favoriteName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className='space-y-1'>
                  <span className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                    Likes Filter
                  </span>
                  <select
                    className={INPUT_CLASS}
                    onChange={(event) => setPokemonLikeFilter(event.target.value)}
                    value={pokemonLikeFilter}
                  >
                    <option value='all'>All likes</option>
                    {pokemonLikeFilterOptions.map((likeName) => (
                      <option key={`resident-like-${likeName}`} value={likeName}>
                        {likeName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                className={`mt-2 w-full rounded border px-2 py-1 text-[11px] tracking-[0.1em] transition ${
                  similarToFirstResidentOnly
                    ? "border-[#a0c4ff] bg-[rgba(160,196,255,.18)] text-[#d7e7ff]"
                    : "border-[#3a3a5c] bg-white/5 text-[#9fb0d6] hover:bg-white/10"
                }`}
                onClick={() =>
                  setSimilarToFirstResidentOnly((previous) => !previous)
                }
                type='button'
              >
                {similarToFirstResidentOnly
                  ? `SIMILAR TO FIRST RESIDENT: ${selectedResidentNames[0] || "ON"}`
                  : "SIMILAR TO FIRST RESIDENT: OFF"}
              </button>

              <div className='mt-2 max-h-[220px] space-y-2 overflow-y-auto pr-1'>
                {availablePokemonOptions.map((pokemon) => (
                  <div
                    className='flex items-center justify-between gap-2 rounded border border-[#3a3a5c] bg-white/5 p-2'
                    key={`${pokemon.number}-${pokemon.name}`}
                  >
                    <div className='flex min-w-0 items-center gap-2'>
                      {pokemon.meta?.spriteUrl ? (
                        <Image
                          alt=''
                          aria-hidden='true'
                          className='h-9 w-9 object-contain'
                          height={36}
                          src={toPublicImageSrc(pokemon.meta.spriteUrl)}
                          unoptimized
                          width={36}
                        />
                      ) : null}
                      <div className='min-w-0'>
                        <p className='truncate text-[13px] font-semibold text-[#d8e4ff]'>
                          {pokemon.name}
                        </p>
                        <p className='truncate text-[11px] text-[#8fa3cc]'>
                          #{pokemon.number} • {pokemon.idealHabitat}
                        </p>
                        {(pokemon.habitatAttractions || []).length > 0 ? (
                          <p className='truncate text-[11px] text-[#7fb0cc]'>
                            Likes: {pokemon.habitatAttractions.slice(0, 2).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <button
                      className='rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] px-2 py-1 text-[11px] tracking-[0.1em] text-[#a0c4ff] transition hover:bg-[rgba(160,196,255,.16)]'
                      onClick={() => addResident(pokemon.name)}
                      type='button'
                    >
                      ADD
                    </button>
                  </div>
                ))}
              </div>

              <div className='mt-3 space-y-2'>
                {selectedResidents.length === 0 ? (
                  <p className='text-[12px] tracking-[0.08em] text-[#6f7ca0]'>
                    No residents selected yet.
                  </p>
                ) : (
                  selectedResidents.map((pokemon) => (
                    <div
                      className='rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] p-2'
                      key={`${pokemon.number}-${pokemon.name}`}
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='flex min-w-0 items-center gap-2'>
                          {pokemon.meta?.spriteUrl ? (
                            <Image
                              alt=''
                              aria-hidden='true'
                              className='h-9 w-9 object-contain'
                              height={36}
                              src={toPublicImageSrc(pokemon.meta.spriteUrl)}
                              unoptimized
                              width={36}
                            />
                          ) : null}
                          <div className='min-w-0'>
                            <p className='truncate text-[13px] font-semibold text-[#d8e4ff]'>
                              {pokemon.name}
                            </p>
                            <p className='truncate text-[11px] text-[#8fa3cc]'>
                              {pokemon.primaryLocation}
                            </p>
                          </div>
                        </div>
                        <button
                          className='rounded border border-[#5a2a2a] bg-[rgba(255,80,80,.08)] px-2 py-1 text-[11px] tracking-[0.1em] text-[#ff9090] transition hover:border-[#ff5050] hover:bg-[rgba(255,80,80,.2)] hover:text-white'
                          onClick={() => removeResident(pokemon.name)}
                          type='button'
                        >
                          REMOVE
                        </button>
                      </div>

                      <div className='mt-2 flex flex-wrap gap-1'>
                        {(pokemon.favorites || []).map((favoriteName) => (
                          <button
                            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                              selectedResidentFavoriteTag === favoriteName
                                ? "border-[#a0c4ff] bg-[rgba(160,196,255,.2)] text-[#d7e7ff]"
                                : "border-[#4f628d] bg-[rgba(79,98,141,.22)] text-[#d7e7ff] hover:bg-[rgba(160,196,255,.18)]"
                            }`}
                            key={`${pokemon.number}-${pokemon.name}-favorite-chip-${favoriteName}`}
                            onClick={() =>
                              setSelectedResidentFavoriteTag((previous) =>
                                previous === favoriteName ? "" : favoriteName,
                              )
                            }
                            type='button'
                          >
                            {favoriteName}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className='rounded-lg border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] p-3'>
              <h2 className='text-[15px] font-semibold uppercase tracking-[0.14em] text-[#a0c4ff]'>
                Items + Decorations
              </h2>

              <label className='mt-2 block space-y-1'>
                <span className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                  Search Items
                </span>
                <input
                  className={INPUT_CLASS}
                  onChange={(event) => setItemSearch(event.target.value)}
                  placeholder='Name, section, favorite, source section, description'
                  value={itemSearch}
                />
              </label>

              <div className='mt-2 grid gap-2 sm:grid-cols-2'>
                <label className='space-y-1'>
                  <span className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                    Favorite Filter
                  </span>
                  <select
                    className={INPUT_CLASS}
                    onChange={(event) => setItemFavoriteFilter(event.target.value)}
                    value={itemFavoriteFilter}
                  >
                    <option value='all'>All favorites</option>
                    {itemFavoriteFilterOptions.map((favoriteName) => (
                      <option key={`item-favorite-${favoriteName}`} value={favoriteName}>
                        {favoriteName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className='space-y-1'>
                  <span className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                    Likes Filter
                  </span>
                  <select
                    className={INPUT_CLASS}
                    onChange={(event) => setItemLikeFilter(event.target.value)}
                    value={itemLikeFilter}
                  >
                    <option value='all'>All likes</option>
                    {pokemonLikeFilterOptions.map((likeName) => (
                      <option key={`item-like-${likeName}`} value={likeName}>
                        {likeName}
                      </option>
                    ))}
                  </select>
                </label>
                <div className='space-y-1'>
                  <span className='text-[12px] uppercase tracking-[0.1em] text-[#8ea4cf]'>
                    Resident Favorite Focus
                  </span>
                  <div className='flex min-h-[44px] items-center rounded-md border border-[#3a3a5c] bg-[rgba(12,12,24,.95)] px-3 text-[13px] text-[#d7e7ff]'>
                    {selectedResidentFavoriteTag || "None selected"}
                  </div>
                </div>
              </div>

              {selectedResidentFavoriteTag ? (
                <button
                  className='mt-2 rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[11px] tracking-[0.1em] text-[#9fb0d6] transition hover:bg-white/10'
                  onClick={() => setSelectedResidentFavoriteTag("")}
                  type='button'
                >
                  CLEAR RESIDENT FAVORITE FOCUS
                </button>
              ) : null}

              <div className='mt-2 max-h-[220px] space-y-2 overflow-y-auto pr-1'>
                {availableItemOptions.map((item) => (
                  <div
                    className='flex items-center justify-between gap-2 rounded border border-[#3a3a5c] bg-white/5 p-2'
                    key={item.id}
                  >
                    <div className='flex min-w-0 items-center gap-2'>
                      {item.imageSrc ? (
                        <Image
                          alt=''
                          aria-hidden='true'
                          className='h-9 w-9 object-contain'
                          height={36}
                          src={item.imageSrc}
                          unoptimized
                          width={36}
                        />
                      ) : null}
                      <div className='min-w-0'>
                        <p className='truncate text-[13px] font-semibold text-[#d8e4ff]'>
                          {item.name}
                        </p>
                        <p className='truncate text-[11px] text-[#8fa3cc]'>
                          {item.sectionTitle}
                        </p>
                        {(item.favorites || []).length > 0 ? (
                          <p className='truncate text-[11px] text-[#7fb0cc]'>
                            Fav: {item.favorites.slice(0, 3).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <button
                      className='rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] px-2 py-1 text-[11px] tracking-[0.1em] text-[#a0c4ff] transition hover:bg-[rgba(160,196,255,.16)]'
                      onClick={() => addItem(item.id)}
                      type='button'
                    >
                      ADD
                    </button>
                  </div>
                ))}
              </div>

              <div className='mt-3 space-y-2'>
                {selectedItems.length === 0 ? (
                  <p className='text-[12px] tracking-[0.08em] text-[#6f7ca0]'>
                    No items selected yet.
                  </p>
                ) : (
                  selectedItems.map(({ item, quantity }) => (
                    <div
                      className='rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] p-2'
                      key={item.id}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div className='min-w-0'>
                          <p className='truncate text-[13px] font-semibold text-[#d8e4ff]'>
                            {item.name}
                          </p>
                          <p className='truncate text-[11px] text-[#8fa3cc]'>
                            {(item.sectionLabels || [item.sectionTitle]).join(" · ")}
                          </p>
                        </div>
                        <button
                          className='rounded border border-[#5a2a2a] bg-[rgba(255,80,80,.08)] px-2 py-1 text-[11px] tracking-[0.1em] text-[#ff9090] transition hover:border-[#ff5050] hover:bg-[rgba(255,80,80,.2)] hover:text-white'
                          onClick={() => removeItem(item.id)}
                          type='button'
                        >
                          REMOVE
                        </button>
                      </div>
                      <div className='mt-2 flex items-center gap-2'>
                        <span className='text-[12px] tracking-[0.1em] text-[#9fb0d6]'>Qty</span>
                        <input
                          className='w-24 rounded border border-[#3a3a5c] bg-[rgba(12,12,24,.95)] px-2 py-1 text-[13px] text-[#e0e0e0] outline-none transition focus:border-[#a0c4ff] focus:ring-1 focus:ring-[#a0c4ff]/40'
                          inputMode='numeric'
                          min={0}
                          onChange={(event) => setItemQuantity(item.id, event.target.value)}
                          type='number'
                          value={quantity}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className='space-y-4'>
            <div className='rounded-lg border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] p-3'>
              <h2 className='text-[15px] font-semibold uppercase tracking-[0.14em] text-[#a0c4ff]'>
                Comfort Level
              </h2>

              <div className='mt-3 rounded-lg border border-[#3a3a5c] bg-[rgba(160,196,255,.1)] p-4 text-center'>
                <p className='text-[12px] uppercase tracking-[0.12em] text-[#8ea4cf]'>Total Comfort</p>
                <p className='text-5xl font-extrabold text-[#e8efff]'>{comfort.score.toFixed(1)}%</p>
                <p className='mt-1 text-[12px] tracking-[0.08em] text-[#9fb0d6]'>
                  Avg residents {comfort.residentAverage.toFixed(1)} • Occupancy {comfort.occupancyScore.toFixed(1)}
                </p>
              </div>

              <div className='mt-3 grid gap-2 text-[12px] text-[#a9b8dc] sm:grid-cols-2'>
                <div className='rounded border border-[#3a3a5c] bg-white/5 p-2'>
                  Favorite coverage: {comfort.favoriteCoverageScore.toFixed(1)}
                </div>
                <div className='rounded border border-[#3a3a5c] bg-white/5 p-2'>
                  Style variety: {comfort.varietyScore.toFixed(1)}
                </div>
                <div className='rounded border border-[#3a3a5c] bg-white/5 p-2'>
                  Placed items: {comfort.totalPlacedItems}
                </div>
                <div className='rounded border border-[#3a3a5c] bg-white/5 p-2'>
                  Builder bonus: {comfort.builderBonus.toFixed(1)}
                </div>
                <div className='rounded border border-[#3a3a5c] bg-white/5 p-2'>
                  Item density: {comfort.itemDensityScore.toFixed(1)}
                </div>
              </div>

              <p className='mt-3 text-[12px] leading-relaxed tracking-[0.04em] text-[#8ea4cf]'>
                Formula: resident favorite matches, ideal habitat alignment, Habitat Dex spawn compatibility,
                attraction matching, occupancy, item favorite coverage, style variety, and item density.
              </p>
            </div>

            <div className='rounded-lg border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] p-3'>
              <h2 className='text-[15px] font-semibold uppercase tracking-[0.14em] text-[#a0c4ff]'>
                Resident Breakdown
              </h2>

              {comfort.residentBreakdown.length === 0 ? (
                <p className='mt-2 text-[12px] tracking-[0.08em] text-[#6f7ca0]'>
                  Add residents to see per-pokemon comfort details.
                </p>
              ) : (
                <div className='mt-2 space-y-2'>
                  {comfort.residentBreakdown.map((row) => (
                    <div
                      className='rounded border border-[#3a3a5c] bg-white/5 p-2'
                      key={row.resident}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <p className='text-[13px] font-semibold text-[#d8e4ff]'>{row.resident}</p>
                        <p className='text-[13px] font-bold text-[#a0c4ff]'>{row.score.toFixed(1)}%</p>
                      </div>
                      <p className='mt-1 text-[11px] tracking-[0.06em] text-[#8fa3cc]'>
                        Favorites {row.metrics.favoritesMatched}/{row.metrics.favoritesTotal} • Attractions {row.metrics.attractionMatched}/{row.metrics.attractionTotal}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {plannerMessage ? (
              <div className='rounded border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] p-2 text-[12px] tracking-[0.08em] text-[#9fb0d6]'>
                {plannerMessage}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
