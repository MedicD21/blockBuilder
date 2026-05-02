import itemsDataset from '../data/items-dataset.json';

function validateDatasetShape(dataset) {
  return Boolean(
    dataset &&
      typeof dataset === 'object' &&
      Array.isArray(dataset.sections) &&
      Array.isArray(dataset.favoriteTypes) &&
      typeof dataset.totalItems === 'number' &&
      typeof dataset.totalSections === 'number',
  );
}

export function getItemsDataset() {
  if (!validateDatasetShape(itemsDataset)) {
    throw new Error(
      'Invalid prebuilt items dataset. Run `npm run build:items-dataset` and try again.',
    );
  }

  return itemsDataset;
}
