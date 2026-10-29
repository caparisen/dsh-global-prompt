# @citisen/dsh-global-prompt

一个 DeepSeek Harness（dsh）插件，在设置里增加 **Global Prompt / 全局 Prompt**
页面：所有启用的条目按列表顺序合并成一段全局 system prompt，对所有对话生效。

首次安装的列表里预置两条 prompt：一条“交付纪律”，约束 agent 只做明确要求的事、用
要求的交付形式；一条“输出要求”，禁止注水、抒情、用连接符堆砌信息、装饰性文字和重复。
它们都是普通列表项：可以改、可以禁用、可以删除。

## 要求

- dsh **0.2.x** 的 Web/桌面 profile，已在 `0.2.1-rc.3` 上验证。
- profile 已经包含 `@deepseek-ai/dsh-base` 和 `@deepseek-ai/dsh-web-app`。

## 安装

先装包，再把包名加进 profile 的 bundle 列表：

```sh
dsh plugin --profile <profile> add @citisen/dsh-global-prompt
```

编辑 `$DSH_HOME/profiles/<profile>/package.json`，加入：

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

重载应用（或等 live patch reload 生效），设置里会出现 **全局 Prompt**。

本地开发也可以用 tarball 安装：

```sh
npm pack
dsh plugin --profile <profile> add ./citisen-dsh-global-prompt-*.tgz
```

## 使用

- **+ 新增 Prompt**：在列表末尾加一条。
- 每条有启用勾选框、文本域、上移/下移、删除；列表顺序就是注入顺序。
- 开关、排序、新增、删除即时保存；文本在失去焦点时保存。
- 状态栏显示 `已启用 N 条 · 已保存`；写入被拒绝（例如被更高层 profile 配置覆盖）
  会直接显示错误，不会静默丢失。
- 全部禁用或内容为空时，不注入任何内容。
- 修改保存在当前 profile 的 Cordis patch 里，下一次模型请求即生效，不用重启。

## 注入行为

```text
所有启用的条目，按列表顺序
        │
        ▼
用空行连接
        │
        ▼
全局 system-prompt section `plugin:global-prompt`（order 10150）
        │
        ▼
所有对话与子会话
```

位置在工具指引和交付规则之后、harness source 和 persona suffix 之前。

### Token 成本

合并后的文本会进入每一次请求，启用期间是固定的每请求开销。不需要的条目请禁用或删除。

### 数据

Prompt 文本只存在本机当前 profile 的配置 patch 中，不上传，插件没有网络代码。

## 开发

```sh
npm install
npm test          # host / schema / shared / 构建产物测试
npm run build     # 从 src/client.js 重新生成 lib/client.js
npm run check     # lib/client.js 过期或语法错误则失败
npm pack --dry-run
```

`lib/client.js` 是提交进仓库的构建产物；浏览器半只能 import 平台注入的模块，本插件
只 `require('react')`。

## 兼容性

客户端半按 dsh 0.2.x 的 lazy-CJS client bundle 格式构建；设置侧使用 0.2.x 的
`configForms`（客户端）和 volatile `Config` 字段（Host）。更早的使用
`settings.register()` / `settingsScope` 的 dsh 版本不支持。

## License

MIT
