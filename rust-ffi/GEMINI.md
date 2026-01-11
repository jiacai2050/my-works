# Rust FFI Demos

## Project Overview
This repository contains a collection of examples demonstrating Foreign Function Interface (FFI) interoperability between Rust and C. It covers both directions: Rust calling C and C calling Rust, including manual binding creation and automated generation using tools like `bindgen` and `cbindgen`.

## Key Technologies
- **Languages:** Rust, C
- **Build System:** Cargo, Make
- **Tools:**
    - `bindgen`: Generates Rust bindings from C headers.
    - `cbindgen`: Generates C headers from Rust code.
    - `cc-rs`: Compiles C code within Rust build scripts (`build.rs`).

## Project Structure
The project is a Cargo workspace with several members, each demonstrating a specific FFI scenario:

- **`c-call-rust`**: Manual implementation of C calling a Rust library (static library).
- **`c-call-rust-by-cbindgen`**: Uses `cbindgen` to automatically generate the C header file for the Rust library.
- **`rust-call-c`**: Manual implementation of Rust calling a C library. Uses `cc` crate in `build.rs` to compile the C code.
- **`rust-call-c-by-bindgen`**: Uses `bindgen` to automatically generate Rust bindings for the C library.
- **`ub-demo`**: A standalone crate (excluded from workspace) to demonstrate Undefined Behavior (UB) in Unsafe Rust.

## Building and Running

### Prerequisites
- Rust (Cargo, rustc)
- C Compiler (gcc or clang)

### Key Commands

| Command | Description |
| :--- | :--- |
| `cargo build` | Build all workspace members |
| `make` | Execute the Makefile to build/run specific examples (check `Makefile` content for details) |

## Development Notes
- The project serves as a practical reference for the "The Rustonomicon" FFI section.
- `build.rs` scripts are heavily used to integrate C compilation and binding generation into the Cargo build lifecycle.
