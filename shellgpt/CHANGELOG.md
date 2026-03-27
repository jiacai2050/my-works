# Changelog

All notable changes to this project will be documented in this file.

## 0.7.1 - 2026-03-27

### Added

- **Stream Usage Reporting**: Send `stream_options: {include_usage: true}` when streaming, and log token usage via `debug_print` in both stream and non-stream modes.

### Fixed

- **Robust Non-Stream Response Parsing**: Use safe `.get()` access for `choices`, `message`, and `content` in non-stream mode to avoid `KeyError` / `IndexError` on unexpected API responses.

## 0.7.0 - 2026-02-23

### Added

- **New Configuration System**: Introduced `~/.shellgpt/config.toml` as the primary configuration method.
- **Multiple Profiles**: Support for multiple API providers with `base_url`, `api_key`, `model`, and custom `headers`. Switch between them using the `-p / --profile` flag.
- **Flexible Authentication**: Added `api_key_env` to profiles, allowing API keys to be read from environment variables.
- **Variable Substitution**: Headers now support environment variable substitution using `$VAR` or `${VAR}` syntax.
- **Role System**: Integrated system prompts into a customizable `[roles]` section in `config.toml`.
- **Configurable Directory**: Added `SHELLGPT_CONF_DIR` environment variable support (defaults to `~/.shellgpt`).
- **Configuration Inspection**: Added `--dump` and `--dump-json` flags to print active configuration (with `api_key` and sensitive headers masked).
- **Stream Control**: Added `--stream` and `--no-stream` CLI flags. `stream` now defaults to `false` if stdout is redirected.
- **Improved Initialization**: `sg --init` now generates a rich configuration template with dynamic shell detection and multi-line role examples.
- **New Built-in Roles**: Added `summary` and `polish` roles to the default template.
- **Enhanced Debugging**: Added HTTP headers (masked) and truncated request bodies to debug logs in verbose mode.
- **Multilingual Docs**: Added `README_zh.md` and `CHANGELOG_zh.md`.

### Changed

- **Unified Terminology**: Standardized on `role` instead of `system_content` across the entire codebase and CLI (changed `-s` to `--role`).
- **Backend Unification**: Switched to 100% OpenAI-compatible API handling; legacy native Ollama support has been removed.
- **Strict Validation**: Resolved profile names and role names must now exist in the configuration, or the program will exit with an error.
- **Optional Parameters**: `temperature` is now optional and only sent to the API if explicitly defined in the config.
- **Cleaned CLI Arguments**: Removed redundant flags like `--max-messages`, `--temperature`, and `--shell`.
- **URL Handling**: URLs in profiles must now be provided in full.
- **Explicit Architecture**: Refactored `LLM` and `ShellGPT` classes to use explicit keyword arguments instead of generic `**kwargs` for better maintainability and clarity.
- **Robust CI Support**: Improved configuration loading logic to prevent crashes in environments without a config file (like CI/CD runners).
- **Architecture Refactoring**:
  - Moved initialization logic to `shellgpt/init.py`.
  - Eliminated dependencies on global variables.

### Fixed

- **Process Exit Codes**: Non-REPL mode now correctly exits with a non-zero code on inference errors.
- **Robust Error Handling**: Added explicit traceback printing for easier troubleshooting.
- **History Management**: Fixed a bug where AI responses were not saved to history during streaming.
- **REPL Logic**: Fixed a bug where the initial prompt was repeatedly sent.
