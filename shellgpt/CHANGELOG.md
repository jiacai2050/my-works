# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **New Configuration System**: Introduced `~/.shellgpt/config.toml` as the primary configuration method, replacing legacy environment variables.
- **Multiple Profiles**: Added `-p / --profile` flag to quickly switch between different API providers (e.g., Ollama, OpenAI, GitHub, Cloudflare).
- **Role System**: Integrated hardcoded system prompts into a customizable `[roles]` section in `config.toml`.
- **Stream Control**: Exposed `--stream` and `--no-stream` CLI arguments.
- **Improved Initialization**: `sg --init` now generates a comprehensive configuration template including multi-line role examples and dynamic shell detection.
- **New Built-in Roles**: Added `summary` (Markdown summary) and `polish` (text refinement) roles to the default template.
- **Multilingual Docs**: Added `README_zh.md` for Chinese users.

### Changed
- **Unified Terminology**: Renamed `system_content` to `role` across the entire codebase and CLI (changed `-s / --system` to `-s / --role`).
- **Cleaned CLI Arguments**: Removed redundant flags like `--max-messages`, `--temperature`, and `--shell` in favor of configuration file settings.
- **URL Handling**: Removed hardcoded `v1/` path concatenation. URLs in profiles must now be provided in full, allowing better support for API gateways and proxies.
- **Architecture Refactoring**:
    - Refactored `LLM` and `ShellGPT` constructors to use `**kwargs` for better extensibility.
    - Moved initialization logic to a dedicated `shellgpt/init.py` module.
    - Eliminated dependencies on global variables `SYSTEM_CONTENT` and `BUILTIN_ROLES`.
- **Robust Streaming**: Switched to `iter_lines(decode_unicode=True)` with a JSON buffer to resolve encoding (garbled characters) and fragmentation issues in SSE streams.

### Fixed
- **History Loss**: Fixed a bug where AI responses were not saved to chat history during streaming mode.
- **REPL Logic**: Fixed a bug where the initial prompt was repeatedly sent in the REPL loop.
- **Documentation**: Fixed GitHub Models URL typo in README (.io -> .ai).
