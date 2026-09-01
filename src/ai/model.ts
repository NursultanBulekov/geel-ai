import type {
  AnthropicChatModelToolCapabilitiesByName,
  AnthropicModelInputModalitiesByName,
} from '@tanstack/ai-anthropic'

/**
 * The single place the provider is named. Everything downstream — the typed
 * `modelOptions` union, the input modalities the UI is allowed to offer, the
 * provider-hosted tools we are allowed to attach — is derived from this
 * literal by the adapter's own types. Change the literal and the compiler
 * re-checks every claim this file makes.
 */
export const MODEL = 'claude-opus-5' as const
export type Model = typeof MODEL

/**
 * Input modalities, read off the adapter's type map rather than asserted here.
 * `satisfies` means an adapter upgrade that drops a modality breaks the build
 * instead of leaving the UI advertising an attachment button that 400s.
 */
export const INPUT_MODALITIES = [
  'text',
  'image',
  'document',
] as const satisfies AnthropicModelInputModalitiesByName[Model]

/**
 * Provider-hosted tools this model supports (web_search, code_execution, ...).
 * For `claude-opus-5` the adapter types this as the empty tuple, so this app
 * attaches none — only the user-defined isomorphic tools in `tools.ts`, which
 * are provider-independent. If you point MODEL at, say, `claude-opus-4-8`,
 * this type widens and you may legitimately add `codeExecutionTool()` from
 * `@tanstack/ai-anthropic/tools` to the `chat({ tools })` array.
 */
export const PROVIDER_HOSTED_TOOLS =
  [] as const satisfies AnthropicChatModelToolCapabilitiesByName[Model]

export const SUPPORTS_PROVIDER_HOSTED_TOOLS = PROVIDER_HOSTED_TOOLS.length > 0

/**
 * `modelOptions` for `chat()` are typed per model by the adapter. For Opus 5
 * the only key we send is `max_tokens`: the Messages API rejects sampling
 * params on this model, and thinking runs adaptively when `thinking` is
 * omitted — so omitting is both the honest and the correct configuration.
 */
export const MODEL_OPTIONS = {
  max_tokens: 8_000,
} as const

/** Displayed on the page so the UI never overstates the model. */
export const MODEL_CARD = {
  id: MODEL,
  provider: 'Anthropic',
  adapter: '@tanstack/ai-anthropic',
  contextWindow: '1M tokens',
  maxOutput: '128K tokens',
  inputModalities: INPUT_MODALITIES,
  providerHostedTools: PROVIDER_HOSTED_TOOLS,
} as const
