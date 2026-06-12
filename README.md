# Gym Tracker PWA

Progressive Web App zum Tracken von Trainingsplänen, Übungen, Sätzen, Gewichten und Wiederholungen — mit Fortschritts-Charts und kopierbarem Klartext-Export für den Google Health Coach. Backend: Google Sheets via Apps Script.

## Entwicklung

```bash
npm install
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

Siehe [`apps-script/README.md`](apps-script/README.md) — Google Sheet + Apps Script anlegen, als Web App deployen, dann URL + Token in der App unter **Einstellungen** eingeben. Keine Credentials liegen im Code; sie werden nur im `localStorage` des Browsers gespeichert.

## Deployment (GitHub Pages)

Bei jedem Push auf `claude/gym-tracking-pwa-DUPW5` baut [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) die App und deployed sie auf GitHub Pages.

Live-URL: **https://bhipfl.github.io/Gym-Tracker/**

**Voraussetzungen / Hinweise:**

1. **Pages-Quelle**: In `Settings → Pages` muss als Source **„GitHub Actions"** ausgewählt sein. Der Workflow versucht dies automatisch zu aktivieren (`enablement: true`).
2. **Privates Repo**: GitHub Pages auf privaten Repos erfordert einen kostenpflichtigen Plan (Pro/Team/Enterprise). Auf einem Free-Account muss das Repo **öffentlich** sein, damit Pages funktioniert.
3. **Routing**: Die App nutzt `HashRouter` (URLs mit `/#/`), damit Deep-Links und Reloads auf GitHub Pages ohne Server-Rewrites funktionieren.
4. **Base-Pfad**: In `vite.config.js` ist `base: '/Gym-Tracker/'` gesetzt — passend zum Repo-Namen. Bei Umbenennung des Repos muss dieser Wert angepasst werden.

## Tech Stack

React 18 · Vite · vite-plugin-pwa (Workbox) · React Router · Google Apps Script + Google Sheets
