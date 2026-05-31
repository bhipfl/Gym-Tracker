# Google Apps Script Setup

## 1. Google Sheet erstellen

1. Gehe zu [sheets.google.com](https://sheets.google.com) und erstelle ein neues Spreadsheet.
2. Kopiere die **Spreadsheet-ID** aus der URL: `https://docs.google.com/spreadsheets/d/`**`DEINE_ID`**`/edit`

## 2. Apps Script erstellen

1. Im Spreadsheet: **Erweiterungen → Apps Script**
2. Lösche den vorhandenen Code und füge den Inhalt von `Code.gs` ein.
3. Speichern (Ctrl+S)

## 3. Script Properties setzen

1. Im Apps Script Editor: **Projekteinstellungen** (Zahnrad-Icon links)
2. Runterscrollen zu **Skript-Eigenschaften** → **Skript-Eigenschaft hinzufügen**
3. Füge folgende Properties hinzu:

| Schlüssel | Wert |
|---|---|
| `SPREADSHEET_ID` | Deine Spreadsheet-ID aus Schritt 1 |
| `TOKEN` | Ein selbst gewähltes Passwort/Token (z.B. `MeinGeheimesToken123`) |

## 4. Als Web App deployen

1. Oben rechts: **Deployen → Neue Implementierung**
2. Typ: **Web App**
3. Einstellungen:
   - **Ausführen als**: Ich (Me)
   - **Zugriff**: Jeder (Anyone)
4. **Deployen** klicken
5. Du erhältst eine **Web-App-URL** – diese brauchst du in der App

## 5. Gym Tracker App einrichten

1. Öffne die Gym Tracker App
2. Gehe zu **Einstellungen** (Zahnrad-Icon)
3. Trage ein:
   - **Apps Script URL**: Die URL aus Schritt 4
   - **Token**: Das Token aus Schritt 3
4. **Verbindung testen** – es sollte "Verbindung erfolgreich!" erscheinen

## Hinweise

- Beim ersten Zugriff erstellt das Script automatisch alle benötigten Sheets (Plans, Exercises, Plan_Exercises, Sessions, Sets)
- Wenn du den Code änderst, musst du **neu deployen** (neue Version erstellen)
- Die App-URL ändert sich bei einer neuen Implementierung – verwende **Bestehende Implementierung bearbeiten** um die URL zu behalten
