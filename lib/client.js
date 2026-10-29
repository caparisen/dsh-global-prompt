window.__ModuleLoader__.load({
  id: "@citisen/dsh-global-prompt",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

/**
 * Values shared by the Host half and the browser half.
 *
 * The build script inlines this module into `lib/client.js`, so the two halves
 * cannot drift: the default list and the merge rule are defined exactly once.
 *
 * @module @citisen/dsh-global-prompt/shared
 */

/** The prompt a fresh install starts with. Ordinary list data: edit, disable, or delete it. */
const DEFAULT_PROMPT_TEXT = `## 交付纪律
- 只做用户明确要求的事。不添加未被要求的文件、文档、页面、图表、清单、预算、脚本、演示或任何“增值”内容。
- 用户要文字就只输出文字；除非明确要求，不生成 Word/PDF/PPT/Excel/图片，不新建目录、项目或仓库。
- 不擅自扩大范围：不为了显得周全而主动调研、开子任务、开工作流、做模板、做排版美化、反复视觉打磨。
- 动手前先确认关键未知：交付格式、数量、对象、范围；不确定就问，不要默认。
- 严格照用户给出的限制（格式、目录、技术栈、字数）执行，不替换成自己更偏好的方案。
- 简单任务直接给结果，不为了“完整”堆内容。
- 交付前对照用户原话逐条自检，删掉所有超出要求的产出；用户表达不满时立即停止扩展，只修正被指出的问题。`

/** The seeded list for an install with no saved user section. */
const DEFAULT_PROMPTS = Object.freeze([
  Object.freeze({ id: 'delivery-discipline', text: DEFAULT_PROMPT_TEXT, enabled: true }),
])

/** A fresh, mutable copy of the seeded list, for schema defaults. */
function createDefaultPrompts() {
  return DEFAULT_PROMPTS.map((prompt) => ({ ...prompt }))
}

/**
 * Narrow one settings section into the list the plugin understands.
 *
 * @param value - a resolved settings section.
 * @returns the normalized list, or null when the section is not a prompt section.
 */
function normalizePrompts(value) {
  if (value === null || typeof value !== 'object') return null
  const list = value.prompts
  if (!Array.isArray(list)) return null
  return list
    .filter((item) => item !== null && typeof item === 'object')
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id !== '' ? item.id : `prompt-${index + 1}`,
      text: typeof item.text === 'string' ? item.text : '',
      enabled: item.enabled !== false,
    }))
}

/**
 * Merge the enabled prompts into the one section text injected system-wide.
 * List order is injection order; entries are separated by one blank line.
 *
 * @param prompts - the prompt list.
 * @returns the merged text, or an empty string when nothing is enabled.
 */
function mergePrompts(prompts) {
  if (!Array.isArray(prompts)) return ''
  const parts = []
  for (const item of prompts) {
    if (item === null || typeof item !== 'object') continue
    if (item.enabled === false) continue
    if (typeof item.text !== 'string') continue
    const text = item.text.trim()
    if (text !== '') parts.push(text)
  }
  return parts.join('\n\n')
}

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



/** Profile entry id; the Settings form is keyed by it. */
const ENTRY_ID = 'global-prompt'
/** Settings-section key. */
const SECTION_ID = 'global-prompt'
/** The one stylesheet this plugin owns. */
const STYLE_ID = 'dsh-global-prompt/styles'

const CSS = `
.dgp-page{display:flex;flex-direction:column;gap:14px;color:inherit}
.dgp-head{display:flex;flex-direction:column;gap:4px}
.dgp-title{margin:0;font-size:16px;font-weight:600;line-height:1.3}
.dgp-desc{margin:0;font-size:12px;line-height:1.55;opacity:.68}
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
.dgp-status{font-size:11px;opacity:.62;margin-left:auto}
.dgp-error{margin:0;font-size:12px;color:#c0392b;line-height:1.5}
.dgp-empty{border:1px dashed rgba(127,127,127,.35);border-radius:8px;padding:18px;text-align:center;font-size:12px;line-height:1.6;opacity:.65}
`

/** A stable id for a new list entry. */
function newPromptId() {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (typeof uuid === 'string' && uuid !== '') return `prompt-${uuid}`
  return `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** Enabled-entry count for the status line. */
function enabledCount(prompts) {
  let count = 0
  for (const item of prompts) if (item.enabled !== false) count += 1
  return count
}

/** The services the Settings section needs. */
const inject = ['slots']

/**
 * Client plugin body: bind the settings namespace, paint the page, and register
 * it into the Settings section ledger.
 *
 * @param ctx - client Cordis context.
 */
function apply(ctx) {
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
    const disabled = state.writable !== true

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

    const status =
      state.status === 'loading'
        ? '加载中…'
        : state.writable !== true
          ? '只读：设置服务不可用'
          : state.error !== ''
            ? '保存失败'
            : state.saving > 0
              ? '保存中…'
              : '已保存'

    const children = []

    children.push(
      React.createElement(
        'div',
        { className: 'dgp-head', key: 'head' },
        React.createElement('h2', { className: 'dgp-title' }, '全局 Prompt'),
        React.createElement(
          'p',
          { className: 'dgp-desc' },
          '所有对话共用。列表顺序就是注入顺序，未启用的条目不参与合并；全部禁用或为空时不注入任何内容。',
        ),
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
        React.createElement(
          'span',
          { className: 'dgp-status', role: 'status' },
          `${enabledCount(prompts)} 条启用 · ${status}`,
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
          '还没有 Prompt。点“新增 Prompt”开始；全部禁用或为空时不会注入任何内容。',
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
                  React.createElement('span', null, item.enabled === false ? '已禁用' : '启用'),
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
                placeholder: '输入一段会注入到所有对话的 system prompt…',
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
        label: '全局 Prompt',
      },
      Page,
    ),
  )
}

    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  }
});
