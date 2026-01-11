# Zigos (Writing an OS in Zig)

## Project Overview
This project serves two purposes:
1.  **OS Development:** A tutorial/experiment in writing a simple operating system kernel using the Zig programming language.
2.  **Documentation Site:** A Hugo-based website documenting the OS development process ("Writing an OS in Zig").

## Key Technologies
- **Kernel:**
    - **Language:** Zig
    - **Architecture:** x86 (32-bit)
    - **Boot Protocol:** Multiboot 1
- **Documentation:**
    - **Generator:** Hugo
    - **Theme:** Docsy

## Features
- **Kernel:**
    - Implements a Multiboot compliant header.
    - Basic VGA text buffer driver (prints "Hello World!" to screen).
    - Linker script for custom memory layout.
- **Website:**
    - Hosted at `https://zigos.liujiacai.net`.
    - Integrated search and dark mode.

## Building and Running

### Kernel
To build the kernel executable:
```bash
zig build
```
This produces a kernel image (e.g., `zig-out/bin/my-kernel`) targeting `x86-freestanding`.

### Website
To run the documentation site locally:
```bash
hugo server
```

## Architecture & Code Structure
- `src/`: Kernel source code.
    - `02-03.zig`: Main kernel entry point (`_start`) and logic (`main`), writing directly to VGA memory (`0xB8000`).
    - `linker.ld`: Linker script defining memory sections (`.multiboot`, `.text`, etc.).
- `build.zig`: Zig build configuration. Sets target to `x86-freestanding`.
- `content/`: Hugo content files (Markdown).
- `hugo.toml`: Website configuration.
- `package.json`: NPM dependencies for website assets (PostCSS, etc.).
