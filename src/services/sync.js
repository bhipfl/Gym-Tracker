import { getOfflineQueue } from './storage.js'
import { saveSession } from './api.js'

export async function syncOfflineQueue() {
  if (!navigator.onLine) return { synced: 0, failed: 0 }
  const queue = getOfflineQueue()
  if (!queue.length) return { synced: 0, failed: 0 }

  let synced = 0
  const remaining = []

  for (const item of queue) {
    try {
      const { _queuedAt, ...session } = item
      await saveSession(session)
      synced++
    } catch (err) {
      // TypeError = network failure → keep in queue
      // Other errors (auth, API) → discard (user needs to fix config)
      if (err instanceof TypeError) remaining.push(item)
    }
  }

  localStorage.setItem('gtracker_offline_queue', JSON.stringify(remaining))
  return { synced, failed: remaining.length }
}
