# ZigCC

## Project Overview
ZigCC provides Python wrapper scripts to simplify using `zig cc` (Zig's C/C++ compiler) for compiling C, C++, Rust, and Go projects. It aims to smooth over common issues encountered when using `zig cc` as a drop-in replacement for GCC/Clang, such as target triple mapping and handling unsupported flags.

## Key Technologies
- **Language:** Python 3
- **Core Tool:** `zig cc` / `zig c++`

## Features
- **Wrappers:**
    - `zigcc`: Wrapper for `CC`.
    - `zigcxx`: Wrapper for `CXX`.
    - `zigcargo`: Wrapper for `cargo`, automatically configuring linkers.
- **Cross-Compilation Helpers:** Automatically converts target triples between Rust/Go conventions and Zig's expected format.
- **Flag Management:**
    - Filters out unsupported linker args (preventing "unsupported linker arg" errors).
    - Can inject extra flags via `ZIGCC_FLAGS`.
- **Sanitization Control:** Disables Zig's default aggressive UB sanitization (which traps on UB) by default, controllable via `ZIGCC_ENABLE_SANITIZE`.

## Building and Running

### Prerequisites
- Python 3
- Zig (installed and in PATH)

### Installation
```bash
pip install zigcc
```

### Key Commands

| Command | Description |
| :--- | :--- |
| `zigcc` | Use as `CC` replacement |
| `zigcxx` | Use as `CXX` replacement |
| `zigcargo build` | Drop-in replacement for `cargo build` |

## Architecture
- `zigcc/__init__.py`: Contains the logic for all entry points (`zigcc`, `zigcxx`, `zigcargo`). It detects how it was called and adjusts behavior accordingly.
- **Configuration (Env Vars):**
    - `ZIGCC_FLAGS`: Pass extra flags.
    - `ZIGCC_BLACKLIST_FLAGS`: Explicitly filter flags.
    - `ZIGCC_VERBOSE`: Enable debug logging.
