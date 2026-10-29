import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const bundlePath = new URL('../lib/client.js', import.meta.url)
const bundle = readFileSync(bundlePath, 'utf8')

test('the client bundle registers the expected loader entry', () => {
  assert.match(bundle, /^window\.__ModuleLoader__\.load\(\{/)
  assert.match(bundle, /id: "@citisen\/dsh-global-prompt"/)
  assert.doesNotMatch(bundle, /^\s*import\s/m)
})

test('the client factory exports apply and inject', () => {
  let loaded
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(options) {
          loaded = options
        },
      },
    },
  }
  vm.createContext(sandbox)
  vm.runInContext(bundle, sandbox)

  assert.ok(loaded)
  assert.equal(loaded.id, '@citisen/dsh-global-prompt')

  const react = {
    createElement: () => null,
    useState: () => [{}, () => {}],
    useSyncExternalStore: () => ({ status: 'loading', prompts: [], writable: false, saving: 0, error: '' }),
  }
  const exports = loaded.factory((specifier) => {
    if (specifier === 'react') return react
    throw new Error(`unexpected require: ${specifier}`)
  })

  assert.equal(typeof exports.apply, 'function')
  assert.equal(Array.isArray(exports.inject), true)
  assert.equal(exports.inject.length, 1)
  assert.equal(exports.inject[0], 'slots')
})
