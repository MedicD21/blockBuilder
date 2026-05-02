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
  const headingMatch = detailHtml.match(/<h2>Available Pok[\s\S]*?<\/h2>/i);
  if (!headingMatch) return [];

  const headingIndex = headingMatch.index ?? -1;
  if (headingIndex < 0) return [];

  const tableStart = detailHtml.indexOf("<table", headingIndex);
  if (tableStart < 0) return [];

  const sectionTableHtml = extractTagWithNesting(detailHtml, tableStart, "table");
  if (!sectionTableHtml) return [];

  const rows = extractTopLevelTagBlocks(sectionTableHtml, "tr", 1);
  if (rows.length === 0) return [];

  const entries = [];
  let activeGroup = [];
  let blockIndex = 0;

  for (const rowHtml of rows) {
    const cells = extractTopLevelTagBlocks(rowHtml, "td", 0);
    if (cells.length === 0) continue;

    const hasNameCells = cells.some(
      (cellHtml) =>
        /class=["']fooevo["']/i.test(cellHtml) &&
        /\/pokemonpokopia\/pokedex\/[^"<>]+\.shtml/i.test(cellHtml),
    );

    if (hasNameCells) {
      blockIndex += 1;
      activeGroup = [];

      for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
        const cellHtml = cells[cellIndex];
        const anchorMatch = cellHtml.match(
          /<a\s+href=(["'])(\/pokemonpokopia\/pokedex\/[^"<>]+\.shtml)\1[^>]*>(?:\s*<u>)?([^<]+)(?:<\/u>)?\s*<\/a>/i,
        );
        if (!anchorMatch) continue;

        const pokedexPath = decodeHtmlEntities(anchorMatch[2] || "");
        const name = cleanText(anchorMatch[3] || "");
        if (!pokedexPath || !name) continue;

        const id = `spawn-${normalizeSlug(name)}-${blockIndex}-${cellIndex + 1}`;
        const entry = {
          id,
          name,
          pokedexPath,
          pokedexUrl: toAbsolutePokopiaUrl(pokedexPath),
          spriteUrl: "",
          spriteAlt: name,
          rarity: "",
          locations: [],
          timeOfDay: [],
          weather: [],
        };

        entries.push(entry);
        activeGroup.push(entry);
      }

      continue;
    }

    if (activeGroup.length === 0) continue;

    const rowHasSprites = cells.some((cellHtml) =>
      /\/pokemonpokopia\/pokemon\/small\//i.test(cellHtml),
    );
    if (rowHasSprites) {
      for (let index = 0; index < cells.length; index += 1) {
        const entry = activeGroup[index];
        if (!entry) continue;

        const spriteMatch = cells[index].match(
          /<img\s+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/i,
        );
        if (!spriteMatch) continue;

        entry.spriteUrl = toAbsoluteHabitatImageUrl(spriteMatch[1] || "");
        entry.spriteAlt = cleanText(spriteMatch[2] || entry.name);
      }
      continue;
    }

    const rowHasLocations = cells.some((cellHtml) => /<b>Location<\/b>/i.test(cellHtml));
    if (rowHasLocations) {
      for (let index = 0; index < cells.length; index += 1) {
        const entry = activeGroup[index];
        if (!entry) continue;

        const locations = [];
        for (const locationMatch of cells[index].matchAll(
          /\/pokemonpokopia\/locations\/[^"']+\.shtml"><u>([^<]+)<\/u>/gi,
        )) {
          const locationName = cleanText(locationMatch[1] || "");
          if (locationName) locations.push(locationName);
        }
        entry.locations = Array.from(new Set(locations));
      }
      continue;
    }

    const rowHasRarity = cells.some((cellHtml) => /<b>Rarity<\/b>/i.test(cellHtml));
    if (rowHasRarity) {
      for (let index = 0; index < cells.length; index += 1) {
        const entry = activeGroup[index];
        if (!entry) continue;

        const rarityMatch = cells[index].match(
          /<b>Rarity<\/b>:\s*<br \/>\s*([^<\n\r]+)/i,
        );
        entry.rarity = cleanText(rarityMatch?.[1] || "");
      }
      continue;
    }

    const rowHasTimeWeather = cells.some(
      (cellHtml) =>
        /<b>Time<\/b>/i.test(cellHtml) || /<b>Weather<\/b>/i.test(cellHtml),
    );
    if (rowHasTimeWeather) {
      for (let index = 0; index < cells.length; index += 1) {
        const entry = activeGroup[index];
        if (!entry) continue;

        const valueColumns = [];
        for (const valueMatch of cells[index].matchAll(
          /<td[^>]*valign=["']top["'][^>]*>([\s\S]*?)(?:<\/td>|<\/tr>)/gi,
        )) {
          const lines = decodeHtmlEntities(valueMatch[1] || "")
            .replace(/<br\s*\/?>/gi, "\n")
            .split("\n")
            .map((line) => cleanText(line))
            .filter(Boolean);
          if (lines.length > 0) valueColumns.push(lines);
        }

        let timeValues = valueColumns[0] || [];
        let weatherValues = valueColumns[1] || [];

        if (valueColumns.length === 1) {
          const knownTime = new Set(["Morning", "Day", "Evening", "Night"]);
          const knownWeather = new Set(["Sun", "Cloud", "Rain"]);

          const fallbackTime = [];
          const fallbackWeather = [];
          for (const value of valueColumns[0]) {
            if (knownTime.has(value)) fallbackTime.push(value);
            if (knownWeather.has(value)) fallbackWeather.push(value);
          }

          if (fallbackTime.length > 0) timeValues = fallbackTime;
          if (fallbackWeather.length > 0) weatherValues = fallbackWeather;
        }

        entry.timeOfDay = Array.from(new Set(timeValues));
        entry.weather = Array.from(new Set(weatherValues));
      }
    }
  }

  return entries;
}

function countExpectedSpawnEntries(detailHtml) {
  const headingMatch = detailHtml.match(/<h2>Available Pok[\s\S]*?<\/h2>/i);
  if (!headingMatch) return 0;

  const headingIndex = headingMatch.index ?? -1;
  if (headingIndex < 0) return 0;

  const tableStart = detailHtml.indexOf("<table", headingIndex);
  if (tableStart < 0) return 0;

  const sectionHtml = extractTagWithNesting(detailHtml, tableStart, "table");
  if (!sectionHtml) return 0;
  const expected = new Set();

  for (const match of sectionHtml.matchAll(/\/pokemonpokopia\/pokedex\/[^"<>]+\.shtml/gi)) {
    const path = decodeHtmlEntities(match[0] || "");
    if (!path) continue;
    if (/\/specialty\//i.test(path)) continue;
    expected.add(path.toLowerCase());
  }

  return expected.size;
}

function extractTagWithNesting(html, startIndex, tagName) {
  const matcher = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  matcher.lastIndex = startIndex;

  let depth = 0;
  let start = -1;
  let match;
  while ((match = matcher.exec(html))) {
    const token = match[0];
    const lowerToken = token.toLowerCase();
    const isClosing = lowerToken.startsWith(`</${tagName}`);
    const isSelfClosing = lowerToken.endsWith("/>");

    if (start === -1) {
      if (isClosing) continue;
      start = match.index;
      depth = 1;
      if (isSelfClosing) {
        return html.slice(start, matcher.lastIndex);
      }
      continue;
    }

    if (!isClosing && !isSelfClosing) {
      depth += 1;
      continue;
    }

    if (isClosing) {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, matcher.lastIndex);
      }
    }
  }

  return "";
}

function extractTopLevelTagBlocks(containerHtml, tagName, requiredTableDepth) {
  const tokens = new RegExp(`<(\\/)?(${tagName}|table)\\b[^>]*>`, "gi");
  const blocks = [];

  let tableDepth = 0;
  let captureStart = -1;
  let match;

  while ((match = tokens.exec(containerHtml))) {
    const isClosing = Boolean(match[1]);
    const tokenName = String(match[2] || "").toLowerCase();

    if (tokenName === "table") {
      if (!isClosing) {
        tableDepth += 1;
      } else {
        tableDepth = Math.max(0, tableDepth - 1);
      }
      continue;
    }

    if (tokenName !== tagName) continue;

    if (!isClosing) {
      if (tableDepth === requiredTableDepth && captureStart === -1) {
        captureStart = match.index;
      }
    } else if (captureStart !== -1 && tableDepth === requiredTableDepth) {
      blocks.push(containerHtml.slice(captureStart, tokens.lastIndex));
      captureStart = -1;
    }
  }

  return blocks;
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
