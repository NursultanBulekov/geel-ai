import { createServerFn } from '@tanstack/react-start'
import { listReleases } from './server-tools'

/** Server boundary for the ledger — the data never ships to the browser. */
export const getReleases = createServerFn().handler(async () => listReleases())
