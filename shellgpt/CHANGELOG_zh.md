# 更新日志

此项目的所有显著更改都将记录在本文件中。

## [未发布]

### 新增
- **全新配置系统**: 引入 `~/.shellgpt/config.toml` 作为核心配置方式，取代了旧的环境变量配置。
- **多 Profile 支持**: 新增 `-p / --profile` 参数，允许在不同的 API 提供商（如 Ollama, OpenAI, GitHub, Cloudflare）之间快速切换。
- **角色 (Role) 系统**: 将原本硬编码的系统提示词整合到 `config.toml` 的 `[roles]` 部分，支持用户自由定义和扩展。
- **流式输出控制**: 在命令行中增加了 `--stream` 和 `--no-stream` 参数。
- **初始化流程优化**: `sg --init` 现在会生成一个包含完整示例、多行字符串以及动态 Shell 环境检测的配置文件模板。
- **新内置角色**: 在默认模板中新增了 `summary`（文章总结）和 `polish`（文字润色）角色。
- **多语言文档**: 增加了中文版本的 `README_zh.md`。

### 变更
- **术语统一**: 将整个代码库中的 `system_content` 统一重命名为 `role`，命令行参数由 `-s / --system` 改为 `-s / --role`。
- **命令行参数精简**: 移除了 `--max-messages`、`--temperature` 和 `--shell` 等冗余参数，改为通过配置文件统一管理。
- **URL 处理逻辑**: 移除了硬编码的 `v1/` 路径拼接。现在 URL 由用户在 Profile 中完整提供，从而更好地支持各种 API 网关和代理。
- **代码架构重构**:
    - 优化了 `LLM` 和 `ShellGPT` 类的构造函数，改用 `**kwargs` 提高扩展性。
    - 将初始化逻辑迁移至独立的 `shellgpt/init.py` 模块。
    - 彻底移除了对全局变量 `SYSTEM_CONTENT` 和 `BUILTIN_ROLES` 的依赖。
- **流式解析优化**: 采用 `iter_lines(decode_unicode=True)` 配合 JSON 缓冲区，解决了由于网络包截断导致的乱码及解析失败问题。

### 修复
- **历史记录丢失**: 修复了流式输出模式下 AI 回复可能无法存入对话历史的问题。
- **REPL 逻辑错误**: 修复了 REPL 循环中重复发送初始 Prompt 的问题。
- **文档修正**: 修正了 README 中 GitHub Models 的域名错误（.io -> .ai）。
