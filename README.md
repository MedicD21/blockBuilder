# Block Builder (Next.js + React + Tailwind)

This project has been migrated from static HTML/JS to a Next.js App Router app with React and Tailwind CSS.

## Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS v3
- Three.js (`three` + `OrbitControls`)

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` - local dev server (Turbopack)
- `npm run build` - production build
- `npm run start` - run built app
- `npm run lint` - ESLint

## Routes

- `/` - 3D block builder (React + Three.js)
- `/items` - item browser page (loads `public/items.html`)
- `/pokemon-explorer` - searchable/filterable Pokemon explorer from the export kit

## Notes

- Static assets are served from `public/`.
- The original `index.html`, `scripts.js`, and `styles.css` are still present in the repo as legacy references.
