import { createFileRoute } from '@tanstack/react-router'
// Type-only: pulls in the Start module augmentation that adds the `server`
// route option. Erased at build time, but without it this file only compiles
// when some *other* module happens to import @tanstack/react-start.
import type {} from '@tanstack/react-start'
import {
  chat,
  chatParamsFromRequest,
  maxIterations,
  toServerSentEventsResponse,
} from '@tanstack/ai'
import { textAdapter, MODEL_OPTIONS } from '../ai/model'
import { focusReleaseDef, readOperatorContextDef } from '../ai/tools'
import { promoteRelease, searchReleases } from '../ai/server-tools'

const SYSTEM = `You are the release copilot for the Geel deploy console.

Ground every claim about deployments in the search_releases tool — never guess a
version, stage or error rate. When you single out one release, call
focus_release so the operator's console highlights it. Before quoting a wall
clock time, call read_operator_context.

Promotions run through promote_release, which pauses for human approval. Say
plainly what you are about to promote and why before you call it. If an
approval is declined, acknowledge it and stop — do not retry the same promotion.

Keep replies short and operational.`

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const abortController = new AbortController()

        // Parses and validates the AG-UI body. Throws a 400 `Response` on a
        // malformed payload, which Start returns to the client for us.
        const params = await chatParamsFromRequest(request)

        const stream = chat({
          adapter: textAdapter(),
          messages: params.messages,
          systemPrompts: [SYSTEM],
          // Server implementation + the bare definition of the tool the
          // browser owns. The model sees one flat tool list either way; where
          // a tool *runs* is an implementation detail of the definition.
          tools: [
            searchReleases,
            promoteRelease,
            focusReleaseDef,
            readOperatorContextDef,
          ],

          // Typed per model by the adapter — see src/ai/model.ts.
          modelOptions: MODEL_OPTIONS,

          // Approval resumption: the client posts the operator's decision back
          // on `resume`, correlated by these ids. Forwarding them is what makes
          // a paused run continue rather than start over.
          threadId: params.threadId,
          runId: params.runId,
          parentRunId: params.parentRunId,
          resume: params.resume,
          state: params.state,

          agentLoopStrategy: maxIterations(12),
          abortController,
        })

        return toServerSentEventsResponse(stream, { abortController })
      },
    },
  },
})
