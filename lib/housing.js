const KEY_NORMALIZE_REGEX = /[^a-z0-9]+/g;

export const PREFAB_HOUSE_OPTIONS = [
  {
    id: "prefab-single",
    label: "Single Pod",
    description: "Prefab shell that supports 1 resident.",
    capacity: 1,
  },
  {
    id: "prefab-duo",
    label: "Duo Cottage",
    description: "Prefab shell that supports 2 residents.",
    capacity: 2,
  },
  {
    id: "prefab-quad",
    label: "Community Villa",
    description: "Prefab shell that supports 4 residents.",
    capacity: 4,
  },
];

const DEFAULT_CUSTOM_CAPACITY = 4;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(KEY_NORMALIZE_REGEX, "");
}

function normalizePathKey(detailPath) {
  return normalizeKey(
    String(detailPath || "")
      .split("/")
      .pop()
      ?.replace(/\.shtml$/i, "") || "",
  );
}

export function getHouseCapacity(houseMode, prefabType) {
  if (houseMode === "custom") return DEFAULT_CUSTOM_CAPACITY;
  const option = PREFAB_HOUSE_OPTIONS.find((entry) => entry.id === prefabType);
  return option?.capacity ?? PREFAB_HOUSE_OPTIONS[1].capacity;
}

export function createHousingLookups({ pokemonDataset, habitatDataset, itemsDataset }) {
  const pokemonByName = new Map();
  for (const pokemon of pokemonDataset?.pokemon || []) {
    pokemonByName.set(pokemon.name, pokemon);
  }

  const habitatsById = new Map();
  const habitatsByPathKey = new Map();
  for (const habitat of habitatDataset?.habitats || []) {
    habitatsById.set(habitat.id, habitat);
    const pathKey = normalizePathKey(habitat.detailPath);
    if (pathKey) habitatsByPathKey.set(pathKey, habitat);
  }

  const itemsById = new Map();
  for (const section of itemsDataset?.sections || []) {
    for (const item of section.items || []) {
      itemsById.set(item.id, item);
    }
  }

  return {
    pokemonByName,
    habitatsById,
    habitatsByPathKey,
    itemsById,
  };
}

function computeTopFavorites(pokemonList, limit = 6) {
  const counts = new Map();
  for (const pokemon of pokemonList) {
    for (const favorite of pokemon.favorites || []) {
      counts.set(favorite, (counts.get(favorite) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] === a[1]) return a[0].localeCompare(b[0]);
      return b[1] - a[1];
    })
    .slice(0, limit)
    .map(([favorite]) => favorite);
}

function getSuggestedPrefabType(count) {
  if (count <= 1) return "prefab-single";
  if (count <= 2) return "prefab-duo";
  return "prefab-quad";
}

export function buildPreconfiguredHousingPlans(pokemonDataset) {
  const grouped = new Map();

  for (const pokemon of pokemonDataset?.pokemon || []) {
    const habitat = String(pokemon.idealHabitat || "").trim();
    if (!habitat) continue;
    if (!grouped.has(habitat)) grouped.set(habitat, []);
    grouped.get(habitat).push(pokemon);
  }

  return Array.from(grouped.entries())
    .map(([idealHabitat, residents]) => {
      const sortedResidents = [...residents].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const sampleResidents = sortedResidents.slice(0, 4).map((resident) => resident.name);
      const topFavorites = computeTopFavorites(sortedResidents);

      return {
        id: `ideal-${normalizeKey(idealHabitat)}`,
        title: `${idealHabitat} Habitat Home`,
        description: `${sortedResidents.length} pokemon in the directory prefer ${idealHabitat} spaces.`,
        preferredHabitat: idealHabitat,
        suggestedPrefabType: getSuggestedPrefabType(sampleResidents.length),
        sampleResidents,
        recommendedFavorites: topFavorites,
        pokemonCount: sortedResidents.length,
      };
    })
    .sort((a, b) => {
      if (b.pokemonCount === a.pokemonCount) {
        return a.title.localeCompare(b.title);
      }
      return b.pokemonCount - a.pokemonCount;
    });
}

function calculateResidentScore({
  resident,
  preferredHabitat,
  selectedHabitat,
  selectedFavoriteSet,
  selectedItemNameSet,
}) {
  const favorites = Array.isArray(resident.favorites) ? resident.favorites : [];
  const attractions = Array.isArray(resident.habitatAttractions)
    ? resident.habitatAttractions
    : [];

  const favoriteHits = favorites.filter((favorite) =>
    selectedFavoriteSet.has(normalizeKey(favorite)),
  ).length;

  const attractionHits = attractions.filter((attraction) =>
    selectedItemNameSet.has(normalizeKey(attraction)),
  ).length;

  const favoriteScore =
    favorites.length > 0 ? (favoriteHits / favorites.length) * 100 : 60;

  const attractionScore =
    attractions.length > 0 ? (attractionHits / attractions.length) * 100 : 60;

  const preferredHabitatScore = preferredHabitat
    ? normalizeKey(resident.idealHabitat) === normalizeKey(preferredHabitat)
      ? 100
      : 30
    : 60;

  const residentHabitatKeySet = new Set(
    (resident.meta?.habitatIds || []).map((entry) => normalizeKey(entry)),
  );

  const selectedHabitatPathKey = normalizePathKey(selectedHabitat?.detailPath);
  const habitatSpawnScore = selectedHabitatPathKey
    ? residentHabitatKeySet.has(selectedHabitatPathKey)
      ? 100
      : 20
    : 60;

  const locationName = selectedHabitat?.primaryLocation || "";
  const locationScore = locationName
    ? (resident.availableAreas || []).includes(locationName)
      ? 100
      : 35
    : 60;

  const score =
    favoriteScore * 0.45 +
    preferredHabitatScore * 0.2 +
    habitatSpawnScore * 0.18 +
    attractionScore * 0.1 +
    locationScore * 0.07;

  return {
    resident: resident.name,
    score: Number(score.toFixed(1)),
    metrics: {
      favoritesMatched: favoriteHits,
      favoritesTotal: favorites.length,
      attractionMatched: attractionHits,
      attractionTotal: attractions.length,
      preferredHabitatScore: Number(preferredHabitatScore.toFixed(1)),
      habitatSpawnScore: Number(habitatSpawnScore.toFixed(1)),
      locationScore: Number(locationScore.toFixed(1)),
    },
  };
}

export function calculateHousingHappiness({
  selectedResidents,
  selectedItems,
  preferredHabitat,
  selectedHabitat,
  houseCapacity,
  linkedBuilderProject,
}) {
  const safeResidents = Array.isArray(selectedResidents) ? selectedResidents : [];
  const safeItems = Array.isArray(selectedItems) ? selectedItems : [];

  const selectedFavoriteSet = new Set();
  const selectedItemNameSet = new Set();
  const selectedItemSectionSet = new Set();

  let totalPlacedItems = 0;
  safeItems.forEach((entry) => {
    const quantity = clamp(Number(entry.quantity) || 0, 0, 999);
    if (quantity <= 0 || !entry.item) return;

    totalPlacedItems += quantity;
    selectedItemNameSet.add(normalizeKey(entry.item.name));
    selectedItemSectionSet.add(normalizeKey(entry.item.sectionTitle));

    for (const favorite of entry.item.favorites || []) {
      selectedFavoriteSet.add(normalizeKey(favorite));
    }
  });

  const residentBreakdown = safeResidents.map((resident) =>
    calculateResidentScore({
      resident,
      preferredHabitat,
      selectedHabitat,
      selectedFavoriteSet,
      selectedItemNameSet,
    }),
  );

  const residentAverage =
    residentBreakdown.length > 0
      ? residentBreakdown.reduce((sum, row) => sum + row.score, 0) /
        residentBreakdown.length
      : 0;

  const occupancyRatio = houseCapacity > 0 ? safeResidents.length / houseCapacity : 0;
  const occupancyScore = clamp(occupancyRatio * 100, 0, 100);
  const favoriteCoverageScore = clamp((selectedFavoriteSet.size / 10) * 100, 0, 100);
  const varietyScore = clamp((selectedItemSectionSet.size / 6) * 100, 0, 100);

  const totalBlocks = Number(linkedBuilderProject?.totalBlocks || 0);
  const builderBonus = totalBlocks > 0 ? Math.min(4, Math.log10(totalBlocks + 1) * 1.8) : 0;

  const happiness =
    residentAverage * 0.78 +
    occupancyScore * 0.12 +
    favoriteCoverageScore * 0.06 +
    varietyScore * 0.04 +
    builderBonus;

  return {
    score: Number(clamp(happiness, 0, 100).toFixed(1)),
    residentAverage: Number(residentAverage.toFixed(1)),
    occupancyScore: Number(occupancyScore.toFixed(1)),
    favoriteCoverageScore: Number(favoriteCoverageScore.toFixed(1)),
    varietyScore: Number(varietyScore.toFixed(1)),
    builderBonus: Number(builderBonus.toFixed(1)),
    totalPlacedItems,
    residentBreakdown,
  };
}

export function normalizeSavedHousingConfig({
  config,
  pokemonByName,
  itemsById,
  habitatsById,
}) {
  if (!config || typeof config !== "object") return null;

  const houseMode = config.houseMode === "custom" ? "custom" : "prefab";
  const prefabType = PREFAB_HOUSE_OPTIONS.some((entry) => entry.id === config.prefabType)
    ? config.prefabType
    : PREFAB_HOUSE_OPTIONS[1].id;

  const capacity = getHouseCapacity(houseMode, prefabType);

  const residentNames = Array.isArray(config.selectedResidentNames)
    ? config.selectedResidentNames.filter((name) => pokemonByName.has(name)).slice(0, capacity)
    : [];

  const itemSelectionsRaw = Array.isArray(config.itemSelections)
    ? config.itemSelections
    : [];
  const itemSelections = itemSelectionsRaw
    .map((entry) => {
      const item = itemsById.get(entry?.itemId);
      if (!item) return null;
      const quantity = clamp(Number(entry?.quantity) || 0, 0, 999);
      if (quantity <= 0) return null;
      return {
        itemId: item.id,
        quantity,
      };
    })
    .filter(Boolean);

  const preferredHabitat = String(config.preferredHabitat || "").trim();
  const selectedHabitatId = habitatsById.has(config.selectedHabitatId)
    ? config.selectedHabitatId
    : "";

  const linkedBuilderProjectId = String(config.linkedBuilderProjectId || "").trim();

  return {
    houseMode,
    prefabType,
    preferredHabitat,
    selectedHabitatId,
    linkedBuilderProjectId,
    selectedResidentNames: residentNames,
    itemSelections,
  };
}
