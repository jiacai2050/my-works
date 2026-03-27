# 更新日志

此项目的所有显著更改都将记录在本文件中。

## 0.7.1 - 2026-03-27

### 新增

- **流式 Usage 上报**: 流式请求时发送 `stream_options: {include_usage: true}`，在 stream 和非 stream 模式下均通过 `debug_print` 输出 token 用量信息。

### 修复

- **非流式响应解析更健壮**: 非 stream 模式下使用安全的 `.get()` 访问 `choices`、`message` 和 `content`，避免 API 返回异常结构时抛出 `KeyError` / `IndexError`。

## 0.7.0 - 2026-02-23

### 新增

- **全新配置系统**: 引入 `~/.shellgpt/config.toml` 作为核心配置方式。
- **多 Profile 支持**: 支持配置多个 API 提供商，包含 `base_url`、`api_key`、`model` 和自定义 `headers`。使用 `-p / --profile` 快速切换。
- **灵活的认证方式**: 在 Profile 中支持 `api_key_env`，允许从环境变量中读取 API Key。
- **变量替换**: Header 的值现在支持使用 `$VAR` 或 `${VAR}` 语法进行环境变量自动替换。
- **角色 (Role) 系统**: 可以在 `config.toml` 的 `[roles]` 部分自由定义和管理系统提示词。
- **配置路径自定义**: 支持通过 `SHELLGPT_CONF_DIR` 环境变量更改配置目录（默认为 `~/.shellgpt`）。
- **配置查看**: 增加 `--dump` 和 `--dump-json` 参数，用于打印当前生效的配置（`api_key` 和敏感 Header 会自动脱敏）。
- **流式控制**: 增加 `--stream` 和 `--no-stream` 参数。若 stdout 被重定向，`stream` 将默认为 `false`。
- **初始化优化**: `sg --init` 现在会生成包含动态 Shell 检测和多行字符串示例的完整配置文件模板。
- **新内置角色**: 默认模板中新增了 `summary` (总结) 和 `polish` (润色) 角色。
- **增强调试**: 在 verbose 模式下增加 HTTP Headers (脱敏) 及截断后的请求体日志输出。
- **多语言文档**: 增加了中文版的 `README_zh.md` 和 `CHANGELOG_zh.md`。

### 变更

- **术语统一**: 将整个代码库中的 `system_content` 统一重命名为 `role`（命令行参数由 `-s` 改为 `--role`）。
- **后端统一**: 移除旧的原生 Ollama 支持，改为全面拥抱 OpenAI 兼容协议。
- **严格校验**: 解析后的 Profile 名和 Role 名必须在配置中存在，否则程序将报错退出。
- **参数优化**: `temperature` 变为可选参数，仅在配置文件中显式定义时才发送给 API。
- **参数精简**: 移除了 `--max-messages`、`--temperature` 和 `--shell` 等冗余命令行参数。
- **显式架构**: 重构了 `LLM` 和 `ShellGPT` 类，将原本模糊的 `**kwargs` 替换为显式命名的关键字参数，提升了代码的可维护性。
- **健壮的 CI 支持**: 优化了配置加载逻辑，防止在没有配置文件的环境（如 CI/CD 流水线）中运行测试时发生崩溃。
- **架构重构**:
  - 将初始化逻辑迁移至独立的 `shellgpt/init.py` 模块。
  - 彻底消除了对全局变量的依赖。

### 修复

- **退出码支持**: 非 REPL 模式在推断出错时现在会正确返回非零退出码。
- **错误处理增强**: 增加了显式的堆栈轨迹打印，方便问题排查。
- **历史记录丢失**: 修复了流式输出模式下 AI 回复无法存入对话历史的问题。
- **REPL 逻辑**: 修复了 REPL 循环中重复发送初始 Prompt 的问题。
