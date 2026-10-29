/**
 * Build `lib/client.js` from `src/client.js`.
 *
 * DSH client bundles are classic scripts: the shell loads them with a plain
 * `<script>` element, and the bundle may only register a lazy CJS factory with
 * `window.__ModuleLoader__`. This script applies that envelope, rewrites the two
 * static imports into their in-bundle forms, and re-exports `apply`/`inject`.
 *
 * The transformation is deliberately narrow — it knows exactly the import
 * shapes this plugin uses. A stray import fails the build instead of producing a
 * bundle that throws in the browser.
 *
 * Usage:
 *   node scripts/build-client.mjs           # write lib/client.js
 *   node scripts/build-client.mjs --check   # fail if lib/client.js is stale
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const clientSourcePath = join(root, 'src', 'client.js')
const sharedSourcePath = join(root, 'lib', 'shared.js')
const outputPath = join(root, 'lib', 'client.js')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

/** Strip declaration `export` keywords so the factory scope can hold them. */
function stripExports(source) {
  return source.replace(/^export\s+(const|let|var|function|class)\s/gm, '$1 ')
}

/** Names the factory publishes on `module.exports`. */
function exportedNames(source) {
  const names = []
  const pattern = /^export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm
  let match
  while ((match = pattern.exec(source)) !== null) names.push(match[1])
  return names
}

function build() {
  const clientSource = readFileSync(clientSourcePath, 'utf8')
  const sharedSource = readFileSync(sharedSourcePath, 'utf8')
  const names = exportedNames(clientSource)

  if (!names.includes('apply') || !names.includes('inject')) {
    throw new Error(`build-client: src/client.js must export apply and inject (found: ${names.join(', ')})`)
  }

  let clientBody = clientSource
    .replace(/^import React from 'react'\s*$/m, '')
    .replace(/^import \{ DEFAULT_PROMPTS, normalizePrompts \} from '\.\.\/lib\/shared\.js'\s*$/m, '')

  if (/^\s*import\s/m.test(clientBody)) {
    throw new Error('build-client: unsupported import remains in src/client.js')
  }

  const body = `${stripExports(sharedSource).trimEnd()}\n\n${stripExports(clientBody).trimEnd()}`
  const exportLines = names.map((name) => `    exports.${name} = ${name};`).join('\n')

  return `window.__ModuleLoader__.load({
  id: ${JSON.stringify(pkg.name)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

${body}

${exportLines}
    return module.exports;
  }
});
`
}

const output = build()
const check = process.argv.includes('--check')

if (check) {
  if (!existsSync(outputPath)) {
    console.error('build-client: lib/client.js is missing; run `npm run build`')
    process.exit(1)
  }
  const current = readFileSync(outputPath, 'utf8')
  if (current !== output) {
    console.error('build-client: lib/client.js is stale; run `npm run build`')
    process.exit(1)
  }
  console.log('build-client: lib/client.js is up to date')
} else {
  writeFileSync(outputPath, output)
  console.log(`build-client: wrote ${outputPath} (${output.length} bytes)`)
}
