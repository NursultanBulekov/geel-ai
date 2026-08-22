import { searchReleasesDef } from './tools'
import type { Release } from './tools'

/**
 * Server-only state. Deliberately a module-level array so the demo has no
 * database dependency — swap it for your own store and the tool contract in
 * `tools.ts` does not change.
 */
const ledger: Array<Release> = [
  {
    id: 'rel-1042',
    service: 'checkout',
    version: '4.12.0',
    stage: 'canary',
    status: 'healthy',
    errorRate: 0.04,
    deployedAt: '2026-09-02T14:20:00Z',
  },
  {
    id: 'rel-1041',
    service: 'checkout',
    version: '4.11.3',
    stage: 'production',
    status: 'healthy',
    errorRate: 0.02,
    deployedAt: '2026-08-29T09:10:00Z',
  },
  {
    id: 'rel-1039',
    service: 'search',
    version: '2.8.1',
    stage: 'staging',
    status: 'degraded',
    errorRate: 1.87,
    deployedAt: '2026-09-01T22:05:00Z',
  },
  {
    id: 'rel-1036',
    service: 'search',
    version: '2.7.9',
    stage: 'production',
    status: 'healthy',
    errorRate: 0.11,
    deployedAt: '2026-08-24T11:40:00Z',
  },
  {
    id: 'rel-1030',
    service: 'billing',
    version: '9.2.0',
    stage: 'canary',
    status: 'rolled-back',
    errorRate: 6.4,
    deployedAt: '2026-08-30T17:55:00Z',
  },
  {
    id: 'rel-1028',
    service: 'billing',
    version: '9.1.4',
    stage: 'production',
    status: 'healthy',
    errorRate: 0.07,
    deployedAt: '2026-08-18T08:30:00Z',
  },
]

/** Read model for the page's initial render (server-rendered via a loader). */
export function listReleases(): Array<Release> {
  return ledger.map((release) => ({ ...release }))
}

export const searchReleases = searchReleasesDef.server(
  async ({ service, stage, status }) => {
    const releases = ledger.filter(
      (release) =>
        (!service ||
          release.service.toLowerCase().includes(service.toLowerCase())) &&
        (!stage || release.stage === stage) &&
        (!status || release.status === status),
    )
    return { releases: releases.map((r) => ({ ...r })), matched: releases.length }
  },
)
