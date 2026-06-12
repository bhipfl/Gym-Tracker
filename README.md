# Gym Tracker PWA — Coach-Plattform

Progressive Web App für Personal Coaches und ihre Klienten:

- **Coach**: verwaltet Klienten, legt Trainingspläne (Templates) an, weist sie Klienten zu, führt pro Klient eine **Akte** mit Notizen und sieht Trainings & Fortschritt (read-only).
- **Klient**: kommt per Einladungslink, trackt Trainings (Sätze, Gewichte, Wdh.) mit Pausen-Timer, Übungsbildern und Fortschritts-Charts — offlinefähig.

Backend: **Supabase** (Postgres + Auth + Row Level Security + Storage). Setup: [`supabase/README.md`](supabase/README.md).

## Entwicklung

```bash
npm install
# .env.local mit VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY anlegen (siehe supabase/README.md)
npm run dev      # Dev-Server
npm run build    # Production-Build nach dist/
npm run preview  # Build lokal testen
```

## Übungsbilder (wger)

Die App zeigt Übungsbilder aus der offenen [wger](https://wger.de)-Übungsdatenbank (deutsche Namen, Lizenz **CC-BY-SA 4.0**, Attribution wird pro Bild in der App angezeigt). Die Daten werden gebündelt, nicht zur Laufzeit abgerufen:

```bash
npm i -D sharp                          # optional, für kleine WebP-Bilder
node scripts/build-exercise-db.mjs      # lädt Übungen + Bilder von wger.de
```

Das Skript schreibt `src/data/exercises.de.json` und `public/exercise-images/` — beides committen, damit die Bilder mit deployt werden. Ohne diesen Schritt läuft die App normal, nur ohne Bilder.

## Backend einrichten

Siehe [`supabase/README.md`](supabase/README.md) — Supabase-Projekt anlegen, [`supabase/schema.sql`](supabase/schema.sql) ausführen, Env-Variablen setzen. Bestehende Google-Sheets-Daten lassen sich einmalig mit `scripts/migrate-sheets.mjs` migrieren (das alte Apps-Script-Backend liegt als Referenz weiter unter `apps-script/`).

## Deployment (GitHub Pages)

Bei jedem Push auf `claude/gym-tracking-pwa-DUPW5` baut [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) die App und deployed sie auf GitHub Pages.

Live-URL: **https://bhipfl.github.io/Gym-Tracker/**

**Voraussetzungen / Hinweise:**

1. **Pages-Quelle**: In `Settings → Pages` muss als Source **„GitHub Actions"** ausgewählt sein. Der Workflow versucht dies automatisch zu aktivieren (`enablement: true`).
2. **Privates Repo**: GitHub Pages auf privaten Repos erfordert einen kostenpflichtigen Plan (Pro/Team/Enterprise). Auf einem Free-Account muss das Repo **öffentlich** sein, damit Pages funktioniert.
3. **Routing**: Die App nutzt `HashRouter` (URLs mit `/#/`), damit Deep-Links und Reloads auf GitHub Pages ohne Server-Rewrites funktionieren.
4. **Base-Pfad**: In `vite.config.js` ist `base: '/Gym-Tracker/'` gesetzt — passend zum Repo-Namen. Bei Umbenennung des Repos muss dieser Wert angepasst werden.

## Tech Stack

React 18 · Vite · TanStack Query (persistierter Cache) · vite-plugin-pwa (Workbox) · React Router · Supabase (Postgres, Auth, RLS, Storage) · wger-Übungsdatenbank
