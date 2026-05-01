import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, "data", "habitats-data.json");
const HABITATS_URL = "https://serebii.net/pokemonpokopia/habitats.shtml";
const SEREBII_BASE = "https://serebii.net";
const POKOPIA_BASE = `${SEREBII_BASE}/pokemonpokopia`;

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
    .replace(/&nbsp;/g, " ")
    .replace(/&eacute;/g, "é")
    .replace(/&Eacute;/g, "É");
}

function stripTags(input = "") {
  return input.replace(/<[^>]+>/g, " ");
}

function cleanText(input = "") {
  return decodeHtmlEntities(stripTags(input))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSlug(input = "") {
  return decodeHtmlEntities(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function getDetailPathKey(detailPath = "") {
  return String(detailPath || "")
    .split("/")
    .pop()
    ?.replace(/\.shtml$/i, "")
    .toLowerCase();
}

function toAbsolutePokopiaUrl(relativePath = "") {
  if (!relativePath) return "";
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const normalizedPath = relativePath.startsWith("/")
    ? relativePath
    : `/pokemonpokopia/${relativePath.replace(/^\/+/, "")}`;
  return `${SEREBII_BASE}${normalizedPath}`;
}

function toAbsoluteHabitatImageUrl(imagePath = "") {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const normalizedPath = imagePath.startsWith("/")
    ? imagePath
    : `/pokemonpokopia/${imagePath.replace(/^\/+/, "")}`;
  return `${SEREBII_BASE}${normalizedPath}`;
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

function parseHabitatListRows(habitatsHtml) {
  const rows = [];
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;

  for (const rowMatch of habitatsHtml.matchAll(rowRegex)) {
    const rowHtml = rowMatch[1] || "";
    const numberMatch = rowHtml.match(/<td\s+class=["']cen["']>\s*#(\d+)\s*<\/td>/i);
    if (!numberMatch) continue;

    const imageMatch = rowHtml.match(
      /<a\s+href=["'](habitatdex\/[^"']+\.shtml)["'][^>]*>\s*<img\s+src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>/i,
    );
    const nameMatch = rowHtml.match(
      /<td\s+class=["']fooinfo["']>\s*<a\s+href=["'](habitatdex\/[^"']+\.shtml)["'][^>]*><u>([^<]+)<\/u><\/a>/i,
    );

    if (!nameMatch) continue;

    const detailPath = decodeHtmlEntities(nameMatch[1] || imageMatch?.[1] || "");
    const name = cleanText(nameMatch[2] || imageMatch?.[3] || "");
    const number = numberMatch[1].padStart(3, "0");

    const detailPathKey = getDetailPathKey(detailPath) || `${number}-${normalizeSlug(name)}`;

    rows.push({
      number,
      id: `habitat-${detailPathKey}`,
      slug: normalizeSlug(name) || `habitat-${number}`,
      name,
      detailPath,
      imageUrl: toAbsoluteHabitatImageUrl(imageMatch?.[2] || ""),
      imageAlt: cleanText(imageMatch?.[3] || name),
    });
  }

  return rows;
}

function parseRequirements(detailHtml) {
  const sectionMatch = detailHtml.match(
    /<h2>Requirements<\/h2>[\s\S]*?<table class=["']dextable["'][\s\S]*?<\/table>/i,
  );
  if (!sectionMatch) return [];

  const sectionHtml = sectionMatch[0];
  const rows = [];
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;

  for (const rowMatch of sectionHtml.matchAll(rowRegex)) {
    const rowHtml = rowMatch[1] || "";
    if (!/class=["']cen["']/i.test(rowHtml)) continue;

    const imageMatch = rowHtml.match(/<img\s+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/i);
    const nameMatch = rowHtml.match(/<td\s+class=["']fooinfo["']>\s*<u>([^<]+)<\/u>/i);
    const quantityMatch = rowHtml.match(/<td\s+class=["']fooinfo["']>\s*([0-9]+)\s*<\/td>\s*$/i);

    const name = cleanText(nameMatch?.[1] || imageMatch?.[2] || "");
    if (!name) continue;

    const quantity = Number.parseInt(quantityMatch?.[1] || "1", 10);
    rows.push({
      id: `req-${normalizeSlug(name)}`,
      name,
      quantity: Number.isFinite(quantity) ? quantity : 1,
      imageUrl: toAbsoluteHabitatImageUrl(imageMatch?.[1] || ""),
      imageAlt: cleanText(imageMatch?.[2] || name),
    });
  }

  return rows;
}

function parseAvailablePokemon(detailHtml) {
  const sectionMatch = detailHtml.match(
    /<h2>Available Pok[\s\S]*?<\/h2>[\s\S]*?<table class=["']dextable["'][\s\S]*?<\/table>/i,
  );
  if (!sectionMatch) return [];

  const sectionHtml = sectionMatch[0];

  const nameEntries = [];
  for (const match of sectionHtml.matchAll(
    /<td\s+class=["']fooevo["']>\s*<a\s+href=(["'])(\/pokemonpokopia\/pokedex\/[^"<>]+\.shtml)\1[^>]*>([^<]+)<\/a>\s*<\/td>/gi,
  )) {
    const pokedexPath = decodeHtmlEntities(match[2] || "");
    const name = cleanText(match[3] || "");
    if (!name || !pokedexPath) continue;
    nameEntries.push({ name, pokedexPath });
  }

  const imageEntries = [];
  for (const match of sectionHtml.matchAll(
    /<a\s+href=(["'])(\/pokemonpokopia\/pokedex\/[^"<>]+\.shtml)\1[^>]*>\s*<img\s+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>\s*<\/a>/gi,
  )) {
    imageEntries.push({
      pokedexPath: decodeHtmlEntities(match[2] || ""),
      spriteUrl: toAbsoluteHabitatImageUrl(match[3] || ""),
      spriteAlt: cleanText(match[4] || ""),
    });
  }

  const locationEntries = [];
  for (const locationCellMatch of sectionHtml.matchAll(
    /<td class=["']fooinfo["']\s+valign=["']top["']>\s*<b>Location<\/b>:[\s\S]*?<\/td>/gi,
  )) {
    const cellHtml = locationCellMatch[0] || "";
    const locations = [];
    for (const locationMatch of cellHtml.matchAll(
      /\/pokemonpokopia\/locations\/[^"']+\.shtml"><u>([^<]+)<\/u>/gi,
    )) {
      const locationName = cleanText(locationMatch[1] || "");
      if (locationName) locations.push(locationName);
    }
    locationEntries.push(Array.from(new Set(locations)));
  }

  const rarityEntries = [];
  for (const rarityCellMatch of sectionHtml.matchAll(
    /<td class=["']fooinfo["']>\s*<b>Rarity<\/b>:[\s\S]*?<br \/>\s*([^<\n\r]+)/gi,
  )) {
    rarityEntries.push(cleanText(rarityCellMatch[1] || ""));
  }

  const maxCount = Math.max(
    nameEntries.length,
    imageEntries.length,
    locationEntries.length,
    rarityEntries.length,
  );

  const entries = [];
  for (let index = 0; index < maxCount; index += 1) {
    const nameEntry = nameEntries[index] || imageEntries[index] || {};
    const imageEntry = imageEntries[index] || {};

    const name = cleanText(nameEntry.name || imageEntry.spriteAlt || "");
    const pokedexPath = decodeHtmlEntities(nameEntry.pokedexPath || imageEntry.pokedexPath || "");
    if (!name || !pokedexPath) continue;

    entries.push({
      id: `spawn-${normalizeSlug(name)}-${index + 1}`,
      name,
      pokedexPath,
      pokedexUrl: toAbsolutePokopiaUrl(pokedexPath),
      spriteUrl: imageEntry.spriteUrl || "",
      spriteAlt: imageEntry.spriteAlt || name,
      rarity: cleanText(rarityEntries[index] || ""),
      locations: locationEntries[index] || [],
    });
  }

  const uniqueByPath = new Map();
  for (const entry of entries) {
    if (!entry.pokedexPath) continue;
    if (!uniqueByPath.has(entry.pokedexPath)) {
      uniqueByPath.set(entry.pokedexPath, entry);
      continue;
    }

    const existing = uniqueByPath.get(entry.pokedexPath);
    if (!existing.spriteUrl && entry.spriteUrl) existing.spriteUrl = entry.spriteUrl;
    if (!existing.rarity && entry.rarity) existing.rarity = entry.rarity;
    if (existing.locations.length === 0 && entry.locations.length > 0) {
      existing.locations = entry.locations;
    }
  }

  return Array.from(uniqueByPath.values());
}

function countExpectedSpawnEntries(detailHtml) {
  const sectionMatch = detailHtml.match(
    /<h2>Available Pok[\s\S]*?<\/h2>[\s\S]*?<table class=["']dextable["'][\s\S]*?<\/table>/i,
  );
  if (!sectionMatch) return 0;

  const sectionHtml = sectionMatch[0];
  const expected = new Set();

  for (const match of sectionHtml.matchAll(/\/pokemonpokopia\/pokedex\/[^"<>]+\.shtml/gi)) {
    const path = decodeHtmlEntities(match[0] || "");
    if (!path) continue;
    if (/\/specialty\//i.test(path)) continue;
    expected.add(path.toLowerCase());
  }

  return expected.size;
}

function parseFlavorText(detailHtml) {
  const match = detailHtml.match(
    /<h2>Flavor Text<\/h2>[\s\S]*?<td class=["']fooinfo["'][^>]*>([\s\S]*?)<\/td>/i,
  );
  return cleanText(match?.[1] || "");
}

function parsePrimaryLocation(spawnPokemon) {
  const allLocations = [];
  for (const entry of spawnPokemon) {
    for (const location of entry.locations || []) {
      allLocations.push(location);
    }
  }

  if (allLocations.length === 0) return "";

  const first = allLocations[0];
  return first || "";
}

async function scrapeHabitatDetail(row, detailCache) {
  if (detailCache.has(row.detailPath)) {
    return detailCache.get(row.detailPath);
  }

  const detailUrl = `${POKOPIA_BASE}/${row.detailPath.replace(/^\/+/, "")}`;
  const html = await fetchHtml(encodeURI(detailUrl));

  const requirements = parseRequirements(html);
  const spawnPokemon = parseAvailablePokemon(html);
  const expectedSpawnCount = countExpectedSpawnEntries(html);
  const flavorText = parseFlavorText(html);

  if (expectedSpawnCount > 0 && spawnPokemon.length !== expectedSpawnCount) {
    throw new Error(
      `Spawn parse mismatch for ${row.name}: parsed ${spawnPokemon.length}, expected ${expectedSpawnCount}.`,
    );
  }

  const detail = {
    ...row,
    detailUrl,
    flavorText,
    requirements,
    spawnPokemon,
    spawnPokemonCount: spawnPokemon.length,
    requirementCount: requirements.length,
    totalRequiredItems: requirements.reduce((sum, item) => sum + item.quantity, 0),
    primaryLocation: parsePrimaryLocation(spawnPokemon),
  };

  detailCache.set(row.detailPath, detail);
  return detail;
}

async function main() {
  const habitatsHtml = await fetchHtml(HABITATS_URL);
  const habitatRows = parseHabitatListRows(habitatsHtml);

  if (habitatRows.length === 0) {
    throw new Error("No habitat rows were parsed from habitats.shtml");
  }

  const detailCache = new Map();
  const habitats = [];

  for (let index = 0; index < habitatRows.length; index += 1) {
    const row = habitatRows[index];
    const detail = await scrapeHabitatDetail(row, detailCache);
    habitats.push(detail);

    if ((index + 1) % 25 === 0 || index + 1 === habitatRows.length) {
      console.log(`[sync] Scraped habitat ${index + 1}/${habitatRows.length}`);
    }
  }

  const requirementNames = Array.from(
    new Set(
      habitats.flatMap((habitat) => habitat.requirements.map((requirement) => requirement.name)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const spawnPokemonNames = Array.from(
    new Set(
      habitats.flatMap((habitat) => habitat.spawnPokemon.map((pokemon) => pokemon.name)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const dataset = {
    generatedAt: new Date().toISOString(),
    sourceUrl: HABITATS_URL,
    totalHabitats: habitats.length,
    totalRequirementTypes: requirementNames.length,
    totalSpawnPokemon: spawnPokemonNames.length,
    facets: {
      requirementNames,
      spawnPokemonNames,
    },
    habitats,
  };

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  console.log(`[done] Wrote habitats dataset to ${OUTPUT_PATH}`);
  console.log(`[done] Habitats: ${dataset.totalHabitats}`);
  console.log(`[done] Requirement types: ${dataset.totalRequirementTypes}`);
  console.log(`[done] Spawn pokemon: ${dataset.totalSpawnPokemon}`);
}

main().catch((error) => {
  console.error("[error] Failed to sync habitat data");
  console.error(error);
  process.exitCode = 1;
});
