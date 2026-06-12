import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

// Bei Änderungen an der Datenform der Queries hochzählen,
// damit der persistierte Cache verworfen wird.
export const CACHE_BUSTER = 'v2'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 7 * 24 * 3600_000,
      retry: 1,
    },
  },
})

export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'gtracker_cache',
})
