# ShellGPT

## Project Overview
ShellGPT is a command-line interface (CLI) tool that enables users to interact with Large Language Models (LLMs) directly from their terminal. It supports various modes, including direct query, interactive REPL, and a Text User Interface (TUI) for generating shell commands.

## Key Technologies
- **Language:** Python 3
- **Dependencies:** `requests`, `pyperclip` (and `textual` for TUI, though currently commented out in optional-deps but used in code/screenshots).
- **Backend Support:** Ollama (default), OpenAI-compatible APIs (OpenAI, Cloudflare Workers AI, GitHub Models).

## Features
- **Modes:**
    - **Direct:** `sg [question]` or `echo question | sg`.
    - **REPL:** `sg -r` for continuous chat.
    - **TUI:** `sg -t` for an interactive interface tailored for shell command inference (supports infer, run, yank).
- **System Contents (Prompts):** Built-in prompts for specific tasks (e.g., `typo`, `slug`, `code`, `shell`, `commit`). Users can define custom prompts in `~/.shellgpt/prompts.toml`.
- **Configuration:** Flexible configuration via environment variables (`SHELLGPT_API_URL`, `SHELLGPT_API_KEY`, `SHELLGPT_MODEL`) or a config file.

## Building and Running

### Prerequisites
- Python 3.6+
- `pip` or `uv`

### Installation
```bash
pip install shgpt
# or
uv tool install shgpt
```

### Key Commands

| Command | Description |
| :--- | :--- |
| `sg --init` | Initialize configuration directory (`~/.shellgpt`) |
| `sg [query]` | Query LLM directly |
| `sg -r` | Start REPL mode |
| `sg -t` | Start TUI mode |
| `sg -s [prompt_name]` | Use a specific system prompt (e.g., `sg -s commit`) |

## Architecture & Code Structure

### Directory Structure
- `shellgpt/`: Source code package.
    - `__init__.py`: Entry point logic.
    - `utils/conf.py`: Configuration handling.
- `prompts.toml`: Default prompts configuration.
- `download-prompts.py`: Utility script to fetch prompts from "Awesome ChatGPT Prompts".
- `pyproject.toml`: Build configuration and dependencies.

### Configuration
Configuration logic resides in `shellgpt/utils/conf.py`. It prioritizes environment variables over config files, allowing for easy switching between backend providers (e.g., local Ollama vs. remote OpenAI).
