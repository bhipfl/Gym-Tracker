#!/usr/bin/env node
/**
 * Baut die gebündelte Übungsdatenbank aus der wger-API (https://wger.de).
 *
 * Lädt alle Übungen mit deutschem Namen und mindestens einem Bild,
 * speichert die Bilder nach public/exercise-images/ (WebP, wenn `sharp`
 * installiert ist, sonst Originalformat) und schreibt den Index nach
 * src/data/exercises.de.json.
 *
 * Ausführen (einmalig / bei Bedarf aktualisieren):
 *   node scripts/build-exercise-db.mjs
 *
 * Lizenz der Inhalte: CC-BY-SA 4.0 (Attribution wird pro Übung gespeichert
 * und in der App angezeigt).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const IMG_DIR = path.join(ROOT, 'public', 'exercise-images')
const JSON_PATH = path.join(ROOT, 'src', 'data', 'exercises.de.json')

const API = 'https://wger.de/api/v2'
const GERMAN = 1 // wger language id für Deutsch
const THROTTLE_MS = 350 // wger ist ein kleines Non-Profit — Requests drosseln

// Englische Kategorienamen der wger-API → deutsche Muskelgruppen
const CATEGORY_DE = {
  Abs: 'Bauch',
  Arms: 'Arme',
  Back: 'Rücken',
  Calves: 'Waden',
  Cardio: 'Cardio',
  Chest: 'Brust',
  Legs: 'Beine',
  Shoulders: 'Schultern',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} für ${url}`)
  return res.json()
}

async function fetchAllExerciseInfo() {
  const all = []
  let url = `${API}/exerciseinfo/?format=json&limit=50`
  while (url) {
    const page = await fetchJson(url)
    all.push(...page.results)
    url = page.next
    process.stdout.write(`\r${all.length} Übungen geladen...`)
    await sleep(THROTTLE_MS)
  }
  console.log()
  return all
}

let sharp = null
try {
  sharp = (await import('sharp')).default
} catch {
  console.warn('Hinweis: `sharp` nicht installiert — Bilder werden unverändert gespeichert.')
  console.warn('Für kleinere WebP-Bilder: npm i -D sharp && erneut ausführen.\n')
}

async function downloadImage(url, wgerId) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Bild-Download fehlgeschlagen (${res.status}): ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (sharp) {
    const out = path.join(IMG_DIR, `${wgerId}.webp`)
    await sharp(buf).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out)
    return `exercise-images/${wgerId}.webp`
  }
  const ext = path.extname(new URL(url).pathname) || '.jpg'
  const out = path.join(IMG_DIR, `${wgerId}${ext}`)
  await writeFile(out, buf)
  return `exercise-images/${wgerId}${ext}`
}

async function main() {
  await mkdir(IMG_DIR, { recursive: true })
  await mkdir(path.dirname(JSON_PATH), { recursive: true })

  console.log('Lade Übungskatalog von wger.de ...')
  const infos = await fetchAllExerciseInfo()

  const entries = []
  let skippedNoGerman = 0
  let skippedNoImage = 0

  for (const info of infos) {
    const de = (info.translations || []).find((t) => t.language === GERMAN && t.name?.trim())
    if (!de) { skippedNoGerman++; continue }

    const images = info.images || []
    const main = images.find((i) => i.is_main) || images[0]
    if (!main?.image) { skippedNoImage++; continue }

    let imagePath
    try {
      imagePath = await downloadImage(main.image, info.id)
      await sleep(THROTTLE_MS)
    } catch (e) {
      console.warn(`  Übersprungen (${de.name}): ${e.message}`)
      continue
    }

    entries.push({
      id: info.id,
      name: de.name.trim(),
      aliases: (de.aliases || []).map((a) => (typeof a === 'string' ? a : a.alias)).filter(Boolean),
      muscle: CATEGORY_DE[info.category?.name] || info.category?.name || '',
      image: imagePath,
      author: main.license_author || info.license_author || 'wger.de',
      license: 'CC-BY-SA 4.0',
      sourceUrl: `https://wger.de/de/exercise/${info.id}/view/`,
    })
    process.stdout.write(`\r${entries.length} Übungen mit Bild übernommen...`)
  }
  console.log()

  entries.sort((a, b) => a.name.localeCompare(b.name, 'de'))
  await writeFile(JSON_PATH, JSON.stringify(entries, null, 1))

  console.log(`\nFertig: ${entries.length} Übungen → ${path.relative(ROOT, JSON_PATH)}`)
  console.log(`Übersprungen: ${skippedNoGerman} ohne deutschen Namen, ${skippedNoImage} ohne Bild.`)
}

main().catch((e) => {
  console.error('\nFehler:', e.message)
  process.exit(1)
})
