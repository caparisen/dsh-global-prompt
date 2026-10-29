/**
 * Browser half of `@citisen/dsh-global-prompt`.
 *
 * Registers one Settings page. The page edits the `global-prompt` profile
 * entry through the client configuration forms; the Host half turns that config
 * into the system-prompt section. Every mutation is written immediately:
 * toggling, reordering, adding, deleting, and (on blur) text edits.
 *
 * @module @citisen/dsh-global-prompt/client
 */

import React from 'react'
import { DEFAULT_PROMPTS, normalizePrompts } from '../lib/shared.js'

/** Profile entry id; the Settings form is keyed by it. */
const ENTRY_ID = 'global-prompt'
/** Settings-section key. */
const SECTION_ID = 'global-prompt'
/** Settings-section label, also used to find the native nav row. */
const SECTION_LABEL = '全局 Prompt'
/** The one stylesheet this plugin owns. */
const STYLE_ID = 'dsh-global-prompt/styles'
/** Namespace for the inline navigation icon. */
const SVG_NS = 'http://www.w3.org/2000/svg'

const CSS = `
.dgp-page{display:flex;flex-direction:column;gap:14px;color:inherit}
.dgp-head{display:flex;flex-direction:column;gap:4px}
.dgp-title{margin:0;font-size:16px;font-weight:600;line-height:1.3}
.dgp-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dgp-btn{appearance:none;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;border-radius:6px;padding:4px 10px;font:inherit;font-size:12px;line-height:1.5;cursor:pointer}
.dgp-btn:hover:not(:disabled){background:rgba(127,127,127,.12)}
.dgp-btn:disabled{opacity:.4;cursor:default}
.dgp-btn--primary{border-color:transparent;background:rgba(127,127,127,.16);font-weight:600}
.dgp-btn--primary:hover:not(:disabled){background:rgba(127,127,127,.24)}
.dgp-list{display:flex;flex-direction:column;gap:10px}
.dgp-item{border:1px solid rgba(127,127,127,.28);border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:8px}
.dgp-item--off{opacity:.55}
.dgp-row{display:flex;align-items:center;gap:8px;justify-content:space-between}
.dgp-label{display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;user-select:none}
.dgp-index{font-variant-numeric:tabular-nums;opacity:.55;min-width:1.6em}
.dgp-actions{display:flex;align-items:center;gap:6px}
.dgp-text{width:100%;box-sizing:border-box;resize:vertical;min-height:84px;border:1px solid rgba(127,127,127,.3);border-radius:6px;background:transparent;color:inherit;padding:8px;font:inherit;font-size:12px;line-height:1.55}
.dgp-text:focus{outline:2px solid rgba(90,140,255,.5);outline-offset:-1px}
.dgp-text:disabled{opacity:.6;cursor:not-allowed}
.dgp-error{margin:0;font-size:12px;color:#c0392b;line-height:1.5}
.dgp-empty{border:1px dashed rgba(127,127,127,.35);border-radius:8px;padding:18px;text-align:center;font-size:12px;line-height:1.6;opacity:.65}
`

/** A stable id for a new list entry. */
function newPromptId() {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (typeof uuid === 'string' && uuid !== '') return `prompt-${uuid}`
  return `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** Build the section icon the shell does not offer a slot for. */
function createNavIcon(reference) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.8')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  const className = reference.getAttribute('class')
  if (className !== null) svg.setAttribute('class', className)
  for (const d of [
    'M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    'M7 8h10',
    'M7 12h6',
  ]) {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
  }
  return svg
}

/**
 * The settings shell hardcodes a gear for unknown section ids and exposes no
 * icon option. Swap that one glyph for a section-specific one; the observer
 * re-applies after a panel remount, and the data marker stops the swap from
 * looping.
 *
 * @param ctx - client Cordis context.
 */
function installNavIcon(ctx) {
  const scan = () => {
    for (const button of document.querySelectorAll('[role="dialog"] nav button')) {
      if (button.querySelector('svg[data-dsh-global-prompt-icon]') !== null) continue
      if ((button.textContent ?? '').trim() !== SECTION_LABEL) continue
      const original = button.querySelector('svg')
      if (original === null) continue
      const icon = createNavIcon(original)
      icon.setAttribute('data-dsh-global-prompt-icon', '')
      original.replaceWith(icon)
    }
  }
  const observer = new MutationObserver(scan)
  observer.observe(document.body, { childList: true, subtree: true })
  ctx.effect(() => () => observer.disconnect(), 'global-prompt: navigation icon')
  scan()
}

/** The services the Settings section needs. */
export const inject = ['slots']

/**
 * Client plugin body: bind the settings namespace, paint the page, and register
 * it into the Settings section ledger.
 *
 * @param ctx - client Cordis context.
 */
export function apply(ctx) {
  /** Bound configuration form; null until the Settings service arrives. */
  let form = null
  /** Page state, replaced on every publish so `useSyncExternalStore` re-renders. */
  let view = {
    status: 'loading',
    prompts: DEFAULT_PROMPTS,
    writable: false,
    saving: 0,
    error: '',
  }
  let saving = 0
  let error = ''
  const listeners = new Set()

  const getView = () => view
  const subscribe = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }
  const publish = (patch) => {
    view = { ...view, ...patch }
    for (const listener of listeners) listener()
  }

  const adopt = () => {
    if (form === null) return
    const snapshot = form.getSnapshot()
    publish({
      status: snapshot.status,
      prompts: normalizePrompts(snapshot.value) ?? DEFAULT_PROMPTS,
      writable: snapshot.status === 'ready' && snapshot.writable === true,
      error,
    })
  }

  // The Settings domain's configuration forms are keyed by the profile entry
  // id. Injecting optionally keeps the page (and the prompt section) usable in
  // a composition without Settings, where it renders the shipped list read-only.
  ctx.inject(['configForms'], (settingsCtx) => {
    form = settingsCtx.configForms.get(ENTRY_ID)
    settingsCtx.effect(
      () => form.subscribe(adopt),
      'global-prompt: configuration-form subscription',
    )
    adopt()
    return () => {
      form = null
      publish({ status: 'unavailable', writable: false })
    }
  })

  /** Write the whole list; the Host validates and persists it. */
  const commit = async (prompts) => {
    if (form === null || view.writable !== true) return false
    saving += 1
    error = ''
    publish({ saving, error: '' })
    try {
      const accepted = await form.set('prompts', prompts)
      if (!accepted) throw new Error('Host 拒绝了这次修改：该配置可能被更高层配置覆盖。')
      return true
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
      publish({ error })
      return false
    } finally {
      saving = Math.max(0, saving - 1)
      publish({ saving })
    }
  }

  const Page = () => {
    const state = React.useSyncExternalStore(subscribe, getView, getView)
    const [drafts, setDrafts] = React.useState({})
    const prompts = state.prompts
    const disabled = state.writable !== true || state.saving > 0

    const setDraft = (id, value) => {
      setDrafts((previous) => ({ ...previous, [id]: value }))
    }
    const clearDraft = (id) => {
      setDrafts((previous) => {
        const next = { ...previous }
        delete next[id]
        return next
      })
    }

    const move = (index, delta) => {
      const target = index + delta
      if (target < 0 || target >= prompts.length) return
      const next = prompts.slice()
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      void commit(next)
    }

    const toggle = (id) => {
      void commit(prompts.map((item) => (item.id === id ? { ...item, enabled: item.enabled === false } : item)))
    }

    const remove = (item) => {
      if (!globalThis.confirm?.('删除这条 prompt？')) return
      void commit(prompts.filter((entry) => entry.id !== item.id))
    }

    const add = () => {
      void commit([...prompts, { id: newPromptId(), text: '', enabled: true }])
    }

    const commitText = async (item) => {
      const value = drafts[item.id]
      if (value === undefined || value === item.text) {
        clearDraft(item.id)
        return
      }
      const saved = await commit(
        prompts.map((entry) => (entry.id === item.id ? { ...entry, text: value } : entry)),
      )
      if (saved) clearDraft(item.id)
    }

    const children = []

    children.push(
      React.createElement(
        'div',
        { className: 'dgp-head', key: 'head' },
        React.createElement('h2', { className: 'dgp-title' }, SECTION_LABEL),
      ),
    )

    children.push(
      React.createElement(
        'div',
        { className: 'dgp-toolbar', key: 'toolbar' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'dgp-btn dgp-btn--primary',
            disabled,
            onClick: add,
          },
          '+ 新增 Prompt',
        ),
      ),
    )

    if (state.error !== '') {
      children.push(
        React.createElement(
          'p',
          { className: 'dgp-error', role: 'alert', key: 'error' },
          state.error,
        ),
      )
    }

    if (prompts.length === 0) {
      children.push(
        React.createElement(
          'div',
          { className: 'dgp-empty', key: 'empty' },
          '还没有 Prompt。',
        ),
      )
    } else {
      children.push(
        React.createElement(
          'div',
          { className: 'dgp-list', key: 'list' },
          prompts.map((item, index) =>
            React.createElement(
              'div',
              {
                key: item.id,
                className: `dgp-item${item.enabled === false ? ' dgp-item--off' : ''}`,
              },
              React.createElement(
                'div',
                { className: 'dgp-row' },
                React.createElement(
                  'label',
                  { className: 'dgp-label' },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: item.enabled !== false,
                    disabled,
                    onChange: () => toggle(item.id),
                  }),
                  React.createElement('span', { className: 'dgp-index' }, `#${index + 1}`),
                ),
                React.createElement(
                  'div',
                  { className: 'dgp-actions' },
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dgp-btn',
                      disabled: disabled || index === 0,
                      onClick: () => move(index, -1),
                      'aria-label': '上移',
                      title: '上移',
                    },
                    '↑',
                  ),
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dgp-btn',
                      disabled: disabled || index === prompts.length - 1,
                      onClick: () => move(index, 1),
                      'aria-label': '下移',
                      title: '下移',
                    },
                    '↓',
                  ),
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dgp-btn',
                      disabled,
                      onClick: () => remove(item),
                    },
                    '删除',
                  ),
                ),
              ),
              React.createElement('textarea', {
                className: 'dgp-text',
                value: drafts[item.id] ?? item.text,
                disabled,
                rows: 4,
                placeholder: '输入 system prompt',
                onChange: (event) => setDraft(item.id, event.target.value),
                onBlur: () => void commitText(item),
              }),
            ),
          ),
        ),
      )
    }

    return React.createElement('div', { className: 'dgp-page' }, children)
  }

  ctx.effect(
    () => {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = CSS
      document.head.appendChild(style)
      return () => {
        style.remove()
      }
    },
    'global-prompt: styles',
  )

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: SECTION_ID,
        order: 40,
        label: SECTION_LABEL,
      },
      Page,
    ),
  )

  installNavIcon(ctx)
}
