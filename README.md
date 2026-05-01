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

For Vercel deployment:

1. Add a **Neon Postgres** integration from the Vercel marketplace.
2. Confirm `DATABASE_URL` is set in your Vercel project env vars.
3. Add `AUTH_SECRET` (long random string) in Vercel env vars.

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
- Other app screens remain reference/database browsing only.

## Notes

- Static assets are served from `public/`.
- The original `index.html`, `scripts.js`, and `styles.css` are still present in the repo as legacy references.
