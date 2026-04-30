import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REFERENCES_INDEX_PATH = path.join(
  ROOT,
  'public',
  'references',
  'Items By Favorite.md',
);
const FAVORITES_DIR_PATH = path.join(
  ROOT,
  'public',
  'references',
  'Items By Favorite',
);
const ITEMS_HTML_PATH = path.join(ROOT, 'public', 'items.html');
const REPORT_PATH = path.join(ROOT, 'data', 'serebii-favorites-sync-report.json');

const SEREBII_BASE = 'https://www.serebii.net';
const SEREBII_FAVORITES_INDEX = `${SEREBII_BASE}/pokemonpokopia/favorites.shtml`;

function decodeHtmlEntities(input) {
  if (!input) return '';

  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É');
}

function stripTags(input) {
  return input.replace(/<[^>]+>/g, ' ');
}

function cleanText(input) {
  return decodeHtmlEntities(stripTags(input || ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeName(input) {
  return decodeHtmlEntities(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '');
}

function parseMarkdownRows(markdown) {
  return markdown
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .map((line) => line.split('|').slice(1, -1).map((part) => part.trim()));
}

function parseFavoriteOrder(indexMarkdown) {
  const rows = parseMarkdownRows(indexMarkdown);
  const favorites = [];

  rows.forEach((columns) => {
    const [favoriteLabel] = columns;
    if (!favoriteLabel) return;
    if (favoriteLabel.toLowerCase() === 'favorite') return;
    if (/^-+$/.test(favoriteLabel.replace(/\s+/g, ''))) return;

    favorites.push(decodeHtmlEntities(favoriteLabel));
  });

  return favorites;
}

function extractCellHtml(rowHtml, className) {
  const regex = new RegExp(
    `<td\\s+class=["']${className}["'][^>]*>([\\s\\S]*?)<\\/td>`,
    'i',
  );
  const match = rowHtml.match(regex);
  return match ? match[1] : '';
}

function parseItemsHtml(html) {
  const sectionRegex = /<section\s+id="([^"]+)">([\s\S]*?)<\/section>/gi;
  const items = [];

  for (const sectionMatch of html.matchAll(sectionRegex)) {
    const sectionId = sectionMatch[1];
    const sectionBody = sectionMatch[2] || '';
    const headingMatch = sectionBody.match(/<h2>([\s\S]*?)<\/h2>/i);
    const sectionTitle = headingMatch
      ? cleanText(headingMatch[1].replace(/<span[\s\S]*?<\/span>/i, ''))
      : sectionId;

    const tbodyMatch = sectionBody.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    const rowSource = tbodyMatch ? tbodyMatch[1] : sectionBody;

    const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
    for (const rowMatch of rowSource.matchAll(rowRegex)) {
      const rowHtml = rowMatch[1] || '';
      const name = cleanText(extractCellHtml(rowHtml, 'name-cell'));
      if (!name) continue;

      const description = cleanText(extractCellHtml(rowHtml, 'desc-cell'));
      const slug = normalizeName(name);
      items.push({
        id: `${sectionId}-${slug}`,
        sectionId,
        sectionTitle,
        name,
        slug,
        description,
      });
    }
  }

  return items;
}

function buildLocalItemsMap(items) {
  const map = new Map();

  items.forEach((item) => {
    if (!item.slug) return;
    if (!map.has(item.slug)) map.set(item.slug, []);
    map.get(item.slug).push(item);
  });

  return map;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

function parseSerebiiFavoriteIndex(html) {
  const map = new Map();
  const rowRegex = /<a href="(\/pokemonpokopia\/favorites\/[^"#?]+\.shtml)"><u>([^<]+)<\/u><\/a>/gi;

  for (const match of html.matchAll(rowRegex)) {
    const href = decodeHtmlEntities(match[1]);
    const label = cleanText(match[2]);
    if (!label || !href || href.endsWith('/.shtml')) continue;

    map.set(normalizeName(label), { label, href });
  }

  return map;
}

function parseSerebiiFavoriteItems(pageHtml) {
  const headingRegex = /List of[^<]*<\/h2>/gi;
  const headings = Array.from(pageHtml.matchAll(headingRegex)).map((match) => ({
    raw: match[0],
    index: match.index ?? -1,
    text: cleanText(match[0]).toLowerCase(),
  }));

  const itemsHeading = headings.find(
    (heading) =>
      heading.index >= 0 &&
      heading.text.includes('list of') &&
      heading.text.includes('items') &&
      !heading.text.includes('favorite objects'),
  );

  if (!itemsHeading) {
    return [];
  }

  const itemsHeadingPos = headings.findIndex(
    (heading) => heading.index === itemsHeading.index,
  );
  const pokemonHeading = headings
    .slice(itemsHeadingPos + 1)
    .find((heading) => heading.index > itemsHeading.index);

  if (!pokemonHeading) {
    return [];
  }

  const segment = pageHtml.slice(itemsHeading.index, pokemonHeading.index);

  const names = [];
  const nameRegex = /<td class="cen"><a href="\/pokemonpokopia\/items\/[^"#?]+"><u>([^<]+)<\/u><\/a><\/td>/gi;

  for (const match of segment.matchAll(nameRegex)) {
    const name = cleanText(match[1]);
    if (!name) continue;
    names.push(name);
  }

  const deduped = [];
  const seen = new Set();
  names.forEach((name) => {
    const normalized = normalizeName(name);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    deduped.push(name);
  });

  return deduped;
}

function toMarkdownTable(favoriteName, records) {
  const lines = [];
  lines.push(`# ${favoriteName}`);
  lines.push('');
  lines.push('| Name | Description |');
  lines.push('|------|-------------|');

  records.forEach((record) => {
    const safeName = (record.name || '').replace(/\|/g, '\\|');
    const safeDescription = (record.description || '').replace(/\|/g, '\\|');
    lines.push(`| ${safeName} | ${safeDescription} |`);
  });

  if (records.length === 0) {
    lines.push('| _No matched items found_ | |');
  }

  lines.push('');
  return lines.join('\n');
}

function favoriteFilePath(favoriteName) {
  return path.join(FAVORITES_DIR_PATH, `${favoriteName}.md`);
}

async function main() {
  const indexMarkdown = fs.readFileSync(REFERENCES_INDEX_PATH, 'utf8');
  const favoriteOrder = parseFavoriteOrder(indexMarkdown);
  const itemsHtml = fs.readFileSync(ITEMS_HTML_PATH, 'utf8');
  const localItems = parseItemsHtml(itemsHtml);
  const localItemsMap = buildLocalItemsMap(localItems);

  const serebiiFavoritesIndexHtml = await fetchHtml(SEREBII_FAVORITES_INDEX);
  const serebiiFavoritesMap = parseSerebiiFavoriteIndex(serebiiFavoritesIndexHtml);

  const report = {
    generatedAt: new Date().toISOString(),
    source: SEREBII_FAVORITES_INDEX,
    favoritesProcessed: [],
    unmatchedFavorites: [],
    totalScrapedNames: 0,
    totalMatchedNames: 0,
    totalUnmatchedNames: 0,
  };

  for (const favoriteName of favoriteOrder) {
    const normalizedFavorite = normalizeName(favoriteName);
    const favoriteInfo = serebiiFavoritesMap.get(normalizedFavorite);

    if (!favoriteInfo) {
      report.unmatchedFavorites.push(favoriteName);
      continue;
    }

    const pageUrl = `${SEREBII_BASE}${favoriteInfo.href}`;
    const favoritePageHtml = await fetchHtml(pageUrl);
    const scrapedNames = parseSerebiiFavoriteItems(favoritePageHtml);

    if (scrapedNames.length === 0) {
      throw new Error(
        `No item names parsed for ${favoriteName} at ${pageUrl}. Aborting to prevent empty overwrite.`,
      );
    }

    const matchedRecords = [];
    const unmatchedNames = [];

    for (const scrapedName of scrapedNames) {
      const normalizedItemName = normalizeName(scrapedName);
      const localMatches = localItemsMap.get(normalizedItemName);

      if (!localMatches || localMatches.length === 0) {
        unmatchedNames.push(scrapedName);
        continue;
      }

      // Use the first matched item's canonical name/description for markdown output.
      const canonical = localMatches[0];
      matchedRecords.push({
        name: canonical.name,
        description: canonical.description,
      });
    }

    const uniqueMatched = [];
    const seenMatched = new Set();
    matchedRecords.forEach((record) => {
      const key = normalizeName(record.name);
      if (!key || seenMatched.has(key)) return;
      seenMatched.add(key);
      uniqueMatched.push(record);
    });

    const markdown = toMarkdownTable(favoriteName, uniqueMatched);
    fs.writeFileSync(favoriteFilePath(favoriteName), markdown, 'utf8');

    report.favoritesProcessed.push({
      favorite: favoriteName,
      serebiiLabel: favoriteInfo.label,
      url: pageUrl,
      scrapedCount: scrapedNames.length,
      matchedCount: uniqueMatched.length,
      unmatchedCount: unmatchedNames.length,
      unmatchedNames,
    });

    report.totalScrapedNames += scrapedNames.length;
    report.totalMatchedNames += uniqueMatched.length;
    report.totalUnmatchedNames += unmatchedNames.length;

    console.log(
      `[sync] ${favoriteName}: scraped=${scrapedNames.length} matched=${uniqueMatched.length} unmatched=${unmatchedNames.length}`,
    );
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log('---');
  console.log(`Favorites processed: ${report.favoritesProcessed.length}/${favoriteOrder.length}`);
  console.log(`Total scraped item names: ${report.totalScrapedNames}`);
  console.log(`Total matched item names: ${report.totalMatchedNames}`);
  console.log(`Total unmatched item names: ${report.totalUnmatchedNames}`);
  console.log(`Report written: ${REPORT_PATH}`);

  if (report.unmatchedFavorites.length > 0) {
    console.warn(`Favorites missing from Serebii index: ${report.unmatchedFavorites.join(', ')}`);
  }
}

main().catch((error) => {
  console.error('[sync] failed:', error);
  process.exit(1);
});
