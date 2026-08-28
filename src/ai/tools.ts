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

/* ------------------------------------------------------------------ *
 * SERVER TOOL + APPROVAL — mutates production. `needsApproval: true`
 * pauses the agent loop and surfaces a bound interrupt on the client;
 * nothing runs until a human resolves it. `approvalSchema` makes the
 * approval itself carry typed data (the change-ticket the operator
 * signs off with), and the client may edit the arguments before
 * approving via `resolveInterrupt(true, { editedArgs })`.
 * ------------------------------------------------------------------ */
export const promoteReleaseDef = toolDefinition({
  name: 'promote_release',
  description:
    'Promote a release to the next stage (canary -> staging -> production). ' +
    'This mutates live infrastructure and always requires human approval.',
  inputSchema: z.object({
    releaseId: z.string().meta({ description: 'Release id, e.g. "rel-1042"' }),
    toStage: z
      .enum(['staging', 'production'])
      .meta({ description: 'Stage to promote into' }),
    reason: z
      .string()
      .meta({ description: 'Short justification recorded in the audit log' }),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    release: releaseSchema.nullable(),
    auditId: z.string(),
    note: z.string(),
  }),
  needsApproval: true,
  approvalSchema: {
    approve: z.object({
      changeTicket: z
        .string()
        .meta({ description: 'Change-management ticket authorising the push' }),
    }),
    reject: z.object({
      reason: z.string().meta({ description: 'Why the operator declined' }),
    }),
  },
})

/* ------------------------------------------------------------------ *
 * CLIENT TOOL — drives the UI. Runs in the browser because the thing it
 * changes (which card is focused) only exists there.
 * ------------------------------------------------------------------ */
export const focusReleaseDef = toolDefinition({
  name: 'focus_release',
  description:
    'Highlight a release in the operator console so the human can see the ' +
    'one being discussed. Call it whenever you single out a release.',
  inputSchema: z.object({
    releaseId: z.string().meta({ description: 'Release id to highlight' }),
    note: z
      .string()
      .optional()
      .meta({ description: 'Short caption shown beside the highlight' }),
  }),
  outputSchema: z.object({ focused: z.boolean() }),
})

/* ------------------------------------------------------------------ *
 * CLIENT TOOL — reads browser-only context. The server genuinely cannot
 * answer this one, which is the whole point of an isomorphic tool system.
 * ------------------------------------------------------------------ */
export const readOperatorContextDef = toolDefinition({
  name: 'read_operator_context',
  description:
    "Read the operator's local browser context (timezone, locale, theme, " +
    'viewport). Use it before quoting times or suggesting a layout.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    timezone: z.string(),
    locale: z.string(),
    localTime: z.string(),
    theme: z.enum(['light', 'dark']),
    viewport: z.string(),
  }),
})

/** Definitions the model is told about, in the order they are advertised. */
export const toolDefinitions = [
  searchReleasesDef,
  promoteReleaseDef,
  focusReleaseDef,
  readOperatorContextDef,
] as const
