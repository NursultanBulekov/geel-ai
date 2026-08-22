import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'

/**
 * Isomorphic tool definitions.
 *
 * These are the *contracts* only — no implementation, so this module is safe to
 * import from both the server route and the browser bundle. The server attaches
 * `.server()` implementations; a shared name and shared Zod schemas mean a
 * drift between the two sides is a type error rather than a runtime surprise.
 */

const releaseSchema = z.object({
  id: z.string(),
  service: z.string(),
  version: z.string(),
  stage: z.enum(['canary', 'staging', 'production']),
  status: z.enum(['healthy', 'degraded', 'rolled-back']),
  errorRate: z.number(),
  deployedAt: z.string(),
})

export type Release = z.infer<typeof releaseSchema>

/* ------------------------------------------------------------------ *
 * SERVER TOOL — reads the release ledger. The data lives on the server
 * and never ships to the browser, so only a `.server()` impl can answer.
 * ------------------------------------------------------------------ */
export const searchReleasesDef = toolDefinition({
  name: 'search_releases',
  description:
    'Search the release ledger. Use this before answering anything about ' +
    'what is deployed, its health, or its error rate.',
  inputSchema: z.object({
    service: z
      .string()
      .optional()
      .meta({ description: 'Filter by service name, e.g. "checkout"' }),
    stage: z
      .enum(['canary', 'staging', 'production'])
      .optional()
      .meta({ description: 'Filter by deployment stage' }),
    status: z
      .enum(['healthy', 'degraded', 'rolled-back'])
      .optional()
      .meta({ description: 'Filter by observed health status' }),
  }),
  outputSchema: z.object({
    releases: z.array(releaseSchema),
    matched: z.number(),
  }),
})
