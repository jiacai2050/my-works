# Serverless WebDAV

## Project Overview

This project is a Serverless WebDAV server implementation built on **Cloudflare Workers** and **D1 Database**. It provides a lightweight, scalable file storage solution compatible with standard WebDAV clients (like Finder, Explorer, Cyberduck, etc.).

## Key Technologies

- **Runtime:** Cloudflare Workers (TypeScript)
- **Database:** Cloudflare D1 (SQLite)
- **Testing:** Vitest
- **Deployment:** Wrangler

## Features

- **WebDAV Support:** Implements core WebDAV methods (`OPTIONS`, `PROPFIND`, `GET`, `HEAD`, `PUT`, `MKCOL`, `DELETE`, `MOVE`).
- **Authentication:** Basic Authentication via environment variables.
- **Serverless:** Runs entirely on the edge with no permanent servers.
- **Database Backed:** File metadata and content are stored in D1 (content stored as BLOBs).

## Limitations
- **File Size:** Due to Cloudflare D1's row size limit, individual files (BLOBs) cannot exceed **2 MB**. For larger file support, integration with Cloudflare R2 is recommended.

## Building and Running

### Prerequisites

- Node.js installed
- Cloudflare account (for deployment)

### Key Commands

| Command              | Description                                         |
| :------------------- | :-------------------------------------------------- |
| `npm run dev`        | Start the local development server (using Wrangler) |
| `npm run deploy`     | Deploy the worker to Cloudflare                     |
| `npm test`           | Run unit tests using Vitest                         |
| `npm run cf-typegen` | Generate TypeScript types for Cloudflare bindings   |

### Configuration

Configuration is managed in `wrangler.jsonc`.

- **Database:** `webdav-db` (D1)
- **Environment Variables:**
  - `AUTH_USER`: Username for Basic Auth
  - `AUTH_PASS`: Password for Basic Auth

## Architecture & Code Structure

### `src/index.ts`

The main entry point containing all logic:

1.  **Database Initialization:** Automatically creates tables (`files`) if they don't exist.
2.  **Authentication:** Middleware-like check for Basic Auth headers.
3.  **Request Handling:** Switch statement handling different HTTP methods (`PROPFIND`, `PUT`, etc.).
4.  **Helper Functions:**
    - `checkAuth`: Validates credentials.
    - `generatePropfindXML`: Generates XML responses for WebDAV listing.
    - `normalizePath`: Handles path sanitization.
    - Database helpers (`getFileByPath`, `createFile`, etc.).

### Database Schema

The `files` table stores:

- `path`: Unique file path.
- `content`: File data (BLOB).
- `is_directory`: Boolean flag.
- Metadata: `mime_type`, `size`, `etag`, `created_at`, `modified_at`.

## Development Conventions

- **Language:** TypeScript
- **Style:** Functional approach, minimal dependencies.
- **Testing:** Uses `vitest` with `@cloudflare/vitest-pool-workers` for worker environment simulation.
