# Block Builder (Next.js + React + Tailwind)

This project has been migrated from static HTML/JS to a Next.js App Router app with React and Tailwind CSS.

## Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS v3
- Three.js (`three` + `OrbitControls`)
- Neon Postgres (`@neondatabase/serverless`)
- Simple cookie session auth (`bcryptjs` + `jose`)

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local` with:

```bash
DATABASE_URL=postgres://...
AUTH_SECRET=replace-with-a-long-random-string
```

## Vercel CLI Setup

```bash
vercel link --yes
vercel install neon --plan free_v3 -m region=iad1 --name block-builder-db
vercel env add AUTH_SECRET production --value "<long-random-secret>" --yes
vercel env add AUTH_SECRET development --value "<long-random-secret>" --yes
vercel env pull .env.local
vercel --prod
```

For preview envs, add `AUTH_SECRET` for your preview branch:

```bash
vercel env add AUTH_SECRET preview <your-branch> --value "<long-random-secret>" --yes
```

## Scripts

- `npm run dev` - local dev server (Turbopack)
- `npm run build` - production build
- `npm run start` - run built app
- `npm run lint` - ESLint

## Routes

- `/` - homepage
- `/builder` - 3D block builder (React + Three.js) with login + save
- `/items` - item browser page (loads `public/items.html`)
- `/pokemon-explorer` - searchable/filterable Pokemon explorer from the export kit

## Builder Save

- Login/signup is available on the **Builder** screen only.
- `SAVE BUILD` stores the current build state in Postgres table `saved_projects`.
- **My Saved Builds** in the Builder sidebar lets users refresh, load, and delete their own saved builds.
- Other app screens remain reference/database browsing only.

## Notes

- Static assets are served from `public/`.
- The original `index.html`, `scripts.js`, and `styles.css` are still present in the repo as legacy references.
