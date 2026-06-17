import api from '../lib/api'

export interface SyncVersionResponse {
  version: number
  checked_at: string
}

export const syncService = {
  version: () =>
    api
      .get('/api/sync/version', { params: { _ts: Date.now() } })
      .then(response => response.data as SyncVersionResponse),
}
