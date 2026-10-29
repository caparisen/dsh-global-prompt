# @citisen/dsh-global-prompt

A DeepSeek Harness (dsh) plugin that adds a **Global Prompt** page to Settings.
Every enabled entry is merged, in list order, into one global system-prompt
section, so it applies to every conversation without repeating instructions.

The page starts with two editable entries: a "delivery discipline" prompt that
tells the agent to do only what was asked and answer in the requested medium,
and a "terse output" prompt that forbids padding, lyricism, connector-symbol
stacking, decorative copy, and repetition. Both are ordinary list data: edit them,
disable them, or delete them.

## Requirements

- dsh **0.2.x** Web/desktop profile. Tested against `0.2.1-rc.3`.
- The profile already composes `@deepseek-ai/dsh-base` and
  `@deepseek-ai/dsh-web-app`.

## Install

Install the package into the profile, then add it to the profile's bundle list:

```sh
dsh plugin --profile <profile> add @citisen/dsh-global-prompt
```

In `$DSH_HOME/profiles/<profile>/package.json`, add the bundle:

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@citisen/dsh-global-prompt"
      ]
    }
  }
}
```

Reload the app (or let live patch reload pick it up). The page appears under
**Settings → Global Prompt**.

Local development installs can point at a tarball or folder instead:

```sh
npm pack
dsh plugin --profile <profile> add ./citisen-dsh-global-prompt-*.tgz
```

## Use

- **+ 新增 Prompt** appends an entry.
- Each entry has an enable checkbox, a text area, up/down order buttons, and
  delete. List order is injection order.
- Toggles, reordering, adding and deleting save immediately. Text saves when the
  field loses focus.
- `已启用 N 条 · 已保存` reports the state. A refused write (for example a
  profile layer that overrides the entry) is shown instead of silently lost.
- If every entry is disabled or empty, nothing is injected.
- Changes persist in the active profile's Cordis patch and apply on the next
  model request; no restart is needed.

## Behavior

```text
enabled entries, in order
        │
        ▼
join with one blank line
        │
        ▼
global system-prompt section `plugin:global-prompt` (order 10150)
        │
        ▼
every conversation and subagent
```

The section sits after tool guidance and deliverable rules, before the harness
source and deployment persona suffix.

### Token cost

The merged text is part of every request, so its length is a fixed per-request
cost while it is enabled. Disable or delete entries you do not need.

### Data

Prompt text is stored only in the active profile's configuration patch on this
machine. Nothing is uploaded; the plugin has no network code.

## Develop

```sh
npm install
npm test          # host/schema/shared + built-bundle tests
npm run build     # regenerate lib/client.js from src/client.js
npm run check     # fail if lib/client.js is stale or unparsable
npm pack --dry-run
```

`lib/client.js` is a checked-in build artifact. The browser half may only import
platform-seeded modules; `require('react')` is the only module request.

## Compatibility

The client half is built for dsh 0.2.x's lazy-CJS client bundle format. The
settings API used here (`configForms` on the client, a volatile `Config` field on
the host) is the 0.2.x line; earlier dsh lines with `settings.register()` /
`settingsScope` are not supported.

## License

MIT
