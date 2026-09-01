import { anthropicText } from '@tanstack/ai-anthropic'
import { MODEL } from './model'

/**
 * Server-only: constructing the adapter pulls in the provider SDK, so it lives
 * apart from `model.ts` (which is types and constants the browser may import).
 */
export const textAdapter = () => anthropicText(MODEL)
