/**
 * Host half of `@citisen/dsh-global-prompt`.
 *
 * Owns one model-facing contribution: a global system-prompt section whose text
 * is the merge of the enabled prompts in the plugin config. The config field is
 * volatile, so the Settings form can edit it without remounting this row; the
 * section text provider reads the volatile reference on every assembly, which
 * makes saved edits effective on the next request.
 *
 * @module @citisen/dsh-global-prompt
 */

import z from '@deepseek-ai/schemastery'
import { DEFAULT_PROMPTS, createDefaultPrompts, mergePrompts } from './shared.js'

/** Profile entry id; the Settings form is keyed by it. */
export const ENTRY_ID = 'global-prompt'
/** Unique system-prompt section name. */
export const SYSTEM_SECTION_NAME = 'plugin:global-prompt'
/**
 * Late in the prompt, after tool guidance and deliverable rules, before the
 * harness source and deployment persona suffix.
 */
export const SYSTEM_SECTION_ORDER = 10150

/** Cordis plugin name, used by loader diagnostics. */
export const name = 'global-prompt'

/** The system-prompt registry this row contributes to. */
export const inject = ['systemPrompt']

/** One editable prompt entry. */
const PromptItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  enabled: z.boolean().default(true),
})

/**
 * Mark a config field as live-editable. The 0.2.x line ships the public
 * `.volatile()` method; older schemastery copies only have the metadata
 * primitive it is built from.
 *
 * @param schema - the field schema.
 * @returns the same schema with the volatile flag.
 */
const editable = (schema) => {
  if (typeof schema.volatile === 'function') return schema.volatile()
  if (typeof schema.extra === 'function') return schema.extra('volatile', true)
  return schema
}

/** The profile entry config: one durable prompt list. */
export const Config = z.object({
  prompts: editable(z.array(PromptItemSchema).default(createDefaultPrompts())),
})

/**
 * Read the prompt list from the parsed config. A volatile field arrives as a
 * reference with `.get()`, mutated in place by the loader; a plain test config
 * arrives as an array.
 *
 * @param config - parsed plugin config.
 * @returns the current list.
 */
function readPrompts(config) {
  const value = config !== null && typeof config === 'object' ? config.prompts : undefined
  if (value !== null && typeof value === 'object' && typeof value.get === 'function') {
    const current = value.get()
    return Array.isArray(current) ? current : DEFAULT_PROMPTS
  }
  return Array.isArray(value) ? value : DEFAULT_PROMPTS
}

/**
 * Register the global prompt section and tell Settings this plugin ships its
 * own page.
 *
 * @param ctx - host context.
 * @param config - parsed plugin config (the `global-prompt` profile entry).
 */
export function apply(ctx, config = {}) {
  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: SYSTEM_SECTION_NAME,
        order: SYSTEM_SECTION_ORDER,
        text: () => mergePrompts(readPrompts(config)),
      }),
    'global-prompt: system-prompt section',
  )

  // Optional: the plugin loads and injects even when Settings is absent.
  ctx.inject(['settings'], (settingsCtx) => {
    const settings = settingsCtx.settings
    if (settings === null || typeof settings !== 'object' || typeof settings.configure !== 'function') {
      return
    }
    settingsCtx.effect(
      () => settings.configure({ auto: false }, ctx.fiber),
      'global-prompt: own Settings page',
    )
  })
}

export default { name, inject, Config, apply }
