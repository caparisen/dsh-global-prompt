import assert from 'node:assert/strict'
import test from 'node:test'

import {
  Config,
  SYSTEM_SECTION_NAME,
  SYSTEM_SECTION_ORDER,
  apply,
  inject,
  name,
} from '../lib/index.js'
import { DEFAULT_PROMPTS, createDefaultPrompts, mergePrompts } from '../lib/shared.js'

const SEED = [
  { id: 'a', text: 'first rule', enabled: true },
  { id: 'b', text: 'second rule', enabled: true },
]

function harness(config) {
  const sections = []
  const settingsCalls = []
  const settingsCtx = {
    settings: {
      configure(presentation, owner) {
        settingsCalls.push({ presentation, owner })
      },
    },
    effect: (callback) => callback(),
    logger: { warn() {} },
  }
  const ctx = {
    effect: (callback) => callback(),
    inject: (deps, callback) => {
      assert.deepEqual(deps, ['settings'])
      callback(settingsCtx)
    },
    systemPrompt: {
      section(contribution) {
        sections.push(contribution)
        return () => {}
      },
    },
  }
  apply(ctx, config)
  return { sections, settingsCalls }
}

test('plugin identity and required service', () => {
  assert.equal(name, 'global-prompt')
  assert.deepEqual(inject, ['systemPrompt'])
})

test('registers one late global section', () => {
  const h = harness({ prompts: SEED })
  assert.equal(h.sections.length, 1)
  assert.equal(h.sections[0].name, SYSTEM_SECTION_NAME)
  assert.equal(h.sections[0].order, SYSTEM_SECTION_ORDER)
  assert.equal(SYSTEM_SECTION_ORDER, 10150)
  assert.equal(typeof h.sections[0].text, 'function')
  assert.equal(h.sections[0].text(), mergePrompts(SEED))
})

test('the section follows a volatile config reference without re-registering', () => {
  let current = SEED
  const ref = { get: () => current }
  const h = harness({ prompts: ref })
  assert.equal(h.sections.length, 1)
  assert.equal(h.sections[0].text(), 'first rule\n\nsecond rule')

  current = [
    { id: 'a', text: 'first rule', enabled: false },
    { id: 'b', text: 'second rule', enabled: true },
    { id: 'c', text: 'third rule', enabled: true },
  ]
  assert.equal(h.sections.length, 1)
  assert.equal(h.sections[0].text(), 'second rule\n\nthird rule')
})

test('disabling everything contributes an empty section', () => {
  const h = harness({ prompts: createDefaultPrompts().map((prompt) => ({ ...prompt, enabled: false })) })
  assert.equal(h.sections[0].text(), '')
})

test('missing or malformed config falls back to the shipped list', () => {
  assert.equal(harness({}).sections[0].text(), mergePrompts(DEFAULT_PROMPTS))
  assert.equal(harness({ prompts: 'nope' }).sections[0].text(), mergePrompts(DEFAULT_PROMPTS))
})

test('tells Settings the plugin ships its own page', () => {
  const h = harness({ prompts: SEED })
  assert.equal(h.settingsCalls.length, 1)
  assert.deepEqual(h.settingsCalls[0].presentation, { auto: false })
})

test('the config schema defaults to the shipped prompt list', () => {
  const resolved = Config({})
  const prompts = resolved.prompts.get()
  assert.equal(Array.isArray(prompts), true)
  assert.equal(prompts.length, DEFAULT_PROMPTS.length)
  assert.equal(prompts[0].id, 'delivery-discipline')
  assert.equal(prompts[0].enabled, true)
  assert.equal(prompts[0].text, DEFAULT_PROMPTS[0].text)
})

test('the config schema adds the enabled default to an entry that omitted it', () => {
  const resolved = Config({ prompts: [{ id: 'x', text: 'keep me' }] })
  assert.deepEqual(resolved.prompts.get(), [{ id: 'x', text: 'keep me', enabled: true }])
})

test('createDefaultPrompts returns detached entries', () => {
  const first = createDefaultPrompts()
  first[0].text = 'changed'
  assert.notEqual(createDefaultPrompts()[0].text, 'changed')
})
