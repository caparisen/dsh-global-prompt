/**
 * Values shared by the Host half and the browser half.
 *
 * The build script inlines this module into `lib/client.js`, so the two halves
 * cannot drift: the default list and the merge rule are defined exactly once.
 *
 * @module @citisen/dsh-global-prompt/shared
 */

/** The prompt a fresh install starts with. Ordinary list data: edit, disable, or delete it. */
export const DEFAULT_PROMPT_TEXT = `## 交付纪律
- 只做用户明确要求的事。不添加未被要求的文件、文档、页面、图表、清单、预算、脚本、演示或任何“增值”内容。
- 用户要文字就只输出文字；除非明确要求，不生成 Word/PDF/PPT/Excel/图片，不新建目录、项目或仓库。
- 不擅自扩大范围：不为了显得周全而主动调研、开子任务、开工作流、做模板、做排版美化、反复视觉打磨。
- 动手前先确认关键未知：交付格式、数量、对象、范围；不确定就问，不要默认。
- 严格照用户给出的限制（格式、目录、技术栈、字数）执行，不替换成自己更偏好的方案。
- 简单任务直接给结果，不为了“完整”堆内容。
- 交付前对照用户原话逐条自检，删掉所有超出要求的产出；用户表达不满时立即停止扩展，只修正被指出的问题。`

/** The seeded list for an install with no saved user section. */
export const DEFAULT_PROMPTS = Object.freeze([
  Object.freeze({ id: 'delivery-discipline', text: DEFAULT_PROMPT_TEXT, enabled: true }),
])

/** A fresh, mutable copy of the seeded list, for schema defaults. */
export function createDefaultPrompts() {
  return DEFAULT_PROMPTS.map((prompt) => ({ ...prompt }))
}

/**
 * Narrow one settings section into the list the plugin understands.
 *
 * @param value - a resolved settings section.
 * @returns the normalized list, or null when the section is not a prompt section.
 */
export function normalizePrompts(value) {
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
export function mergePrompts(prompts) {
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
