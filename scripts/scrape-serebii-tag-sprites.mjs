import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SEREBII_BASE = 'https://serebii.net';
const SEREBII_ITEMS_URL = `${SEREBII_BASE}/pokemonpokopia/items.shtml`;
const OUTPUT_DIR = path.join(ROOT, 'public', 'images', 'tags');
const OUTPUT_MAP_PATH = path.join(ROOT, 'data', 'serebii-tag-sprites.json');

function decodeHtmlEntities(input) {
  if (!input) return '';

  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function normalizeLabel(input) {
  return decodeHtmlEntities(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function toCategoryFileName(label, srcPath) {
  const normalized = normalizeLabel(label);
  const extMatch = srcPath.match(/\.[a-z0-9]+$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : '.png';
  return `${normalized || 'tag'}${ext}`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function parseTagSprites(itemsHtml) {
  const tagCellRegex =
    /<td\s+class=["']fooinfo["']>\s*<a\s+href=["']items\/[^"']+["']>([\s\S]*?)<\/a>\s*<\/td>/gi;
  const spritesByLabel = new Map();

  for (const match of itemsHtml.matchAll(tagCellRegex)) {
    const anchorHtml = match[1] || '';
    const imgMatch = anchorHtml.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
    if (!imgMatch) continue;

    const rawLabel = anchorHtml
      .replace(/<img[^>]*>/gi, ' ')
      .replace(/<br\s*\/?\s*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const label = decodeHtmlEntities(rawLabel);
    if (!label) continue;

    const normalized = normalizeLabel(label);
    if (!normalized || spritesByLabel.has(normalized)) continue;

    spritesByLabel.set(normalized, {
      label,
      srcPath: imgMatch[1],
    });
  }

  return Array.from(spritesByLabel.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const itemsHtml = await fetchText(SEREBII_ITEMS_URL);
  const tagSprites = parseTagSprites(itemsHtml);

  if (tagSprites.length === 0) {
    throw new Error('No tag sprites were parsed from the Serebii items page.');
  }

  const mapping = {};
  let savedCount = 0;

  for (const sprite of tagSprites) {
    const imageUrl = sprite.srcPath.startsWith('http')
      ? sprite.srcPath
      : `${SEREBII_BASE}/pokemonpokopia/${sprite.srcPath.replace(/^\/+/, '')}`;

    const fileName = toCategoryFileName(sprite.label, sprite.srcPath);
    const outputPath = path.join(OUTPUT_DIR, fileName);

    try {
      const imageBuffer = await fetchBuffer(imageUrl);
      await fs.writeFile(outputPath, imageBuffer);

      mapping[sprite.label] = `/images/tags/${fileName}`;
      savedCount += 1;
      console.log(`[sync] ${sprite.label} -> ${mapping[sprite.label]}`);
    } catch (error) {
      console.warn(`[warn] Skipping ${sprite.label}: ${error.message}`);
    }
  }

  if (savedCount === 0) {
    throw new Error('No tag sprite images were downloaded successfully.');
  }

  const sortedMapping = Object.fromEntries(
    Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b)),
  );
  await fs.writeFile(OUTPUT_MAP_PATH, `${JSON.stringify(sortedMapping, null, 2)}\n`, 'utf8');

  console.log(`[done] Wrote ${Object.keys(sortedMapping).length} tag sprites to ${OUTPUT_DIR}`);
  console.log(`[done] Wrote tag sprite map to ${OUTPUT_MAP_PATH}`);
}

main().catch((error) => {
  console.error('[error] Failed to sync Serebii tag sprites');
  console.error(error);
  process.exitCode = 1;
});
