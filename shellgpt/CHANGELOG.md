# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **New Configuration System**: Introduced `~/.shellgpt/config.toml` as the primary configuration method.
- **Multiple Profiles**: Support for multiple API providers with `base_url`, `api_key`, `model`, and custom `headers`. Switch between them using the `-p / --profile` flag.
- **Role System**: Integrated system prompts into a customizable `[roles]` section in `config.toml`.
- **Configurable Directory**: Added `SHELLGPT_CONF_DIR` environment variable support (defaults to `~/.shellgpt`).
- **Configuration Inspection**: Added `--dump` and `--dump-json` flags to print active configuration (with `api_key` masked).
- **Stream Control**: Added `--stream` and `--no-stream` CLI flags. `stream` now defaults to `false` if stdout is redirected.
- **Improved Initialization**: `sg --init` now generates a rich configuration template with dynamic shell detection and multi-line role examples.
- **New Built-in Roles**: Added `summary` and `polish` roles to the default template.
- **Multilingual Docs**: Added `README_zh.md` and `CHANGELOG_zh.md`.

### Changed
- **Unified Terminology**: Standardized on `role` instead of `system_content` across the entire codebase and CLI (changed `-s` to `--role`).
- **Backend Unification**: Switched to 100% OpenAI-compatible API handling; legacy native Ollama support has been removed (use Ollama's OpenAI-compatible endpoint instead).
- **Cleaned CLI Arguments**: Removed redundant flags like `--max-messages`, `--temperature`, and `--shell` in favor of configuration file settings.
- **URL Handling**: URLs in profiles must now be provided in full (e.g., including `/v1`), allowing better support for API gateways and proxies.
- **Architecture Refactoring**: 
    - Refactored `LLM` and `ShellGPT` to use `**kwargs` for better extensibility.
    - Moved initialization logic to `shellgpt/init.py`.
    - Eliminated dependencies on global variables.
- **Optimized Logging**: Request logs are now truncated to 50 characters in verbose mode to keep output clean.

### Fixed
- **History Management**: Fixed a bug where AI responses were not saved to history during streaming.
- **REPL Loop**: Fixed a bug where the initial prompt was repeatedly sent.
