import fs from 'node:fs';
import path from 'node:path';

const ITEMS_HTML_PATH = path.join(process.cwd(), 'public', 'items.html');
const FAVORITES_INDEX_PATH = path.join(
  process.cwd(),
  'public',
  'references',
  'Items By Favorite.md',
);
const FAVORITES_DIR_PATH = path.join(
  process.cwd(),
  'public',
  'references',
  'Items By Favorite',
);

let cachedDataset = null;

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
    .replace(/&nbsp;/g, ' ');
}

function stripTags(input) {
  return input.replace(/<[^>]+>/g, ' ');
}

function cleanText(input) {
  return decodeHtmlEntities(stripTags(input || ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueStrings(input) {
  const seen = new Set();
  const unique = [];

  input.forEach((value) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    unique.push(value);
  });

  return unique;
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

function parseFavoriteItemNames(markdown) {
  const rows = parseMarkdownRows(markdown);
  const names = [];

  rows.forEach((columns) => {
    const [nameCell] = columns;
    if (!nameCell) return;
    if (nameCell.toLowerCase() === 'name') return;
    if (/^-+$/.test(nameCell.replace(/\s+/g, ''))) return;

    names.push(decodeHtmlEntities(nameCell));
  });

  return names;
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
  const sections = [];

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
    const items = [];

    for (const rowMatch of rowSource.matchAll(rowRegex)) {
      const rowHtml = rowMatch[1] || '';

      const name = cleanText(extractCellHtml(rowHtml, 'name-cell'));
      if (!name) continue;

      const description = cleanText(extractCellHtml(rowHtml, 'desc-cell'));
      const tagText = cleanText(extractCellHtml(rowHtml, 'tag-cell'));

      const locHtml = extractCellHtml(rowHtml, 'loc-cell');
      const locations = Array.from(
        locHtml.matchAll(/<div\s+class=["']loc["'][^>]*>([\s\S]*?)<\/div>/gi),
      )
        .map((locMatch) => cleanText(locMatch[1]))
        .filter(Boolean);

      if (locations.length === 0) {
        const locFallback = cleanText(locHtml);
        if (locFallback) locations.push(locFallback);
      }

      const uniqueLocations = uniqueStrings(locations);

      const imageMatch = rowHtml.match(
        /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/i,
      );

      const imageSrc = imageMatch ? decodeHtmlEntities(imageMatch[1]) : '';
      const imageAlt = imageMatch ? decodeHtmlEntities(imageMatch[2]) : name;
      const slug = normalizeName(name);

      items.push({
        id: `${sectionId}-${slug || items.length + 1}`,
        name,
        slug,
        description,
        tagText,
        locations: uniqueLocations,
        imageSrc,
        imageAlt,
        sectionId,
        sectionTitle,
        favorites: [],
      });
    }

    sections.push({
      id: sectionId,
      title: sectionTitle,
      items,
    });
  }

  return sections;
}

function attachFavoriteTags(sections, favoriteOrder) {
  const itemLookup = new Map();
  const unmatched = [];

  sections.forEach((section) => {
    section.items.forEach((item) => {
      if (!item.slug) return;
      if (!itemLookup.has(item.slug)) {
        itemLookup.set(item.slug, []);
      }
      itemLookup.get(item.slug).push(item);
    });
  });

  const favoriteFiles = fs
    .readdirSync(FAVORITES_DIR_PATH)
    .filter((file) => file.toLowerCase().endsWith('.md'));

  const favoriteNames = new Set(favoriteOrder);

  favoriteFiles.forEach((fileName) => {
    const favoriteType = decodeHtmlEntities(
      fileName.replace(/\.md$/i, '').trim(),
    );
    favoriteNames.add(favoriteType);

    const filePath = path.join(FAVORITES_DIR_PATH, fileName);
    const markdown = fs.readFileSync(filePath, 'utf8');
    const itemNames = parseFavoriteItemNames(markdown);

    itemNames.forEach((itemName) => {
      const normalized = normalizeName(itemName);
      if (!normalized) return;

      const linkedItems = itemLookup.get(normalized);
      if (!linkedItems || linkedItems.length === 0) {
        unmatched.push({ favoriteType, itemName });
        return;
      }

      linkedItems.forEach((item) => {
        item.favorites.push(favoriteType);
      });
    });
  });

  sections.forEach((section) => {
    section.items.forEach((item) => {
      item.favorites = Array.from(new Set(item.favorites)).sort((a, b) =>
        a.localeCompare(b),
      );
    });
  });

  return {
    favoriteTypes: Array.from(favoriteNames),
    unmatched,
  };
}

function sortFavoriteTypes(favoriteTypes, preferredOrder) {
  const orderIndex = new Map(preferredOrder.map((name, idx) => [name, idx]));
  return favoriteTypes.sort((a, b) => {
    const aIndex = orderIndex.has(a) ? orderIndex.get(a) : Number.MAX_SAFE_INTEGER;
    const bIndex = orderIndex.has(b) ? orderIndex.get(b) : Number.MAX_SAFE_INTEGER;

    if (aIndex === bIndex) return a.localeCompare(b);
    return aIndex - bIndex;
  });
}

export function getItemsDataset() {
  if (cachedDataset) return cachedDataset;

  const itemsHtml = fs.readFileSync(ITEMS_HTML_PATH, 'utf8');
  const favoritesIndex = fs.readFileSync(FAVORITES_INDEX_PATH, 'utf8');

  const sections = parseItemsHtml(itemsHtml);
  const favoriteOrder = parseFavoriteOrder(favoritesIndex);
  const { favoriteTypes, unmatched } = attachFavoriteTags(sections, favoriteOrder);

  const items = sections.flatMap((section) => section.items);
  const sortedFavorites = sortFavoriteTypes(favoriteTypes, favoriteOrder);

  cachedDataset = {
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    totalSections: sections.length,
    favoriteTypes: sortedFavorites,
    sections,
    unmatchedFavoriteReferences: unmatched,
  };

  return cachedDataset;
}
