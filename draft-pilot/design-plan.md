# IssuePilot — Design Plan

> 一个浏览器插件，帮助中文用户在 GitHub issue 中用地道的英文表达自己。

---

## 1. 产品定位

**目标用户**：母语为中文、日常参与开源社区、需要用英文回复 GitHub issue 的开发者。

**核心价值**：降低英文表达门槛，让用户专注于技术本身，而不是语言组织。

**设计原则**：

- **最小侵入**：不破坏 GitHub 原有 UI，插件元素风格与 GitHub 保持一致
- **低摩擦启动**：用户可以什么都不输入，直接从意图选择开始
- **快速可用**：从点击到生成草稿，控制在 3 秒内

---

## 2. 功能范围（MVP）

### 2.1 核心功能

- 在 GitHub issue / PR 评论框旁注入「✨ Draft」按钮
- 弹出意图选择面板（6 个预设意图 + 自由输入框）
- 读取当前 issue 标题、描述、及最近几条评论作为上下文
- 调用 LLM API 生成英文草稿
- 一键将草稿填入评论输入框

### 2.2 增强功能（v1.1+）

- 草稿生成后提供语气微调（Formal / Friendly / Concise）
- 支持重新生成
- 历史草稿记录（本地存储，最近 20 条）
- 支持 PR Review comment 场景

### 2.3 明确不做（MVP）

- 不做自动提交，用户始终手动发送
- 不做多语言（只服务中文用户）
- 不做云端同步

---

## 3. 交互流程

### 主流程

```
用户打开 GitHub Issue 页面
        │
        ▼
输入框右下角出现 [✨ Draft] 按钮
        │
        ▼
用户点击按钮 / 快捷键 Cmd+Shift+G
        │
        ▼
弹出「意图面板」(Popover)
  ┌─────────────────────────────────┐
  │  你想表达什么？                   │
  │                                 │
  │  👍 赞同   🤔 有疑问   ❌ 反对   │
  │  💡 有建议  🐛 补充信息  🙏 求助  │
  │                                 │
  │  或补充说明（中文/英文均可）        │
  │  ┌───────────────────────────┐  │
  │  │                           │  │
  │  └───────────────────────────┘  │
  │                        [生成草稿] │
  └─────────────────────────────────┘
        │
  ┌─────┴──────────────────────────┐
  │ 选了意图 → 直接生成              │
  │ 只输入文字 → 直接生成            │
  │ 意图 + 文字 → 更精准生成         │
  └────────────────────────────────┘
        │
        ▼
草稿预览区（在 Popover 内展开）
  ┌─────────────────────────────────┐
  │  ✨ 草稿已生成                   │
  │  ─────────────────────────────  │
  │  I think this issue might be    │
  │  related to...（可直接编辑）      │
  │                                 │
  │  [🔄 重新生成]  [📋 插入输入框]  │
  └─────────────────────────────────┘
        │
        ▼
草稿填入 GitHub 评论框
用户确认后手动点击 GitHub 原生提交按钮
```

### 边界场景处理

| 场景                               | 处理方式                                 |
| ---------------------------------- | ---------------------------------------- |
| 用户什么都不选也不输入，直接点生成 | 提示「请选择一个意图或输入说明」         |
| API 调用超时                       | 显示错误提示，提供重试按钮               |
| 未配置 API Key                     | 引导至设置页填写                         |
| 非 issue / PR 页面                 | 不注入按钮，插件静默                     |
| issue 描述过长超出 token 限制      | 截取标题 + 描述前 500 字 + 最近 3 条评论 |

---

## 4. UI 设计规范

### 4.1 注入按钮

位置：GitHub 评论框工具栏右侧（紧贴「Preview」Tab 旁）

```
[ Write ] [ Preview ]                    [ ✨ Draft ]
┌─────────────────────────────────────────────────┐
│                                                 │
│  Leave a comment                                │
│                                                 │
└─────────────────────────────────────────────────┘
```

样式要求：

- 与 GitHub 原生按钮风格一致（圆角、边框色跟随主题）
- 支持 GitHub Light / Dark 主题自适应
- Hover 状态有轻微高亮，不过度抢眼

### 4.2 意图面板（Popover）

- 宽度：320px
- 以注入按钮为锚点，向上弹出
- 6 个意图按钮排列：2 行 × 3 列
- 选中状态：高亮边框 + 背景色填充
- 点击面板外部区域关闭

### 4.3 草稿预览区

- 在同一 Popover 内向下展开（不新开弹窗）
- 草稿文本支持直接编辑（`contenteditable`）
- 字数显示（GitHub 评论有长度限制参考）

### 4.4 色彩 & 主题

跟随 GitHub CSS 变量，不硬编码颜色：

```css
--color-btn-bg
--color-btn-border
--color-accent-fg
--color-canvas-overlay
--color-border-default
```

---

## 5. 技术架构

### 5.1 文件结构

```
issuepilot/
├── manifest.json          # Manifest V3
├── content/
│   ├── content.js         # 主注入逻辑
│   ├── ui.js              # Popover 渲染
│   └── github.js          # 读取 issue 上下文
├── background/
│   └── service-worker.js  # API 调用（避免 CORS）
├── popup/
│   ├── popup.html         # 插件设置页
│   └── popup.js
├── styles/
│   └── content.css        # 注入样式
└── icons/
    ├── icon-16.png
    └── icon-48.png
```

### 5.2 权限声明

```json
"permissions": ["storage", "activeTab"],
"host_permissions": ["https://github.com/*"]
```

### 5.3 Context 提取策略

从页面 DOM 中读取：

| 内容         | CSS 选择器 / 方式                 |
| ------------ | --------------------------------- |
| Issue 标题   | `h1.gh-header-title`              |
| Issue 正文   | `.js-comment-body`（第一条）      |
| 最近评论     | `.js-comment-body`（取最近 3 条） |
| 当前用户输入 | 评论框 `textarea` 的值            |

### 5.4 Prompt 设计

**System Prompt：**

```
You are helping a Chinese developer write professional GitHub issue comments in English.
The user will provide their intent and the issue context.
Generate a natural, concise, and technically appropriate English comment.
Do not add unnecessary pleasantries. Match the tone of the issue thread.
Reply with only the comment text, no explanations.
```

**User Prompt 结构：**

```
Issue Title: {title}
Issue Body: {body_excerpt}
Recent Comments: {recent_comments}

User Intent: {selected_intent}
User Note (optional): {user_input}

Write the comment:
```

### 5.5 API 支持

MVP 阶段支持：

- **Anthropic Claude API**（推荐，默认）
- **OpenAI API**（兼容格式）

API Key 存储：`chrome.storage.local`（不上传，本地加密存储）

---

## 6. 设置页（Popup）

| 设置项       | 说明                                    |
| ------------ | --------------------------------------- |
| API Provider | Anthropic / OpenAI 切换                 |
| API Key      | 输入框 + 显示/隐藏切换                  |
| Model        | 默认 claude-sonnet / gpt-4o，可手动填写 |
| 默认语气     | Neutral / Formal / Friendly             |
| 快捷键提示   | 显示当前快捷键 `Cmd+Shift+G`            |

---

## 7. 开发里程碑

### Phase 1 — MVP（1~2 周）

- [ ] manifest.json 基础配置
- [ ] content.js：注入「Draft」按钮到 GitHub 评论区
- [ ] github.js：提取 issue 标题、正文、评论
- [ ] ui.js：意图选择 Popover 渲染
- [ ] service-worker.js：调用 Claude API
- [ ] 草稿填入输入框
- [ ] popup.html：API Key 配置页

### Phase 2 — 打磨（+1 周）

- [ ] Dark Mode 适配
- [ ] 重新生成功能
- [ ] 草稿可编辑
- [ ] 错误处理与 loading 状态

### Phase 3 — 增强（后续迭代）

- [ ] 语气微调（Formal / Friendly / Concise）
- [ ] PR Review comment 场景支持
- [ ] 本地草稿历史记录
- [ ] Chrome Web Store 上架

---

## 8. 风险与注意事项

| 风险                              | 缓解措施                                                      |
| --------------------------------- | ------------------------------------------------------------- |
| GitHub DOM 结构更新导致注入失效   | 使用多个候选选择器，添加 MutationObserver 监听动态加载        |
| API Key 安全                      | 明确告知用户 Key 仅存本地，不经过任何服务器                   |
| 生成内容质量不稳定                | 提供重新生成，用户永远可以手动修改后再发                      |
| Chrome Extension Manifest V3 限制 | API 调用走 service worker，避免在 content script 中直接 fetch |
