# Pokemon Explorer Next.js Export Kit

This folder contains everything needed to move the Pokemon Explorer section (search + filters + cards) into another Next.js app.

## Included

- `src/components/pokemon-explorer.tsx`
- `src/types/pokemon.ts`
- `data/pokemon-data.json`
- `next.config.images.example.ts`
- `src/app/page.example.tsx`

## Target Requirements

- Next.js App Router project
- Tailwind CSS enabled
- TypeScript enabled (recommended)

## Install Steps In Your New Project

1. Copy this folder's files into your target app:
   - Copy `src/components/pokemon-explorer.tsx` to your app `src/components/`
   - Copy `src/types/pokemon.ts` to your app `src/types/`
   - Copy `data/pokemon-data.json` to your app data folder (for example `data/generated/`)
2. Merge image host config from `next.config.images.example.ts` into your target `next.config.ts`.
3. Add a page based on `src/app/page.example.tsx`.
4. Start your app and confirm images and filters load.

## Notes

- The component is a client component and keeps all search/filter state internally.
- The import in the component is alias-free (`../types/pokemon`) so it works without `@/*` path aliases.
- If your project already uses a path alias, you can switch the import back to your alias style.
