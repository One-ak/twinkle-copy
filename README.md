# Entering Our Universe

A cinematic romantic memory universe built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, GSAP, Three.js, React Three Fiber, Lenis, and a Supabase-ready realtime data layer.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Personalize

Edit names, dates, poem lines, memories, reminders, and seed chat in `src/data/universe.ts`.

The site expects the requested song, "Ajj Din Chadheya", here:

```text
public/audio/din-chadheya.mp3
```

The app serves it through `/api/audio/din-chadheya` so the music analyser can reliably start the track in development and production. If that file is absent, the music orb falls back to a subtle generated ambient pad so the analyser-driven glow still works.

## Supabase

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_LOVE_SITE_ID=twinkle-universe
```

Apply `supabase/schema.sql` in your Supabase SQL editor, insert one row into `love_sites`, and add authenticated users to `love_site_members`. The app works locally with `localStorage` until Supabase is connected.
