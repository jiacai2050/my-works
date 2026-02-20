# 更新日志

此项目的所有显著更改都将记录在本文件中。

## [未发布]

### 新增
- **全新配置系统**: 引入 `~/.shellgpt/config.toml` 作为核心配置方式。
- **多 Profile 支持**: 支持配置多个 API 提供商，包含 `base_url`、`api_key`、`model` 和自定义 `headers`。使用 `-p / --profile` 快速切换。
- **角色 (Role) 系统**: 可以在 `config.toml` 的 `[roles]` 部分自由定义和管理系统提示词。
- **配置路径自定义**: 支持通过 `SHELLGPT_CONF_DIR` 环境变量更改配置目录（默认为 `~/.shellgpt`）。
- **配置查看**: 增加 `--dump` 和 `--dump-json` 参数，用于打印当前生效的配置（`api_key` 会自动脱敏）。
- **流式控制**: 增加 `--stream` 和 `--no-stream` 参数。若 stdout 被重定向，`stream` 将默认为 `false`。
- **初始化优化**: `sg --init` 现在会生成包含动态 Shell 检测和多行字符串示例的完整配置文件模板。
- **新内置角色**: 默认模板中新增了 `summary` (总结) 和 `polish` (润色) 角色。
- **多语言文档**: 增加了中文版的 `README_zh.md` 和 `CHANGELOG_zh.md`。

### 变更
- **术语统一**: 将整个代码库中的 `system_content` 统一重命名为 `role`（命令行参数由 `-s` 改为 `--role`）。
- **后端统一**: 移除旧的原生 Ollama 支持，改为全面拥抱 OpenAI 兼容协议。
- **参数精简**: 移除了 `--max-messages`、`--temperature` 和 `--shell` 等冗余参数，改为通过配置文件统一管理。
- **URL 处理**: 移除了自动拼接逻辑，Profile 中的 URL 现在需由用户完整提供（例如包含 `/v1`），以支持更复杂的网关和代理。
- **架构重构**:
    - `LLM` 和 `ShellGPT` 类改用 `**kwargs` 传参，提升扩展性。
    - 将初始化逻辑迁移至独立的 `shellgpt/init.py` 模块。
    - 彻底消除了对全局变量的依赖。
- **日志优化**: 在 verbose 模式下，请求体的日志输出将截断至 50 字符，保持终端整洁。

### 修复
- **历史记录丢失**: 修复了流式输出模式下 AI 回复无法存入对话历史的问题。
- **REPL 逻辑**: 修复了 REPL 循环中重复发送初始 Prompt 的问题。
