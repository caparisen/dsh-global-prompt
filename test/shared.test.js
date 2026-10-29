import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_PROMPTS, mergePrompts, normalizePrompts } from '../lib/shared.js'

test('the shipped list seeds one enabled prompt', () => {
  assert.equal(DEFAULT_PROMPTS.length, 1)
  assert.equal(DEFAULT_PROMPTS[0].enabled, true)
  assert.match(DEFAULT_PROMPTS[0].text, /^## 交付纪律/)
})

test('merge keeps list order and skips disabled, empty, and malformed entries', () => {
  const prompts = [
    { id: 'a', text: 'first', enabled: true },
    { id: 'b', text: 'disabled', enabled: false },
    { id: 'c', text: '  \n  ', enabled: true },
    { id: 'd', text: 'second', enabled: true },
    { id: 'e', text: 42, enabled: true },
    null,
  ]
  assert.equal(mergePrompts(prompts), 'first\n\nsecond')
})

test('merge returns an empty string when every entry is disabled', () => {
  assert.equal(
    mergePrompts([
      { id: 'a', text: 'x', enabled: false },
      { id: 'b', text: 'y', enabled: false },
    ]),
    '',
  )
})

test('merge tolerates a non-list value', () => {
  assert.equal(mergePrompts(undefined), '')
  assert.equal(mergePrompts({}), '')
})

test('normalizePrompts repairs missing fields and preserves enabled=false', () => {
  const normalized = normalizePrompts({
    prompts: [
      { id: 'a', text: 'hello' },
      { text: 'no id', enabled: false },
      'not an object',
    ],
  })
  assert.deepEqual(normalized, [
    { id: 'a', text: 'hello', enabled: true },
    { id: 'prompt-2', text: 'no id', enabled: false },
  ])
  assert.equal(normalizePrompts({ prompts: 'nope' }), null)
  assert.equal(normalizePrompts(null), null)
})
