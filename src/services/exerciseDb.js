// Lokale wger-Übungsdatenbank (gebündelt via scripts/build-exercise-db.mjs).
// Wird lazy als eigener Chunk geladen, damit der Entry-Bundle klein bleibt.

let dbPromise = null
let index = null

export function loadExerciseDb() {
  if (!dbPromise) {
    dbPromise = import('../data/exercises.de.json')
      .then((m) => m.default || [])
      .catch(() => [])
  }
  return dbPromise
}

export function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
}

async function getIndex() {
  if (index) return index
  const db = await loadExerciseDb()
  index = new Map()
  for (const ex of db) {
    index.set(normalizeName(ex.name), ex)
    for (const alias of ex.aliases || []) {
      const key = normalizeName(alias)
      if (!index.has(key)) index.set(key, ex)
    }
  }
  return index
}

/** Exakter Treffer (inkl. Aliases) für einen Übungsnamen, sonst null. */
export async function findExercise(name) {
  const idx = await getIndex()
  return idx.get(normalizeName(name)) || null
}

/** Substring-Suche über Namen + Aliases. */
export async function searchLocal(query, limit = 10) {
  const q = normalizeName(query)
  if (!q) return []
  const db = await loadExerciseDb()
  const results = []
  for (const ex of db) {
    const haystack = [ex.name, ...(ex.aliases || [])].map(normalizeName)
    if (haystack.some((h) => h.includes(q))) {
      results.push(ex)
      if (results.length >= limit) break
    }
  }
  return results
}
