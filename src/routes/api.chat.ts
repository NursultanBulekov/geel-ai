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
import { focusReleaseDef } from '../ai/tools'
import { searchReleases } from '../ai/server-tools'

const SYSTEM = `You are the release copilot for the Geel deploy console.

Ground every claim about deployments in the search_releases tool — never guess a
version, stage or error rate. When you single out one release, call
focus_release so the operator's console highlights it.

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
          tools: [searchReleases, focusReleaseDef],

          // Typed per model by the adapter — see src/ai/model.ts.
          modelOptions: MODEL_OPTIONS,
          threadId: params.threadId,

          agentLoopStrategy: maxIterations(12),
          abortController,
        })

        return toServerSentEventsResponse(stream, { abortController })
      },
    },
  },
})
