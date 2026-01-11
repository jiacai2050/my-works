# Video Compress

## Project Overview
Video Compress is a command-line tool designed to significantly reduce video file size (up to 90%) while maintaining acceptable quality. It acts as a wrapper around `ffmpeg`.

## Key Technologies
- **Language:** Python 3.6+
- **Core Dependency:** `ffmpeg` (must be installed separately).
- **Build Backend:** Hatchling

## Features
- **High Compression:** Uses FFMPEG to compress videos effectively (default CRF 30).
- **Batch Processing:** Can process individual files or recursively scan directories.
- **Multithreading:** Supports concurrent compression (default: 6 threads).
- **Automatic Output Naming:** Output files are suffixed with `-compressed.mp4`.
- **Cleanup Option:** Optional flag (`--delete`) to remove original files after successful compression.

## Building and Running

### Prerequisites
- Python 3
- `ffmpeg` (installed and in PATH)

### Installation
```bash
pip install video-compress
# or
uv tool install video-compress
```

### Key Commands

| Command | Description |
| :--- | :--- |
| `vc [path]` | Compress video(s) at path (file or directory) |
| `vc -t 4 [path]` | Compress using 4 threads |
| `vc --crf 25 [path]` | Compress with Custom Rate Factor 25 |
| `vc --delete [path]` | Delete original files after compression |

## Architecture
- `vc/main.py`: Main entry point and logic.
    - Uses `subprocess` to call `ffmpeg`.
    - Handles argument parsing, file discovery (`os.walk`), and thread management (`concurrent.futures`).
    - Version is dynamically sourced from `vc/main.py` by Hatch.
