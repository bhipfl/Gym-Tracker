# Supabase-Setup (Coach-Plattform)

Die App nutzt Supabase für Auth (E-Mail/Passwort), Postgres mit Row Level Security und Storage für Übungsbilder. Einrichtung dauert ~15 Minuten.

## 1. Projekt anlegen

1. [supabase.com](https://supabase.com) → neues Projekt (Region z.B. `eu-central-1`).
2. **SQL Editor** → Inhalt von [`schema.sql`](schema.sql) einfügen und ausführen. Das legt alle Tabellen, RLS-Policies, den Einladungs-RPC und den Storage-Bucket an.
3. **Authentication → Sign In / Up**: E-Mail-Provider aktiviert lassen. Empfehlung für den Start: **"Confirm email" deaktivieren** (sonst brauchen Einladungslinks einen E-Mail-Bestätigungs-Roundtrip).
4. **Authentication → URL Configuration**: `https://bhipfl.github.io/Gym-Tracker/` als Site URL + Redirect URL eintragen.

## 2. App verbinden

Aus **Project Settings → API** kopieren:

| Wert | Wohin |
|---|---|
| Project URL | `VITE_SUPABASE_URL` |
| `anon` public key | `VITE_SUPABASE_ANON_KEY` |

- **Lokal:** `.env.local` im Projektroot anlegen (ist gitignored):
  ```
  VITE_SUPABASE_URL=https://xyz.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  ```
- **Deployment:** Im GitHub-Repo unter *Settings → Secrets and variables → Actions* dieselben zwei Werte als Secrets anlegen. Der Workflow (`.github/workflows/deploy.yml`) liest sie beim Build.

Der anon-Key ist by design öffentlich — die Security-Grenze ist Row Level Security in der Datenbank.

## 3. Übungsdatenbank seeden (einmalig)

Benötigt den **Service-Role-Key** (Project Settings → API) — nur lokal verwenden, nie committen oder in den Client einbauen:

```bash
node scripts/build-exercise-db.mjs        # wger-Übungen + Bilder lokal laden
SUPABASE_URL=https://xyz.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/seed-wger.mjs                # in Supabase hochladen
```

## 4. Bestehende Daten aus Google Sheets migrieren (optional, einmalig)

1. Coach-Account in der App registrieren, dann die User-UUID aus *Authentication → Users* kopieren.
2. Im Google Sheet jeden Tab als CSV herunterladen (`Plans.csv`, `Exercises.csv`, `Plan_Exercises.csv`, `Sessions.csv`, `Sets.csv`).
3. ```bash
   SUPABASE_URL=https://xyz.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=... \
   TARGET_USER_ID=<coach-uuid> \
   node scripts/migrate-sheets.mjs ./pfad/zu/csvs
   ```
4. In der App prüfen: Verlauf vollständig, Fortschritts-Chart einer bekannten Übung korrekt, „letzte Gewichte" beim Trainingsstart vorhanden.

## Rollenmodell

- **Coach**: registriert sich frei über `/register`. Sieht eigene Templates unter „Pläne", verwaltet Klienten unter „Klienten", führt pro Klient die Akte (Notizen, nur für den Coach sichtbar), weist Pläne als Kopie zu und sieht Trainings/Fortschritt der Klienten (read-only).
- **Klient**: kommt nur über einen Einladungslink (`/#/invite/<code>`, 14 Tage gültig) ins System. Sieht zugewiesene Pläne, trackt Trainings, sieht eigenen Fortschritt.

## Sicherheits-Verifikation (nach dem Setup empfohlen)

Mit drei Test-Accounts (Coach A, Coach B, Klient C von A) prüfen:

- C sieht nur eigene Sessions/Pläne.
- A sieht C's Trainings **read-only** und nur eigene Notizen.
- B sieht nichts von A oder C.
- Abgelaufener oder bereits genutzter Einladungscode wird abgelehnt.
