import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DATASET_PATH = path.join(ROOT, "data", "pokemon-data.json");
const REPORT_PATH = path.join(ROOT, "data", "serebii-pokemon-sync-report.json");
const HABITAT_DATA_PATH = path.join(ROOT, "data", "habitats-data.json");
const AVAILABLE_SOURCE_URL = "https://serebii.net/pokemonpokopia/availablepokemon.shtml";
const EVENT_SOURCE_URL = "https://serebii.net/pokemonpokopia/eventpokedex.shtml";
const LITTER_SOURCE_URL = "https://serebii.net/pokemonpokopia/litter.shtml";
const SEREBII_BASE = "https://serebii.net";
const UNIQUE_FORM_NAMES = [
  "Professor Tangrowth",
  "Peakychu",
  "Mosslax",
  "Smearguru",
  "DJ Rotom",
];
const UNIQUE_BASE_FORM_NAMES = ["Tangrowth", "Pikachu", "Snorlax"];

const SPECIAL_NAME_RENAMES = new Map([
  ["Stereo Rotom", "DJ Rotom"],
  ["Smeargle", "Smearguru"],
  ["Shellos", "Shellos (West Sea)"],
  ["Gastrodon", "Gastrodon (West Sea)"],
]);

const LEGACY_NAME_ALIASES = new Map([
  ["DJ Rotom", ["DJ Rotom", "Stereo Rotom"]],
  ["Smearguru", ["Smearguru", "Smeargle"]],
  ["Shellos (West Sea)", ["Shellos (West Sea)", "Shellos"]],
  ["Gastrodon (West Sea)", ["Gastrodon (West Sea)", "Gastrodon"]],
]);

function decodeHtmlEntities(input = "") {
  return input
    .replace(/&#x([\da-f]+);/gi, (_, value) =>
      String.fromCodePoint(Number.parseInt(value, 16)),
    )
    .replace(/&#(\d+);/g, (_, value) =>
      String.fromCodePoint(Number.parseInt(value, 10)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(input = "") {
  return input.replace(/<[^>]+>/g, " ");
}

function cleanText(input = "") {
  return decodeHtmlEntities(stripTags(input))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(input = "") {
  return decodeHtmlEntities(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function toAbsoluteUrl(srcPath) {
  if (!srcPath) return "";
  if (/^https?:\/\//i.test(srcPath)) return srcPath;
  return `${SEREBII_BASE}${srcPath.startsWith("/") ? srcPath : `/${srcPath}`}`;
}

function toSpecialtyId(hrefSlug, name) {
  if (hrefSlug === "???") return "specialty_unknown";
  const normalized =
    /^[a-z0-9-?]+$/i.test(hrefSlug) && hrefSlug.length > 0
      ? hrefSlug
      : normalizeName(name) || "unknown";
  return `specialty_${normalized.replace(/[^a-z0-9_]+/gi, "_")}`;
}

function toHabitatPathKey(detailPath = "") {
  return String(detailPath || "")
    .split("/")
    .pop()
    ?.replace(/\.shtml$/i, "")
    .toLowerCase();
}

function parseSpecialties(rowHtml) {
  const specialties = [];
  const seen = new Set();

  const specialtyRegex =
    /<a\s+href=["'](\/pokemonpokopia\/pokedex\/specialty\/[^"']+\.shtml)["'][^>]*>(?:\s*<img\s+[^>]*src=["']([^"']+)["'][^>]*>)?[^<]*<\/a>\s*<\/td>\s*<td>\s*<a\s+href=["'][^"']+["'][^>]*><u>([^<]+)<\/u><\/a>/gi;

  for (const match of rowHtml.matchAll(specialtyRegex)) {
    const href = decodeHtmlEntities(match[1] || "");
    const iconSrc = decodeHtmlEntities(match[2] || "");
    const name = cleanText(match[3] || "");
    if (!name) continue;

    const normalized = normalizeName(name);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    const hrefSlug = href
      .replace(/^\/pokemonpokopia\/pokedex\/specialty\//i, "")
      .replace(/\.shtml$/i, "");

    specialties.push({
      name,
      id: toSpecialtyId(hrefSlug, name),
      iconUrl: toAbsoluteUrl(iconSrc),
    });
  }

  return specialties;
}

function parsePokemonRows(html, { isEventPokemon }) {
  const rows = [];
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;

  for (const rowMatch of html.matchAll(rowRegex)) {
    const rowHtml = rowMatch[1] || "";
    const numberMatch = rowHtml.match(/<td\s+class=["']cen["']>\s*#(\d+)\s*<\/td>/i);
    if (!numberMatch) continue;

    const spriteMatch = rowHtml.match(
      /<img\s+src=["'](\/pokemonpokopia\/pokemon\/small\/[^"']+)"[^>]*class=["']stdsprite["']/i,
    );
    const nameMatch = rowHtml.match(
      /<td\s+class=["']cen["']>\s*<a\s+href=(["'])(\/pokemonpokopia\/pokedex\/[^"<>]+\.shtml)\1[^>]*><u>([^<]+)<\/u><\/a>\s*<\/td>/i,
    );

    if (!spriteMatch || !nameMatch) continue;

    const number = numberMatch[1].padStart(3, "0");
    const sourceName = cleanText(nameMatch[3]);
    const canonicalName = SPECIAL_NAME_RENAMES.get(sourceName) ?? sourceName;
    const spriteUrl = toAbsoluteUrl(decodeHtmlEntities(spriteMatch[1]));
    const detailPath = decodeHtmlEntities(nameMatch[2]);
    const specialties = parseSpecialties(rowHtml);

    rows.push({
      number,
      sourceName,
      name: canonicalName,
      spriteUrl,
      detailPath,
      specialties,
      isEventPokemon,
      eventNumber: isEventPokemon ? `E-${number}` : null,
    });
  }

  return rows;
}

function buildDatasetLookup(dataset) {
  const map = new Map();
  for (const pokemon of dataset.pokemon) {
    map.set(normalizeName(pokemon.name), pokemon);
  }
  return map;
}

function getCandidateNameKeys(name) {
  const aliases = LEGACY_NAME_ALIASES.get(name) ?? [name];
  return aliases.map((value) => normalizeName(value)).filter(Boolean);
}

function mergeSpecialtyDetails(existingDetails, scrapedDetails) {
  const existingByName = new Map();

  if (Array.isArray(existingDetails)) {
    for (const detail of existingDetails) {
      if (!detail?.name) continue;
      existingByName.set(normalizeName(detail.name), detail);
    }
  }

  return scrapedDetails.map((scraped) => {
    const key = normalizeName(scraped.name);
    const existing = key ? existingByName.get(key) : undefined;

    return {
      ...(existing || {}),
      name: scraped.name,
      id: scraped.id,
      iconUrl: scraped.iconUrl,
    };
  });
}

function parseLitterRewardsMap(litterHtml) {
  const map = new Map();
  const entryRegex =
    /<td class="cen">#\d+<\/td>\s*<td class="cen"><a href="\/pokemonpokopia\/pokedex\/[^"]+"><img[\s\S]*?<\/td>\s*<td class="cen"><a href="\/pokemonpokopia\/pokedex\/[^"]+"><u>([^<]+)<\/u><\/a><\/td>[\s\S]*?<td class="cen">\s*<img src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>\s*<br \/>\s*([^<]+)\s*<\/td>/gi;

  for (const match of litterHtml.matchAll(entryRegex)) {
    const sourceName = cleanText(match[1] || "");
    const canonicalName = SPECIAL_NAME_RENAMES.get(sourceName) ?? sourceName;
    const key = normalizeName(canonicalName);
    if (!key) continue;

    const itemName = cleanText(match[4] || match[3] || "");
    if (!itemName) continue;

    let iconSrc = decodeHtmlEntities(match[2] || "");
    if (iconSrc && !/^https?:\/\//i.test(iconSrc)) {
      const normalizedPath = iconSrc.replace(/^\/+/, "");
      iconSrc = `${SEREBII_BASE}/pokemonpokopia/${normalizedPath}`;
    }

    map.set(key, {
      itemName,
      itemIconUrl: iconSrc,
    });
  }

  return map;
}

function buildHabitatIdsByPokemonKey(habitatDataset) {
  const map = new Map();

  for (const habitat of habitatDataset?.habitats || []) {
    const pathKey = toHabitatPathKey(habitat.detailPath);
    if (!pathKey) continue;

    for (const spawn of habitat.spawnPokemon || []) {
      const sourceName = cleanText(spawn?.name || "");
      if (!sourceName) continue;

      const canonicalName = SPECIAL_NAME_RENAMES.get(sourceName) ?? sourceName;
      const normalized = normalizeName(canonicalName);
      if (!normalized) continue;

      if (!map.has(normalized)) map.set(normalized, new Set());
      map.get(normalized).add(pathKey);
    }
  }

  return map;
}

function applyLitterRewardsToPokemon(pokemon, litterRewardsMap) {
  if (!pokemon?.meta) return;
  if (!Array.isArray(pokemon.meta.specialtyDetails)) return;

  const candidateKeys = getCandidateNameKeys(pokemon.name);
  let litterReward = null;
  for (const key of candidateKeys) {
    if (!litterRewardsMap.has(key)) continue;
    litterReward = litterRewardsMap.get(key);
    break;
  }
  if (!litterReward) return;

  pokemon.meta.specialtyDetails = pokemon.meta.specialtyDetails.map((detail) => {
    if (!detail || normalizeName(detail.name) !== "litter") return detail;
    return {
      ...detail,
      litterItemName: litterReward.itemName,
      litterItemIconUrl: litterReward.itemIconUrl,
    };
  });
}

function applyHabitatIdsToPokemon(pokemon, habitatIdsByPokemonKey) {
  const existingIds = Array.isArray(pokemon.meta?.habitatIds)
    ? pokemon.meta.habitatIds
    : [];
  const merged = new Set(existingIds.map((value) => String(value || "").trim()).filter(Boolean));

  const candidateKeys = getCandidateNameKeys(pokemon.name);
  for (const key of candidateKeys) {
    const ids = habitatIdsByPokemonKey.get(key);
    if (!ids) continue;
    for (const habitatId of ids) merged.add(habitatId);
  }

  pokemon.meta = {
    ...(pokemon.meta || {}),
    habitatIds: Array.from(merged).sort((a, b) => a.localeCompare(b)),
  };
}

function parseTypeNames(detailPageHtml) {
  const rowMatch = detailPageHtml.match(
    /<td class="foo">Type<\/td>[\s\S]*?<tr>\s*<td class="cen">([\s\S]*?)<\/td>/i,
  );
  const source = rowMatch ? rowMatch[1] : detailPageHtml;
  const names = [];
  const seen = new Set();

  for (const match of source.matchAll(/<img[^>]*\salt="([^"]+)"[^>]*>/gi)) {
    const name = cleanText(match[1] || "");
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }

  return names;
}

function parsePokemonDetailPage(detailPageHtml) {
  const statsSegmentMatch = detailPageHtml.match(
    /<h2>Stats<\/h2>[\s\S]*?(?=<h2>Habitats & Locations<\/h2>)/i,
  );
  const statsSegment =
    statsSegmentMatch?.[0] ||
    detailPageHtml.match(/<h2>Stats<\/h2>[\s\S]*?<\/table>/i)?.[0] ||
    "";

  const specialtyDetails = [];
  const specialtySeen = new Set();
  const specialtyRegex =
    /\/pokemonpokopia\/pokedex\/specialty\/([^"']+)\.shtml["'][^>]*><u>([^<]+)<\/u>/gi;

  for (const match of statsSegment.matchAll(specialtyRegex)) {
    const slug = cleanText(match[1] || "");
    const name = cleanText(match[2] || "");
    if (!name) continue;

    const key = normalizeName(name);
    if (!key || specialtySeen.has(key)) continue;
    specialtySeen.add(key);

    specialtyDetails.push({
      name,
      id: toSpecialtyId(slug, name),
      iconUrl: `${SEREBII_BASE}/pokemonpokopia/pokedex/specialty/${slug}.png`,
    });
  }

  const idealHabitatMatch = statsSegment.match(
    /\/pokemonpokopia\/pokedex\/idealhabitat\/[^"']+\.shtml["'][^>]*><u>([^<]+)<\/u>/i,
  );
  const idealHabitat = cleanText(idealHabitatMatch?.[1] || "");

  const favorites = [];
  const favoriteSeen = new Set();
  const favoriteRegex =
    /\/pokemonpokopia\/(?:favorites\/[^"']+|flavors)\.shtml["'][^>]*><u>([^<]+)<\/u>/gi;

  for (const match of statsSegment.matchAll(favoriteRegex)) {
    const name = cleanText(match[1] || "");
    if (!name) continue;
    const key = normalizeName(name);
    if (!key || favoriteSeen.has(key)) continue;
    favoriteSeen.add(key);
    favorites.push(name);
  }

  const habitatsSegmentMatch = detailPageHtml.match(
    /<h2>Habitats & Locations<\/h2>[\s\S]*?<\/table>/i,
  );
  const habitatsSegment = habitatsSegmentMatch ? habitatsSegmentMatch[0] : "";

  const habitatAttractions = [];
  const habitatSeen = new Set();
  for (const match of habitatsSegment.matchAll(
    /<td class="fooevo"><a href="\/pokemonpokopia\/habitatdex\/[^"]+">([^<]+)<\/a><\/td>/gi,
  )) {
    const name = cleanText(match[1] || "");
    if (!name) continue;
    const key = normalizeName(name);
    if (!key || habitatSeen.has(key)) continue;
    habitatSeen.add(key);
    habitatAttractions.push(name);
  }

  const availableAreas = [];
  const areaSeen = new Set();
  for (const match of habitatsSegment.matchAll(
    /\/pokemonpokopia\/locations\/[^"']+\.shtml"><u>([^<]+)<\/u>/gi,
  )) {
    const name = cleanText(match[1] || "");
    if (!name) continue;
    const key = normalizeName(name);
    if (!key || areaSeen.has(key)) continue;
    areaSeen.add(key);
    availableAreas.push(name);
  }

  const rarityMatch = habitatsSegment.match(
    /<b>Rarity<\/b>:\s*<br \/>\s*([^<\n\r]+)/i,
  );
  const rarity = cleanText(rarityMatch?.[1] || "");
  const primaryLocation = availableAreas[0] || "";
  const types = parseTypeNames(detailPageHtml);

  return {
    primaryLocation,
    idealHabitat,
    favorites,
    habitatAttractions,
    availableAreas,
    areaDetails: availableAreas.map((name) => ({ name })),
    rarity: rarity ? rarity.toUpperCase() : "",
    types,
    specialties: specialtyDetails.map((entry) => entry.name),
    specialtyDetails,
  };
}

function createPokemonRecordFromRow(row) {
  const isEvent = Boolean(row.isEventPokemon);

  return {
    number: row.number,
    name: row.name,
    primaryLocation: isEvent ? "Event" : "Unknown",
    idealHabitat: isEvent ? "Event" : "Unknown",
    specialties: row.specialties.map((entry) => entry.name),
    favorites: isEvent ? [] : ["None"],
    habitatAttractions: [],
    availableAreas: isEvent ? ["Event"] : [],
    meta: {
      rarity: isEvent ? "EVENT" : "UNKNOWN",
      types: [],
      spriteUrl: row.spriteUrl,
      habitatIds: [],
      areaDetails: isEvent ? [{ name: "Event" }] : [],
      favoriteDetails: [],
      specialtyDetails: row.specialties,
      isEventPokemon: isEvent,
      eventNumber: isEvent ? row.eventNumber : null,
    },
  };
}

function recomputeSpecialtiesFacet(pokemon) {
  const specialties = new Set();
  for (const entry of pokemon) {
    if (!Array.isArray(entry.specialties)) continue;
    for (const specialty of entry.specialties) {
      if (specialty) specialties.add(specialty);
    }
  }
  return Array.from(specialties).sort((a, b) => a.localeCompare(b));
}

function comparePokemonForSort(a, b) {
  const aEvent = Boolean(a.meta?.isEventPokemon);
  const bEvent = Boolean(b.meta?.isEventPokemon);

  if (aEvent !== bEvent) {
    return aEvent ? 1 : -1;
  }

  if (aEvent && bEvent) {
    const aEventNumber = Number.parseInt(String(a.meta?.eventNumber || "").replace(/\D+/g, ""), 10);
    const bEventNumber = Number.parseInt(String(b.meta?.eventNumber || "").replace(/\D+/g, ""), 10);

    if (!Number.isNaN(aEventNumber) && !Number.isNaN(bEventNumber) && aEventNumber !== bEventNumber) {
      return aEventNumber - bEventNumber;
    }
  }

  const aNum = Number.parseInt(a.number, 10);
  const bNum = Number.parseInt(b.number, 10);

  if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) {
    return aNum - bNum;
  }

  if (a.name !== b.name) {
    return a.name.localeCompare(b.name);
  }

  return 0;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchPokemonDetail(detailPath, detailCache) {
  if (!detailPath) return null;
  if (detailCache.has(detailPath)) {
    return detailCache.get(detailPath);
  }

  const url = toAbsoluteUrl(detailPath);
  const html = await fetchHtml(url);
  const parsed = parsePokemonDetailPage(html);
  detailCache.set(detailPath, parsed);
  return parsed;
}

async function main() {
  const [datasetRaw, habitatDatasetRaw, availableHtml, eventHtml, litterHtml] = await Promise.all([
    fs.readFile(DATASET_PATH, "utf8"),
    fs.readFile(HABITAT_DATA_PATH, "utf8"),
    fetchHtml(AVAILABLE_SOURCE_URL),
    fetchHtml(EVENT_SOURCE_URL),
    fetchHtml(LITTER_SOURCE_URL),
  ]);

  const dataset = JSON.parse(datasetRaw);
  const habitatDataset = JSON.parse(habitatDatasetRaw);
  const availableRows = parsePokemonRows(availableHtml, { isEventPokemon: false });
  const eventRows = parsePokemonRows(eventHtml, { isEventPokemon: true });
  const litterRewardsMap = parseLitterRewardsMap(litterHtml);
  const habitatIdsByPokemonKey = buildHabitatIdsByPokemonKey(habitatDataset);

  if (availableRows.length === 0) {
    throw new Error("No standard pokemon rows were parsed from availablepokemon.shtml.");
  }

  if (eventRows.length === 0) {
    throw new Error("No event pokemon rows were parsed from eventpokedex.shtml.");
  }

  const allRows = [...availableRows, ...eventRows];
  const lookup = buildDatasetLookup(dataset);
  const detailCache = new Map();
  const detailTargetNames = new Set([
    ...UNIQUE_FORM_NAMES,
    ...UNIQUE_BASE_FORM_NAMES,
    ...eventRows.map((entry) => entry.name),
  ]);

  let updatedCount = 0;
  let renamedCount = 0;
  let appendedCount = 0;

  const unmatchedStandardRows = [];
  const appendedStandardRows = [];
  const appendedEventRows = [];

  for (const row of allRows) {
    const candidateKeys = getCandidateNameKeys(row.name);
    let target;

    for (const key of candidateKeys) {
      if (!lookup.has(key)) continue;

      const candidate = lookup.get(key);
      if (row.isEventPokemon && !candidate.meta?.isEventPokemon) {
        continue;
      }

      target = candidate;
      break;
    }

    if (!target) {
      const created = createPokemonRecordFromRow(row);
      if (detailTargetNames.has(row.name) && row.detailPath) {
        const detail = await fetchPokemonDetail(row.detailPath, detailCache);
        if (detail) {
          if (detail.primaryLocation) created.primaryLocation = detail.primaryLocation;
          if (detail.idealHabitat) created.idealHabitat = detail.idealHabitat;
          if (detail.favorites.length > 0) created.favorites = detail.favorites;
          if (detail.habitatAttractions.length > 0) {
            created.habitatAttractions = detail.habitatAttractions;
          }
          if (detail.availableAreas.length > 0) {
            created.availableAreas = detail.availableAreas;
          }
          created.specialties =
            detail.specialties.length > 0 ? detail.specialties : created.specialties;
          created.meta = {
            ...(created.meta || {}),
            rarity: detail.rarity || created.meta?.rarity,
            types: detail.types.length > 0 ? detail.types : created.meta?.types || [],
            areaDetails:
              detail.areaDetails.length > 0
                ? detail.areaDetails
                : created.meta?.areaDetails || [],
            specialtyDetails:
              detail.specialtyDetails.length > 0
                ? detail.specialtyDetails
                : created.meta?.specialtyDetails || [],
          };
        }
      }
      dataset.pokemon.push(created);
      lookup.set(normalizeName(created.name), created);

      appendedCount += 1;
      if (row.isEventPokemon) {
        appendedEventRows.push({ name: row.name, number: row.number, eventNumber: row.eventNumber });
      } else {
        appendedStandardRows.push({ name: row.name, number: row.number });
        unmatchedStandardRows.push({ sourceName: row.sourceName, canonicalName: row.name, number: row.number });
      }
      continue;
    }

    const previousName = target.name;
    target.name = row.name;
    target.number = row.number;
    target.specialties = row.specialties.map((entry) => entry.name);

    target.meta = {
      ...(target.meta || {}),
      spriteUrl: row.spriteUrl,
      specialtyDetails: mergeSpecialtyDetails(
        target.meta?.specialtyDetails,
        row.specialties,
      ),
      isEventPokemon: Boolean(row.isEventPokemon),
      eventNumber: row.isEventPokemon ? row.eventNumber : null,
    };

    if (detailTargetNames.has(row.name) && row.detailPath) {
      const detail = await fetchPokemonDetail(row.detailPath, detailCache);
      if (detail) {
        if (detail.primaryLocation) target.primaryLocation = detail.primaryLocation;
        if (detail.idealHabitat) target.idealHabitat = detail.idealHabitat;
        if (detail.favorites.length > 0) target.favorites = detail.favorites;
        if (detail.habitatAttractions.length > 0) {
          target.habitatAttractions = detail.habitatAttractions;
        }
        if (detail.availableAreas.length > 0) {
          target.availableAreas = detail.availableAreas;
        }
        if (detail.specialties.length > 0) {
          target.specialties = detail.specialties;
        }

        target.meta = {
          ...(target.meta || {}),
          rarity: detail.rarity || target.meta?.rarity,
          types: detail.types.length > 0 ? detail.types : target.meta?.types || [],
          areaDetails:
            detail.areaDetails.length > 0
              ? detail.areaDetails
              : target.meta?.areaDetails || [],
          specialtyDetails:
            detail.specialtyDetails.length > 0
              ? mergeSpecialtyDetails(
                  target.meta?.specialtyDetails,
                  detail.specialtyDetails,
                )
              : target.meta?.specialtyDetails || [],
        };
      }
    }

    if (row.isEventPokemon) {
      target.primaryLocation = target.primaryLocation || "Event";
      target.idealHabitat = target.idealHabitat || "Event";
      if (!Array.isArray(target.availableAreas) || target.availableAreas.length === 0) {
        target.availableAreas = ["Event"];
      }
      if (!target.meta?.rarity || target.meta.rarity === "UNKNOWN") {
        target.meta.rarity = "EVENT";
      }
      if (!Array.isArray(target.meta?.areaDetails) || target.meta.areaDetails.length === 0) {
        target.meta.areaDetails = [{ name: "Event" }];
      }
    }

    if (previousName !== row.name) {
      renamedCount += 1;
      lookup.delete(normalizeName(previousName));
      lookup.set(normalizeName(row.name), target);
    }

    updatedCount += 1;
  }

  dataset.count = dataset.pokemon.length;
  dataset.generatedAt = new Date().toISOString();

  for (const pokemon of dataset.pokemon) {
    applyLitterRewardsToPokemon(pokemon, litterRewardsMap);
    applyHabitatIdsToPokemon(pokemon, habitatIdsByPokemonKey);
  }

  dataset.facets = {
    ...(dataset.facets || {}),
    specialties: recomputeSpecialtiesFacet(dataset.pokemon),
  };

  dataset.pokemon.sort(comparePokemonForSort);

  await fs.writeFile(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  const report = {
    generatedAt: new Date().toISOString(),
      sourceUrls: {
      available: AVAILABLE_SOURCE_URL,
      event: EVENT_SOURCE_URL,
      litter: LITTER_SOURCE_URL,
    },
    totals: {
      availableRows: availableRows.length,
      eventRows: eventRows.length,
      combinedRows: allRows.length,
      datasetCount: dataset.count,
      updatedCount,
      renamedCount,
      appendedCount,
      litterRewardsMapped: litterRewardsMap.size,
      habitatNameMappings: habitatIdsByPokemonKey.size,
    },
    appendedStandardRows,
    appendedEventRows,
    unmatchedStandardRows,
    keyEntries: dataset.pokemon
      .filter((entry) =>
        [
          "Shellos (West Sea)",
          "Shellos East Sea",
          "Gastrodon (West Sea)",
          "Gastrodon East Sea",
          "Paldean Wooper",
          "Tatsugiri Curly Form",
          "Tatsugiri Droopy Form",
          "Tatsugiri Stretchy Form",
          "Professor Tangrowth",
          "Peakychu",
          "Mosslax",
          "DJ Rotom",
          "Smearguru",
          "Hoppip",
          "Skiploom",
          "Jumpluff",
          "Sableye",
        ].includes(entry.name),
      )
      .map((entry) => ({
        number: entry.number,
        name: entry.name,
        isEventPokemon: Boolean(entry.meta?.isEventPokemon),
        eventNumber: entry.meta?.eventNumber || null,
        spriteUrl: entry.meta?.spriteUrl || null,
        specialties: entry.specialties,
      })),
    uniqueAudit: UNIQUE_FORM_NAMES.map((uniqueName) => {
      const uniqueEntry = dataset.pokemon.find((entry) => entry.name === uniqueName);
      const baseNameMap = {
        "Professor Tangrowth": "Tangrowth",
        Peakychu: "Pikachu",
        Mosslax: "Snorlax",
      };
      const baseName = baseNameMap[uniqueName] || null;
      const baseEntry = baseName
        ? dataset.pokemon.find((entry) => entry.name === baseName)
        : null;

      return {
        uniqueName,
        uniqueNumber: uniqueEntry?.number || null,
        uniquePrimaryLocation: uniqueEntry?.primaryLocation || null,
        uniqueSpecialties: uniqueEntry?.specialties || [],
        baseName,
        baseNumber: baseEntry?.number || null,
        basePrimaryLocation: baseEntry?.primaryLocation || null,
        baseSpecialties: baseEntry?.specialties || [],
        sameNumber: Boolean(uniqueEntry && baseEntry && uniqueEntry.number === baseEntry.number),
      };
    }),
  };

  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Synced ${updatedCount} existing pokemon from Serebii.`);
  console.log(`Renamed ${renamedCount} pokemon entries.`);
  console.log(`Appended ${appendedCount} new pokemon entries.`);
  console.log(`Dataset total is now ${dataset.count}.`);
  console.log(`Wrote dataset: ${DATASET_PATH}`);
  console.log(`Wrote report: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error("[error] Failed to sync available/event pokemon data");
  console.error(error);
  process.exitCode = 1;
});
