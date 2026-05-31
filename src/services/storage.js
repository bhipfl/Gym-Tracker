const CONFIG_KEY = 'gtracker_config'
const OFFLINE_QUEUE_KEY = 'gtracker_offline_queue'

export function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null')
  } catch {
    return null
  }
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function clearConfig() {
  localStorage.removeItem(CONFIG_KEY)
}

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

export function addToOfflineQueue(session) {
  const queue = getOfflineQueue()
  queue.push({ ...session, _queuedAt: Date.now() })
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

export function removeFromOfflineQueue(index) {
  const queue = getOfflineQueue()
  queue.splice(index, 1)
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY)
}
