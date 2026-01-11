# ZMS (Zig Mirror Server)

## Project Overview
ZMS is a lightweight HTTP server written in pure Zig. Its primary purpose is to act as a caching mirror for Zig compiler tarballs. It fetches requested Zig artifacts on demand and caches them locally, useful for environments with slow access to the official Zig downloads or for setting up private mirrors.

## Key Technologies
- **Language:** Zig
- **Libraries:** `zigcli` (specifically `simargs` for argument parsing).
- **Protocol:** HTTP

## Features
- **On-Demand Caching:** Proxies requests to fetch Zig tarballs and saves them to a local directory.
- **Configurable:** Customizable bind host, port, thread count, and storage directory.
- **High Performance:** Uses Zig's native performance characteristics.

## Building and Running

### Prerequisites
- Zig (0.13.0 or later likely required, check `build.zig.zon` for specific version if needed)

### Key Commands

| Command | Description |
| :--- | :--- |
| `zig build` | Build the `zms` executable |
| `zig build run` | Build and run the server (with default args) |
| `zig build test` | Run unit tests |

### Usage
```bash
./zig-out/bin/zms --host 0.0.0.0 --port 9090 --tarball_dir /tmp
```

## Architecture
- `src/main.zig`: Application entry point. Handles HTTP server logic, request routing, file caching, and command-line argument parsing (via `simargs`).
- `build.zig`: Build configuration. Defines dependencies (`zigcli`), executable targets, and test steps.
