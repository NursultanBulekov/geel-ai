import { anthropicText } from '@tanstack/ai-anthropic'

/**
 * The single place the provider is named. Everything downstream — the typed
 * `modelOptions` union, the tools we are allowed to attach — is derived from
 * this literal by the adapter's own types.
 */
export const MODEL = 'claude-opus-5' as const
export type Model = typeof MODEL

export const textAdapter = () => anthropicText(MODEL)

/**
 * `modelOptions` for `chat()` are typed per model by the adapter. For Opus 5
 * the only key we send is `max_tokens`: the Messages API rejects sampling
 * params on this model, and thinking runs adaptively when `thinking` is
 * omitted — so omitting is both the honest and the correct configuration.
 */
export const MODEL_OPTIONS = {
  max_tokens: 8_000,
} as const
